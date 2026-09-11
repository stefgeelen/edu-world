-- Buddy Room & Shop: per-child Buddy care mechanic (wayfinder tickets 008 + 009).
-- Ports the pure decay/care logic from src/lib/buddy/{state,catalog,constants}.ts
-- into Postgres so a child can't cheat decay or prices by editing client state.

-- =============================================
-- 1. Care Item catalog (mirrors src/lib/buddy/catalog.ts CARE_ITEMS)
-- =============================================
-- Per wayfinder ticket 006, the catalog stays client-side only (no DB table for
-- the client to fetch) — this lookup exists solely so the RPCs below have a
-- server-side source of truth for price/strength that a child can't tamper with.
CREATE OR REPLACE FUNCTION public._buddy_item(p_item_id text)
RETURNS TABLE (id text, name text, category text, price integer, strength integer)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT * FROM (VALUES
    ('bes', 'Bosbes', 'food', 5, 15),
    ('noot', 'Hazelnoot', 'food', 12, 35),
    ('taart', 'Feesttaart', 'food', 25, 70),
    ('dennenappel', 'Dennenappel', 'toy', 5, 15),
    ('bal', 'Mosbal', 'toy', 12, 35),
    ('vlieger', 'Blaadjesvlieger', 'toy', 25, 70),
    ('blad', 'Blaadjesdeken', 'sleep-comfort', 6, 25),
    ('kussen', 'Mospluk-kussen', 'sleep-comfort', 14, 50),
    ('hangmat', 'Sterrenhangmat', 'sleep-comfort', 28, 80),
    ('kruid', 'Kruidenthee', 'medicine', 8, 20),
    ('siroop', 'Bosbessiroop', 'medicine', 18, 45),
    ('toverdrank', 'Fluisterdrank', 'medicine', 32, 80),
    ('doekje', 'Bladdoekje', 'hygiene', 5, 15),
    ('zeep', 'Beukenzeep', 'hygiene', 12, 35),
    ('bad', 'Bronbad', 'hygiene', 25, 70)
  ) AS t(id, name, category, price, strength)
  WHERE t.id = p_item_id;
$$;

REVOKE EXECUTE ON FUNCTION public._buddy_item(text) FROM PUBLIC, authenticated, anon;

-- =============================================
-- 2. Per-child Buddy state (mirrors src/lib/buddy/state.ts BuddyState)
-- =============================================
CREATE TABLE public.buddy_states (
  child_id uuid PRIMARY KEY REFERENCES public.children(id) ON DELETE CASCADE,
  parent_id uuid NOT NULL,
  needs jsonb NOT NULL DEFAULT jsonb_build_object('hunger', 80, 'fun', 75, 'energy', 85, 'hygiene', 80, 'health', 100),
  munten integer NOT NULL DEFAULT 40,
  inventory jsonb NOT NULL DEFAULT jsonb_build_object('bes', 2, 'dennenappel', 1, 'doekje', 1),
  last_tick timestamptz NOT NULL DEFAULT now(),
  sleep_until timestamptz,
  health_zero_since timestamptz,
  dead boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_buddy_states_parent_id ON public.buddy_states(parent_id);

ALTER TABLE public.buddy_states ENABLE ROW LEVEL SECURITY;

-- Reads/writes normally go through the RPCs below (SECURITY DEFINER, so they run
-- regardless of these policies) but a direct SELECT policy is kept for parity
-- with every other child-scoped table and as a safety net.
CREATE POLICY "Parents can view own buddy state"
  ON public.buddy_states FOR SELECT TO authenticated
  USING (parent_id = auth.uid());

-- =============================================
-- 3. Internal helpers (not directly callable by clients)
-- =============================================

CREATE OR REPLACE FUNCTION public._buddy_ensure_row(p_child_id uuid, p_parent_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO buddy_states (child_id, parent_id)
  VALUES (p_child_id, p_parent_id)
  ON CONFLICT (child_id) DO NOTHING;
END;
$$;

-- Applies elapsed-time decay/sleep-recovery/health/death, mirrors state.ts `tick()`.
CREATE OR REPLACE FUNCTION public._buddy_tick(p_child_id uuid)
RETURNS buddy_states
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v buddy_states%ROWTYPE;
  v_now timestamptz := now();
  v_elapsed_h double precision;
  v_hunger numeric; v_fun numeric; v_energy numeric; v_hygiene numeric; v_health numeric;
  v_sleeping boolean;
  v_slept_h double precision;
  v_sleep_until timestamptz;
  v_health_zero_since timestamptz;
  v_dead boolean;
  v_critical_count integer := 0;
BEGIN
  SELECT * INTO v FROM buddy_states WHERE child_id = p_child_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Buddy state not found for child %', p_child_id;
  END IF;

  v_elapsed_h := EXTRACT(EPOCH FROM (v_now - v.last_tick)) / 3600.0;
  IF v_elapsed_h <= 0 THEN
    RETURN v;
  END IF;

  IF v.dead THEN
    UPDATE buddy_states SET last_tick = v_now, updated_at = v_now
    WHERE child_id = p_child_id RETURNING * INTO v;
    RETURN v;
  END IF;

  v_hunger := (v.needs ->> 'hunger')::numeric;
  v_fun := (v.needs ->> 'fun')::numeric;
  v_energy := (v.needs ->> 'energy')::numeric;
  v_hygiene := (v.needs ->> 'hygiene')::numeric;
  v_health := (v.needs ->> 'health')::numeric;

  v_sleeping := v.sleep_until IS NOT NULL AND v.last_tick < v.sleep_until;
  v_sleep_until := v.sleep_until;

  v_hunger := LEAST(100, GREATEST(0, ROUND((v_hunger - 8 * v_elapsed_h) * 10) / 10));
  v_fun := LEAST(100, GREATEST(0, ROUND((v_fun - 6 * v_elapsed_h) * 10) / 10));
  v_hygiene := LEAST(100, GREATEST(0, ROUND((v_hygiene - 4 * v_elapsed_h) * 10) / 10));

  IF v_sleeping THEN
    v_slept_h := EXTRACT(EPOCH FROM (LEAST(v_now, v.sleep_until) - v.last_tick)) / 3600.0;
    v_energy := LEAST(100, GREATEST(0, ROUND((v_energy + 100 * v_slept_h / 0.5) * 10) / 10));
    IF v_now >= v.sleep_until THEN
      v_energy := 100;
      v_sleep_until := NULL;
    END IF;
  ELSE
    v_energy := LEAST(100, GREATEST(0, ROUND((v_energy - 5 * v_elapsed_h) * 10) / 10));
  END IF;

  IF v_hunger < 20 THEN v_critical_count := v_critical_count + 1; END IF;
  IF v_fun < 20 THEN v_critical_count := v_critical_count + 1; END IF;
  IF v_energy < 20 THEN v_critical_count := v_critical_count + 1; END IF;
  IF v_hygiene < 20 THEN v_critical_count := v_critical_count + 1; END IF;

  IF v_critical_count > 0 THEN
    v_health := LEAST(100, GREATEST(0, ROUND((v_health - 6 * v_critical_count * v_elapsed_h) * 10) / 10));
  ELSE
    v_health := LEAST(100, GREATEST(0, ROUND((v_health + 4 * v_elapsed_h) * 10) / 10));
  END IF;

  v_health_zero_since := v.health_zero_since;
  v_dead := v.dead;

  IF v_health <= 0 THEN
    IF v_health_zero_since IS NULL THEN v_health_zero_since := v_now; END IF;
    IF EXTRACT(EPOCH FROM (v_now - v_health_zero_since)) / 3600.0 >= 24 THEN
      v_dead := true;
      v_sleep_until := NULL;
    END IF;
  ELSE
    v_health_zero_since := NULL;
  END IF;

  UPDATE buddy_states SET
    needs = jsonb_build_object('hunger', v_hunger, 'fun', v_fun, 'energy', v_energy, 'hygiene', v_hygiene, 'health', v_health),
    sleep_until = v_sleep_until,
    health_zero_since = v_health_zero_since,
    dead = v_dead,
    last_tick = v_now,
    updated_at = v_now
  WHERE child_id = p_child_id
  RETURNING * INTO v;

  RETURN v;
END;
$$;

REVOKE EXECUTE ON FUNCTION public._buddy_ensure_row(uuid, uuid) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public._buddy_tick(uuid) FROM PUBLIC, authenticated, anon;

-- =============================================
-- 4. Client-callable RPCs
-- =============================================

-- Read (and lazily create) a child's Buddy state, decay already applied.
CREATE OR REPLACE FUNCTION public.buddy_get_or_create(p_child_id uuid)
RETURNS buddy_states
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_parent_id uuid;
BEGIN
  SELECT parent_id INTO v_parent_id FROM children WHERE id = p_child_id;
  IF v_parent_id IS NULL OR v_parent_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  PERFORM public._buddy_ensure_row(p_child_id, v_parent_id);
  RETURN public._buddy_tick(p_child_id);
END;
$$;

-- Perform a Care Action (feed/play/sleep/medicine/wash), mirrors state.ts `applyCare()`.
CREATE OR REPLACE FUNCTION public.buddy_care(p_child_id uuid, p_action text, p_item_id text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_parent_id uuid;
  v_state buddy_states%ROWTYPE;
  v_action_category text;
  v_action_need text;
  v_item_name text;
  v_item_category text;
  v_item_strength integer;
  v_owned integer;
  v_now timestamptz := now();
BEGIN
  SELECT parent_id INTO v_parent_id FROM children WHERE id = p_child_id;
  IF v_parent_id IS NULL OR v_parent_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  PERFORM public._buddy_ensure_row(p_child_id, v_parent_id);
  v_state := public._buddy_tick(p_child_id);

  IF v_state.dead THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Je Buddy heeft eerst hulp van een ouder nodig.', 'state', to_jsonb(v_state));
  END IF;

  IF v_state.sleep_until IS NOT NULL AND v_now < v_state.sleep_until AND p_action <> 'sleep' THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Je Buddy slaapt nu — wacht even.', 'state', to_jsonb(v_state));
  END IF;

  SELECT t.category, t.need INTO v_action_category, v_action_need FROM (VALUES
    ('feed', 'food', 'hunger'),
    ('play', 'toy', 'fun'),
    ('sleep', 'sleep-comfort', 'energy'),
    ('medicine', 'medicine', 'health'),
    ('wash', 'hygiene', 'hygiene')
  ) AS t(action, category, need) WHERE t.action = p_action;

  IF v_action_category IS NULL THEN
    RAISE EXCEPTION 'Unknown Care Action: %', p_action;
  END IF;

  IF p_item_id IS NOT NULL THEN
    SELECT name, category, strength INTO v_item_name, v_item_category, v_item_strength
    FROM public._buddy_item(p_item_id);
    IF v_item_name IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'message', 'Onbekend Care Item.', 'state', to_jsonb(v_state));
    END IF;
    v_owned := COALESCE((v_state.inventory ->> p_item_id)::integer, 0);
    IF v_owned < 1 THEN
      RETURN jsonb_build_object('ok', false, 'message', 'Dat Care Item heb je niet meer.', 'state', to_jsonb(v_state));
    END IF;
    IF v_item_category <> v_action_category THEN
      RETURN jsonb_build_object('ok', false, 'message', 'Dat Care Item hoort niet bij deze Care Action.', 'state', to_jsonb(v_state));
    END IF;
  END IF;

  IF p_action = 'sleep' THEN
    DECLARE
      v_speedup numeric := CASE WHEN v_item_strength IS NOT NULL THEN v_item_strength / 100.0 ELSE 0 END;
      v_minutes numeric := 30 * (1 - v_speedup);
    BEGIN
      UPDATE buddy_states SET
        sleep_until = v_now + (v_minutes * interval '1 minute'),
        inventory = CASE WHEN p_item_id IS NOT NULL
          THEN jsonb_set(inventory, ARRAY[p_item_id], to_jsonb(v_owned - 1))
          ELSE inventory END,
        updated_at = v_now
      WHERE child_id = p_child_id
      RETURNING * INTO v_state;

      RETURN jsonb_build_object(
        'ok', true,
        'message', CASE WHEN v_item_name IS NOT NULL
          THEN format('Welterusten! Met %s is de rust na %s min klaar.', v_item_name, round(v_minutes))
          ELSE format('Welterusten! Over %s minuten is je Buddy uitgerust.', round(v_minutes)) END,
        'state', to_jsonb(v_state)
      );
    END;
  END IF;

  IF p_item_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Voor deze Care Action heb je een Care Item nodig.', 'state', to_jsonb(v_state));
  END IF;

  IF p_action = 'medicine' THEN
    UPDATE buddy_states SET
      needs = jsonb_set(needs, ARRAY['health'], to_jsonb(LEAST(100::numeric, GREATEST((needs ->> 'health')::numeric, 0) + v_item_strength))),
      health_zero_since = NULL,
      inventory = jsonb_set(inventory, ARRAY[p_item_id], to_jsonb(v_owned - 1)),
      updated_at = v_now
    WHERE child_id = p_child_id
    RETURNING * INTO v_state;

    RETURN jsonb_build_object('ok', true, 'message', format('%s gegeven — de Ziekte is weg!', v_item_name), 'state', to_jsonb(v_state));
  END IF;

  UPDATE buddy_states SET
    needs = jsonb_set(needs, ARRAY[v_action_need], to_jsonb(LEAST(100::numeric, GREATEST(0::numeric, COALESCE((needs ->> v_action_need)::numeric, 0) + v_item_strength)))),
    inventory = jsonb_set(inventory, ARRAY[p_item_id], to_jsonb(v_owned - 1)),
    updated_at = v_now
  WHERE child_id = p_child_id
  RETURNING * INTO v_state;

  RETURN jsonb_build_object(
    'ok', true,
    'message', format('%s gebruikt. %s gelukt!', v_item_name,
      CASE p_action WHEN 'feed' THEN 'Voeren' WHEN 'play' THEN 'Spelen' WHEN 'wash' THEN 'Wassen' END),
    'state', to_jsonb(v_state)
  );
END;
$$;

-- Buy a Care Item with Munten, mirrors state.ts `buyItem()`.
CREATE OR REPLACE FUNCTION public.buddy_buy(p_child_id uuid, p_item_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_parent_id uuid;
  v_state buddy_states%ROWTYPE;
  v_item_name text;
  v_item_price integer;
BEGIN
  SELECT parent_id INTO v_parent_id FROM children WHERE id = p_child_id;
  IF v_parent_id IS NULL OR v_parent_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  PERFORM public._buddy_ensure_row(p_child_id, v_parent_id);
  v_state := public._buddy_tick(p_child_id);

  SELECT name, price INTO v_item_name, v_item_price FROM public._buddy_item(p_item_id);
  IF v_item_name IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Onbekend Care Item.', 'state', to_jsonb(v_state));
  END IF;

  IF v_state.munten < v_item_price THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Niet genoeg Munten.', 'state', to_jsonb(v_state));
  END IF;

  UPDATE buddy_states SET
    munten = munten - v_item_price,
    inventory = jsonb_set(inventory, ARRAY[p_item_id], to_jsonb(COALESCE((inventory ->> p_item_id)::integer, 0) + 1)),
    updated_at = now()
  WHERE child_id = p_child_id
  RETURNING * INTO v_state;

  RETURN jsonb_build_object('ok', true, 'message', format('%s gekocht voor %s Munten.', v_item_name, v_item_price), 'state', to_jsonb(v_state));
END;
$$;

-- Parent Portal revival (ticket 009), mirrors state.ts `revive()`. Partially
-- restores Needs and clears death/illness — never full restoration.
CREATE OR REPLACE FUNCTION public.buddy_revive(p_child_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_parent_id uuid;
  v_state buddy_states%ROWTYPE;
BEGIN
  SELECT parent_id INTO v_parent_id FROM children WHERE id = p_child_id;
  IF v_parent_id IS NULL OR v_parent_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  PERFORM public._buddy_ensure_row(p_child_id, v_parent_id);

  UPDATE buddy_states SET
    needs = jsonb_build_object('hunger', 55, 'fun', 55, 'energy', 55, 'hygiene', 55, 'health', 55),
    dead = false,
    health_zero_since = NULL,
    sleep_until = NULL,
    last_tick = now(),
    updated_at = now()
  WHERE child_id = p_child_id
  RETURNING * INTO v_state;

  RETURN jsonb_build_object('ok', true, 'message', 'Je Buddy is terug! De Needs zijn deels hersteld.', 'state', to_jsonb(v_state));
END;
$$;

-- =============================================
-- 5. Award Munten on exercise completion (mirrors state.ts MUNTEN_PER_EXERCISE = 8)
-- =============================================
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
      updated_at = now()
  WHERE id = p_child_id
  RETURNING xp, level INTO v_total_xp, v_child_level;

  WHILE v_total_xp >= v_child_level * 1000 LOOP
    v_child_level := v_child_level + 1;
    v_leveled_up := true;
  END LOOP;

  IF v_leveled_up THEN
    UPDATE children SET level = v_child_level, updated_at = now() WHERE id = p_child_id;
  END IF;

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

  INSERT INTO child_badges (child_id, badge_id, progress, is_unlocked, unlocked_at)
  VALUES (p_child_id, 'first-steps', 1, true, now())
  ON CONFLICT (child_id, badge_id) DO NOTHING;

  INSERT INTO child_badges (child_id, badge_id, progress, is_unlocked, unlocked_at)
  VALUES (p_child_id, 'goal-oriented', LEAST(v_total_xp, 500), v_total_xp >= 500, CASE WHEN v_total_xp >= 500 THEN now() ELSE NULL END)
  ON CONFLICT (child_id, badge_id) DO UPDATE SET
    progress = LEAST(v_total_xp, 500),
    is_unlocked = CASE WHEN v_total_xp >= 500 AND NOT child_badges.is_unlocked THEN true ELSE child_badges.is_unlocked END,
    unlocked_at = CASE WHEN v_total_xp >= 500 AND NOT child_badges.is_unlocked THEN now() ELSE child_badges.unlocked_at END;

  INSERT INTO child_badges (child_id, badge_id, progress, is_unlocked, unlocked_at)
  VALUES (p_child_id, 'book-master', LEAST(v_total_exercises, 20), v_total_exercises >= 20, CASE WHEN v_total_exercises >= 20 THEN now() ELSE NULL END)
  ON CONFLICT (child_id, badge_id) DO UPDATE SET
    progress = LEAST(v_total_exercises, 20),
    is_unlocked = CASE WHEN v_total_exercises >= 20 AND NOT child_badges.is_unlocked THEN true ELSE child_badges.is_unlocked END,
    unlocked_at = CASE WHEN v_total_exercises >= 20 AND NOT child_badges.is_unlocked THEN now() ELSE child_badges.unlocked_at END;

  INSERT INTO child_badges (child_id, badge_id, progress, is_unlocked, unlocked_at)
  VALUES (p_child_id, 'legend', LEAST(v_child_level, 10), v_child_level >= 10, CASE WHEN v_child_level >= 10 THEN now() ELSE NULL END)
  ON CONFLICT (child_id, badge_id) DO UPDATE SET
    progress = LEAST(v_child_level, 10),
    is_unlocked = CASE WHEN v_child_level >= 10 AND NOT child_badges.is_unlocked THEN true ELSE child_badges.is_unlocked END,
    unlocked_at = CASE WHEN v_child_level >= 10 AND NOT child_badges.is_unlocked THEN now() ELSE child_badges.unlocked_at END;

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

  -- Streak badge: fire-streak (max 5)
  INSERT INTO child_badges (child_id, badge_id, progress, is_unlocked, unlocked_at)
  VALUES (p_child_id, 'fire-streak', LEAST(v_new_streak, 5), v_new_streak >= 5, CASE WHEN v_new_streak >= 5 THEN now() ELSE NULL END)
  ON CONFLICT (child_id, badge_id) DO UPDATE SET
    progress = LEAST(v_new_streak, 5),
    is_unlocked = CASE WHEN v_new_streak >= 5 AND NOT child_badges.is_unlocked THEN true ELSE child_badges.is_unlocked END,
    unlocked_at = CASE WHEN v_new_streak >= 5 AND NOT child_badges.is_unlocked THEN now() ELSE child_badges.unlocked_at END;

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
