-- 3de kleuterklas (25 okt 2026): children.grade = 0.
--
-- Een kleuter ziet enkel oefeningen met exercises.grade = 0 (practice_menu
-- vergelijkt al c.grade = e.grade; Herhalen neemt e.grade < c.grade, voor een
-- kleuter dus niets). Er zijn nog geen kleuteroefeningen.
--
-- Schakelaar Test / Live, zoals bij oefeningen: in Test kan enkel een admin
-- een kind in de 3de kleuterklas zetten, en houden de Buddy-vormen hun huidige
-- namen. Live: elke ouder kan het kiezen, en de vormen schuiven een leerjaar op
-- (de kleuter begint bij Baby, het 6de leerjaar wordt Meester). Die namen
-- staan in de app (src/lib/buddy/growth.ts).
--
-- Groei: de groeistap blijft (leerjaar - 1) * 3 + trimester. Voor een kleuter
-- is dat -2, -1 of 0. Zo veranderen de bestaande stappen 1..18 niet.

-- =============================================
-- 1. De schakelaar
-- =============================================
CREATE TABLE public.kindergarten_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  mode text NOT NULL DEFAULT 'admins' CHECK (mode IN ('admins', 'all')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.kindergarten_settings (id) VALUES (true) ON CONFLICT DO NOTHING;

ALTER TABLE public.kindergarten_settings ENABLE ROW LEVEL SECURITY;

-- Iedereen die aangemeld is mag het lezen: de app toont de keuze en de
-- Buddy-namen volgens deze stand.
CREATE POLICY "Signed-in users can view kindergarten settings"
  ON public.kindergarten_settings FOR SELECT TO authenticated
  USING (true);

CREATE OR REPLACE FUNCTION public.admin_set_kindergarten_mode(p_mode text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_mode NOT IN ('admins', 'all') THEN
    RAISE EXCEPTION 'Invalid mode';
  END IF;
  UPDATE kindergarten_settings SET mode = p_mode, updated_at = now() WHERE id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_set_kindergarten_mode(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_kindergarten_mode(text) TO authenticated;

-- =============================================
-- 2. Wie mag een kind in de 3de kleuterklas zetten?
-- =============================================
-- Een kind dat al kleuter is, mag kleuter blijven (bv. als de schakelaar
-- terug op Test gaat). Zonder aangemelde gebruiker (service role) geen check.
CREATE OR REPLACE FUNCTION public._children_check_grade()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.grade < 0 OR NEW.grade > 6 THEN
    RAISE EXCEPTION 'Invalid grade';
  END IF;
  IF NEW.grade = 0
     AND (TG_OP = 'INSERT' OR OLD.grade IS DISTINCT FROM 0)
     AND auth.uid() IS NOT NULL
     AND NOT public.has_role(auth.uid(), 'admin')
     AND NOT EXISTS (SELECT 1 FROM kindergarten_settings WHERE id AND mode = 'all') THEN
    RAISE EXCEPTION 'Kindergarten not available';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS children_check_grade ON public.children;
CREATE TRIGGER children_check_grade
  BEFORE INSERT OR UPDATE OF grade ON public.children
  FOR EACH ROW EXECUTE FUNCTION public._children_check_grade();

-- =============================================
-- 3. Groei van de Buddy
-- =============================================
-- Groeistap -2..18: (leerjaar - 1) * 3 + trimester, leerjaar 0..6.
CREATE OR REPLACE FUNCTION public.buddy_growth_target(p_grade integer, p_day date)
RETURNS integer
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path TO 'public'
AS $$
  SELECT (LEAST(6, GREATEST(0, COALESCE(p_grade, 1))) - 1) * 3
    + CASE
        WHEN EXTRACT(MONTH FROM p_day) >= 9 THEN 1
        WHEN EXTRACT(MONTH FROM p_day) <= 3 THEN 2
        ELSE 3
      END;
$$;

-- Zelfde regel als in 20261001120000_buddy_centred_practice.sql. Enkel
-- afronden naar beneden (floor) in plaats van gehele deling: die rondt naar
-- nul af, waardoor de kleuterstappen -1 en 0 bij het 1ste leerjaar zouden
-- horen. Voor stappen 1..18 verandert er niets.
CREATE OR REPLACE FUNCTION public.buddy_next_growth(p_current integer, p_target integer)
RETURNS integer
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN floor((p_current - 1) / 3.0) = floor((p_target - 1) / 3.0) THEN GREATEST(p_current, p_target)
    ELSE p_target
  END;
$$;

COMMENT ON COLUMN public.buddy_states.growth_stage IS
  'Groeistap -2..18 = (leerjaar-1)*3 + trimester; -2..0 = 3de kleuterklas. Bijgewerkt door buddy_get_or_create.';
