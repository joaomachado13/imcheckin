-- Add approval status enum
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');

-- Add approval_status to profiles
ALTER TABLE public.profiles 
ADD COLUMN approval_status public.approval_status NOT NULL DEFAULT 'pending';

-- Update existing profiles to approved (so current users can still access)
UPDATE public.profiles SET approval_status = 'approved';

-- Create function to check if user is approved
CREATE OR REPLACE FUNCTION public.is_user_approved(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE user_id = _user_id
          AND approval_status = 'approved'
    )
$$;

-- Create function to mask contact info (shows only first 2 and last 2 chars)
CREATE OR REPLACE FUNCTION public.mask_contact(contact text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
    SELECT CASE 
        WHEN contact IS NULL OR length(contact) <= 4 THEN '****'
        ELSE substring(contact, 1, 2) || repeat('*', greatest(length(contact) - 4, 1)) || substring(contact, length(contact) - 1, 2)
    END
$$;

-- Drop old permissive policies
DROP POLICY IF EXISTS "Authenticated users can view buyers" ON public.buyers;
DROP POLICY IF EXISTS "Authenticated users can view events" ON public.events;

-- Create secure view for buyers that masks contact for non-admins
CREATE VIEW public.buyers_secure
WITH (security_invoker = on)
AS
SELECT 
    id,
    event_id,
    data_compra,
    nome,
    CASE 
        WHEN has_role(auth.uid(), 'admin') THEN contato
        ELSE mask_contact(contato)
    END as contato,
    CASE 
        WHEN has_role(auth.uid(), 'admin') THEN contato_normalizado
        ELSE mask_contact(contato_normalizado)
    END as contato_normalizado,
    num_ingressos,
    entrega,
    ingressos_resgatados,
    status,
    created_at,
    updated_at
FROM public.buyers;

-- Create secure view for events that hides sheet_url for non-admins
CREATE VIEW public.events_secure
WITH (security_invoker = on)
AS
SELECT 
    id,
    name,
    event_date,
    description,
    CASE 
        WHEN has_role(auth.uid(), 'admin') THEN sheet_url
        ELSE NULL
    END as sheet_url,
    created_by,
    created_at,
    updated_at
FROM public.events;

-- New RLS policies for buyers - only approved users can view, and through secure view
CREATE POLICY "Approved users can view buyers"
ON public.buyers FOR SELECT
TO authenticated
USING (is_user_approved(auth.uid()));

-- New RLS policies for events - only approved users can view
CREATE POLICY "Approved users can view events"
ON public.events FOR SELECT
TO authenticated
USING (is_user_approved(auth.uid()));

-- Update profiles policies to allow admins to view and update all profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view own profile or admins can view all"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update own profile or admins can update all"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

-- Allow admins to view all user roles for management
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
ON public.user_roles FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));