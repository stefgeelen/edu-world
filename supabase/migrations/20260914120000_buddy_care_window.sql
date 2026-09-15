-- Buddy Care Window: het verval van Needs loopt niet meer op de wandklok maar
-- op schooltijd.
--
-- Het oude model liet alle vier de Needs 24/7 doorzakken (8/6/5/4 punten per
-- uur). Eén nacht slapen was daardoor al genoeg om een Buddy kritiek te laten
-- worden, en na een weekend was hij ziek of dood zonder dat het kind iets fout
-- had gedaan.
--
-- Nieuw model, naar het voorbeeld van de klassieke Tamagotchi:
--   * Needs vervallen alleen tijdens actieve uren: ma-vr 07:00-19:00 (Europe/Amsterdam).
--   * 's Nachts (19:00-07:00, elke dag) slaapt de Buddy: geen verval, Energie laadt op.
--   * Weekenddagen overdag tellen voor geen van beide — die zijn gratis.
--   * Verval is teruggeschroefd naar ~12 actieve uren per dag, zodat één bezoek
--     per schooldag volstaat en een overgeslagen weekdag te overleven is.
--
-- Spiegelt src/lib/buddy/{constants,schedule,state}.ts.

-- =============================================
-- 1. Actieve uren en nachturen tussen twee momenten
-- =============================================
CREATE OR REPLACE FUNCTION public._buddy_window_hours(
  p_from timestamptz,
  p_to timestamptz,
  OUT active_h double precision,
  OUT night_h double precision
)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_from timestamptz;
  v_daylight_secs double precision;
  v_active_secs double precision;
BEGIN
  active_h := 0;
  night_h := 0;
  IF p_to <= p_from THEN
    RETURN;
  END IF;

  -- Vangnet tegen een kapotte klok of een herstelde back-up.
  v_from := GREATEST(p_from, p_to - interval '400 days');

  SELECT
    COALESCE(SUM(secs), 0),
    COALESCE(SUM(secs) FILTER (WHERE is_weekday), 0)
  INTO v_daylight_secs, v_active_secs
  FROM (
    SELECT
      EXTRACT(ISODOW FROM d) < 6 AS is_weekday,
      GREATEST(0, EXTRACT(EPOCH FROM (
        LEAST(p_to, (d::date + time '19:00') AT TIME ZONE 'Europe/Amsterdam')
        - GREATEST(v_from, (d::date + time '07:00') AT TIME ZONE 'Europe/Amsterdam')
      ))) AS secs
    FROM generate_series(
      (v_from AT TIME ZONE 'Europe/Amsterdam')::date,
      (p_to AT TIME ZONE 'Europe/Amsterdam')::date,
      interval '1 day'
    ) AS d
  ) AS daylight;

  active_h := v_active_secs / 3600.0;
  night_h := GREATEST(0, EXTRACT(EPOCH FROM (p_to - v_from)) - v_daylight_secs) / 3600.0;
END;
$$;

REVOKE EXECUTE ON FUNCTION public._buddy_window_hours(timestamptz, timestamptz)
  FROM PUBLIC, authenticated, anon;

-- =============================================
-- 2. Tick op basis van actieve uren in plaats van wandklokuren
-- =============================================
CREATE OR REPLACE FUNCTION public._buddy_tick(p_child_id uuid)
RETURNS buddy_states
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v buddy_states%ROWTYPE;
  v_now timestamptz := now();
  v_active_h double precision;
  v_night_h double precision;
  v_zero_active_h double precision;
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

  IF v_now <= v.last_tick THEN
    RETURN v;
  END IF;

  IF v.dead THEN
    UPDATE buddy_states SET last_tick = v_now, updated_at = v_now
    WHERE child_id = p_child_id RETURNING * INTO v;
    RETURN v;
  END IF;

  SELECT w.active_h, w.night_h INTO v_active_h, v_night_h
  FROM _buddy_window_hours(v.last_tick, v_now) AS w;

  v_hunger := (v.needs ->> 'hunger')::numeric;
  v_fun := (v.needs ->> 'fun')::numeric;
  v_energy := (v.needs ->> 'energy')::numeric;
  v_hygiene := (v.needs ->> 'hygiene')::numeric;
  v_health := (v.needs ->> 'health')::numeric;

  v_sleeping := v.sleep_until IS NOT NULL AND v.last_tick < v.sleep_until;
  v_sleep_until := v.sleep_until;

  v_hunger := LEAST(100, GREATEST(0, ROUND((v_hunger - 3 * v_active_h) * 10) / 10));
  v_fun := LEAST(100, GREATEST(0, ROUND((v_fun - 2.5 * v_active_h) * 10) / 10));
  v_hygiene := LEAST(100, GREATEST(0, ROUND((v_hygiene - 1.5 * v_active_h) * 10) / 10));

  IF v_sleeping THEN
    -- Het dutje van het kind (Care Action "Slapen") vult Energie in één keer.
    v_slept_h := EXTRACT(EPOCH FROM (LEAST(v_now, v.sleep_until) - v.last_tick)) / 3600.0;
    v_energy := LEAST(100, GREATEST(0, ROUND((v_energy + 100 * v_slept_h / 0.5) * 10) / 10));
    IF v_now >= v.sleep_until THEN
      v_energy := 100;
      v_sleep_until := NULL;
    END IF;
  ELSE
    v_energy := LEAST(100, GREATEST(0, ROUND((v_energy - 2 * v_active_h + 4 * v_night_h) * 10) / 10));
  END IF;

  IF v_hunger < 20 THEN v_critical_count := v_critical_count + 1; END IF;
  IF v_fun < 20 THEN v_critical_count := v_critical_count + 1; END IF;
  IF v_energy < 20 THEN v_critical_count := v_critical_count + 1; END IF;
  IF v_hygiene < 20 THEN v_critical_count := v_critical_count + 1; END IF;

  IF v_critical_count > 0 THEN
    v_health := LEAST(100, GREATEST(0, ROUND((v_health - 2 * v_critical_count * v_active_h) * 10) / 10));
  ELSE
    v_health := LEAST(100, GREATEST(0, ROUND((v_health + 6 * v_active_h) * 10) / 10));
  END IF;

  v_health_zero_since := v.health_zero_since;
  v_dead := v.dead;

  IF v_health <= 0 THEN
    IF v_health_zero_since IS NULL THEN v_health_zero_since := v_now; END IF;
    -- 24 actieve uren = twee volle schooldagen respijt voordat de Buddy overlijdt.
    SELECT w.active_h INTO v_zero_active_h
    FROM _buddy_window_hours(v_health_zero_since, v_now) AS w;
    IF v_zero_active_h >= 24 THEN
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

REVOKE EXECUTE ON FUNCTION public._buddy_tick(uuid) FROM PUBLIC, authenticated, anon;
