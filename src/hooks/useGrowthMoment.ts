import { useCallback, useEffect, useState } from 'react';

const key = (childId: string) => `leapio:buddy-growth-seen:${childId}`;

function readSeen(childId: string): number | null {
  try {
    const raw = window.localStorage.getItem(key(childId));
    return raw === null ? null : Number(raw);
  } catch {
    return null;
  }
}

function writeSeen(childId: string, stage: number) {
  try {
    window.localStorage.setItem(key(childId), String(stage));
  } catch {
    // Private mode / blocked storage: the worst case is seeing the party twice.
  }
}

/**
 * True once, when the Buddy has grown since this device last showed it.
 *
 * The very first visit on a device only records the current stage: a child
 * opening the app for the first time hasn't watched anything grow. Per device
 * rather than in the database, because a celebration replayed on a second
 * tablet is harmless and not worth a write per visit.
 */
export function useGrowthMoment(childId: string | undefined, stage: number, loaded: boolean) {
  const [grewFrom, setGrewFrom] = useState<number | null>(null);

  useEffect(() => {
    if (!childId || !loaded) return;
    const seen = readSeen(childId);
    if (seen === null || Number.isNaN(seen)) {
      writeSeen(childId, stage);
      return;
    }
    if (stage > seen) setGrewFrom(seen);
    else if (stage < seen) writeSeen(childId, stage);
  }, [childId, stage, loaded]);

  const dismiss = useCallback(() => {
    if (childId) writeSeen(childId, stage);
    setGrewFrom(null);
  }, [childId, stage]);

  return { grew: grewFrom !== null, dismiss };
}
