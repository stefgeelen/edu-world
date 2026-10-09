-- Aandachtspunten in het ouderportaal: kijken naar moeite, niet naar score.
--
-- De oude regel (child_exercise_stats + "gemiddelde score < 65%") zag alleen
-- game-overs: een uitgespeelde oefening scoort altijd 100%, hoeveel fouten er
-- ook vielen. Bovendien werd een game-over in 9 van de 15 oefeningen nergens
-- bewaard, en een oefening die het kind halverwege sloot ook niet.
--
-- Nieuwe regel, per oefening over de laatste 10 pogingen:
--   * vlot        = uitgespeeld met 2 of 3 hartjes (stars 2..3)
--   * moeizaam    = uitgespeeld met 1 hartje (stars 1)
--   * game_over   = alle hartjes kwijt (stars 0, of een rij hieronder)
--   * abandoned   = zelf gestopt na minstens één antwoord
-- Welke oefeningen een aandachtspunt worden, beslist de client
-- (useChildInsights); deze functie levert alleen de tellingen.

-- 1. Pogingen die niet tot complete_exercise leiden.
--
-- Bewust een aparte tabel: complete_exercise betaalt Munten, XP, beloningen en
-- badges uit. Een gestopte of mislukte poging mag daar niets aan veranderen.
CREATE TABLE public.exercise_incomplete_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (reason IN ('game_over', 'abandoned')),
  progress_pct integer NOT NULL DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  mistakes integer NOT NULL DEFAULT 0 CHECK (mistakes BETWEEN 0 AND 3),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_exercise_incomplete_attempts_child
  ON public.exercise_incomplete_attempts (child_id, exercise_id, created_at DESC);

ALTER TABLE public.exercise_incomplete_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can view child incomplete attempts"
  ON public.exercise_incomplete_attempts FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.children WHERE id = child_id AND parent_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all incomplete attempts"
  ON public.exercise_incomplete_attempts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Geen INSERT-policy: schrijven gaat alleen via de functie hieronder.

-- 2. record_incomplete_exercise: één gestopte of mislukte poging bewaren.
CREATE OR REPLACE FUNCTION public.record_incomplete_exercise(
  p_child_id uuid,
  p_exercise_id uuid,
  p_reason text,
  p_progress_pct integer,
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

  INSERT INTO exercise_incomplete_attempts (child_id, exercise_id, reason, progress_pct, mistakes)
  VALUES (
    p_child_id,
    p_exercise_id,
    p_reason,
    LEAST(GREATEST(COALESCE(p_progress_pct, 0), 0), 100),
    LEAST(GREATEST(COALESCE(p_mistakes, 0), 0), 3)
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.record_incomplete_exercise(uuid, uuid, text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_incomplete_exercise(uuid, uuid, text, integer, integer) TO authenticated;

-- 3. child_exercise_insights: per oefening de uitkomst van de laatste 10 pogingen.
--
-- SECURITY INVOKER, net als child_exercise_stats: de RLS van beide tabellen
-- filtert al op de eigen kinderen van de ouder.
CREATE OR REPLACE FUNCTION public.child_exercise_insights(p_child_id uuid)
RETURNS TABLE (
  exercise_id uuid,
  tries integer,
  smooth integer,
  hard integer,
  game_over integer,
  abandoned integer,
  last_try_at timestamptz,
  title text,
  subject subject_type,
  stage text
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  WITH tries AS (
    SELECT
      ea.exercise_id,
      ea.completed_at AS at,
      CASE
        WHEN ea.stars <= 0 THEN 'game_over'
        WHEN ea.stars = 1 THEN 'hard'
        ELSE 'smooth'
      END AS outcome
    FROM exercise_attempts ea
    WHERE ea.child_id = p_child_id
    UNION ALL
    SELECT ia.exercise_id, ia.created_at, ia.reason
    FROM exercise_incomplete_attempts ia
    WHERE ia.child_id = p_child_id
  ),
  recent AS (
    SELECT t.*, row_number() OVER (PARTITION BY t.exercise_id ORDER BY t.at DESC) AS rn
    FROM tries t
  )
  SELECT
    r.exercise_id,
    COUNT(*)::integer,
    COUNT(*) FILTER (WHERE r.outcome = 'smooth')::integer,
    COUNT(*) FILTER (WHERE r.outcome = 'hard')::integer,
    COUNT(*) FILTER (WHERE r.outcome = 'game_over')::integer,
    COUNT(*) FILTER (WHERE r.outcome = 'abandoned')::integer,
    MAX(r.at),
    e.title,
    e.subject,
    e.stage
  FROM recent r
  JOIN exercises e ON e.id = r.exercise_id
  WHERE r.rn <= 10
  GROUP BY r.exercise_id, e.title, e.subject, e.stage;
$$;
