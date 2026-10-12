-- Several children per account: "Wie speelt er?" and paused children.
--
-- A package allows N children (plan_max_children, only while active or
-- trialing; otherwise 1). When an account has more, the extra children are
-- paused: nothing is deleted, but they cannot play until there is room again.
--
-- Which children stay playable: the ones the parent marked keep_active first,
-- then the oldest. children.paused is that outcome, stored, and only
-- sync_paused_children writes it. It runs whenever the package, the parent's
-- choice or the set of children changes.
--
-- A paused child cannot earn or spend: no exercise attempts, no Munten,
-- inventory or Buddy changes. Its Buddy is frozen: when the child becomes
-- playable again its decay clock restarts from that moment.

ALTER TABLE public.children
  ADD COLUMN paused boolean NOT NULL DEFAULT false,
  ADD COLUMN keep_active boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.children.paused IS
  'Gepauzeerd: meer kinderen dan het pakket toelaat. Alleen sync_paused_children zet dit.';
COMMENT ON COLUMN public.children.keep_active IS
  'De ouder koos dit kind om te blijven spelen bij te weinig plaats (set_active_children).';

-- How many children may play: the same rule as enforce_max_children().
CREATE OR REPLACE FUNCTION public.parent_child_allowance(p_parent_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT GREATEST(COALESCE(MAX(max_children), 1), 1)
    FROM subscriptions
   WHERE user_id = p_parent_id
     AND status IN ('trialing', 'active');
$$;
REVOKE EXECUTE ON FUNCTION public.parent_child_allowance(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.sync_paused_children(p_parent_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_allowed integer := parent_child_allowance(p_parent_id);
BEGIN
  IF p_parent_id IS NULL THEN RETURN; END IF;

  -- Lets the guard trigger below know this write is the sanctioned one.
  PERFORM set_config('leapio.sync_paused', 'on', true);

  -- Coming back from a pause: the Buddy picks up where it was left, so its
  -- decay restarts now instead of catching up on the paused time.
  WITH ranked AS (
    SELECT id, row_number() OVER (ORDER BY keep_active DESC, created_at, id) > v_allowed AS should_pause
      FROM children
     WHERE parent_id = p_parent_id
  )
  UPDATE buddy_states b
     SET last_tick = now(),
         health_zero_since = CASE WHEN b.health_zero_since IS NOT NULL THEN now() END
    FROM children c
    JOIN ranked r ON r.id = c.id
   WHERE b.child_id = c.id
     AND c.paused
     AND NOT r.should_pause;

  WITH ranked AS (
    SELECT id, row_number() OVER (ORDER BY keep_active DESC, created_at, id) > v_allowed AS should_pause
      FROM children
     WHERE parent_id = p_parent_id
  )
  UPDATE children c
     SET paused = r.should_pause
    FROM ranked r
   WHERE c.id = r.id
     AND c.paused IS DISTINCT FROM r.should_pause;

  PERFORM set_config('leapio.sync_paused', 'off', true);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.sync_paused_children(uuid) FROM PUBLIC, anon, authenticated;

-- Parents may update their own children (name, grade...), but not unpause one.
CREATE OR REPLACE FUNCTION public.guard_children_paused()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.paused IS DISTINCT FROM OLD.paused
     AND COALESCE(current_setting('leapio.sync_paused', true), 'off') <> 'on' THEN
    NEW.paused := OLD.paused;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_children_paused_trigger ON public.children;
CREATE TRIGGER guard_children_paused_trigger
  BEFORE UPDATE ON public.children
  FOR EACH ROW EXECUTE FUNCTION public.guard_children_paused();

-- A removed child can free a place for a paused one.
CREATE OR REPLACE FUNCTION public.children_after_delete_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM sync_paused_children(OLD.parent_id);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS children_after_delete_sync_trigger ON public.children;
CREATE TRIGGER children_after_delete_sync_trigger
  AFTER DELETE ON public.children
  FOR EACH ROW EXECUTE FUNCTION public.children_after_delete_sync();

-- A paused child cannot finish exercises (and so earns nothing).
CREATE OR REPLACE FUNCTION public.block_paused_child_attempt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM children WHERE id = NEW.child_id AND paused) THEN
    RAISE EXCEPTION 'Child is paused';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS block_paused_child_attempt_trigger ON public.exercise_attempts;
CREATE TRIGGER block_paused_child_attempt_trigger
  BEFORE INSERT ON public.exercise_attempts
  FOR EACH ROW EXECUTE FUNCTION public.block_paused_child_attempt();

-- ...and cannot spend Munten, use items or change Buddy.
CREATE OR REPLACE FUNCTION public.block_paused_child_buddy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF (NEW.munten IS DISTINCT FROM OLD.munten
      OR NEW.inventory IS DISTINCT FROM OLD.inventory
      OR NEW.species IS DISTINCT FROM OLD.species
      OR NEW.species_school_year IS DISTINCT FROM OLD.species_school_year)
     AND EXISTS (SELECT 1 FROM children WHERE id = NEW.child_id AND paused) THEN
    RAISE EXCEPTION 'Child is paused';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS block_paused_child_buddy_trigger ON public.buddy_states;
CREATE TRIGGER block_paused_child_buddy_trigger
  BEFORE UPDATE ON public.buddy_states
  FOR EACH ROW EXECUTE FUNCTION public.block_paused_child_buddy();

-- "Wie speelt er?": the parent's children, oldest first, with their Buddy
-- (null until the child chose one) and whether they are paused.
CREATE OR REPLACE FUNCTION public.my_players()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', c.id,
           'name', c.name,
           'species', CASE WHEN b.species_school_year IS NOT NULL THEN b.species END,
           'paused', c.paused
         ) ORDER BY c.created_at, c.id), '[]'::jsonb)
    FROM children c
    LEFT JOIN buddy_states b ON b.child_id = c.id
   WHERE c.parent_id = auth.uid();
$$;
REVOKE EXECUTE ON FUNCTION public.my_players() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_players() TO authenticated;

-- The parent picks who keeps playing when there is not room for everyone.
CREATE OR REPLACE FUNCTION public.set_active_children(p_child_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Niet ingelogd';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(p_child_ids) AS x(id)
     WHERE NOT EXISTS (SELECT 1 FROM children WHERE id = x.id AND parent_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Unknown child';
  END IF;

  UPDATE children
     SET keep_active = (id = ANY(p_child_ids))
   WHERE parent_id = auth.uid();

  PERFORM sync_paused_children(auth.uid());
END;
$$;
REVOKE EXECUTE ON FUNCTION public.set_active_children(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_active_children(uuid[]) TO authenticated;

-- Switching package now also pauses or unpauses children.
CREATE OR REPLACE FUNCTION public.admin_set_subscription(
  p_user_id uuid,
  p_plan subscription_plan,
  p_status subscription_status
)
RETURNS public.subscriptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sub subscriptions;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can change a subscription'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Unknown user %', p_user_id
      USING ERRCODE = 'no_data_found';
  END IF;

  UPDATE subscriptions
     SET plan = p_plan,
         status = p_status,
         max_children = plan_max_children(p_plan),
         updated_at = now()
   WHERE id = (
     SELECT id FROM subscriptions
      WHERE user_id = p_user_id
      ORDER BY created_at DESC
      LIMIT 1
      FOR UPDATE
   )
  RETURNING * INTO v_sub;

  IF NOT FOUND THEN
    INSERT INTO subscriptions (user_id, plan, status, max_children)
    VALUES (p_user_id, p_plan, p_status, plan_max_children(p_plan))
    RETURNING * INTO v_sub;
  END IF;

  PERFORM sync_paused_children(p_user_id);

  RETURN v_sub;
END;
$$;

-- Bring every existing account in line with its package.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT DISTINCT parent_id FROM public.children WHERE parent_id IS NOT NULL LOOP
    PERFORM public.sync_paused_children(r.parent_id);
  END LOOP;
END;
$$;
