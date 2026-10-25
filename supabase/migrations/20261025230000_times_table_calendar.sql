-- Tafels per periode (2de leerjaar), plus tafels die de ouder zelf openzet.
--
-- Tot nu toe hing het van het trimester af welke tafels het kind kon kiezen
-- (exercises.config.tables / divisionTables). Nu opent elke maal- en deeltafel
-- op een vaste datum in het schooljaar (times_table_schedule). De ouder kan
-- in het ouderportaal (Leerstof → Tafels) een maal- en/of deeltafel vroeger
-- openzetten: children.extra_times_tables en children.extra_division_tables.
--   * child_times_table_access(child) = wat open staat, voor de oefening en
--     het ouderportaal.
--   * In september staat er nog geen tafel open: dan is de oefening Tafels
--     er niet (niet in Oefenen, niet als Wens, niet in Snel starten).
-- Een kind uit een hoger leerjaar (Herhalen) krijgt altijd alle tafels.
-- De kalender aanpassen = times_table_schedule opnieuw maken.

ALTER TABLE public.children
  ADD COLUMN IF NOT EXISTS extra_times_tables integer[] NOT NULL DEFAULT '{}'
    CHECK (extra_times_tables <@ '{1,2,3,4,5,6,7,8,9,10}'::integer[]),
  ADD COLUMN IF NOT EXISTS extra_division_tables integer[] NOT NULL DEFAULT '{}'
    CHECK (extra_division_tables <@ '{1,2,3,4,5,6,7,8,9,10}'::integer[]);

COMMENT ON COLUMN public.children.extra_times_tables IS
  'Maaltafels die de ouder vroeger openzette dan de kalender (times_table_schedule).';
COMMENT ON COLUMN public.children.extra_division_tables IS
  'Deeltafels die de ouder vroeger openzette dan de kalender (times_table_schedule).';

-- 1. De kalender: vanaf welke dag in het schooljaar een tafel open gaat.
--    kind = 'multiply' (maaltafel) of 'divide' (deeltafel).
CREATE OR REPLACE FUNCTION public.times_table_schedule()
RETURNS TABLE (table_number integer, kind text, from_month integer, from_day integer)
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  VALUES
    (10, 'multiply', 10, 1),  (2, 'multiply', 10, 1),
    (5, 'multiply', 11, 9),
    (10, 'divide', 1, 4),     (2, 'divide', 1, 4),     (5, 'divide', 1, 4),
    (4, 'multiply', 1, 25),
    (3, 'multiply', 3, 1),    (4, 'divide', 3, 1),     (3, 'divide', 3, 1),
    (6, 'multiply', 4, 20),   (8, 'multiply', 4, 20),  (6, 'divide', 4, 20),  (8, 'divide', 4, 20),
    (9, 'multiply', 5, 11),   (7, 'multiply', 5, 11),  (1, 'multiply', 5, 11),
    (9, 'divide', 5, 11),     (7, 'divide', 5, 11),    (1, 'divide', 5, 11)
$$;

GRANT EXECUTE ON FUNCTION public.times_table_schedule() TO authenticated;

-- Plaats van een dag in het schooljaar: september = 0, augustus = 11.
CREATE OR REPLACE FUNCTION public._school_year_key(p_month integer, p_day integer)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT ((p_month + 3) % 12) * 100 + p_day;
$$;

-- 2. Wat open staat voor een kind: de kalender plus wat de ouder openzette.
CREATE OR REPLACE FUNCTION public._child_open_times_tables(p_child children, OUT multiply integer[], OUT divide integer[])
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH today AS (
    SELECT (now() AT TIME ZONE 'Europe/Brussels')::date AS d
  ),
  open AS (
    SELECT s.table_number, s.kind
      FROM public.times_table_schedule() s, today
     WHERE p_child.grade > 2
        OR public._school_year_key(extract(month FROM today.d)::integer, extract(day FROM today.d)::integer)
           >= public._school_year_key(s.from_month, s.from_day)
    UNION
    SELECT unnest(p_child.extra_times_tables), 'multiply'
    UNION
    SELECT unnest(p_child.extra_division_tables), 'divide'
  )
  SELECT
    COALESCE((SELECT array_agg(DISTINCT table_number ORDER BY table_number) FROM open WHERE kind = 'multiply'), '{}'),
    COALESCE((SELECT array_agg(DISTINCT table_number ORDER BY table_number) FROM open WHERE kind = 'divide'), '{}');
$$;

REVOKE EXECUTE ON FUNCTION public._child_open_times_tables(children) FROM PUBLIC, authenticated, anon;

-- Voor de oefening en het ouderportaal.
CREATE OR REPLACE FUNCTION public.child_times_table_access(p_child_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_child children%ROWTYPE;
  v_open record;
BEGIN
  SELECT * INTO v_child FROM children WHERE id = p_child_id;
  IF NOT FOUND OR NOT public._can_access_child(v_child) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO v_open FROM public._child_open_times_tables(v_child);

  RETURN jsonb_build_object(
    'multiply', to_jsonb(v_open.multiply),
    'divide', to_jsonb(v_open.divide),
    'extra_multiply', to_jsonb(v_child.extra_times_tables),
    'extra_divide', to_jsonb(v_child.extra_division_tables),
    'schedule', (
      SELECT jsonb_agg(jsonb_build_object(
               'table', s.table_number, 'kind', s.kind, 'month', s.from_month, 'day', s.from_day))
        FROM public.times_table_schedule() s
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.child_times_table_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.child_times_table_access(uuid) TO authenticated;

-- 3. Kiesbare oefeningen: Tafels valt weg zolang er geen tafel open staat.
-- Verder ongewijzigd ten opzichte van 20261025120000_reading_themes.sql.
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
           public._child_reading_theme(ch) AS reading_theme,
           cardinality((public._child_open_times_tables(ch)).multiply)
             + cardinality((public._child_open_times_tables(ch)).divide) AS open_tables
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
       AND (public.exercise_type_key(e.route) <> '/exercises/times-tables' OR c.open_tables > 0)
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
