-- Update buyers_secure view to show full contact info for all approved users
-- Operators are trusted, so no masking needed
CREATE OR REPLACE VIEW public.buyers_secure
WITH (security_invoker = on)
AS
SELECT 
    b.id,
    b.event_id,
    b.data_compra,
    b.nome,
    b.contato,
    b.contato_normalizado,
    b.num_ingressos,
    b.entrega,
    b.ingressos_resgatados,
    b.status,
    b.created_at,
    b.updated_at
FROM public.buyers b
WHERE public.is_user_approved(auth.uid());

-- Add RLS policy for deleting user roles (needed for user removal)
-- Already exists: "Admins can delete roles"

-- Add RLS policy for deleting profiles by admin
CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));