-- Admins kunnen iemand van de wachtlijst halen (Admin → Beta, "Verwijder").
-- Wie van de lijst gaat, kan tijdens de beta geen nieuw account meer maken
-- (20261019120000_signup_only_from_beta_list.sql); een bestaand account blijft.

DROP POLICY IF EXISTS "Admins can delete beta signups" ON public.beta_signups;
CREATE POLICY "Admins can delete beta signups"
  ON public.beta_signups FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
