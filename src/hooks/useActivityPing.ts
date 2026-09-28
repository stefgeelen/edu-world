import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useCurrentChild } from '@/hooks/useCompleteExercise';
import { isStandalone } from '@/lib/platform';

/**
 * Records that this account — and, when one is selected, this child — had the
 * app open. Without it the only usage signal in the database is a completed
 * exercise, so an account that opens Leapio daily and stalls before the first
 * question is indistinguishable from one that never came back.
 *
 * Deliberately fire-and-forget: this is telemetry sitting alongside a
 * six-year-old's session, and a failed ping must never surface anything.
 */

const THROTTLE_MS = 5 * 60 * 1000;

let lastPingAt = 0;
let lastChildId: string | undefined;

/** Test seam — the throttle is module state and would leak between cases. */
export function __resetActivityPing() {
  lastPingAt = 0;
  lastChildId = undefined;
}

export function useActivityPing() {
  const { user } = useAuth();
  const { data: child } = useCurrentChild();
  const childId = child?.id;

  useEffect(() => {
    if (!user) return;

    const ping = () => {
      // A newly selected child pings immediately: otherwise its first session
      // would fall inside the throttle window opened by the parent's own load
      // and last_opened_at would stay null for five minutes.
      const childChanged = childId !== lastChildId;
      if (!childChanged && Date.now() - lastPingAt < THROTTLE_MS) return;

      lastPingAt = Date.now();
      lastChildId = childId;

      void supabase
        .rpc('touch_activity', {
          p_child_id: childId ?? null,
          // Read per ping rather than once: a home-screen launch and a browser
          // tab are different sessions of the same account.
          p_standalone: isStandalone(),
        })
        .then(() => undefined, () => undefined);
    };

    ping();

    const onVisible = () => {
      if (document.visibilityState === 'visible') ping();
    };

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [user, childId]);
}

/** Mounted once, high in the tree, so every signed-in route reports activity. */
export function ActivityTracker() {
  useActivityPing();
  return null;
}
