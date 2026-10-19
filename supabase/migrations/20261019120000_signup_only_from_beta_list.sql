-- Tijdens de beta maakt enkel wie op de wachtlijst staat (beta_signups) een
-- account. Dat geldt voor registreren met e-mail en voor de eerste keer
-- inloggen met Google: beide maken een nieuwe rij in auth.users.
--
-- Bestaande accounts blijven werken: de controle loopt alleen bij een nieuw
-- account. Een e-mailadres wijzigen gaat er ook niet langs.
--
-- De app krijgt "not on beta list" (of na Google mogelijk "Database error
-- saving new user") en toont daarvoor een eigen tekst (mapAuthError,
-- AuthCallback).
--
-- De beta openzetten voor iedereen: DROP TRIGGER on_auth_user_created_beta_check ON auth.users;

CREATE OR REPLACE FUNCTION public.enforce_beta_signup_list()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
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

DROP TRIGGER IF EXISTS on_auth_user_created_beta_check ON auth.users;
CREATE TRIGGER on_auth_user_created_beta_check
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.enforce_beta_signup_list();
