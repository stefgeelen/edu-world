-- complete_exercise: add the missing caller-ownership guard, and cut the number
-- of sequential statements per completion without changing any behaviour.
--
-- 1. AUTHORIZATION (critical). The function is SECURITY DEFINER and takes
--    p_child_id straight from the client, but never verified the caller owns
--    that child — any authenticated user could award XP/streak/badges/rewards/
--    Munten to any child id. The guard mirrors the existing access rules on
--    public.children exactly: the parent, or a member of the child's
--    organisation (org-owned children can have parent_id IS NULL, so a
--    parent-only check would lock them out).
--
-- 2. STATEMENT COUNT. Per completion this did 16-18 sequential writes. Two
--    behaviour-preserving consolidations bring that down:
--      - the two UPDATEs on children (xp/streak, then level) become one, with
--        the level computed inline. FLOOR(new_xp / 1000) + 1 is algebraically
--        identical to the previous `WHILE xp >= level * 1000` loop, and
--        GREATEST(level, ...) keeps a level from ever going backwards.
--      - the four absolute-value badge upserts (goal-oriented, book-master,
--        legend, fire-streak) become one multi-row upsert. The two
--        increment-by-one badges (perfect, speed) stay separate: their
--        ON CONFLICT expression reads the existing row rather than the
--        incoming value, which a shared statement can't express.
--    The remaining per-completion work (attempt, progress, trimester, rewards,
--    buddy) is unchanged. Decomposing those into an async path is deliberately
--    NOT done here — it would make badge unlocks eventually-consistent and
--    change what a child sees right after finishing an exercise.

CREATE OR REPLACE FUNCTION public.complete_exercise(p_child_id uuid, p_exercise_id uuid, p_score integer, p_max_score integer, p_stars integer, p_time_spent integer, p_answers jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_exercise exercises%ROWTYPE;
  v_child children%ROWTYPE;
  v_trimester_number integer;
  v_all_completed boolean;
  v_attempt_id uuid;
  v_completed_rewards jsonb := '[]'::jsonb;
  v_total_xp integer;
  v_total_exercises integer;
  v_child_level integer;
  v_new_streak integer;
  v_today date := (now() AT TIME ZONE 'Europe/Amsterdam')::date;
  v_leveled_up boolean := false;
  v_munten_total integer;
BEGIN
  SELECT * INTO v_exercise FROM exercises WHERE id = p_exercise_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Exercise not found'; END IF;

  SELECT * INTO v_child FROM children WHERE id = p_child_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Child not found'; END IF;

  -- Caller must be this child's parent, or a member of its organisation.
  -- Mirrors the "Parents can update own children" / "Org members can view org
  -- children" policies on public.children.
  IF NOT (
    v_child.parent_id = auth.uid()
    OR (
      v_child.organization_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_members.organization_id = v_child.organization_id
          AND organization_members.user_id = auth.uid()
      )
    )
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF v_child.last_active_date IS NULL THEN
    v_new_streak := 1;
  ELSIF v_child.last_active_date = v_today THEN
    v_new_streak := GREATEST(v_child.streak, 1);
  ELSIF v_child.last_active_date = v_today - 1 THEN
    v_new_streak := COALESCE(v_child.streak, 0) + 1;
  ELSE
    v_new_streak := 1;
  END IF;

  INSERT INTO exercise_attempts (child_id, exercise_id, score, max_score, stars, time_spent_seconds, answers)
  VALUES (p_child_id, p_exercise_id, p_score, p_max_score, p_stars, p_time_spent, p_answers)
  RETURNING id INTO v_attempt_id;

  INSERT INTO child_progress (child_id, subject, total_xp, exercises_completed, average_score, total_time_seconds)
  VALUES (
    p_child_id, v_exercise.subject, v_exercise.xp_reward, 1,
    p_score::numeric / NULLIF(p_max_score, 0), p_time_spent
  )
  ON CONFLICT (child_id, subject) DO UPDATE SET
    total_xp = child_progress.total_xp + v_exercise.xp_reward,
    exercises_completed = child_progress.exercises_completed + 1,
    average_score = (
      (child_progress.average_score * child_progress.exercises_completed + p_score::numeric / NULLIF(p_max_score, 0))
      / (child_progress.exercises_completed + 1)
    ),
    total_time_seconds = child_progress.total_time_seconds + p_time_spent,
    updated_at = now();

  -- xp/streak/last_active_date/level in a single statement. `xp` on the right
  -- hand side is the pre-update value, so (xp + reward) is the new total.
  UPDATE children
  SET xp = xp + v_exercise.xp_reward,
      streak = v_new_streak,
      last_active_date = v_today,
      level = GREATEST(level, FLOOR((xp + v_exercise.xp_reward) / 1000.0)::integer + 1),
      updated_at = now()
  WHERE id = p_child_id
  RETURNING xp, level INTO v_total_xp, v_child_level;

  v_leveled_up := v_child_level > v_child.level;

  v_trimester_number := COALESCE(
    NULLIF(regexp_replace(v_exercise.stage, '[^0-9]', '', 'g'), '')::integer, 1
  );
  IF v_trimester_number < 1 OR v_trimester_number > 3 THEN v_trimester_number := 1; END IF;

  INSERT INTO trimester_progress (child_id, grade_level, trimester_number, xp_earned)
  VALUES (p_child_id, v_child.grade, v_trimester_number, v_exercise.xp_reward)
  ON CONFLICT (child_id, grade_level, trimester_number) DO UPDATE SET
    xp_earned = trimester_progress.xp_earned + v_exercise.xp_reward,
    is_completed = CASE
      WHEN (trimester_progress.xp_earned + v_exercise.xp_reward) >= trimester_progress.xp_threshold
      THEN true ELSE trimester_progress.is_completed END,
    completed_at = CASE
      WHEN (trimester_progress.xp_earned + v_exercise.xp_reward) >= trimester_progress.xp_threshold
        AND NOT trimester_progress.is_completed THEN now()
      ELSE trimester_progress.completed_at END,
    updated_at = now();

  SELECT NOT EXISTS (
    SELECT 1 FROM generate_series(1, 3) AS t(n)
    WHERE NOT EXISTS (
      SELECT 1 FROM trimester_progress tp
      WHERE tp.child_id = p_child_id
        AND tp.grade_level = v_child.grade
        AND tp.trimester_number = t.n
        AND tp.is_completed = true
    )
  ) INTO v_all_completed;

  IF v_all_completed THEN
    UPDATE children SET pending_promotion = true, updated_at = now() WHERE id = p_child_id;
  END IF;

  UPDATE rewards SET
    current_progress = current_progress + 1,
    is_completed = CASE WHEN current_progress + 1 >= required_exercises THEN true ELSE false END,
    completed_at = CASE WHEN current_progress + 1 >= required_exercises AND NOT is_completed THEN now() ELSE completed_at END,
    updated_at = now()
  WHERE child_id = p_child_id AND subject = v_exercise.subject AND is_completed = false;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', r.id, 'title', r.title)), '[]'::jsonb)
  INTO v_completed_rewards
  FROM rewards r
  WHERE r.child_id = p_child_id AND r.is_completed = true
    AND r.completed_at >= now() - interval '5 seconds';

  SELECT COALESCE(SUM(exercises_completed), 0) INTO v_total_exercises
  FROM child_progress WHERE child_id = p_child_id;

  -- Awarded once, never recalculated.
  INSERT INTO child_badges (child_id, badge_id, progress, is_unlocked, unlocked_at)
  VALUES (p_child_id, 'first-steps', 1, true, now())
  ON CONFLICT (child_id, badge_id) DO NOTHING;

  -- Badges whose progress is an absolute value recomputed from running totals.
  INSERT INTO child_badges (child_id, badge_id, progress, is_unlocked, unlocked_at)
  SELECT
    p_child_id,
    b.badge_id,
    LEAST(b.val, b.cap),
    b.val >= b.cap,
    CASE WHEN b.val >= b.cap THEN now() ELSE NULL END
  FROM (VALUES
    ('goal-oriented'::text, v_total_xp, 500),
    ('book-master', v_total_exercises, 20),
    ('legend', v_child_level, 10),
    ('fire-streak', v_new_streak, 5)
  ) AS b(badge_id, val, cap)
  ON CONFLICT (child_id, badge_id) DO UPDATE SET
    progress = EXCLUDED.progress,
    is_unlocked = CASE
      WHEN EXCLUDED.is_unlocked AND NOT child_badges.is_unlocked THEN true
      ELSE child_badges.is_unlocked END,
    unlocked_at = CASE
      WHEN EXCLUDED.is_unlocked AND NOT child_badges.is_unlocked THEN now()
      ELSE child_badges.unlocked_at END;

  -- Badges that increment by one per qualifying attempt.
  IF p_score = p_max_score AND p_max_score > 0 THEN
    INSERT INTO child_badges (child_id, badge_id, progress, is_unlocked, unlocked_at)
    VALUES (p_child_id, 'perfect', 1, 1 >= 10, CASE WHEN 1 >= 10 THEN now() ELSE NULL END)
    ON CONFLICT (child_id, badge_id) DO UPDATE SET
      progress = LEAST(child_badges.progress + 1, 10),
      is_unlocked = CASE WHEN child_badges.progress + 1 >= 10 AND NOT child_badges.is_unlocked THEN true ELSE child_badges.is_unlocked END,
      unlocked_at = CASE WHEN child_badges.progress + 1 >= 10 AND NOT child_badges.is_unlocked THEN now() ELSE child_badges.unlocked_at END;
  END IF;

  IF p_time_spent <= 30 AND p_score = p_max_score AND p_max_score > 0 THEN
    INSERT INTO child_badges (child_id, badge_id, progress, is_unlocked, unlocked_at)
    VALUES (p_child_id, 'speed', 1, 1 >= 5, CASE WHEN 1 >= 5 THEN now() ELSE NULL END)
    ON CONFLICT (child_id, badge_id) DO UPDATE SET
      progress = LEAST(child_badges.progress + 1, 5),
      is_unlocked = CASE WHEN child_badges.progress + 1 >= 5 AND NOT child_badges.is_unlocked THEN true ELSE child_badges.is_unlocked END,
      unlocked_at = CASE WHEN child_badges.progress + 1 >= 5 AND NOT child_badges.is_unlocked THEN now() ELSE child_badges.unlocked_at END;
  END IF;

  -- Buddy Room: award Munten for this completed exercise.
  PERFORM public._buddy_ensure_row(p_child_id, v_child.parent_id);
  PERFORM public._buddy_tick(p_child_id);
  UPDATE buddy_states SET munten = munten + 8, updated_at = now()
  WHERE child_id = p_child_id
  RETURNING munten INTO v_munten_total;

  RETURN jsonb_build_object(
    'attempt_id', v_attempt_id,
    'xp_earned', v_exercise.xp_reward,
    'all_trimesters_completed', v_all_completed,
    'completed_rewards', v_completed_rewards,
    'leveled_up', v_leveled_up,
    'new_level', v_child_level,
    'streak', v_new_streak,
    'munten_earned', 8,
    'munten_total', v_munten_total
  );
END;
$function$;

-- Redundant indexes taxing every upsert this function performs.
-- idx_child_progress_child_subject duplicates the index Postgres already builds
-- for child_progress's UNIQUE (child_id, subject); idx_trimester_progress_child_grade
-- is a left-prefix of trimester_progress's UNIQUE (child_id, grade_level, trimester_number).
DROP INDEX IF EXISTS public.idx_child_progress_child_subject;
DROP INDEX IF EXISTS public.idx_trimester_progress_child_grade;
