-- XP weg uit de databank. Het kind zag het al niet meer, sinds 25 okt 2026
-- ook de ouder niet. Munten, Wensen, badges, beloningen van ouders en de
-- reeks dagen op rij (streak, voor de badge 'fire-streak') blijven.
--
-- Weg: children.xp, children.level, children.pending_promotion (werd gezet
-- als alle trimesters vol XP zaten), child_progress.total_xp,
-- exercises.xp_reward en de tabel trimester_progress.
--
-- _complete_exercise_core: dezelfde regels als in
-- 20261013210000_review_previous_grade.sql, zonder XP, niveau, trimester-XP
-- en promotie. Het antwoord heeft geen xp_earned, all_trimesters_completed,
-- leveled_up en new_level meer; de app gebruikte ze niet.
--
-- Volgorde: eerst de app zonder deze kolommen live zetten, dan deze migratie.

CREATE OR REPLACE FUNCTION public._complete_exercise_core(p_child_id uuid, p_exercise_id uuid, p_score integer, p_max_score integer, p_stars integer, p_time_spent integer, p_answers jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_exercise exercises%ROWTYPE;
  v_child children%ROWTYPE;
  v_attempt_id uuid;
  v_completed_rewards jsonb := '[]'::jsonb;
  v_total_exercises integer;
  v_new_streak integer;
  v_today date := (now() AT TIME ZONE 'Europe/Amsterdam')::date;
  v_type_key text;
  v_nth_today integer;
  v_wish_fulfilled boolean := false;
  v_munten_earned integer := 0;
  v_munten_total integer;
BEGIN
  SELECT * INTO v_exercise FROM exercises WHERE id = p_exercise_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Exercise not found'; END IF;

  SELECT * INTO v_child FROM children WHERE id = p_child_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Child not found'; END IF;

  IF NOT public._can_access_child(v_child) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  v_type_key := public.exercise_type_key(v_exercise.route);

  -- Hoeveelste keer vandaag, deze poging meegerekend.
  SELECT count(*) + 1 INTO v_nth_today
    FROM exercise_attempts ea
    JOIN exercises e ON e.id = ea.exercise_id
   WHERE ea.child_id = p_child_id
     AND ea.completed_at >= public._practice_day_start()
     AND public.exercise_type_key(e.route) = v_type_key;

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

  INSERT INTO child_progress (child_id, subject, exercises_completed, average_score, total_time_seconds)
  VALUES (
    p_child_id, v_exercise.subject, 1,
    p_score::numeric / NULLIF(p_max_score, 0), p_time_spent
  )
  ON CONFLICT (child_id, subject) DO UPDATE SET
    exercises_completed = child_progress.exercises_completed + 1,
    average_score = (
      (child_progress.average_score * child_progress.exercises_completed + p_score::numeric / NULLIF(p_max_score, 0))
      / (child_progress.exercises_completed + 1)
    ),
    total_time_seconds = child_progress.total_time_seconds + p_time_spent,
    updated_at = now();

  UPDATE children
  SET streak = v_new_streak,
      last_active_date = v_today,
      updated_at = now()
  WHERE id = p_child_id;

  -- Beloningen van ouders: elke oefening telt voluit mee, ook herhalingen.
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

  INSERT INTO child_badges (child_id, badge_id, progress, is_unlocked, unlocked_at)
  VALUES (p_child_id, 'first-steps', 1, true, now())
  ON CONFLICT (child_id, badge_id) DO NOTHING;

  INSERT INTO child_badges (child_id, badge_id, progress, is_unlocked, unlocked_at)
  SELECT
    p_child_id,
    b.badge_id,
    LEAST(b.val, b.cap),
    b.val >= b.cap,
    CASE WHEN b.val >= b.cap THEN now() ELSE NULL END
  FROM (VALUES
    ('goal-oriented'::text, v_total_exercises, 50),
    ('book-master', v_total_exercises, 20),
    ('legend', v_total_exercises, 500),
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

  -- Buddy: Munten volgens herhaling, plus de Wensbonus de eerste keer vandaag.
  IF v_child.parent_id IS NOT NULL THEN
    PERFORM public._buddy_ensure_row(p_child_id, v_child.parent_id);
    PERFORM public._buddy_tick(p_child_id);

    SELECT v_nth_today = 1 AND wishes_day = v_today AND v_type_key = ANY (wishes)
      INTO v_wish_fulfilled
      FROM buddy_states WHERE child_id = p_child_id;
    v_wish_fulfilled := COALESCE(v_wish_fulfilled, false);

    v_munten_earned := public.practice_munten_for(v_nth_today)
      + CASE WHEN v_wish_fulfilled THEN public.practice_wish_bonus() ELSE 0 END;

    UPDATE buddy_states SET munten = munten + v_munten_earned, updated_at = now()
    WHERE child_id = p_child_id
    RETURNING munten INTO v_munten_total;
  END IF;

  RETURN jsonb_build_object(
    'attempt_id', v_attempt_id,
    'completed_rewards', v_completed_rewards,
    'streak', v_new_streak,
    'munten_earned', v_munten_earned,
    'munten_total', v_munten_total,
    'times_today', v_nth_today,
    'wish_fulfilled', v_wish_fulfilled,
    'wish_bonus', CASE WHEN v_wish_fulfilled THEN public.practice_wish_bonus() ELSE 0 END
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public._complete_exercise_core(uuid, uuid, integer, integer, integer, integer, jsonb)
  FROM PUBLIC, anon, authenticated;

DROP TABLE IF EXISTS public.trimester_progress;

ALTER TABLE public.children
  DROP COLUMN IF EXISTS xp,
  DROP COLUMN IF EXISTS level,
  DROP COLUMN IF EXISTS pending_promotion;

ALTER TABLE public.child_progress
  DROP COLUMN IF EXISTS total_xp;

ALTER TABLE public.exercises
  DROP COLUMN IF EXISTS xp_reward;
