import { supabase } from '@/integrations/supabase/client';
import { isIos, isStandalone } from '@/lib/platform';
import { VAPID_PUBLIC_KEY } from '@/lib/pushConfig';

/**
 * Push notifications for parents (Web Push).
 *
 * The browser hands us an address per device; we store it with
 * `save_push_subscription` and the edge function send-push-notifications
 * delivers to it. What gets sent, and when, is decided in the database — see
 * supabase/migrations/20261024120000_parent_push_notifications.sql.
 */

export const SERVICE_WORKER_URL = '/sw.js';

/**
 * - `unsupported`    this browser cannot receive push (or push is not configured)
 * - `needs-install`  iPhone/iPad in the browser: only works from the home screen
 * - `denied`         the parent (or the browser) blocked notifications
 * - `off`            possible, not switched on on this device
 * - `on`             this device receives notifications
 */
export type PushStatus = 'unsupported' | 'needs-install' | 'denied' | 'off' | 'on';

function browserCanPush(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/** What this device can do, before asking anything. */
export function pushSupport(): 'supported' | 'needs-install' | 'unsupported' {
  if (!VAPID_PUBLIC_KEY) return 'unsupported';
  if (browserCanPush()) return 'supported';
  // iOS only exposes push to web apps opened from the home screen.
  if (isIos() && !isStandalone()) return 'needs-install';
  return 'unsupported';
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration('/');
  return registration ? registration.pushManager.getSubscription() : null;
}

/** This device's push address, or null when it has none (or cannot have one). */
export async function currentPushEndpoint(): Promise<string | null> {
  if (!browserCanPush()) return null;
  const subscription = await currentSubscription();
  return subscription?.endpoint ?? null;
}

/** "je iPhone", "je computer"… from a stored user agent, for "also on" lines. */
export function deviceLabel(userAgent: string | null): string {
  const ua = userAgent ?? '';
  if (/iPhone/.test(ua)) return 'je iPhone';
  if (/iPad/.test(ua)) return 'je iPad';
  if (/Android/.test(ua)) return /Mobile/.test(ua) ? 'je Android-telefoon' : 'je Android-tablet';
  if (/Macintosh|Windows|Linux|CrOS/.test(ua)) return 'je computer';
  return 'een ander toestel';
}

async function saveSubscription(subscription: PushSubscription): Promise<void> {
  const json = subscription.toJSON();
  const { error } = await supabase.rpc('save_push_subscription', {
    p_endpoint: subscription.endpoint,
    p_p256dh: json.keys?.p256dh ?? '',
    p_auth: json.keys?.auth ?? '',
    p_user_agent: navigator.userAgent,
  });
  if (error) throw error;
}

/**
 * The state of this device. When it is on, the address is saved again: that
 * ties it to whoever is logged in now (another parent on the same browser).
 */
export async function readPushStatus(): Promise<PushStatus> {
  const support = pushSupport();
  if (support !== 'supported') return support;
  if (Notification.permission === 'denied') return 'denied';

  const subscription = await currentSubscription();
  if (!subscription || Notification.permission !== 'granted') return 'off';

  await saveSubscription(subscription);
  return 'on';
}

function base64UrlToBytes(base64Url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/**
 * Ask permission and subscribe this device. Call straight from a tap: Safari
 * only shows the permission prompt for a user gesture, so the prompt comes
 * before anything else is awaited.
 */
export async function enablePush(): Promise<PushStatus> {
  const support = pushSupport();
  if (support !== 'supported') return support;

  const permission = await Notification.requestPermission();
  if (permission === 'denied') return 'denied';
  if (permission !== 'granted') return 'off';

  const registration = await navigator.serviceWorker.register(SERVICE_WORKER_URL, { scope: '/' });
  await navigator.serviceWorker.ready;

  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToBytes(VAPID_PUBLIC_KEY),
    }));

  await saveSubscription(subscription);
  return 'on';
}

/** Stop notifications on this device (other devices of the parent keep them). */
export async function disablePush(): Promise<PushStatus> {
  const subscription = await currentSubscription();
  if (subscription) {
    const { error } = await supabase.rpc('remove_push_subscription', { p_endpoint: subscription.endpoint });
    if (error) throw error;
    await subscription.unsubscribe();
  }
  return 'off';
}
