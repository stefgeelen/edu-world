import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import webpush from 'npm:web-push@3.6.7';
import { requireUser } from '../_shared/requireUser.ts';

// Sends parent push notifications (Web Push). Two callers:
//   * pg_cron, every 15 minutes inside the send window, with the shared secret
//     from Vault in x-push-cron-secret. Asks push_claim_due() who gets what now; that
//     function holds every rule (window, caps, priorities) and logs each
//     notification as 'pending' before we send it.
//   * A signed-in parent, body { test: true }: one test notification to their
//     own devices (push_claim_test, at most 3 an hour).
// See supabase/migrations/20261024120000_parent_push_notifications.sql.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

/** A Buddy message is stale by tomorrow; the push service may drop it after this. */
const TTL_SECONDS = 4 * 60 * 60;
const SEND_TIMEOUT_MS = 10_000;

interface PushNotificationRow {
  id: string;
  parent_id: string;
  child_id: string | null;
  kind: string;
  title: string;
  body: string;
  url: string;
}

interface SubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Sends one logged notification to every device of its parent and records the outcome. */
async function deliver(admin: SupabaseClient, n: PushNotificationRow): Promise<number> {
  const { data: subs, error } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('parent_id', n.parent_id);
  if (error) throw error;

  const payload = JSON.stringify({
    title: n.title,
    body: n.body,
    url: n.url,
    // Same kind for the same child replaces the older one on the lock screen.
    tag: `${n.kind}:${n.child_id ?? 'test'}`,
  });

  let delivered = 0;
  await Promise.all(
    ((subs ?? []) as SubscriptionRow[]).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
          { TTL: TTL_SECONDS, urgency: 'normal', timeout: SEND_TIMEOUT_MS },
        );
        delivered += 1;
        await admin.from('push_subscriptions').update({ last_success_at: new Date().toISOString() }).eq('id', s.id);
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        // Gone or unknown: the parent switched notifications off or removed the app.
        if (status === 404 || status === 410) {
          await admin.from('push_subscriptions').delete().eq('id', s.id);
        } else {
          console.error('push send failed', status, (e as Error).message);
        }
      }
    }),
  );

  const { error: updErr } = await admin
    .from('push_notifications')
    .update({
      status: delivered > 0 ? 'sent' : 'failed',
      devices: delivered,
      sent_at: delivered > 0 ? new Date().toISOString() : null,
    })
    .eq('id', n.id);
  if (updErr) console.error('push log update failed', updErr.message);

  return delivered;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const privateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    if (!publicKey || !privateKey) return json({ error: 'Push is not configured' }, 500);
    webpush.setVapidDetails('mailto:info@leapio.be', publicKey, privateKey);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // The cron secret lives in Vault only (created by the migration).
    const cronHeader = req.headers.get('x-push-cron-secret');
    let isCron = false;
    if (cronHeader) {
      const { data: cronSecret, error: secretErr } = await admin.rpc('_push_cron_secret');
      if (secretErr) throw secretErr;
      isCron = typeof cronSecret === 'string' && cronSecret.length > 0 && cronHeader === cronSecret;
      if (!isCron) return json({ error: 'Unauthorized' }, 401);
    }

    if (isCron) {
      const { data, error } = await admin.rpc('push_claim_due');
      if (error) throw error;
      const due = (data ?? []) as PushNotificationRow[];
      let sent = 0;
      for (const n of due) {
        if ((await deliver(admin, n)) > 0) sent += 1;
      }
      return json({ due: due.length, sent });
    }

    // A parent testing their own device.
    const user = await requireUser(req);
    if (!user) return json({ error: 'Unauthorized' }, 401);

    let body: { test?: boolean } = {};
    try {
      body = await req.json();
    } catch {
      return json({ error: 'Invalid body' }, 400);
    }
    if (body?.test !== true) return json({ error: 'Invalid body' }, 400);

    const asUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } },
    );
    const { data: claimed, error: claimErr } = await asUser.rpc('push_claim_test');
    if (claimErr) {
      if (claimErr.message.includes('Too many')) return json({ error: 'Too many test notifications' }, 429);
      throw claimErr;
    }

    const devices = await deliver(admin, claimed as PushNotificationRow);
    return json({ devices });
  } catch (e) {
    return json({ error: 'Unexpected error', details: (e as Error).message }, 500);
  }
});
