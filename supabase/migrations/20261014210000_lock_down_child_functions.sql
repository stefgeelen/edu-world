-- Dichtzetten van de functies die Munten en de Buddy veranderen.
--
-- 1. _can_access_child liet een oproep zonder login door: auth.uid() is dan
--    NULL, "parent_id = NULL" is NULL en "IF NOT NULL" faalt niet. Hetzelfde
--    gat liet elke ingelogde gebruiker aan een kind zonder ouder en zonder
--    organisatie. Nu is het antwoord altijd true of false.
-- 2. complete_exercise en de Buddy-functies waren nog uitvoerbaar voor anon
--    (niet ingelogd). Nu enkel voor ingelogde gebruikers.
-- 3. complete_exercise betaalde twee keer bij een dubbele tik of een herhaalde
--    oproep. De app stuurt nu per gespeelde ronde een eigen id mee
--    (p_client_attempt_id). Komt hetzelfde id een tweede keer binnen, dan
--    geeft de functie het eerste resultaat terug zonder opnieuw te betalen.
--    De oude werking zit ongewijzigd in _complete_exercise_core; een latere
--    wijziging aan de spelregels gebeurt daar, niet in complete_exercise.
--
-- Een oude app zonder p_client_attempt_id blijft werken (standaard NULL).

-- 1. Toegangscontrole die nooit NULL teruggeeft.
CREATE OR REPLACE FUNCTION public._can_access_child(p_child children)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    auth.uid() IS NOT NULL
    AND (
      p_child.parent_id = auth.uid()
      OR (
        p_child.organization_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM organization_members om
           WHERE om.organization_id = p_child.organization_id
             AND om.user_id = auth.uid()
        )
      )
    ),
    false
  );
$$;

REVOKE EXECUTE ON FUNCTION public._can_access_child(children) FROM PUBLIC, authenticated, anon;

-- 2. Buddy-functies enkel voor ingelogde gebruikers. Hun eigen controle
--    ("v_parent_id <> auth.uid()") is correct zodra auth.uid() bestaat.
REVOKE EXECUTE ON FUNCTION public.buddy_get_or_create(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.buddy_care(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.buddy_buy(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.buddy_revive(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.buddy_get_or_create(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.buddy_care(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.buddy_buy(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.buddy_revive(uuid) TO authenticated;

-- 3. Eén betaling per gespeelde ronde.
ALTER TABLE public.exercise_attempts
  ADD COLUMN IF NOT EXISTS client_attempt_id uuid,
  ADD COLUMN IF NOT EXISTS completion_result jsonb;

COMMENT ON COLUMN public.exercise_attempts.client_attempt_id IS
  'Id dat de app per gespeelde ronde meestuurt; een tweede oproep met hetzelfde id betaalt niet opnieuw.';
COMMENT ON COLUMN public.exercise_attempts.completion_result IS
  'Wat complete_exercise de eerste keer teruggaf, om een herhaalde oproep hetzelfde antwoord te geven.';

CREATE UNIQUE INDEX IF NOT EXISTS exercise_attempts_client_attempt_id_key
  ON public.exercise_attempts (client_attempt_id)
  WHERE client_attempt_id IS NOT NULL;

-- De bestaande functie, ongewijzigd, krijgt een interne naam.
ALTER FUNCTION public.complete_exercise(uuid, uuid, integer, integer, integer, integer, jsonb)
  RENAME TO _complete_exercise_core;
REVOKE EXECUTE ON FUNCTION public._complete_exercise_core(uuid, uuid, integer, integer, integer, integer, jsonb)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.complete_exercise(
  p_child_id uuid,
  p_exercise_id uuid,
  p_score integer,
  p_max_score integer,
  p_stars integer,
  p_time_spent integer,
  p_answers jsonb DEFAULT '[]'::jsonb,
  p_client_attempt_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_child children%ROWTYPE;
  v_result jsonb;
BEGIN
  -- Dezelfde rij-lock als _complete_exercise_core: een tweede oproep met
  -- hetzelfde id wacht hier tot de eerste klaar is en vindt dan haar poging.
  SELECT * INTO v_child FROM children WHERE id = p_child_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Child not found'; END IF;

  IF NOT public._can_access_child(v_child) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_client_attempt_id IS NOT NULL THEN
    SELECT completion_result INTO v_result
      FROM exercise_attempts
     WHERE client_attempt_id = p_client_attempt_id
       AND child_id = p_child_id;
    IF FOUND THEN
      RETURN COALESCE(v_result, '{}'::jsonb) || jsonb_build_object('duplicate', true);
    END IF;
  END IF;

  v_result := public._complete_exercise_core(
    p_child_id, p_exercise_id, p_score, p_max_score, p_stars, p_time_spent, p_answers
  );

  IF p_client_attempt_id IS NOT NULL THEN
    UPDATE exercise_attempts
       SET client_attempt_id = p_client_attempt_id,
           completion_result = v_result
     WHERE id = (v_result->>'attempt_id')::uuid;
  END IF;

  RETURN v_result;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.complete_exercise(uuid, uuid, integer, integer, integer, integer, jsonb, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_exercise(uuid, uuid, integer, integer, integer, integer, jsonb, uuid)
  TO authenticated;
