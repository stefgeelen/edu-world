-- Lezen per thema (1ste leerjaar). Afspraken: docs/lezen-per-thema.md.
--
-- Het leesjaar van het 1ste leerjaar heeft 10 leesthema's. Per thema komen er
-- letters bij; de leesoefeningen gebruiken alleen wat het kind al kent.
--   * children.reading_theme  = het thema dat de ouder koos, of NULL: dan
--     volgt het de kalender (reading_theme_for_date).
--   * exercises.from_reading_theme = een oefening die pas vanaf dat thema
--     past. Voor een kind van het 1ste leerjaar in een lager thema bestaat ze
--     niet: niet in Oefenen, niet als Wens, niet in Snel starten.
--     Zulke oefeningen tellen niet mee om een trimester te openen: ze
--     verschijnen op een moment dat het kind niet zelf kiest, en mogen dan
--     geen trimester terug dichtzetten.
--   * child_reading_theme(child) = wat de app toont en gebruikt.
-- Andere leerjaren (en Herhalen) krijgen thema 10: alles.
--
-- Plus de nieuwe oefening Woordenmaker, in test (admin_only).
-- Verder ongewijzigd ten opzichte van 20261014180000_admin_test_exercises.sql.

ALTER TABLE public.children
  ADD COLUMN IF NOT EXISTS reading_theme smallint
    CHECK (reading_theme BETWEEN 1 AND 10);

COMMENT ON COLUMN public.children.reading_theme IS
  'Leesthema (1..10) dat de ouder koos. NULL = volgt de kalender (reading_theme_for_date).';

ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS from_reading_theme smallint
    CHECK (from_reading_theme BETWEEN 1 AND 10);

COMMENT ON COLUMN public.exercises.from_reading_theme IS
  'Pas zichtbaar voor een kind van het 1ste leerjaar vanaf dit leesthema. Telt niet mee om een trimester te openen.';

-- 1. Het thema volgens de kalender. Schatting rond de schoolvakanties; zelfde
-- datums als calendarReadingTheme in src/data/readingThemes.ts.
CREATE OR REPLACE FUNCTION public.reading_theme_for_date(p_day date)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN md >= '09-01' AND md < '09-28' THEN 1
    WHEN md >= '09-28' AND md < '11-09' THEN 2
    WHEN md >= '11-09' AND md < '12-07' THEN 3
    WHEN md >= '12-07' OR md < '01-04' THEN 4
    WHEN md < '01-25' THEN 5
    WHEN md < '03-01' THEN 6
    WHEN md < '04-20' THEN 7
    WHEN md < '05-11' THEN 8
    WHEN md < '06-01' THEN 9
    ELSE 10
  END
  FROM (SELECT to_char(p_day, 'MM-DD') AS md) d;
$$;

GRANT EXECUTE ON FUNCTION public.reading_theme_for_date(date) TO authenticated;

-- 2. Het thema van een kind: enkel het 1ste leerjaar volgt de thema's.
CREATE OR REPLACE FUNCTION public._child_reading_theme(p_child children)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN p_child.grade = 1 THEN COALESCE(
      p_child.reading_theme::integer,
      public.reading_theme_for_date((now() AT TIME ZONE 'Europe/Brussels')::date)
    )
    ELSE 10
  END;
$$;

REVOKE EXECUTE ON FUNCTION public._child_reading_theme(children) FROM PUBLIC, authenticated, anon;

-- Voor de app (oefeningen) en het ouderportaal.
CREATE OR REPLACE FUNCTION public.child_reading_theme(p_child_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_child children%ROWTYPE;
BEGIN
  SELECT * INTO v_child FROM children WHERE id = p_child_id;
  IF NOT FOUND OR NOT public._can_access_child(v_child) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN jsonb_build_object(
    'theme', public._child_reading_theme(v_child),
    'calendar_theme', public.reading_theme_for_date((now() AT TIME ZONE 'Europe/Brussels')::date),
    'chosen_theme', v_child.reading_theme
  );
END;
$$;

REVOKE ALL ON FUNCTION public.child_reading_theme(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.child_reading_theme(uuid) TO authenticated;

-- 3. Kiesbare oefeningen: een oefening met een later leesthema valt weg, en
-- telt niet mee om een trimester te openen.
CREATE OR REPLACE FUNCTION public._child_practice_options(p_child_id uuid)
RETURNS TABLE (
  type_key text,
  exercise_id uuid,
  title text,
  subject subject_type,
  route text,
  stage_num integer,
  display_order integer,
  admin_only boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH child AS (
    SELECT ch.grade, COALESCE(ch.max_unlocked_stage, 1) AS max_unlocked,
           public._child_reading_theme(ch) AS reading_theme
      FROM children ch WHERE ch.id = p_child_id
  ),
  ex AS (
    SELECT e.id, e.title, e.subject, e.route, e.display_order, e.admin_only,
           e.from_reading_theme,
           NULLIF(regexp_replace(e.stage, '[^0-9]', '', 'g'), '')::integer AS stage_num
      FROM exercises e
      JOIN child c ON c.grade = e.grade
     WHERE e.is_active
       AND public._can_see_exercise(e.admin_only)
       AND (e.from_reading_theme IS NULL OR c.reading_theme >= e.from_reading_theme)
  ),
  counts AS (
    SELECT ea.exercise_id, count(*) AS n
      FROM exercise_attempts ea
     WHERE ea.child_id = p_child_id
     GROUP BY ea.exercise_id
  ),
  stages AS (
    SELECT s.n AS stage_num,
           count(ex.id) AS total,
           count(ex.id) FILTER (WHERE COALESCE(ct.n, 0) >= 5) AS mastered
      FROM generate_series(1, 3) AS s(n)
      LEFT JOIN ex ON ex.stage_num = s.n AND ex.from_reading_theme IS NULL
      LEFT JOIN counts ct ON ct.exercise_id = ex.id
     GROUP BY s.n
  ),
  open_until AS (
    SELECT GREATEST(
      (SELECT max_unlocked FROM child),
      COALESCE((SELECT min(stage_num) FROM stages WHERE NOT (total > 0 AND mastered >= total)), 3)
    ) AS max_stage
  )
  SELECT DISTINCT ON (public.exercise_type_key(ex.route))
         public.exercise_type_key(ex.route),
         ex.id, ex.title, ex.subject, ex.route, ex.stage_num, ex.display_order, ex.admin_only
    FROM ex, open_until
   WHERE ex.stage_num BETWEEN 1 AND open_until.max_stage
   ORDER BY public.exercise_type_key(ex.route), ex.stage_num DESC;
$$;

REVOKE EXECUTE ON FUNCTION public._child_practice_options(uuid) FROM PUBLIC, authenticated, anon;

-- 4. Vanaf welk thema de leesoefeningen van het 1ste leerjaar passen.
--    Prent & Woord: thema 3, want er zijn nog maar prenten voor een paar
--    woorden van thema 1 en 2. Zinnendokter: thema 5, de eerste zinnetjes.
UPDATE public.exercises SET from_reading_theme = 3
 WHERE grade = 1 AND route LIKE '/exercises/picture-word/%';
UPDATE public.exercises SET from_reading_theme = 5
 WHERE grade = 1 AND route LIKE '/exercises/sentence-doctor/%';

-- 5. Nieuwe oefening Woordenmaker (1ste leerjaar), in test. Het kind hoort
-- een woord en zet de juiste beginletter voor het stukje dat er al staat.
-- Vanaf thema 1; telt daardoor niet mee om een trimester te openen.
-- Herhaalbaar: een rij die al bestaat wordt bijgewerkt in plaats van verdubbeld.
WITH grade_1(route, stage) AS (
  VALUES
    ('/exercises/word-maker/1', 'stage-1'),
    ('/exercises/word-maker/2', 'stage-2'),
    ('/exercises/word-maker/3', 'stage-3')
),
updated AS (
  UPDATE public.exercises e
     SET stage = g.stage,
         title = 'Woordenmaker',
         subject = 'reading',
         from_reading_theme = 1
    FROM grade_1 g
   WHERE e.route = g.route
     AND e.grade = 1
  RETURNING e.route
)
INSERT INTO public.exercises (route, grade, stage, title, subject, display_order, xp_reward, is_active, config, admin_only, from_reading_theme)
SELECT g.route, 1, g.stage, 'Woordenmaker', 'reading', 15, 20, true, '{}'::jsonb, true, 1
  FROM grade_1 g
 WHERE NOT EXISTS (
   SELECT 1 FROM public.exercises e WHERE e.route = g.route AND e.grade = 1
 );
