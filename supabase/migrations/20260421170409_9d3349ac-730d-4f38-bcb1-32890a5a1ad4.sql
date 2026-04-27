-- Ensure pgcrypto is installed in the extensions schema (Supabase best practice)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Recreate set_parent_pin with explicit search_path that includes extensions
CREATE OR REPLACE FUNCTION public.set_parent_pin(p_pin text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
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
  VALUES (v_uid, extensions.crypt(p_pin, extensions.gen_salt('bf', 10)))
  ON CONFLICT (user_id) DO UPDATE SET
    pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf', 10)),
    updated_at = now();
END;
$function$;

-- Recreate verify_parent_pin with explicit extensions schema
CREATE OR REPLACE FUNCTION public.verify_parent_pin(p_pin text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
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

  RETURN v_hash = extensions.crypt(p_pin, v_hash);
END;
$function$;