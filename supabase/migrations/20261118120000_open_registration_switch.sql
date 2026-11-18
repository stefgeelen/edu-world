-- Open beta: iedereen kan een account maken, met een noodrem.
--
-- 1. registration_settings.open (één rij): de schakelaar in Admin → Beta.
--    Aan  = iedereen kan registreren (e-mail of eerste Google-login).
--    Uit  = zoals sinds 19 okt: enkel een adres op de wachtlijst (beta_signups).
--    Begint UIT, zodat deze migratie op zich niets verandert.
--    Iedereen mag hem lezen, ook zonder account: de website toont volgens deze
--    stand "Gratis starten" of het wachtlijstformulier.
--
-- 2. De trigger op auth.users (20261019120000_signup_only_from_beta_list.sql)
--    laat een nieuw account door zodra de schakelaar aan staat.
--
-- 3. beta_signups.open_mail_sent_at: de eenmalige mail "de beta is open" aan
--    de wachtlijst (edge function beta-open-announcement). Elk adres krijgt hem
--    hoogstens één keer, en niet als het al een account heeft.

-- =============================================
-- 1. De schakelaar
-- =============================================
CREATE TABLE IF NOT EXISTS public.registration_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  open boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.registration_settings (id) VALUES (true) ON CONFLICT DO NOTHING;

ALTER TABLE public.registration_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view registration settings" ON public.registration_settings;
CREATE POLICY "Anyone can view registration settings"
  ON public.registration_settings FOR SELECT TO anon, authenticated
  USING (true);

CREATE OR REPLACE FUNCTION public.registration_is_open()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE((SELECT open FROM registration_settings WHERE id), false);
$$;

CREATE OR REPLACE FUNCTION public.admin_set_registration_open(p_open boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_open IS NULL THEN
    RAISE EXCEPTION 'Invalid value';
  END IF;
  UPDATE registration_settings SET open = p_open, updated_at = now() WHERE id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_set_registration_open(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_registration_open(boolean) TO authenticated;

-- =============================================
-- 2. De poort bij een nieuw account
-- =============================================
CREATE OR REPLACE FUNCTION public.enforce_beta_signup_list()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF public.registration_is_open() THEN
    RETURN NEW;
  END IF;
  IF NEW.email IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.beta_signups b
     WHERE lower(b.email) = lower(NEW.email)
  ) THEN
    RAISE EXCEPTION 'not on beta list' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_beta_signup_list() FROM PUBLIC, anon, authenticated;

-- =============================================
-- 3. De mail "de beta is open"
-- =============================================
ALTER TABLE public.beta_signups
  ADD COLUMN IF NOT EXISTS open_mail_sent_at timestamptz;

-- Wie nog een mail moet krijgen: nooit gemaild en nog geen account.
CREATE OR REPLACE FUNCTION public._beta_open_mail_pending_rows()
RETURNS SETOF public.beta_signups
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT b.*
    FROM public.beta_signups b
   WHERE b.open_mail_sent_at IS NULL
     AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE lower(u.email) = lower(b.email));
$$;

REVOKE ALL ON FUNCTION public._beta_open_mail_pending_rows() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._beta_open_mail_pending_rows() TO service_role;

-- Voor Admin → Beta: hoeveel adressen de mail nog zouden krijgen.
CREATE OR REPLACE FUNCTION public.admin_beta_open_mail_pending()
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN (SELECT count(*)::integer FROM public._beta_open_mail_pending_rows());
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_beta_open_mail_pending() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_beta_open_mail_pending() TO authenticated;

-- Enkel voor de edge function (service role): neemt de volgende p_limit
-- adressen (oudste eerst) en zet ze meteen op "verstuurd", zodat twee
-- oproepen tegelijk nooit hetzelfde adres mailen. Lukt een mail niet, dan
-- zet de functie open_mail_sent_at terug op NULL.
CREATE OR REPLACE FUNCTION public._claim_beta_open_mail_batch(p_limit integer)
RETURNS TABLE (id uuid, email text, full_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.beta_signups b
     SET open_mail_sent_at = now()
   WHERE b.id IN (
     SELECT p.id
       FROM public.beta_signups p
      WHERE p.open_mail_sent_at IS NULL
        AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE lower(u.email) = lower(p.email))
      ORDER BY p.created_at
      LIMIT GREATEST(1, LEAST(p_limit, 100))
      FOR UPDATE SKIP LOCKED
   )
  RETURNING b.id, b.email, b.full_name;
END;
$$;

REVOKE ALL ON FUNCTION public._claim_beta_open_mail_batch(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._claim_beta_open_mail_batch(integer) TO service_role;
