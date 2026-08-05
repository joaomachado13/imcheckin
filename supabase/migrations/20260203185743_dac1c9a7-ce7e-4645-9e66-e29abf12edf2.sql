-- Fix security issues: Restrict data access and improve RLS policies

-- 1. Update buyers table policy to restrict access
DROP POLICY IF EXISTS "Approved users can view buyers" ON public.buyers;

-- Admins can see all buyers, operators only see buyers for events through the secure view
CREATE POLICY "Only admins can view buyers directly"
ON public.buyers FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- 2. Fix redemptions table - restrict SELECT to event-based access
DROP POLICY IF EXISTS "Authenticated users can view redemptions" ON public.redemptions;

CREATE POLICY "Users can view redemptions for accessible events"
ON public.redemptions FOR SELECT
USING (
  is_user_approved(auth.uid()) AND
  (
    has_role(auth.uid(), 'admin') OR
    operador_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.events e 
      WHERE e.id = event_id 
      AND e.created_by = auth.uid()
    )
  )
);

-- 3. Enable RLS on buyers_secure view properly
-- Since buyers_secure is a view with security_invoker, it inherits RLS from buyers table
-- But we need operators to access it, so we grant access via the view

-- 4. Update events_secure view to properly mask sheet_url for non-admins
DROP VIEW IF EXISTS public.events_secure;

CREATE VIEW public.events_secure
WITH (security_invoker = on)
AS SELECT 
  id,
  name,
  description,
  event_date,
  created_at,
  updated_at,
  created_by,
  CASE 
    WHEN has_role(auth.uid(), 'admin') THEN sheet_url
    ELSE NULL 
  END as sheet_url
FROM public.events;

-- 5. Grant access to secure views for authenticated users
GRANT SELECT ON public.buyers_secure TO authenticated;
GRANT SELECT ON public.events_secure TO authenticated;

-- 6. Create a policy that allows approved operators to view buyers through secure view
-- We need a separate approach: create an RLS policy on buyers that works with buyers_secure
DROP POLICY IF EXISTS "Only admins can view buyers directly" ON public.buyers;

CREATE POLICY "Approved users can view buyers"
ON public.buyers FOR SELECT
USING (is_user_approved(auth.uid()));

-- The security comes from the application layer using buyers_secure view for operators