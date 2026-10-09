-- =============================================
-- Een Buddy kiezen: Nootje, Vosje, Prikkel of Loeka
-- =============================================
-- Het kind kiest zijn Buddy bij de start, en daarna één keer per schooljaar
-- opnieuw (blijven of wisselen). Wisselen verandert alleen het dier: Munten,
-- voorraad, behoeften en groei blijven. De lijst met Buddy's staat ook in
-- src/lib/buddy/species.ts.
--
-- Een schooljaar heet naar het jaar waarin het begint: september 2026 tot en
-- met augustus 2027 is schooljaar 2026.

ALTER TABLE public.buddy_states
  ADD COLUMN species text NOT NULL DEFAULT 'nootje'
    CONSTRAINT buddy_states_species_check CHECK (species IN ('nootje', 'vosje', 'prikkel', 'loeka')),
  ADD COLUMN species_school_year integer;

COMMENT ON COLUMN public.buddy_states.species IS
  'Welke Buddy: nootje, vosje, prikkel of loeka. Zie src/lib/buddy/species.ts.';
COMMENT ON COLUMN public.buddy_states.species_school_year IS
  'Schooljaar (beginjaar) waarin het kind zijn Buddy het laatst koos. NULL = nog nooit gekozen.';

-- Wie al speelt, blijft Nootje en telt als "gekozen dit schooljaar": de vraag
-- blijven-of-wisselen komt pas in september 2027. Een Buddy-rij die later
-- ontstaat (nieuw kind) begint op NULL en krijgt dus de keuze.
UPDATE public.buddy_states SET species_school_year = 2026 WHERE species_school_year IS NULL;

CREATE OR REPLACE FUNCTION public.buddy_school_year(p_day date)
RETURNS integer
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path TO 'public'
AS $$
  SELECT EXTRACT(YEAR FROM p_day)::integer - CASE WHEN EXTRACT(MONTH FROM p_day) >= 9 THEN 0 ELSE 1 END;
$$;

-- Kies (of houd) een Buddy. Mag als het kind dit schooljaar nog niet koos.
CREATE OR REPLACE FUNCTION public.buddy_choose(p_child_id uuid, p_species text)
RETURNS buddy_states
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_parent_id uuid;
  v_year integer := public.buddy_school_year((now() AT TIME ZONE 'Europe/Amsterdam')::date);
  v_chosen integer;
BEGIN
  SELECT parent_id INTO v_parent_id FROM children WHERE id = p_child_id;
  IF v_parent_id IS NULL OR v_parent_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_species IS NULL OR p_species NOT IN ('nootje', 'vosje', 'prikkel', 'loeka') THEN
    RAISE EXCEPTION 'Unknown buddy';
  END IF;

  PERFORM public._buddy_ensure_row(p_child_id, v_parent_id);

  SELECT species_school_year INTO v_chosen FROM buddy_states WHERE child_id = p_child_id FOR UPDATE;
  IF v_chosen IS NOT NULL AND v_chosen >= v_year THEN
    RAISE EXCEPTION 'Buddy already chosen this school year';
  END IF;

  UPDATE buddy_states
     SET species = p_species,
         species_school_year = v_year,
         updated_at = now()
   WHERE child_id = p_child_id;

  RETURN public._buddy_tick(p_child_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.buddy_choose(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.buddy_choose(uuid, text) TO authenticated;
