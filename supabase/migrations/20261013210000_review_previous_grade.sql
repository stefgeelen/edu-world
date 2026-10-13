-- Herhalen (2de leerjaar, wayfinder/second-grade/map.md, stap 3).
--
-- Een kind ziet onderaan de oefenlijst een groep "Herhalen" met de
-- oefeningen van lagere leerjaren (voor het 2de leerjaar: het 1ste).
-- Beslist door Stef: ze betalen gewone Munten, zoals elk type.
--
--   * _child_review_options: per type de versie uit het hoogste lagere
--     leerjaar en daarin het hoogste trimester.
--   * practice_menu: geeft die terug in een aparte lijst 'review'. De
--     gewone lijst, de Wensen en Snel starten blijven ongewijzigd, en de
--     app die nu live staat negeert het nieuwe veld gewoon.
--   * complete_exercise: een herhaaloefening telt niet mee voor de
--     trimesters (en promotie) van het eigen leerjaar. Verder ongewijzigd
--     ten opzichte van 20261001120000_buddy_centred_practice.sql.

-- 1. Welke herhaaloefeningen?
CREATE OR REPLACE FUNCTION public._child_review_options(p_child_id uuid)
RETURNS TABLE (
  type_key text,
  exercise_id uuid,
  title text,
  subject subject_type,
  route text,
  grade integer,
  display_order integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT DISTINCT ON (public.exercise_type_key(e.route))
         public.exercise_type_key(e.route),
         e.id, e.title, e.subject, e.route, e.grade, e.display_order
    FROM exercises e
    JOIN children c ON c.id = p_child_id
   WHERE e.is_active
     AND e.grade < c.grade
   ORDER BY public.exercise_type_key(e.route),
            e.grade DESC,
            NULLIF(regexp_replace(e.stage, '[^0-9]', '', 'g'), '')::integer DESC NULLS LAST;
$$;

REVOKE EXECUTE ON FUNCTION public._child_review_options(uuid) FROM PUBLIC, authenticated, anon;

-- 2. practice_menu: met de lijst 'review'.
CREATE OR REPLACE FUNCTION public.practice_menu(p_child_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_child children%ROWTYPE;
  v_today date := (now() AT TIME ZONE 'Europe/Amsterdam')::date;
  v_options jsonb;
  v_counts jsonb;
  v_wishes text[] := '{}';
  v_state buddy_states%ROWTYPE;
  v_review jsonb;
BEGIN
  SELECT * INTO v_child FROM children WHERE id = p_child_id;
  IF NOT FOUND OR NOT public._can_access_child(v_child) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(o) ORDER BY o.subject, o.display_order, o.title), '[]'::jsonb)
    INTO v_options
    FROM public._child_practice_options(p_child_id) o;

  SELECT COALESCE(jsonb_object_agg(t.type_key, t.n), '{}'::jsonb)
    INTO v_counts
    FROM (
      SELECT public.exercise_type_key(e.route) AS type_key, count(*) AS n
        FROM exercise_attempts ea
        JOIN exercises e ON e.id = ea.exercise_id
       WHERE ea.child_id = p_child_id
         AND ea.completed_at >= public._practice_day_start()
       GROUP BY 1
    ) t;

  -- Kinderen van een organisatie hebben soms geen ouder en dus geen Buddy:
  -- die krijgen gewoon geen Wensen.
  IF v_child.parent_id IS NOT NULL THEN
    PERFORM public._buddy_ensure_row(p_child_id, v_child.parent_id);
    SELECT * INTO v_state FROM buddy_states WHERE child_id = p_child_id FOR UPDATE;

    IF v_state.wishes_day IS DISTINCT FROM v_today THEN
      -- Vaste, maar per kind en per dag andere volgorde.
      SELECT COALESCE(array_agg(k ORDER BY md5(p_child_id::text || v_today::text || k)), '{}')
        INTO v_wishes
        FROM (SELECT DISTINCT e.o ->> 'type_key' AS k FROM jsonb_array_elements(v_options) AS e(o)) s;
      v_wishes := v_wishes[1:3];

      UPDATE buddy_states
         SET wishes = v_wishes, wishes_day = v_today, updated_at = now()
       WHERE child_id = p_child_id;
    ELSE
      v_wishes := v_state.wishes;
    END IF;
  END IF;

  -- Herhalen: oefeningen uit lagere leerjaren. Betalen zoals elk type
  -- (dezelfde telling per type vandaag), maar nooit een Wens.
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'type_key', r.type_key,
           'exercise_id', r.exercise_id,
           'title', r.title,
           'subject', r.subject,
           'route', r.route,
           'grade', r.grade,
           'done_today', COALESCE((v_counts ->> r.type_key)::integer, 0),
           'next_munten', public.practice_munten_for(COALESCE((v_counts ->> r.type_key)::integer, 0) + 1),
           'wished', false
         ) ORDER BY r.subject, r.display_order, r.title), '[]'::jsonb)
    INTO v_review
    FROM public._child_review_options(p_child_id) r;

  RETURN jsonb_build_object(
    'day', v_today,
    'review', v_review,
    'wish_bonus', public.practice_wish_bonus(),
    'full_munten', public.practice_munten_for(1),
    'exercises', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'type_key', o ->> 'type_key',
               'exercise_id', o ->> 'exercise_id',
               'title', o ->> 'title',
               'subject', o ->> 'subject',
               'route', o ->> 'route',
               'done_today', COALESCE((v_counts ->> (o ->> 'type_key'))::integer, 0),
               'next_munten', public.practice_munten_for(COALESCE((v_counts ->> (o ->> 'type_key'))::integer, 0) + 1),
               'wished', (o ->> 'type_key') = ANY (v_wishes)
             ) ORDER BY ord)
        FROM jsonb_array_elements(v_options) WITH ORDINALITY AS x(o, ord)
    ), '[]'::jsonb),
    -- In de volgorde waarin ze gekozen zijn; een Wens waarvan het type niet
    -- meer kiesbaar is (leerjaar veranderd) valt weg.
    'wishes', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'type_key', w,
               'title', opt.o ->> 'title',
               'subject', opt.o ->> 'subject',
               'route', opt.o ->> 'route',
               'fulfilled', COALESCE((v_counts ->> w)::integer, 0) > 0
             ) ORDER BY wi)
        FROM unnest(v_wishes) WITH ORDINALITY AS u(w, wi)
        JOIN LATERAL (
          SELECT e.o FROM jsonb_array_elements(v_options) AS e(o) WHERE e.o ->> 'type_key' = w LIMIT 1
        ) opt ON true
    ), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.practice_menu(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.practice_menu(uuid) TO authenticated;

-- 3. complete_exercise: herhalen telt niet voor de trimesters van het eigen leerjaar.
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

  -- Herhalen: een oefening uit een lager leerjaar telt niet mee voor de
  -- trimesters van het eigen leerjaar (en dus niet voor de promotie).
  IF v_exercise.grade = v_child.grade THEN
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
  END IF;

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
    'xp_earned', v_exercise.xp_reward,
    'all_trimesters_completed', v_all_completed,
    'completed_rewards', v_completed_rewards,
    'leveled_up', v_leveled_up,
    'new_level', v_child_level,
    'streak', v_new_streak,
    'munten_earned', v_munten_earned,
    'munten_total', v_munten_total,
    'times_today', v_nth_today,
    'wish_fulfilled', v_wish_fulfilled,
    'wish_bonus', CASE WHEN v_wish_fulfilled THEN public.practice_wish_bonus() ELSE 0 END
  );
END;
$function$;
