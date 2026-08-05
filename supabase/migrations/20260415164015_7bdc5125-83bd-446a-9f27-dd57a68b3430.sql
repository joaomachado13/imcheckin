
-- Table: conferences (lista de conferências disponíveis)
CREATE TABLE public.conferences (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.conferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved users can view active conferences"
ON public.conferences FOR SELECT TO authenticated
USING (is_user_approved(auth.uid()));

CREATE POLICY "Admins can manage conferences"
ON public.conferences FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed initial conferences
INSERT INTO public.conferences (name, sort_order) VALUES
('Imagine Conference', 1),
('Conferência do Espírito Santo', 2),
('Escola Profética', 3),
('Conferência de Mulheres', 4),
('Conferência de Homens', 5),
('Conferência Juventude', 6),
('Confra Kids', 7),
('Conferência da Família', 8);

-- Table: volunteers (lista de voluntários oficiais)
CREATE TABLE public.volunteers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    contato TEXT,
    contato_normalizado TEXT,
    funcao TEXT,
    removido BOOLEAN NOT NULL DEFAULT false,
    removido_em TIMESTAMP WITH TIME ZONE,
    removido_por UUID,
    motivo_remocao TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.volunteers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved users can view volunteers"
ON public.volunteers FOR SELECT TO authenticated
USING (is_user_approved(auth.uid()));

CREATE POLICY "Admins can manage volunteers"
ON public.volunteers FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger to normalize phone for volunteers
CREATE TRIGGER normalize_volunteer_phone
BEFORE INSERT OR UPDATE ON public.volunteers
FOR EACH ROW
EXECUTE FUNCTION public.normalize_buyer_phone();

-- Table: volunteer_redemptions (1 resgate por voluntário)
CREATE TABLE public.volunteer_redemptions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    volunteer_id UUID NOT NULL REFERENCES public.volunteers(id) ON DELETE CASCADE,
    conference_id UUID NOT NULL REFERENCES public.conferences(id),
    operador_id UUID NOT NULL,
    operador_nome TEXT,
    observacao TEXT,
    desfeito BOOLEAN NOT NULL DEFAULT false,
    desfeito_em TIMESTAMP WITH TIME ZONE,
    desfeito_por UUID,
    justificativa_desfazer TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint: 1 active redemption per volunteer
CREATE UNIQUE INDEX idx_volunteer_one_redemption 
ON public.volunteer_redemptions (volunteer_id) 
WHERE desfeito = false;

ALTER TABLE public.volunteer_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved users can view volunteer redemptions"
ON public.volunteer_redemptions FOR SELECT TO authenticated
USING (is_user_approved(auth.uid()));

CREATE POLICY "Approved users can create volunteer redemptions"
ON public.volunteer_redemptions FOR INSERT TO authenticated
WITH CHECK (is_user_approved(auth.uid()) AND auth.uid() = operador_id);

CREATE POLICY "Admins can update volunteer redemptions"
ON public.volunteer_redemptions FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- View: volunteers_secure (filters removed volunteers)
CREATE VIEW public.volunteers_secure AS
SELECT id, nome, contato, contato_normalizado, funcao, created_at, updated_at
FROM public.volunteers
WHERE removido = false;
