-- "Wat ziet een kind?" in Admin → Oefeningen: welke tegels een denkbeeldig
-- kind krijgt, voor een leerjaar, het hoogste open trimester, een dag en
-- (1ste leerjaar) een leesthema. Enkel voor admins; leest alleen.
--
-- Zelfde regels als _child_practice_options en _child_review_options
-- (20261025230000_times_table_calendar.sql, 20261014180000_admin_test_exercises.sql),
-- maar met de keuzes van de admin in plaats van een echt kind:
--   * per oefentype de rij van het hoogste trimester tot en met p_open_stage;
--     een kind komt daar door elke oefening van zijn trimester 5 keer te doen,
--     of doordat de ouder het opent (children.max_unlocked_stage);
--   * leesthema: 1ste leerjaar volgt de kalender van p_day, of p_reading_theme;
--     andere leerjaren krijgen thema 10;
--   * Tafels enkel als er op p_day een tafel open is (kalender, 3de leerjaar
--     en hoger alles); de extra tafels die een ouder opent, tellen hier niet;
--   * testoefeningen (admin_only) komen mee, gemarkeerd: een admin ziet ze.
-- Daarnaast: welke actieve oefentypes er (nog) niet bij zijn, en waarom.
-- Verandert een van die regels, pas dan ook deze functie aan.

CREATE OR REPLACE FUNCTION public.admin_preview_practice(
  p_grade integer,
  p_open_stage integer,
  p_day date DEFAULT NULL,
  p_reading_theme integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_day date := COALESCE(p_day, (now() AT TIME ZONE 'Europe/Brussels')::date);
  v_stage integer := LEAST(GREATEST(COALESCE(p_open_stage, 1), 1), 3);
  v_theme integer;
  v_multiply integer[];
  v_divide integer[];
  v_practice jsonb;
  v_hidden jsonb;
  v_review jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  v_theme := CASE
    WHEN p_grade = 1 THEN LEAST(GREATEST(COALESCE(p_reading_theme, public.reading_theme_for_date(v_day)), 1), 10)
    ELSE 10
  END;

  WITH open AS (
    SELECT s.table_number, s.kind
      FROM public.times_table_schedule() s
     WHERE p_grade > 2
        OR public._school_year_key(extract(month FROM v_day)::integer, extract(day FROM v_day)::integer)
           >= public._school_year_key(s.from_month, s.from_day)
  )
  SELECT
    COALESCE((SELECT array_agg(DISTINCT table_number ORDER BY table_number) FROM open WHERE kind = 'multiply'), '{}'),
    COALESCE((SELECT array_agg(DISTINCT table_number ORDER BY table_number) FROM open WHERE kind = 'divide'), '{}')
    INTO v_multiply, v_divide;

  -- Tegels onder Oefenen.
  WITH ex AS (
    SELECT e.*, public.exercise_type_key(e.route) AS type_key,
           NULLIF(regexp_replace(e.stage, '[^0-9]', '', 'g'), '')::integer AS stage_num
      FROM exercises e
     WHERE e.is_active
       AND e.grade = p_grade
  ),
  shown AS (
    SELECT DISTINCT ON (ex.type_key) ex.*
      FROM ex
     WHERE (ex.from_reading_theme IS NULL OR v_theme >= ex.from_reading_theme)
       AND (ex.type_key <> '/exercises/times-tables' OR cardinality(v_multiply) + cardinality(v_divide) > 0)
       AND ex.stage_num BETWEEN 1 AND v_stage
     ORDER BY ex.type_key, ex.stage_num DESC
  ),
  hidden AS (
    SELECT ex.type_key,
           (array_agg(ex.title ORDER BY ex.stage_num))[1] AS title,
           (array_agg(ex.subject ORDER BY ex.stage_num))[1] AS subject,
           min(ex.display_order) AS display_order,
           CASE
             WHEN ex.type_key = '/exercises/times-tables'
                  AND cardinality(v_multiply) + cardinality(v_divide) = 0 THEN 'times_tables'
             WHEN bool_and(ex.from_reading_theme IS NOT NULL AND v_theme < ex.from_reading_theme) THEN 'reading_theme'
             ELSE 'stage'
           END AS reason,
           min(ex.from_reading_theme) AS from_reading_theme,
           min(ex.stage_num) AS first_stage
      FROM ex
     WHERE ex.type_key NOT IN (SELECT type_key FROM shown)
     GROUP BY ex.type_key
  )
  SELECT
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'type_key', s.type_key, 'title', s.title, 'subject', s.subject, 'route', s.route,
               'stage_num', s.stage_num, 'admin_only', s.admin_only, 'config', s.config
             ) ORDER BY s.subject, s.display_order, s.title)
        FROM shown s
    ), '[]'::jsonb),
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'type_key', h.type_key, 'title', h.title, 'subject', h.subject, 'reason', h.reason,
               'from_reading_theme', h.from_reading_theme, 'first_stage', h.first_stage
             ) ORDER BY h.subject, h.display_order, h.title)
        FROM hidden h
    ), '[]'::jsonb)
    INTO v_practice, v_hidden;

  -- Herhalen: oefeningen van vorige leerjaren, per type de laatste versie.
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'type_key', r.type_key, 'title', r.title, 'subject', r.subject, 'route', r.route,
           'grade', r.grade, 'admin_only', r.admin_only, 'config', r.config
         ) ORDER BY r.subject, r.display_order, r.title), '[]'::jsonb)
    INTO v_review
    FROM (
      SELECT DISTINCT ON (public.exercise_type_key(e.route))
             public.exercise_type_key(e.route) AS type_key,
             e.title, e.subject, e.route, e.grade, e.admin_only, e.config, e.display_order
        FROM exercises e
       WHERE e.is_active
         AND e.grade < p_grade
       ORDER BY public.exercise_type_key(e.route),
                e.grade DESC,
                NULLIF(regexp_replace(e.stage, '[^0-9]', '', 'g'), '')::integer DESC NULLS LAST
    ) r;

  RETURN jsonb_build_object(
    'day', v_day,
    'grade', p_grade,
    'open_stage', v_stage,
    'reading_theme', CASE WHEN p_grade = 1 THEN v_theme END,
    'times_tables', jsonb_build_object('multiply', to_jsonb(v_multiply), 'divide', to_jsonb(v_divide)),
    'practice', v_practice,
    'hidden', v_hidden,
    'review', v_review
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_preview_practice(integer, integer, date, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_preview_practice(integer, integer, date, integer) TO authenticated;
