-- Let an admin switch an account between plans in one step.
--
-- Upgrades are still requested by mail and set by hand; this replaces editing
-- the subscriptions table directly. max_children always follows the plan, so
-- it can no longer drift from it.
--
-- Most parents have no subscriptions row yet (they count as free, 1 child).
-- The first switch creates one; later switches update the newest row.

CREATE OR REPLACE FUNCTION public.plan_max_children(p_plan subscription_plan)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_plan
    WHEN 'free'   THEN 1
    WHEN 'basic'  THEN 2
    WHEN 'family' THEN 5
    WHEN 'school' THEN 999  -- "onbeperkt"
  END;
$$;

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

  RETURN v_sub;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_subscription(uuid, subscription_plan, subscription_status) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_subscription(uuid, subscription_plan, subscription_status) TO authenticated;
