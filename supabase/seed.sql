-- Testdata voor de LOKALE database (Docker, `supabase start`).
-- Draait alleen bij `supabase db reset` op deze computer (en in de CI-job voor
-- de flowtests). Nooit op productie: `supabase db push` neemt seed.sql niet mee.
--
-- Houd dit klein: elke flowtest maakt zijn eigen ouder en kinderen aan, met een
-- uniek e-mailadres, zodat tests elkaar niet storen.

-- Registratie open: flowtests mogen een nieuw account aanmaken zonder wachtlijst.
UPDATE public.registration_settings SET open = true, updated_at = now() WHERE id = true;

-- Badges: staan in productie, maar in geen enkele migratie (ooit via het
-- dashboard aangemaakt). Zonder deze rijen faalt complete_exercise lokaal op de
-- foreign key child_badges → badges. Bron: src/data/badges.ts.
INSERT INTO public.badges (id, name, description, requirement, icon, gradient_from, gradient_to, max_progress) VALUES
  ('first-steps', 'Eerste Stappen', 'Begin je leeravontuur!', 'Los je eerste vraag op', 'Sparkles', '#fbbf24', '#f59e0b', 1),
  ('fire-streak', 'Vijf Dagen Trouw', 'Hou de vlammen brandend!', 'Oefen 5 dagen op rij', 'Flame', '#f97316', '#ea580c', 5),
  ('perfect', 'Perfect!', 'Onberispelijke prestatie!', 'Haal 10 vragen perfect achter elkaar', 'Star', '#a855f7', '#9333ea', 10),
  ('goal-oriented', 'Doelgericht', 'Je bent goed op weg!', 'Maak 50 oefeningen', 'Target', '#3b82f6', '#2563eb', 50),
  ('champion', 'Kampioen', 'Meester van de groep!', 'Voltooi alle oefeningen van 1 groep', 'Trophy', '#f59e0b', '#d97706', 6),
  ('book-master', 'Boekenmeester', 'Kennis is kracht!', 'Voltooi 20 lessen', 'BookOpen', '#14b8a6', '#0d9488', 20),
  ('speed', 'Snelheid', 'Bliksem snel!', 'Los 5 vragen in 30 seconden op', 'Zap', '#eab308', '#ca8a04', 5),
  ('collector', 'Verzamelaar', 'Badge jager!', 'Verdien 5 verschillende badges', 'Award', '#ec4899', '#db2777', 5),
  ('rainbow', 'Regenboog', 'Vrienden verzamelaar!', 'Speel met alle 5 karakters', 'Heart', '#f43f5e', '#e11d48', 5),
  ('legend', 'Legende', 'Ongeëvenaard meesterschap!', 'Maak 500 oefeningen', 'Crown', '#6366f1', '#4f46e5', 500)
ON CONFLICT (id) DO NOTHING;
