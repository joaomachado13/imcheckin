-- Lock down SECURITY DEFINER functions from direct API execution
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_buyer_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_user_approved(uuid) FROM PUBLIC, anon, authenticated;

-- Keep internal/server usage working
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_user_approved(uuid) TO service_role;

-- Storage: stop anonymous listing of the public bucket
DROP POLICY IF EXISTS "Public can view event backgrounds" ON storage.objects;
CREATE POLICY "Admins can view event backgrounds"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'event-backgrounds' AND public.has_role(auth.uid(), 'admin'::public.app_role));