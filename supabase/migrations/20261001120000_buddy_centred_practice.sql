-- Buddy als middelpunt: de app draait voortaan om het verzorgen van de Buddy.
--
-- Productbeslissingen (oktober 2026) die deze migratie ondersteunt:
--   * Geen kaart meer: het kind kiest zelf een oefening uit één lijst, per type
--     oefening (klok, geld, getallenlijn, ...). practice_menu levert die lijst.
--   * Munten zijn de enige munt. Herhaal je op één dag hetzelfde type oefening,
--     dan levert het steeds minder op (8, 8, 4, 2, 1, 1, ...). Elke dag begint
--     het opnieuw.
--   * Wensen van de Buddy vervangen de daily quests: elke dag tot 3 types
--     oefening, met een bonus de eerste keer dat je er vandaag één maakt.
--   * De Buddy groeit op vaste momenten: een nieuwe vorm per leerjaar, een kleine
--     verandering per trimester. Verzorging heeft er geen invloed op.
--   * XP, levels en streak verdwijnen uit het zicht van het kind. De kolommen
--     blijven bestaan: het ouderportaal (trimestervoortgang, promotie) en de
--     badges rekenen er nog mee.
--   * Beloningen van ouders tellen elke oefening voluit mee, ook herhalingen —
--     daarom blijft dat deel van complete_exercise ongewijzigd.
--
-- Alles hieronder is additief: de app die nu live staat blijft werken tegen dit
-- schema (complete_exercise geeft dezelfde velden terug, plus nieuwe).

-- =============================================
-- 1. Type oefening
-- =============================================
-- Een route ziet eruit als '/exercises/clock/2': type 'clock', trimester 2. Het
-- type is de route zonder het laatste segment — dezelfde "familie" die het
-- admin-scherm al gebruikt.
CREATE OR REPLACE FUNCTION public.exercise_type_key(p_route text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path TO 'public'
AS $$
  SELECT regexp_replace(p_route, '/[^/]*$', '');
$$;

-- =============================================
-- 2. Munten per herhaling
-- =============================================
-- p_nth = de hoeveelste keer vandaag dat het kind dit type maakt (1-based).
-- Nooit 0: ook een vijfde herhaling is nog een gemaakte oefening.
CREATE OR REPLACE FUNCTION public.practice_munten_for(p_nth integer)
RETURNS integer
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN p_nth <= 2 THEN 8
    WHEN p_nth = 3 THEN 4
    WHEN p_nth = 4 THEN 2
    ELSE 1
  END;
$$;

-- Bonus bovenop de gewone Munten wanneer een Wens vervuld wordt.
CREATE OR REPLACE FUNCTION public.practice_wish_bonus()
RETURNS integer
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path TO 'public'
AS $$
  SELECT 5;
$$;

-- Middernacht vandaag, Vlaamse tijd. Dezelfde tijdzone als de streak en de Buddy.
CREATE OR REPLACE FUNCTION public._practice_day_start()
RETURNS timestamptz
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT date_trunc('day', now() AT TIME ZONE 'Europe/Amsterdam') AT TIME ZONE 'Europe/Amsterdam';
$$;

-- =============================================
-- 3. Groei van de Buddy
-- =============================================
-- Groeistap 1..18: (leerjaar - 1) * 3 + trimester. Trimesters volgen de
-- kalender: sep-dec = 1, jan-mrt = 2, apr-aug = 3.
CREATE OR REPLACE FUNCTION public.buddy_growth_target(p_grade integer, p_day date)
RETURNS integer
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path TO 'public'
AS $$
  SELECT (LEAST(6, GREATEST(1, COALESCE(p_grade, 1))) - 1) * 3
    + CASE
        WHEN EXTRACT(MONTH FROM p_day) >= 9 THEN 1
        WHEN EXTRACT(MONTH FROM p_day) <= 3 THEN 2
        ELSE 3
      END;
$$;

-- Binnen hetzelfde leerjaar gaat de Buddy nooit achteruit: in september, voor
-- een ouder het leerjaar verhoogd heeft, zou de kalender anders terugspringen
-- naar trimester 1. Verandert het leerjaar, dan volgt de Buddy dat wel — ook
-- naar beneden, zodat een verkeerd ingegeven leerjaar te corrigeren is.
CREATE OR REPLACE FUNCTION public.buddy_next_growth(p_current integer, p_target integer)
RETURNS integer
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN (p_current - 1) / 3 = (p_target - 1) / 3 THEN GREATEST(p_current, p_target)
    ELSE p_target
  END;
$$;

ALTER TABLE public.buddy_states
  ADD COLUMN IF NOT EXISTS growth_stage smallint NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS wishes_day date,
  ADD COLUMN IF NOT EXISTS wishes text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.buddy_states.growth_stage IS
  'Groeistap 1..18 = (leerjaar-1)*3 + trimester. Bijgewerkt door buddy_get_or_create.';
COMMENT ON COLUMN public.buddy_states.wishes IS
  'Types oefening (exercise_type_key) die de Buddy op wishes_day wenst. Gezet door practice_menu.';

-- Bestaande Buddies meteen op hun huidige vorm zetten.
UPDATE public.buddy_states b
   SET growth_stage = public.buddy_growth_target(c.grade, (now() AT TIME ZONE 'Europe/Amsterdam')::date)
  FROM public.children c
 WHERE c.id = b.child_id;

-- =============================================
-- 4. Welke oefeningen kan dit kind kiezen?
-- =============================================
-- Server-side versie van wat useStageMastery in de browser deed: een trimester
-- gaat open als alle oefeningen van het vorige minstens 5 keer gemaakt zijn, of
-- als een ouder het opengezet heeft (max_unlocked_stage). Per type wordt de
-- versie uit het hoogste open trimester gekozen.
CREATE OR REPLACE FUNCTION public._child_practice_options(p_child_id uuid)
RETURNS TABLE (
  type_key text,
  exercise_id uuid,
  title text,
  subject subject_type,
  route text,
  stage_num integer,
  display_order integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH child AS (
    SELECT grade, COALESCE(max_unlocked_stage, 1) AS max_unlocked
      FROM children WHERE id = p_child_id
  ),
  ex AS (
    SELECT e.id, e.title, e.subject, e.route, e.display_order,
           NULLIF(regexp_replace(e.stage, '[^0-9]', '', 'g'), '')::integer AS stage_num
      FROM exercises e
      JOIN child c ON c.grade = e.grade
     WHERE e.is_active
  ),
  counts AS (
    SELECT ea.exercise_id, count(*) AS n
      FROM exercise_attempts ea
     WHERE ea.child_id = p_child_id
     GROUP BY ea.exercise_id
  ),
  stages AS (
    SELECT s.n AS stage_num,
           count(ex.id) AS total,
           count(ex.id) FILTER (WHERE COALESCE(ct.n, 0) >= 5) AS mastered
      FROM generate_series(1, 3) AS s(n)
      LEFT JOIN ex ON ex.stage_num = s.n
      LEFT JOIN counts ct ON ct.exercise_id = ex.id
     GROUP BY s.n
  ),
  open_until AS (
    SELECT GREATEST(
      (SELECT max_unlocked FROM child),
      COALESCE((SELECT min(stage_num) FROM stages WHERE NOT (total > 0 AND mastered >= total)), 3)
    ) AS max_stage
  )
  SELECT DISTINCT ON (public.exercise_type_key(ex.route))
         public.exercise_type_key(ex.route),
         ex.id, ex.title, ex.subject, ex.route, ex.stage_num, ex.display_order
    FROM ex, open_until
   WHERE ex.stage_num BETWEEN 1 AND open_until.max_stage
   ORDER BY public.exercise_type_key(ex.route), ex.stage_num DESC;
$$;

REVOKE EXECUTE ON FUNCTION public._child_practice_options(uuid) FROM PUBLIC, authenticated, anon;

-- Ouder van het kind, of lid van zijn organisatie. Dezelfde regel als
-- complete_exercise en de policies op public.children.
CREATE OR REPLACE FUNCTION public._can_access_child(p_child children)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p_child.parent_id = auth.uid()
      OR (
        p_child.organization_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM organization_members om
           WHERE om.organization_id = p_child.organization_id
             AND om.user_id = auth.uid()
        )
      );
$$;

REVOKE EXECUTE ON FUNCTION public._can_access_child(children) FROM PUBLIC, authenticated, anon;

-- =============================================
-- 5. practice_menu: alles wat het oefenscherm en de Wensen nodig hebben
-- =============================================
-- Eén aanroep: de kiesbare oefeningen, hoeveel Munten de volgende poging per
-- type oplevert, en de Wensen van vandaag. De Wensen worden de eerste keer per
-- dag gekozen en bewaard, zodat ze de hele dag hetzelfde blijven en
-- complete_exercise ze met één rij-lookup kan controleren.
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

  RETURN jsonb_build_object(
    'day', v_today,
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

-- =============================================
-- 6. buddy_get_or_create: houdt nu ook de groei bij
-- =============================================
CREATE OR REPLACE FUNCTION public.buddy_get_or_create(p_child_id uuid)
RETURNS buddy_states
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_parent_id uuid;
  v_grade integer;
  v_target integer;
BEGIN
  SELECT parent_id, grade INTO v_parent_id, v_grade FROM children WHERE id = p_child_id;
  IF v_parent_id IS NULL OR v_parent_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  PERFORM public._buddy_ensure_row(p_child_id, v_parent_id);

  v_target := public.buddy_growth_target(v_grade, (now() AT TIME ZONE 'Europe/Amsterdam')::date);
  UPDATE buddy_states
     SET growth_stage = public.buddy_next_growth(growth_stage, v_target)
   WHERE child_id = p_child_id
     AND growth_stage IS DISTINCT FROM public.buddy_next_growth(growth_stage, v_target);

  RETURN public._buddy_tick(p_child_id);
END;
$$;

-- =============================================
-- 7. complete_exercise: Munten volgens herhaling en Wensen
-- =============================================
-- Ten opzichte van 20260911160000:
--   * De rij van het kind wordt meteen gelockt, zodat twee gelijktijdige
--     afrondingen elkaars "hoeveelste keer vandaag" niet missen.
--   * Munten = practice_munten_for(n) + Wensbonus, in plaats van vast 8.
--   * Het Buddy-gedeelte slaat kinderen zonder ouder over. Voorheen faalde de
--     hele afronding voor zo'n kind op de NOT NULL van buddy_states.parent_id.
--   * Badges 'goal-oriented' en 'legend' tellen gemaakte oefeningen in plaats
--     van XP en niveau, die het kind niet meer ziet.
-- XP, niveau, streak, trimesters en beloningen blijven ongewijzigd.
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

-- =============================================
-- 8. Badges zonder XP, niveau of streak in de tekst
-- =============================================
UPDATE public.badges SET requirement = 'Maak 50 oefeningen', max_progress = 50
 WHERE id = 'goal-oriented';
UPDATE public.badges SET requirement = 'Maak 500 oefeningen', max_progress = 500
 WHERE id = 'legend';
UPDATE public.badges SET name = 'Vijf Dagen Trouw', requirement = 'Oefen 5 dagen op rij'
 WHERE id = 'fire-streak';

-- Voortgang van de twee omgebouwde badges herrekenen met de nieuwe maatstaf.
-- Een al verdiende badge blijft verdiend.
WITH totals AS (
  SELECT child_id, COALESCE(SUM(exercises_completed), 0)::integer AS n
    FROM public.child_progress
   GROUP BY child_id
)
UPDATE public.child_badges cb
   SET progress = LEAST(t.n, CASE cb.badge_id WHEN 'goal-oriented' THEN 50 ELSE 500 END),
       is_unlocked = cb.is_unlocked OR t.n >= CASE cb.badge_id WHEN 'goal-oriented' THEN 50 ELSE 500 END,
       unlocked_at = CASE
         WHEN NOT cb.is_unlocked AND t.n >= CASE cb.badge_id WHEN 'goal-oriented' THEN 50 ELSE 500 END THEN now()
         ELSE cb.unlocked_at END
  FROM totals t
 WHERE t.child_id = cb.child_id
   AND cb.badge_id IN ('goal-oriented', 'legend');
