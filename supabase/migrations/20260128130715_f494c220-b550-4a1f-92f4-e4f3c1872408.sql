-- Fix search_path for normalize_phone function
CREATE OR REPLACE FUNCTION public.normalize_phone(phone TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    RETURN regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g');
END;
$$;

-- Fix search_path for normalize_buyer_phone trigger function
CREATE OR REPLACE FUNCTION public.normalize_buyer_phone()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    NEW.contato_normalizado := public.normalize_phone(NEW.contato);
    RETURN NEW;
END;
$$;