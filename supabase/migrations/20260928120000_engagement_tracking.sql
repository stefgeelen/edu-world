-- Engagement tracking: who is still actually using Leapio.
--
-- Before this migration the only usage signal in the database was
-- `children.last_active_date`, set by complete_exercise. That answers "when did
-- this child last FINISH an exercise" and nothing else. It cannot tell an
-- account that never came back from one that opens the app daily but stalls
-- before the first question, which is exactly the distinction the beta has to
-- measure.
--
-- Two columns and two functions close that:
--   profiles.last_seen_at   — the account had the app open
--   children.last_opened_at — this child had the app open
--   touch_activity()        — what writes them, throttled
--   admin_engagement_stats() — one server-side aggregate for the admin screen

-- 1. Columns -----------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

ALTER TABLE public.children
  ADD COLUMN IF NOT EXISTS last_opened_at timestamptz;

COMMENT ON COLUMN public.profiles.last_seen_at IS
  'Last time this account had the app open (throttled to one write per 5 min by touch_activity).';
COMMENT ON COLUMN public.children.last_opened_at IS
  'Last time this child had the app open. Distinct from last_active_date, which only moves when an exercise is completed.';

-- Backfill so the admin screen is not blank on day one. Supabase already tracks
-- sign-ins in auth.users; that is a weaker signal than last_seen_at (a session
-- persists for months without a fresh sign-in) but it is real history.
UPDATE public.profiles p
   SET last_seen_at = u.last_sign_in_at
  FROM auth.users u
 WHERE u.id = p.id
   AND p.last_seen_at IS NULL
   AND u.last_sign_in_at IS NOT NULL;

UPDATE public.children
   SET last_opened_at = last_active_date::timestamptz
 WHERE last_opened_at IS NULL
   AND last_active_date IS NOT NULL;

-- 2. Indexes -----------------------------------------------------------------
--
-- admin_engagement_stats scans exercise_attempts by date window and by child.
-- Without these the 30-day series and the retention cohorts are sequential
-- scans over the whole attempts table on every admin page load.

CREATE INDEX IF NOT EXISTS idx_exercise_attempts_completed_at
  ON public.exercise_attempts (completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_exercise_attempts_child_completed
  ON public.exercise_attempts (child_id, completed_at);

CREATE INDEX IF NOT EXISTS idx_profiles_last_seen_at
  ON public.profiles (last_seen_at DESC NULLS LAST);

-- 3. touch_activity ----------------------------------------------------------
--
-- SECURITY DEFINER because the child update must be ownership-checked here
-- rather than trusted from the client. The 5-minute guard in the WHERE clause
-- means a child hammering the app for an hour produces at most 12 writes, and
-- a no-op UPDATE that matches no row costs nothing.
--
-- Silent no-op when unauthenticated: this is telemetry on a best-effort path
-- and must never surface an error to a six-year-old mid-exercise.

CREATE OR REPLACE FUNCTION public.touch_activity(p_child_id uuid DEFAULT NULL)
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

  IF p_child_id IS NOT NULL THEN
    UPDATE public.children
       SET last_opened_at = now()
     WHERE id = p_child_id
       AND parent_id = v_uid
       AND (last_opened_at IS NULL OR last_opened_at < now() - interval '5 minutes');
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.touch_activity(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.touch_activity(uuid) TO authenticated;

-- 4. admin_engagement_stats --------------------------------------------------
--
-- One call, one JSON payload, all aggregation server-side. The admin stats
-- screen previously issued four table counts and derived everything else in the
-- browser; anything richer than that (a 30-day series, retention cohorts) would
-- have meant downloading every attempt row in the database.
--
-- SECURITY DEFINER with an explicit has_role gate: the function reads across
-- every parent's data, so it must not rely on the caller's RLS.
--
-- Retention buckets are relative to each child's own created_at:
--   w1 = days 0-6, w2 = days 7-13, w4 = days 21-27, w6 = days 35-41
-- A bucket returns NULL until every child in that cohort week has had the
-- chance to complete it, so a half-finished week reads as "—" and not as a
-- collapse in retention.

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
