ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS ministerios text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS buyers_ministerios_idx ON public.buyers USING GIN (ministerios);

DROP VIEW IF EXISTS public.buyers_secure;
CREATE VIEW public.buyers_secure
WITH (security_invoker = true)
AS
SELECT id,
    event_id,
    data_compra,
    nome,
    contato,
    contato_normalizado,
    num_ingressos,
    entrega,
    ingressos_resgatados,
    status,
    ministerios,
    created_at,
    updated_at
   FROM public.buyers
  WHERE removido = false;

GRANT SELECT ON public.buyers_secure TO authenticated;