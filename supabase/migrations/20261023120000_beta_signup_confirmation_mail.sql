-- Wie zich via het formulier op de wachtlijst zet, krijgt één bevestigingsmail
-- (edge function beta-signup-confirmation, via Brevo). Deze kolom onthoudt dat
-- die mail vertrokken is, zodat de functie nooit twee keer naar hetzelfde adres
-- mailt. Bestaande inschrijvingen blijven NULL en krijgen achteraf niets.
-- Enkel de functie (service role) schrijft hem.

ALTER TABLE public.beta_signups
  ADD COLUMN IF NOT EXISTS confirmation_sent_at timestamptz;
