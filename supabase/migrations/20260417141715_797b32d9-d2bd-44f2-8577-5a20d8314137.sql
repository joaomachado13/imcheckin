-- Fix 1: Recreate events_secure with security_invoker = on
CREATE OR REPLACE VIEW public.events_secure
  WITH (security_invoker = on)
AS SELECT
  id, name, event_date, description, created_by,
  created_at, updated_at, background_url,
  CASE WHEN public.has_role(auth.uid(), 'admin'::public.app_role) THEN sheet_url ELSE NULL END AS sheet_url
FROM public.events;

-- Also ensure the other secure views have security_invoker on (defensive)
ALTER VIEW public.buyers_secure SET (security_invoker = on);
ALTER VIEW public.volunteers_secure SET (security_invoker = on);

-- Fix 2: Tighten redemptions SELECT — require approval for the operador_id branch
DROP POLICY IF EXISTS "Users can view redemptions for accessible events" ON public.redemptions;

CREATE POLICY "Users can view redemptions for accessible events"
ON public.redemptions
FOR SELECT
TO authenticated
USING (
  public.is_user_approved(auth.uid()) AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR (operador_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = redemptions.event_id
        AND e.created_by = auth.uid()
    )
  )
);

-- Fix 3: Prevent privilege escalation via profiles INSERT
-- Restrict to authenticated users only and force approval_status = 'pending'
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND approval_status = 'pending'::public.approval_status
);

-- Also prevent self-approval via UPDATE: split policy so users updating their own
-- profile cannot change approval_status, while admins still can.
DROP POLICY IF EXISTS "Users can update own profile or admins can update all" ON public.profiles;

CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Users can update own profile (no status change)"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND approval_status = (
    SELECT approval_status FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1
  )
);