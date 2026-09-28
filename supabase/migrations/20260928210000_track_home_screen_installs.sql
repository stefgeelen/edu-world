-- Measure whether the home-screen install onboarding actually works.
--
-- The app can tell at runtime whether it is running from the home screen or in
-- a browser tab, but nothing recorded it, so "how many families installed
-- Leapio" was unanswerable. Two columns, written by the existing activity ping:
--
--   installed_at        the first time we ever saw a standalone session
--   last_standalone_at  the most recent one
--
-- Both are needed. The first counts installs; the second tells you whether a
-- family still opens the app from the home screen or has drifted back to the
-- browser, which is the difference between an install and a habit.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS installed_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_standalone_at timestamptz;

COMMENT ON COLUMN public.profiles.installed_at IS
  'First session observed running from the home screen (display-mode standalone, or navigator.standalone on iOS).';
COMMENT ON COLUMN public.profiles.last_standalone_at IS
  'Most recent session observed running from the home screen.';

-- touch_activity gains a parameter. Postgres cannot add one in place, and
-- leaving both versions would make a one-argument call ambiguous, so drop
-- first. The live client keeps working across the change: PostgREST matches a
-- call by the argument names it supplies, and p_standalone has a default.
DROP FUNCTION IF EXISTS public.touch_activity(uuid);

CREATE OR REPLACE FUNCTION public.touch_activity(
  p_child_id uuid DEFAULT NULL,
  p_standalone boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.profiles
     SET last_seen_at = now()
   WHERE id = v_uid
     AND (last_seen_at IS NULL OR last_seen_at < now() - interval '5 minutes');

  -- The NULL check makes the very first standalone session always land, even
  -- though everything after it is throttled the same way as last_seen_at.
  IF p_standalone THEN
    UPDATE public.profiles
       SET installed_at = COALESCE(installed_at, now()),
           last_standalone_at = now()
     WHERE id = v_uid
       AND (last_standalone_at IS NULL OR last_standalone_at < now() - interval '5 minutes');
  END IF;

  IF p_child_id IS NOT NULL THEN
    UPDATE public.children
       SET last_opened_at = now()
     WHERE id = p_child_id
       AND parent_id = v_uid
       AND (last_opened_at IS NULL OR last_opened_at < now() - interval '5 minutes');
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.touch_activity(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.touch_activity(uuid, boolean) TO authenticated;


-- admin_engagement_stats, restated in full to add the 'install' block.
-- Postgres has no way to amend part of a function body; CREATE OR REPLACE
-- takes the whole definition. Unchanged from the previous migration apart
-- from that one key.

CREATE OR REPLACE FUNCTION public.admin_engagement_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_now timestamptz := now();
  v_result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin role required' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(

    'generated_at', v_now,

    'totals', jsonb_build_object(
      'accounts',             (SELECT count(*) FROM profiles),
      'children',             (SELECT count(*) FROM children),
      'attempts',             (SELECT count(*) FROM exercise_attempts),
      'active_subscriptions', (SELECT count(*) FROM subscriptions WHERE status IN ('active', 'trialing'))
    ),

    'new_signups', jsonb_build_object(
      'accounts_7d',  (SELECT count(*) FROM profiles WHERE created_at >= v_now - interval '7 days'),
      'accounts_30d', (SELECT count(*) FROM profiles WHERE created_at >= v_now - interval '30 days'),
      'children_7d',  (SELECT count(*) FROM children WHERE created_at >= v_now - interval '7 days')
    ),

    -- "Active" for a child means practised, not merely opened: a completed
    -- exercise is the only event that proves the product did its job.
    'active_children', jsonb_build_object(
      'd1',  (SELECT count(DISTINCT child_id) FROM exercise_attempts WHERE completed_at >= v_now - interval '1 day'),
      'd7',  (SELECT count(DISTINCT child_id) FROM exercise_attempts WHERE completed_at >= v_now - interval '7 days'),
      'd30', (SELECT count(DISTINCT child_id) FROM exercise_attempts WHERE completed_at >= v_now - interval '30 days')
    ),

    'active_accounts', jsonb_build_object(
      'd1',  (SELECT count(*) FROM profiles WHERE last_seen_at >= v_now - interval '1 day'),
      'd7',  (SELECT count(*) FROM profiles WHERE last_seen_at >= v_now - interval '7 days'),
      'd30', (SELECT count(*) FROM profiles WHERE last_seen_at >= v_now - interval '30 days')
    ),

    -- Home-screen adoption. installed counts families who ever opened Leapio
    -- from the home screen; standalone_7d counts those still doing so, which
    -- is the difference between an install and a habit.
    'install', jsonb_build_object(
      'accounts',      (SELECT count(*) FROM profiles),
      'installed',     (SELECT count(*) FROM profiles WHERE installed_at IS NOT NULL),
      'installed_7d',  (SELECT count(*) FROM profiles WHERE installed_at >= v_now - interval '7 days'),
      'standalone_7d', (SELECT count(*) FROM profiles WHERE last_standalone_at >= v_now - interval '7 days')
    ),

    -- The activation funnel: created -> opened -> practised. The gap between
    -- the last two is the single most useful number in the beta.
    'activation', jsonb_build_object(
      'children_total',   (SELECT count(*) FROM children),
      'children_opened',  (SELECT count(*) FROM children WHERE last_opened_at IS NOT NULL),
      'children_started', (SELECT count(DISTINCT child_id) FROM exercise_attempts),
      'children_never_started', (
        SELECT count(*) FROM children c
         WHERE NOT EXISTS (SELECT 1 FROM exercise_attempts ea WHERE ea.child_id = c.id)
      )
    ),

    'attempts', jsonb_build_object(
      'last_7d', (SELECT count(*) FROM exercise_attempts WHERE completed_at >= v_now - interval '7 days'),
      'prev_7d', (SELECT count(*) FROM exercise_attempts
                   WHERE completed_at >= v_now - interval '14 days'
                     AND completed_at <  v_now - interval '7 days')
    ),

    'daily', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
               'day',      d::date,
               'attempts', coalesce(a.attempts, 0),
               'children', coalesce(a.children, 0)
             ) ORDER BY d), '[]'::jsonb)
        FROM generate_series((v_now - interval '29 days')::date, v_now::date, interval '1 day') d
        LEFT JOIN (
          SELECT completed_at::date       AS day,
                 count(*)                 AS attempts,
                 count(DISTINCT child_id) AS children
            FROM exercise_attempts
           WHERE completed_at >= v_now - interval '30 days'
           GROUP BY 1
        ) a ON a.day = d::date
    ),

    -- Local time, because "do they practise after school or at the weekend"
    -- is a question about Flemish clocks, not UTC.
    'by_hour', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
               'hour',     h,
               'attempts', coalesce(x.attempts, 0)
             ) ORDER BY h), '[]'::jsonb)
        FROM generate_series(0, 23) h
        LEFT JOIN (
          SELECT extract(hour FROM completed_at AT TIME ZONE 'Europe/Brussels')::int AS hour,
                 count(*) AS attempts
            FROM exercise_attempts
           WHERE completed_at >= v_now - interval '30 days'
           GROUP BY 1
        ) x ON x.hour = h
    ),

    'retention', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
               'cohort',       to_char(week, 'IYYY-"W"IW'),
               'cohort_start', week::date,
               'size',         size,
               'w1', CASE WHEN v_now >= week + interval '14 days' THEN w1 END,
               'w2', CASE WHEN v_now >= week + interval '21 days' THEN w2 END,
               'w4', CASE WHEN v_now >= week + interval '35 days' THEN w4 END,
               'w6', CASE WHEN v_now >= week + interval '49 days' THEN w6 END
             ) ORDER BY week), '[]'::jsonb)
        FROM (
          SELECT date_trunc('week', c.created_at) AS week,
                 count(*)                         AS size,
                 count(*) FILTER (WHERE EXISTS (
                   SELECT 1 FROM exercise_attempts ea WHERE ea.child_id = c.id
                    AND ea.completed_at >= c.created_at
                    AND ea.completed_at <  c.created_at + interval '7 days')) AS w1,
                 count(*) FILTER (WHERE EXISTS (
                   SELECT 1 FROM exercise_attempts ea WHERE ea.child_id = c.id
                    AND ea.completed_at >= c.created_at + interval '7 days'
                    AND ea.completed_at <  c.created_at + interval '14 days')) AS w2,
                 count(*) FILTER (WHERE EXISTS (
                   SELECT 1 FROM exercise_attempts ea WHERE ea.child_id = c.id
                    AND ea.completed_at >= c.created_at + interval '21 days'
                    AND ea.completed_at <  c.created_at + interval '28 days')) AS w4,
                 count(*) FILTER (WHERE EXISTS (
                   SELECT 1 FROM exercise_attempts ea WHERE ea.child_id = c.id
                    AND ea.completed_at >= c.created_at + interval '35 days'
                    AND ea.completed_at <  c.created_at + interval '42 days')) AS w6
            FROM children c
           WHERE c.created_at >= v_now - interval '12 weeks'
           GROUP BY 1
        ) cohorts
    ),

    'top_exercises', (
      SELECT coalesce(jsonb_agg(t ORDER BY (t->>'attempts')::int DESC), '[]'::jsonb)
        FROM (
          SELECT jsonb_build_object(
                   'title',     e.title,
                   'subject',   e.subject::text,
                   'attempts',  count(*)::int,
                   'avg_stars', round(avg(ea.stars)::numeric, 2)
                 ) AS t
            FROM exercise_attempts ea
            JOIN exercises e ON e.id = ea.exercise_id
           WHERE ea.completed_at >= v_now - interval '30 days'
           GROUP BY e.id, e.title, e.subject
           ORDER BY count(*) DESC
           LIMIT 10
        ) t10
    ),

    -- Where children give up. An exercise with a high attempt count and a low
    -- average star score is one that is too hard, not one that is popular.
    'by_subject', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
               'subject',   subject,
               'attempts',  attempts,
               'avg_stars', avg_stars
             ) ORDER BY attempts DESC), '[]'::jsonb)
        FROM (
          SELECT e.subject::text AS subject,
                 count(*)::int   AS attempts,
                 round(avg(ea.stars)::numeric, 2) AS avg_stars
            FROM exercise_attempts ea
            JOIN exercises e ON e.id = ea.exercise_id
           WHERE ea.completed_at >= v_now - interval '30 days'
           GROUP BY e.subject
        ) s
    )

  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_engagement_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_engagement_stats() TO authenticated;
