-- Create public bucket for event background images
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-backgrounds', 'event-backgrounds', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access
CREATE POLICY "Public can view event backgrounds"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-backgrounds');

-- Only admins can upload
CREATE POLICY "Admins can upload event backgrounds"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'event-backgrounds' AND public.has_role(auth.uid(), 'admin'));

-- Only admins can update
CREATE POLICY "Admins can update event backgrounds"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'event-backgrounds' AND public.has_role(auth.uid(), 'admin'));

-- Only admins can delete
CREATE POLICY "Admins can delete event backgrounds"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'event-backgrounds' AND public.has_role(auth.uid(), 'admin'));