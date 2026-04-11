
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
BEGIN
  -- Get exercise info
  SELECT * INTO v_exercise FROM exercises WHERE id = p_exercise_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Exercise not found';
  END IF;

  -- Get child info
  SELECT * INTO v_child FROM children WHERE id = p_child_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Child not found';
  END IF;

  -- 1. Insert exercise attempt
  INSERT INTO exercise_attempts (child_id, exercise_id, score, max_score, stars, time_spent_seconds, answers)
  VALUES (p_child_id, p_exercise_id, p_score, p_max_score, p_stars, p_time_spent, p_answers)
  RETURNING id INTO v_attempt_id;

  -- 2. Upsert child_progress per subject
  INSERT INTO child_progress (child_id, subject, total_xp, exercises_completed, average_score, total_time_seconds)
  VALUES (
    p_child_id,
    v_exercise.subject,
    v_exercise.xp_reward,
    1,
    p_score::numeric / NULLIF(p_max_score, 0),
    p_time_spent
  )
  ON CONFLICT (child_id, subject)
  DO UPDATE SET
    total_xp = child_progress.total_xp + v_exercise.xp_reward,
    exercises_completed = child_progress.exercises_completed + 1,
    average_score = (
      (child_progress.average_score * child_progress.exercises_completed + p_score::numeric / NULLIF(p_max_score, 0))
      / (child_progress.exercises_completed + 1)
    ),
    total_time_seconds = child_progress.total_time_seconds + p_time_spent,
    updated_at = now();

  -- 3. Update child total XP
  UPDATE children
  SET xp = xp + v_exercise.xp_reward,
      updated_at = now()
  WHERE id = p_child_id
  RETURNING xp, level INTO v_total_xp, v_child_level;

  -- 4. Determine current trimester
  v_trimester_number := COALESCE(
    NULLIF(regexp_replace(v_exercise.stage, '[^0-9]', '', 'g'), '')::integer,
    1
  );
  IF v_trimester_number < 1 OR v_trimester_number > 4 THEN
    v_trimester_number := 1;
  END IF;

  -- 5. Upsert trimester_progress
  INSERT INTO trimester_progress (child_id, grade_level, trimester_number, xp_earned)
  VALUES (p_child_id, v_child.grade, v_trimester_number, v_exercise.xp_reward)
  ON CONFLICT (child_id, grade_level, trimester_number)
  DO UPDATE SET
    xp_earned = trimester_progress.xp_earned + v_exercise.xp_reward,
    is_completed = CASE
      WHEN (trimester_progress.xp_earned + v_exercise.xp_reward) >= trimester_progress.xp_threshold
      THEN true
      ELSE trimester_progress.is_completed
    END,
    completed_at = CASE
      WHEN (trimester_progress.xp_earned + v_exercise.xp_reward) >= trimester_progress.xp_threshold
        AND NOT trimester_progress.is_completed
      THEN now()
      ELSE trimester_progress.completed_at
    END,
    updated_at = now();

  -- 6. Check if all 4 trimesters completed
  SELECT NOT EXISTS (
    SELECT 1
    FROM generate_series(1, 4) AS t(n)
    WHERE NOT EXISTS (
      SELECT 1 FROM trimester_progress tp
      WHERE tp.child_id = p_child_id
        AND tp.grade_level = v_child.grade
        AND tp.trimester_number = t.n
        AND tp.is_completed = true
    )
  ) INTO v_all_completed;

  IF v_all_completed THEN
    UPDATE children SET pending_promotion = true, updated_at = now()
    WHERE id = p_child_id;
  END IF;

  -- 7. Update reward progress for matching subject
  UPDATE rewards
  SET current_progress = current_progress + 1,
      is_completed = CASE WHEN current_progress + 1 >= required_exercises THEN true ELSE false END,
      completed_at = CASE WHEN current_progress + 1 >= required_exercises AND NOT is_completed THEN now() ELSE completed_at END,
      updated_at = now()
  WHERE child_id = p_child_id
    AND subject = v_exercise.subject
    AND is_completed = false;

  -- Collect newly completed rewards
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', r.id, 'title', r.title)), '[]'::jsonb)
  INTO v_completed_rewards
  FROM rewards r
  WHERE r.child_id = p_child_id
    AND r.is_completed = true
    AND r.completed_at >= now() - interval '5 seconds';

  -- 8. Update badge progress
  -- Get total exercises completed across all subjects
  SELECT COALESCE(SUM(exercises_completed), 0) INTO v_total_exercises
  FROM child_progress WHERE child_id = p_child_id;

  -- first-steps: first exercise completed
  INSERT INTO child_badges (child_id, badge_id, progress, is_unlocked, unlocked_at)
  VALUES (p_child_id, 'first-steps', 1, true, now())
  ON CONFLICT (child_id, badge_id) DO NOTHING;

  -- goal-oriented: total XP (max 500)
  INSERT INTO child_badges (child_id, badge_id, progress, is_unlocked, unlocked_at)
  VALUES (p_child_id, 'goal-oriented', LEAST(v_total_xp, 500), v_total_xp >= 500, CASE WHEN v_total_xp >= 500 THEN now() ELSE NULL END)
  ON CONFLICT (child_id, badge_id)
  DO UPDATE SET
    progress = LEAST(v_total_xp, 500),
    is_unlocked = CASE WHEN v_total_xp >= 500 AND NOT child_badges.is_unlocked THEN true ELSE child_badges.is_unlocked END,
    unlocked_at = CASE WHEN v_total_xp >= 500 AND NOT child_badges.is_unlocked THEN now() ELSE child_badges.unlocked_at END;

  -- book-master: total exercises (max 20)
  INSERT INTO child_badges (child_id, badge_id, progress, is_unlocked, unlocked_at)
  VALUES (p_child_id, 'book-master', LEAST(v_total_exercises, 20), v_total_exercises >= 20, CASE WHEN v_total_exercises >= 20 THEN now() ELSE NULL END)
  ON CONFLICT (child_id, badge_id)
  DO UPDATE SET
    progress = LEAST(v_total_exercises, 20),
    is_unlocked = CASE WHEN v_total_exercises >= 20 AND NOT child_badges.is_unlocked THEN true ELSE child_badges.is_unlocked END,
    unlocked_at = CASE WHEN v_total_exercises >= 20 AND NOT child_badges.is_unlocked THEN now() ELSE child_badges.unlocked_at END;

  -- legend: level (max 10)
  INSERT INTO child_badges (child_id, badge_id, progress, is_unlocked, unlocked_at)
  VALUES (p_child_id, 'legend', LEAST(v_child_level, 10), v_child_level >= 10, CASE WHEN v_child_level >= 10 THEN now() ELSE NULL END)
  ON CONFLICT (child_id, badge_id)
  DO UPDATE SET
    progress = LEAST(v_child_level, 10),
    is_unlocked = CASE WHEN v_child_level >= 10 AND NOT child_badges.is_unlocked THEN true ELSE child_badges.is_unlocked END,
    unlocked_at = CASE WHEN v_child_level >= 10 AND NOT child_badges.is_unlocked THEN now() ELSE child_badges.unlocked_at END;

  -- perfect: perfect score (p_score = p_max_score)
  IF p_score = p_max_score AND p_max_score > 0 THEN
    INSERT INTO child_badges (child_id, badge_id, progress, is_unlocked, unlocked_at)
    VALUES (p_child_id, 'perfect', 1, 1 >= 10, CASE WHEN 1 >= 10 THEN now() ELSE NULL END)
    ON CONFLICT (child_id, badge_id)
    DO UPDATE SET
      progress = LEAST(child_badges.progress + 1, 10),
      is_unlocked = CASE WHEN child_badges.progress + 1 >= 10 AND NOT child_badges.is_unlocked THEN true ELSE child_badges.is_unlocked END,
      unlocked_at = CASE WHEN child_badges.progress + 1 >= 10 AND NOT child_badges.is_unlocked THEN now() ELSE child_badges.unlocked_at END;
  END IF;

  -- speed: answered in under 30 seconds
  IF p_time_spent <= 30 AND p_score = p_max_score AND p_max_score > 0 THEN
    INSERT INTO child_badges (child_id, badge_id, progress, is_unlocked, unlocked_at)
    VALUES (p_child_id, 'speed', 1, 1 >= 5, CASE WHEN 1 >= 5 THEN now() ELSE NULL END)
    ON CONFLICT (child_id, badge_id)
    DO UPDATE SET
      progress = LEAST(child_badges.progress + 1, 5),
      is_unlocked = CASE WHEN child_badges.progress + 1 >= 5 AND NOT child_badges.is_unlocked THEN true ELSE child_badges.is_unlocked END,
      unlocked_at = CASE WHEN child_badges.progress + 1 >= 5 AND NOT child_badges.is_unlocked THEN now() ELSE child_badges.unlocked_at END;
  END IF;

  RETURN jsonb_build_object(
    'attempt_id', v_attempt_id,
    'xp_earned', v_exercise.xp_reward,
    'all_trimesters_completed', v_all_completed,
    'completed_rewards', v_completed_rewards
  );
END;
$function$;
