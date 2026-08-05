-- Settings table (key/value) for app-wide configuration like the volunteer sheet URL
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view settings"
ON public.app_settings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can insert settings"
ON public.app_settings
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update settings"
ON public.app_settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete settings"
ON public.app_settings
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));