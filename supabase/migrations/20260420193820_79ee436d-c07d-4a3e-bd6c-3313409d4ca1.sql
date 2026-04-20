-- Enable pgcrypto for secure hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Table to store hashed parent PINs
CREATE TABLE public.parent_pins (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pin_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.parent_pins ENABLE ROW LEVEL SECURITY;

-- Note: hash is sensitive; we only allow read of own row but never expose hash directly to client (always use RPC).
CREATE POLICY "Users can view own pin row"
  ON public.parent_pins FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own pin row"
  ON public.parent_pins FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own pin row"
  ON public.parent_pins FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION public.tg_parent_pins_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER parent_pins_updated_at
BEFORE UPDATE ON public.parent_pins
FOR EACH ROW EXECUTE FUNCTION public.tg_parent_pins_updated_at();

-- RPC: set or update PIN. Validates 4-digit numeric format.
CREATE OR REPLACE FUNCTION public.set_parent_pin(p_pin TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Niet ingelogd' USING ERRCODE = '28000';
  END IF;
  IF p_pin IS NULL OR p_pin !~ '^[0-9]{4}$' THEN
    RAISE EXCEPTION 'PIN moet exact 4 cijfers zijn' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.parent_pins (user_id, pin_hash)
  VALUES (v_uid, crypt(p_pin, gen_salt('bf', 10)))
  ON CONFLICT (user_id) DO UPDATE SET
    pin_hash = crypt(p_pin, gen_salt('bf', 10)),
    updated_at = now();
END;
$$;

-- RPC: verify PIN, returns boolean.
CREATE OR REPLACE FUNCTION public.verify_parent_pin(p_pin TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_hash TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;
  IF p_pin IS NULL OR p_pin !~ '^[0-9]{4}$' THEN
    RETURN false;
  END IF;

  SELECT pin_hash INTO v_hash FROM public.parent_pins WHERE user_id = v_uid;
  IF v_hash IS NULL THEN
    RETURN false;
  END IF;

  RETURN v_hash = crypt(p_pin, v_hash);
END;
$$;

-- RPC: check if current user has a pin set
CREATE OR REPLACE FUNCTION public.has_parent_pin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.parent_pins WHERE user_id = auth.uid());
$$;