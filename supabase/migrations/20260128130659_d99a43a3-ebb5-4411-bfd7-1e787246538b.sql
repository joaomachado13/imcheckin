-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'operador');

-- Create enum for delivery status
CREATE TYPE public.delivery_status AS ENUM ('pendente', 'parcial', 'resgatado');

-- Create profiles table for user info
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role app_role NOT NULL DEFAULT 'operador',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Create events table
CREATE TABLE public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    event_date DATE,
    description TEXT,
    sheet_url TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create buyers table (imported from Google Sheets)
CREATE TABLE public.buyers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    data_compra DATE,
    nome TEXT NOT NULL,
    contato TEXT,
    contato_normalizado TEXT,
    num_ingressos INTEGER NOT NULL DEFAULT 1,
    entrega TEXT,
    ingressos_resgatados INTEGER NOT NULL DEFAULT 0,
    status delivery_status NOT NULL DEFAULT 'pendente',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create redemptions table (registro de resgates)
CREATE TABLE public.redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL REFERENCES public.buyers(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    quantidade INTEGER NOT NULL,
    resgatado_por_comprador BOOLEAN NOT NULL DEFAULT true,
    nome_retirada TEXT,
    telefone_retirada TEXT,
    observacao TEXT,
    operador_id UUID NOT NULL,
    operador_nome TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    desfeito BOOLEAN NOT NULL DEFAULT false,
    desfeito_em TIMESTAMPTZ,
    desfeito_por UUID,
    justificativa_desfazer TEXT
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redemptions ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role
    FROM public.user_roles
    WHERE user_id = _user_id
    LIMIT 1
$$;

-- Profiles policies
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- User roles policies
CREATE POLICY "Users can view own role"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Events policies
CREATE POLICY "Authenticated users can view events"
ON public.events FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can create events"
ON public.events FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update events"
ON public.events FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete events"
ON public.events FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Buyers policies
CREATE POLICY "Authenticated users can view buyers"
ON public.buyers FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage buyers"
ON public.buyers FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Redemptions policies
CREATE POLICY "Authenticated users can view redemptions"
ON public.redemptions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create redemptions"
ON public.redemptions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = operador_id);

CREATE POLICY "Admins can update redemptions"
ON public.redemptions FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Function to normalize phone numbers
CREATE OR REPLACE FUNCTION public.normalize_phone(phone TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g');
END;
$$;

-- Trigger to auto-normalize phone on buyers insert/update
CREATE OR REPLACE FUNCTION public.normalize_buyer_phone()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.contato_normalizado := public.normalize_phone(NEW.contato);
    RETURN NEW;
END;
$$;

CREATE TRIGGER normalize_buyer_phone_trigger
BEFORE INSERT OR UPDATE ON public.buyers
FOR EACH ROW
EXECUTE FUNCTION public.normalize_buyer_phone();

-- Trigger to update buyer status after redemption
CREATE OR REPLACE FUNCTION public.update_buyer_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    total_resgates INTEGER;
    total_ingressos INTEGER;
BEGIN
    -- Calculate total valid redemptions
    SELECT COALESCE(SUM(quantidade), 0) INTO total_resgates
    FROM public.redemptions
    WHERE buyer_id = NEW.buyer_id AND desfeito = false;
    
    -- Get total tickets
    SELECT num_ingressos INTO total_ingressos
    FROM public.buyers
    WHERE id = NEW.buyer_id;
    
    -- Update buyer status
    UPDATE public.buyers
    SET 
        ingressos_resgatados = total_resgates,
        status = CASE 
            WHEN total_resgates >= total_ingressos THEN 'resgatado'::delivery_status
            WHEN total_resgates > 0 THEN 'parcial'::delivery_status
            ELSE 'pendente'::delivery_status
        END,
        updated_at = now()
    WHERE id = NEW.buyer_id;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_buyer_status_trigger
AFTER INSERT OR UPDATE ON public.redemptions
FOR EACH ROW
EXECUTE FUNCTION public.update_buyer_status();

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, full_name, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    
    -- First user becomes admin, others become operador
    IF (SELECT COUNT(*) FROM public.user_roles) = 0 THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, 'admin');
    ELSE
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, 'operador');
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for search performance
CREATE INDEX idx_buyers_nome ON public.buyers USING gin(to_tsvector('portuguese', nome));
CREATE INDEX idx_buyers_contato_normalizado ON public.buyers(contato_normalizado);
CREATE INDEX idx_buyers_event_id ON public.buyers(event_id);
CREATE INDEX idx_redemptions_buyer_id ON public.redemptions(buyer_id);
CREATE INDEX idx_redemptions_event_id ON public.redemptions(event_id);