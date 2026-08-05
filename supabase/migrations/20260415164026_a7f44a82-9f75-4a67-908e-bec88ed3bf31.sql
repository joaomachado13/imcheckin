
DROP VIEW IF EXISTS public.volunteers_secure;
CREATE VIEW public.volunteers_secure WITH (security_invoker = true) AS
SELECT id, nome, contato, contato_normalizado, funcao, created_at, updated_at
FROM public.volunteers
WHERE removido = false;
