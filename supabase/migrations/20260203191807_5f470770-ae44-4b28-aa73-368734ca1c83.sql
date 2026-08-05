-- Add background_url column to events table for custom event backgrounds
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS background_url text;

-- Update events_secure view to include background_url
DROP VIEW IF EXISTS public.events_secure;

CREATE VIEW public.events_secure AS
SELECT 
    id,
    name,
    event_date,
    description,
    created_by,
    created_at,
    updated_at,
    background_url,
    CASE 
        WHEN public.has_role(auth.uid(), 'admin'::app_role) THEN sheet_url
        ELSE NULL
    END as sheet_url
FROM public.events;

-- Grant access to the view
GRANT SELECT ON public.events_secure TO authenticated;