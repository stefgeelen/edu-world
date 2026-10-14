-- Testoefeningen: een nieuwe oefening eerst als admin uitproberen.
--
-- exercises.admin_only = "in test". Zo'n oefening bestaat voor gewone
-- gebruikers gewoon niet:
--   * de policy op exercises verbergt de rij, dus ook een rechtstreekse link
--     vindt geen oefening;
--   * _child_practice_options en _child_review_options laten ze weg, ook bij
--     het tellen wanneer een trimester opengaat;
--   * een trigger op exercise_attempts weigert een poging erop.
-- Een admin ziet ze met zijn eigen kind in de oefenlijst, met een label
-- "Test". Een testoefening wordt nooit een Wens. In Admin → Oefeningen zet de
-- admin een type op "Test" of "Live" (alle rijen van dat type tegelijk).
--
-- Een nieuwe oefening start dus best met admin_only = true in haar migratie.
-- Verder ongewijzigd ten opzichte van 20261013210000_review_previous_grade.sql.

ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS admin_only boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.exercises.admin_only IS
  'In test: alleen zichtbaar en speelbaar voor admins. Gezet in Admin → Oefeningen.';

-- Wie mag deze oefening zien? Iedereen, of bij een testoefening enkel admins.
CREATE OR REPLACE FUNCTION public._can_see_exercise(p_admin_only boolean)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT NOT p_admin_only OR public.has_role(auth.uid(), 'admin');
$$;

-- 1. Lezen: testoefeningen enkel voor admins.
DROP POLICY IF EXISTS "Exercises are readable by all authenticated" ON public.exercises;
CREATE POLICY "Exercises are readable by all authenticated"
  ON public.exercises FOR SELECT TO authenticated
  USING (public._can_see_exercise(admin_only));

-- 2. Geen pogingen op een testoefening door wie geen admin is.
CREATE OR REPLACE FUNCTION public.guard_admin_only_attempt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public._can_see_exercise(
       COALESCE((SELECT admin_only FROM exercises WHERE id = NEW.exercise_id), false)
     ) THEN
    RAISE EXCEPTION 'Exercise not found';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_admin_only_attempt ON public.exercise_attempts;
CREATE TRIGGER guard_admin_only_attempt
  BEFORE INSERT ON public.exercise_attempts
  FOR EACH ROW EXECUTE FUNCTION public.guard_admin_only_attempt();

-- 3. Kiesbare oefeningen: met admin_only, zonder testoefeningen voor wie geen
-- admin is. Het terugkeertype verandert, dus eerst weg.
DROP FUNCTION IF EXISTS public._child_practice_options(uuid);
CREATE FUNCTION public._child_practice_options(p_child_id uuid)
RETURNS TABLE (
  type_key text,
  exercise_id uuid,
  title text,
  subject subject_type,
  route text,
  stage_num integer,
  display_order integer,
  admin_only boolean
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
    SELECT e.id, e.title, e.subject, e.route, e.display_order, e.admin_only,
           NULLIF(regexp_replace(e.stage, '[^0-9]', '', 'g'), '')::integer AS stage_num
      FROM exercises e
      JOIN child c ON c.grade = e.grade
     WHERE e.is_active
       AND public._can_see_exercise(e.admin_only)
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
         ex.id, ex.title, ex.subject, ex.route, ex.stage_num, ex.display_order, ex.admin_only
    FROM ex, open_until
   WHERE ex.stage_num BETWEEN 1 AND open_until.max_stage
   ORDER BY public.exercise_type_key(ex.route), ex.stage_num DESC;
$$;

REVOKE EXECUTE ON FUNCTION public._child_practice_options(uuid) FROM PUBLIC, authenticated, anon;

DROP FUNCTION IF EXISTS public._child_review_options(uuid);
CREATE FUNCTION public._child_review_options(p_child_id uuid)
RETURNS TABLE (
  type_key text,
  exercise_id uuid,
  title text,
  subject subject_type,
  route text,
  grade integer,
  display_order integer,
  admin_only boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT DISTINCT ON (public.exercise_type_key(e.route))
         public.exercise_type_key(e.route),
         e.id, e.title, e.subject, e.route, e.grade, e.display_order, e.admin_only
    FROM exercises e
    JOIN children c ON c.id = p_child_id
   WHERE e.is_active
     AND public._can_see_exercise(e.admin_only)
     AND e.grade < c.grade
   ORDER BY public.exercise_type_key(e.route),
            e.grade DESC,
            NULLIF(regexp_replace(e.stage, '[^0-9]', '', 'g'), '')::integer DESC NULLS LAST;
$$;

REVOKE EXECUTE ON FUNCTION public._child_review_options(uuid) FROM PUBLIC, authenticated, anon;

-- 4. practice_menu: admin_only per oefening; testoefeningen worden geen Wens.
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
      -- Vaste, maar per kind en per dag andere volgorde. Nooit een testoefening.
      SELECT COALESCE(array_agg(k ORDER BY md5(p_child_id::text || v_today::text || k)), '{}')
        INTO v_wishes
        FROM (
          SELECT DISTINCT e.o ->> 'type_key' AS k
            FROM jsonb_array_elements(v_options) AS e(o)
           WHERE NOT COALESCE((e.o ->> 'admin_only')::boolean, false)
        ) s;
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
           'wished', false,
           'admin_only', r.admin_only
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
               'wished', (o ->> 'type_key') = ANY (v_wishes),
               'admin_only', COALESCE((o ->> 'admin_only')::boolean, false)
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
