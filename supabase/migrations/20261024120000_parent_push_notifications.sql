-- Pushmeldingen voor ouders: de ouder aansporen om het kind te laten oefenen.
--
-- Twee soorten in v1:
--   * De Buddy mist je kind (de Buddy spreekt). Volgt de trap van het verval:
--     een Need kritiek (buddy_needs) → ziek (buddy_ill) → vertrokken (buddy_gone).
--   * Een nieuw rood aandachtspunt (insight, Leapio spreekt): ≥2 pogingen en
--     ≥75% moeizaam, zelfde regel als het rode label in ParentChildDetail.
--
-- Spelregels, allemaal hier beslist:
--   * Hooguit 1 melding per ouder per dag, en 3 per 7 dagen. Buddy gaat voor.
--   * Alleen binnen een venster (Europe/Brussels): ma/di/do/vr 16:00–18:30,
--     wo 13:00–18:30, za/zo 10:00–18:00.
--   * Dezelfde Buddy-trede voor hetzelfde kind niet opnieuw binnen 3 dagen
--     (vertrokken: 7 dagen); hetzelfde aandachtspunt niet opnieuw binnen 60 dagen.
--   * Gepauzeerde kinderen tellen niet mee.
--   * Schakelaar in Admin → Meldingen: uit / alleen admins / iedereen. Start uit.
--
-- Hoe het loopt: pg_cron roept elke 15 minuten (enkel binnen het venster) de
-- edge function send-push-notifications aan. Die vraagt push_claim_due() welke
-- meldingen nu weg moeten (die zet ze meteen in het logboek, zodat twee runs
-- nooit dubbel sturen) en verstuurt ze via Web Push.
--
-- De wekker bewijst zich met een gedeeld geheim (header x-push-cron-secret).
-- De database maakt het zelf aan in Vault, zodat het nergens in tekst staat;
-- de edge function leest het via _push_cron_secret(). Handmatig (geheim, dus
-- niet hier): VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY als function secrets.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- =============================================
-- 1. De schakelaar
-- =============================================
CREATE TABLE public.push_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  mode text NOT NULL DEFAULT 'off' CHECK (mode IN ('off', 'admins', 'all')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.push_settings (id) VALUES (true) ON CONFLICT DO NOTHING;

ALTER TABLE public.push_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view push settings"
  ON public.push_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.admin_set_push_mode(p_mode text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_mode NOT IN ('off', 'admins', 'all') THEN
    RAISE EXCEPTION 'Invalid mode';
  END IF;
  UPDATE push_settings SET mode = p_mode, updated_at = now() WHERE id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_set_push_mode(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_push_mode(text) TO authenticated;

-- Het geheim van de wekker: willekeurig, enkel in Vault.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'push_cron_secret') THEN
    PERFORM vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'push_cron_secret',
      'Gedeeld geheim tussen pg_cron en de edge function send-push-notifications'
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public._push_cron_secret()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'push_cron_secret';
$$;

REVOKE EXECUTE ON FUNCTION public._push_cron_secret() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._push_cron_secret() TO service_role;

-- =============================================
-- 2. Toestellen (één rij per browser die meldingen toeliet)
-- =============================================
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_success_at timestamptz
);

CREATE INDEX idx_push_subscriptions_parent ON public.push_subscriptions (parent_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can view own push subscriptions"
  ON public.push_subscriptions FOR SELECT TO authenticated
  USING (parent_id = auth.uid());

-- Geen INSERT/DELETE-policy: schrijven gaat via de twee functies hieronder.

-- Een toestel hoort bij wie er nu ingelogd is: logt een andere ouder in op
-- dezelfde browser, dan verhuist het adres mee.
CREATE OR REPLACE FUNCTION public.save_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_endpoint IS NULL OR p_endpoint NOT LIKE 'https://%' OR length(p_endpoint) > 2000
     OR coalesce(length(p_p256dh), 0) NOT BETWEEN 1 AND 200
     OR coalesce(length(p_auth), 0) NOT BETWEEN 1 AND 200 THEN
    RAISE EXCEPTION 'Invalid subscription';
  END IF;

  INSERT INTO push_subscriptions (parent_id, endpoint, p256dh, auth, user_agent)
  VALUES (auth.uid(), p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300))
  ON CONFLICT (endpoint) DO UPDATE
    SET parent_id = EXCLUDED.parent_id,
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        user_agent = EXCLUDED.user_agent;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.save_push_subscription(text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_push_subscription(text, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.remove_push_subscription(p_endpoint text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  DELETE FROM push_subscriptions WHERE endpoint = p_endpoint AND parent_id = auth.uid();
$$;

REVOKE EXECUTE ON FUNCTION public.remove_push_subscription(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_push_subscription(text) TO authenticated;

-- =============================================
-- 3. Welke soorten de ouder wil (geen rij = alles aan)
-- =============================================
CREATE TABLE public.push_preferences (
  parent_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  buddy boolean NOT NULL DEFAULT true,
  insights boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.push_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can view own push preferences"
  ON public.push_preferences FOR SELECT TO authenticated
  USING (parent_id = auth.uid());

CREATE POLICY "Parents can insert own push preferences"
  ON public.push_preferences FOR INSERT TO authenticated
  WITH CHECK (parent_id = auth.uid());

CREATE POLICY "Parents can update own push preferences"
  ON public.push_preferences FOR UPDATE TO authenticated
  USING (parent_id = auth.uid())
  WITH CHECK (parent_id = auth.uid());

-- =============================================
-- 4. Logboek: elke melding die vertrok (of probeerde te vertrekken)
-- =============================================
CREATE TABLE public.push_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id uuid REFERENCES public.children(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('buddy_needs', 'buddy_ill', 'buddy_gone', 'insight', 'test')),
  exercise_id uuid REFERENCES public.exercises(id) ON DELETE SET NULL,
  title text NOT NULL,
  body text NOT NULL,
  url text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  devices integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);

CREATE INDEX idx_push_notifications_parent ON public.push_notifications (parent_id, created_at DESC);
CREATE INDEX idx_push_notifications_child ON public.push_notifications (child_id, kind, created_at DESC);

ALTER TABLE public.push_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view push notifications"
  ON public.push_notifications FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- 5. Het venster
-- =============================================
CREATE OR REPLACE FUNCTION public._push_in_window(p_at timestamptz)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN EXTRACT(ISODOW FROM l) IN (6, 7) THEN l::time >= time '10:00' AND l::time < time '18:00'
    WHEN EXTRACT(ISODOW FROM l) = 3 THEN l::time >= time '13:00' AND l::time < time '18:30'
    ELSE l::time >= time '16:00' AND l::time < time '18:30'
  END
  FROM (SELECT p_at AT TIME ZONE 'Europe/Brussels' AS l) AS t;
$$;

-- Of de wekker de edge function nu moet wekken: schakelaar aan en binnen het venster.
CREATE OR REPLACE FUNCTION public._push_cron_active()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM push_settings WHERE id AND mode <> 'off')
     AND _push_in_window(now());
$$;

REVOKE EXECUTE ON FUNCTION public._push_in_window(timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._push_cron_active() FROM PUBLIC, anon, authenticated;

-- =============================================
-- 6. De teksten
-- =============================================
CREATE OR REPLACE FUNCTION public._buddy_display_name(p_species text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_species
    WHEN 'vosje' THEN 'Vosje'
    WHEN 'prikkel' THEN 'Prikkel'
    WHEN 'loeka' THEN 'Loeka'
    ELSE 'Nootje'
  END;
$$;

REVOKE EXECUTE ON FUNCTION public._buddy_display_name(text) FROM PUBLIC, anon, authenticated;

-- =============================================
-- 7. push_claim_due: wie krijgt nu welke melding?
--
-- Alleen voor de edge function (service role). Schrijft de gekozen meldingen
-- meteen als 'pending' in het logboek en geeft ze terug; de edge function zet
-- ze daarna op 'sent' of 'failed'. Een 'failed' telt niet mee voor de limieten.
-- =============================================
CREATE OR REPLACE FUNCTION public.push_claim_due()
RETURNS SETOF public.push_notifications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_mode text;
  v_today date := (now() AT TIME ZONE 'Europe/Brussels')::date;
  v_parent uuid;
  v_pref_buddy boolean;
  v_pref_insights boolean;
  v_child record;
  v_state buddy_states%ROWTYPE;
  v_kind text;
  v_rank integer;
  v_best_rank integer;
  v_best_kind text;
  v_best_child record;
  v_best_state buddy_states%ROWTYPE;
  v_lowest text;
  v_buddy text;
  v_insight record;
  v_row push_notifications%ROWTYPE;
BEGIN
  -- Twee runs tegelijk (een trage vorige run) mogen nooit dezelfde ouder kiezen.
  IF NOT pg_try_advisory_xact_lock(hashtext('push_claim_due')) THEN
    RETURN;
  END IF;

  SELECT mode INTO v_mode FROM push_settings WHERE id;
  IF coalesce(v_mode, 'off') = 'off' OR NOT _push_in_window(now()) THEN
    RETURN;
  END IF;

  FOR v_parent IN
    SELECT DISTINCT s.parent_id
      FROM push_subscriptions s
     WHERE (v_mode = 'all' OR public.has_role(s.parent_id, 'admin'))
       AND NOT EXISTS (
         SELECT 1 FROM push_notifications n
          WHERE n.parent_id = s.parent_id
            AND n.kind <> 'test'
            AND n.status <> 'failed'
            AND (n.created_at AT TIME ZONE 'Europe/Brussels')::date = v_today
       )
       AND (
         SELECT count(*) FROM push_notifications n
          WHERE n.parent_id = s.parent_id
            AND n.kind <> 'test'
            AND n.status <> 'failed'
            AND n.created_at > now() - interval '7 days'
       ) < 3
  LOOP
    SELECT coalesce(p.buddy, true), coalesce(p.insights, true)
      INTO v_pref_buddy, v_pref_insights
      FROM (SELECT 1) AS one
      LEFT JOIN push_preferences p ON p.parent_id = v_parent;

    v_best_rank := 0;
    v_best_kind := NULL;

    -- De Buddy eerst: de hoogste trede over alle kinderen van deze ouder.
    IF v_pref_buddy THEN
      FOR v_child IN
        SELECT c.id, c.name
          FROM children c
          JOIN buddy_states b ON b.child_id = c.id
         WHERE c.parent_id = v_parent AND NOT c.paused
         ORDER BY c.created_at, c.id
      LOOP
        v_state := _buddy_tick(v_child.id);

        IF v_state.dead THEN
          v_kind := 'buddy_gone'; v_rank := 3;
        ELSIF (v_state.needs ->> 'health')::numeric <= 0 THEN
          v_kind := 'buddy_ill'; v_rank := 2;
        ELSIF LEAST(
                (v_state.needs ->> 'hunger')::numeric,
                (v_state.needs ->> 'fun')::numeric,
                (v_state.needs ->> 'energy')::numeric,
                (v_state.needs ->> 'hygiene')::numeric
              ) < 20 THEN
          v_kind := 'buddy_needs'; v_rank := 1;
        ELSE
          CONTINUE;
        END IF;

        IF v_rank <= v_best_rank THEN CONTINUE; END IF;

        IF EXISTS (
          SELECT 1 FROM push_notifications n
           WHERE n.child_id = v_child.id
             AND n.kind = v_kind
             AND n.status <> 'failed'
             AND n.created_at > now() - CASE WHEN v_kind = 'buddy_gone' THEN interval '7 days' ELSE interval '3 days' END
        ) THEN
          CONTINUE;
        END IF;

        v_best_rank := v_rank;
        v_best_kind := v_kind;
        v_best_child := v_child;
        v_best_state := v_state;
      END LOOP;
    END IF;

    IF v_best_kind IS NOT NULL THEN
      v_buddy := _buddy_display_name(v_best_state.species);

      IF v_best_kind = 'buddy_gone' THEN
        INSERT INTO push_notifications (parent_id, child_id, kind, title, body, url)
        VALUES (
          v_parent, v_best_child.id, v_best_kind,
          v_buddy || ' is even op avontuur',
          v_best_child.name || ' kan ' || v_buddy || ' nu niet verzorgen. Je kan ' || v_buddy
            || ' terughalen in het ouderportaal.',
          '/app/parent/child/' || v_best_child.id
        )
        RETURNING * INTO v_row;
      ELSIF v_best_kind = 'buddy_ill' THEN
        INSERT INTO push_notifications (parent_id, child_id, kind, title, body, url)
        VALUES (
          v_parent, v_best_child.id, v_best_kind,
          v_buddy || ' voelt zich niet zo goed 💚',
          v_buddy || ' kreeg al even geen zorg. Komt ' || v_best_child.name || ' vandaag langs?',
          '/app'
        )
        RETURNING * INTO v_row;
      ELSE
        -- De laagste Need bepaalt de zin.
        SELECT k INTO v_lowest
          FROM (VALUES ('hunger'), ('fun'), ('energy'), ('hygiene')) AS needs(k)
         ORDER BY (v_best_state.needs ->> k)::numeric, k
         LIMIT 1;

        INSERT INTO push_notifications (parent_id, child_id, kind, title, body, url)
        VALUES (
          v_parent, v_best_child.id, v_best_kind,
          v_buddy || ' mist ' || v_best_child.name || ' 🥺',
          v_buddy || CASE v_lowest
              WHEN 'hunger' THEN ' heeft honger.'
              WHEN 'fun' THEN ' verveelt zich.'
              WHEN 'energy' THEN ' is heel moe.'
              ELSE ' moet nodig in bad.'
            END
            || ' Een oefening en wat zorg, en ' || v_buddy || ' is weer blij!',
          '/app'
        )
        RETURNING * INTO v_row;
      END IF;

      RETURN NEXT v_row;
      CONTINUE;
    END IF;

    -- Anders: een nieuw rood aandachtspunt, recent geoefend.
    IF v_pref_insights THEN
      SELECT c.id AS child_id, c.name AS child_name, e.id AS exercise_id, e.title, e.subject::text AS subject
        INTO v_insight
        FROM children c
        CROSS JOIN LATERAL (
          SELECT t.exercise_id,
                 count(*) AS tries,
                 count(*) FILTER (WHERE t.struggle) AS struggles,
                 max(t.at) AS last_at
            FROM (
              SELECT x.*, row_number() OVER (PARTITION BY x.exercise_id ORDER BY x.at DESC) AS rn
                FROM (
                  SELECT ea.exercise_id, ea.completed_at AS at, ea.stars < 2 AS struggle
                    FROM exercise_attempts ea
                   WHERE ea.child_id = c.id
                  UNION ALL
                  SELECT ia.exercise_id, ia.created_at, true
                    FROM exercise_incomplete_attempts ia
                   WHERE ia.child_id = c.id
                ) AS x
            ) AS t
           WHERE t.rn <= 10
           GROUP BY t.exercise_id
        ) AS s
        JOIN exercises e ON e.id = s.exercise_id
       WHERE c.parent_id = v_parent
         AND NOT c.paused
         AND NOT e.admin_only
         AND s.tries >= 2
         AND s.struggles::numeric / s.tries >= 0.75
         AND s.last_at > now() - interval '7 days'
         AND NOT EXISTS (
           SELECT 1 FROM push_notifications n
            WHERE n.child_id = c.id
              AND n.kind = 'insight'
              AND n.exercise_id = e.id
              AND n.status <> 'failed'
              AND n.created_at > now() - interval '60 days'
         )
       ORDER BY s.struggles::numeric / s.tries DESC, s.tries DESC, c.created_at, e.id
       LIMIT 1;

      IF FOUND THEN
        INSERT INTO push_notifications (parent_id, child_id, kind, exercise_id, title, body, url)
        VALUES (
          v_parent, v_insight.child_id, 'insight', v_insight.exercise_id,
          v_insight.child_name || ' vindt ' || v_insight.title || ' nog moeilijk',
          CASE v_insight.subject
            WHEN 'math' THEN 'Tip: reken eens samen, aan tafel of in de winkel.'
            WHEN 'reading' THEN 'Tip: lees eens samen een kort stukje, om de beurt.'
            WHEN 'writing' THEN 'Tip: schrijf eens samen een boodschappenlijstje.'
            WHEN 'geometry' THEN 'Tip: zoek samen lijnen en hoeken in huis.'
            ELSE 'Tip: oefen het eens samen.'
          END || ' In het ouderportaal zie je waar het knelt.',
          '/app/parent/child/' || v_insight.child_id
        )
        RETURNING * INTO v_row;

        RETURN NEXT v_row;
      END IF;
    END IF;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.push_claim_due() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.push_claim_due() TO service_role;

-- =============================================
-- 8. Testmelding: de ouder probeert het eigen toestel (max 3 per uur)
-- =============================================
CREATE OR REPLACE FUNCTION public.push_claim_test()
RETURNS public.push_notifications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row push_notifications%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF (
    SELECT count(*) FROM push_notifications
     WHERE parent_id = auth.uid() AND kind = 'test' AND created_at > now() - interval '1 hour'
  ) >= 3 THEN
    RAISE EXCEPTION 'Too many test notifications';
  END IF;

  INSERT INTO push_notifications (parent_id, kind, title, body, url)
  VALUES (
    auth.uid(), 'test',
    'Meldingen staan aan 🎉',
    'Zo laat Leapio je weten wanneer de Buddy je kind mist.',
    '/app/parent/account'
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.push_claim_test() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.push_claim_test() TO authenticated;

-- =============================================
-- 9. Cijfers voor Admin → Meldingen
-- =============================================
CREATE OR REPLACE FUNCTION public.admin_push_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  WITH sent AS (
    SELECT n.*,
           EXISTS (
             SELECT 1
               FROM exercise_attempts ea
               JOIN children c ON c.id = ea.child_id
              WHERE c.parent_id = n.parent_id
                AND ea.completed_at BETWEEN n.sent_at AND n.sent_at + interval '24 hours'
           ) AS played_24h
      FROM push_notifications n
     WHERE n.status = 'sent' AND n.kind <> 'test'
       AND n.sent_at > now() - interval '30 days'
  )
  SELECT jsonb_build_object(
    'mode', (SELECT mode FROM push_settings WHERE id),
    'parents_total', (SELECT count(DISTINCT parent_id) FROM children WHERE parent_id IS NOT NULL),
    'parents_with_push', (SELECT count(DISTINCT parent_id) FROM push_subscriptions),
    'devices', (SELECT count(*) FROM push_subscriptions),
    'sent_7d', (SELECT count(*) FROM sent WHERE sent_at > now() - interval '7 days'),
    'sent_30d', (SELECT count(*) FROM sent),
    'failed_30d', (
      SELECT count(*) FROM push_notifications
       WHERE status = 'failed' AND kind <> 'test' AND created_at > now() - interval '30 days'
    ),
    -- Alleen meldingen van minstens 24 uur oud: anders telt een melding van
    -- vijf minuten geleden als "niet gespeeld".
    'measured_30d', (SELECT count(*) FROM sent WHERE sent_at <= now() - interval '24 hours'),
    'played_24h_30d', (SELECT count(*) FROM sent WHERE sent_at <= now() - interval '24 hours' AND played_24h),
    'by_kind', coalesce((
      SELECT jsonb_object_agg(kind, jsonb_build_object(
               'sent', cnt,
               'measured', measured,
               'played_24h', played))
        FROM (
          SELECT kind,
                 count(*) AS cnt,
                 count(*) FILTER (WHERE sent_at <= now() - interval '24 hours') AS measured,
                 count(*) FILTER (WHERE sent_at <= now() - interval '24 hours' AND played_24h) AS played
            FROM sent
           GROUP BY kind
        ) AS k
    ), '{}'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_push_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_push_stats() TO authenticated;

-- =============================================
-- 10. De wekker: elke 15 minuten, maar alleen een oproep als het nodig is
-- =============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-push-notifications') THEN
    PERFORM cron.unschedule('send-push-notifications');
  END IF;
END;
$$;

SELECT cron.schedule(
  'send-push-notifications',
  '*/15 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://txtrbkbthibwgopzdbnq.supabase.co/functions/v1/send-push-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-push-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'push_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  )
  WHERE public._push_cron_active();
  $cron$
);
