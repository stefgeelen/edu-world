-- 1. child_exercise_stats: aggregate attempts server-side.
--
-- useStageExercises, useStageMastery and useChildInsights each selected every
-- row a child has ever produced in exercise_attempts (no limit, no window) and
-- aggregated in JavaScript. That payload grows for the life of the account and
-- is re-downloaded on every stage-screen visit.
--
-- Deliberately SECURITY INVOKER (the default): exercise_attempts already has a
-- parent-scoped SELECT policy and exercises is readable by any authenticated
-- user, so the caller's own RLS does the filtering. No hand-written ownership
-- check to keep in sync, and no way for it to return another parent's rows.
CREATE OR REPLACE FUNCTION public.child_exercise_stats(p_child_id uuid)
RETURNS TABLE (
  exercise_id uuid,
  attempt_count integer,
  best_stars integer,
  avg_score_pct numeric,
  title text,
  subject subject_type,
  stage text
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT
    ea.exercise_id,
    COUNT(*)::integer,
    COALESCE(MAX(ea.stars), 0)::integer,
    AVG(CASE WHEN ea.max_score > 0 THEN ea.score::numeric / ea.max_score ELSE 0 END),
    e.title,
    e.subject,
    e.stage
  FROM exercise_attempts ea
  JOIN exercises e ON e.id = ea.exercise_id
  WHERE ea.child_id = p_child_id
  GROUP BY ea.exercise_id, e.title, e.subject, e.stage;
$$;

-- 2. Statement timeout.
--
-- No [db] config or timeout was set anywhere, so a blocked or pathological
-- query could hold a connection indefinitely. 15s is far above any normal query
-- here (the heaviest, complete_exercise, is a handful of indexed writes) while
-- still capping a runaway. Tune with ALTER ROLE if a legitimate query ever
-- needs longer.
ALTER ROLE authenticated SET statement_timeout = '15s';
ALTER ROLE anon SET statement_timeout = '15s';
