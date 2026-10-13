-- Tafels (2de leerjaar, wayfinder/second-grade/map.md, stap 2).
--
-- Het kind kiest zelf één tafel en oefent die. Een tafel is "gekend" (sticker)
-- na 3 keer uitgespeeld zonder fout; die drempel staat in de client
-- (TABLE_STICKER_RUNS), deze migratie bewaart alleen de beurten.
--
-- Bewust naast complete_exercise: die betaalt Munten, XP, beloningen en
-- badges per oefening uit en weet niet welke tafel het was. Een beurt hier
-- betaalt niets.

-- 1. Uitgespeelde beurten per tafel.
CREATE TABLE public.times_table_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  table_number integer NOT NULL CHECK (table_number BETWEEN 1 AND 10),
  mistakes integer NOT NULL CHECK (mistakes BETWEEN 0 AND 2),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_times_table_runs_child
  ON public.times_table_runs (child_id, table_number);

ALTER TABLE public.times_table_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can view child times table runs"
  ON public.times_table_runs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.children WHERE id = child_id AND parent_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all times table runs"
  ON public.times_table_runs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Geen INSERT-policy: schrijven gaat alleen via de functie hieronder.

-- 2. record_times_table_run: één uitgespeelde beurt bewaren.
-- Een game-over komt hier nooit: alleen een uitgespeelde beurt (1-3 hartjes).
CREATE OR REPLACE FUNCTION public.record_times_table_run(
  p_child_id uuid,
  p_table_number integer,
  p_mistakes integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_child children%ROWTYPE;
BEGIN
  SELECT * INTO v_child FROM children WHERE id = p_child_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Child not found'; END IF;

  IF NOT public._can_access_child(v_child) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Een gepauzeerd kind verdient niets, ook geen stickers.
  IF v_child.paused THEN
    RAISE EXCEPTION 'Child is paused';
  END IF;

  IF p_table_number IS NULL OR p_table_number NOT BETWEEN 1 AND 10 THEN
    RAISE EXCEPTION 'Invalid table';
  END IF;

  INSERT INTO times_table_runs (child_id, table_number, mistakes)
  VALUES (p_child_id, p_table_number, LEAST(GREATEST(COALESCE(p_mistakes, 0), 0), 2));
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.record_times_table_run(uuid, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_times_table_run(uuid, integer, integer) TO authenticated;

-- 3. child_times_tables: per tafel het aantal beurten en foutloze beurten.
-- SECURITY INVOKER: de RLS hierboven filtert al op de eigen kinderen.
CREATE OR REPLACE FUNCTION public.child_times_tables(p_child_id uuid)
RETURNS TABLE (
  table_number integer,
  runs integer,
  flawless_runs integer,
  last_run_at timestamptz
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT
    r.table_number,
    COUNT(*)::integer,
    COUNT(*) FILTER (WHERE r.mistakes = 0)::integer,
    MAX(r.created_at)
  FROM times_table_runs r
  WHERE r.child_id = p_child_id
  GROUP BY r.table_number;
$$;

REVOKE EXECUTE ON FUNCTION public.child_times_tables(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.child_times_tables(uuid) TO authenticated;

-- 4. De oefening Tafels voor het 2de leerjaar, één rij per trimester.
--    tables         = welke tafels het kind kan kiezen
--    divisionTables = bij welke tafels ook deelsommen komen (15 : 5)
WITH grade_2(route, stage, display_order, config) AS (
  VALUES
    ('/exercises/times-tables/1', 'stage-1', 45, '{"tables":[2,5,10],"divisionTables":[]}'::jsonb),
    ('/exercises/times-tables/2', 'stage-2', 45, '{"tables":[2,3,4,5,10],"divisionTables":[2,5,10]}'::jsonb),
    ('/exercises/times-tables/3', 'stage-3', 45, '{"tables":[1,2,3,4,5,6,7,8,9,10],"divisionTables":[1,2,3,4,5,6,7,8,9,10]}'::jsonb)
),
updated AS (
  UPDATE public.exercises e
     SET stage = g.stage,
         title = 'Tafels',
         subject = 'math',
         display_order = g.display_order,
         config = g.config,
         is_active = true
    FROM grade_2 g
   WHERE e.route = g.route
     AND e.grade = 2
  RETURNING e.route
)
INSERT INTO public.exercises (route, grade, stage, title, subject, display_order, xp_reward, is_active, config)
SELECT g.route, 2, g.stage, 'Tafels', 'math', g.display_order, 20, true, g.config
  FROM grade_2 g
 WHERE NOT EXISTS (
   SELECT 1 FROM public.exercises e WHERE e.route = g.route AND e.grade = 2
 );
