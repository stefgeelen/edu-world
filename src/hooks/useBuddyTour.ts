import { useCallback, useState } from 'react';

/**
 * Korte rondleiding bij het eerste bezoek aan de Buddy Room: de Buddy legt zelf
 * uit waar je tikt.
 *
 * - `poke`: tik op de Buddy
 * - `feed`: geef hem eten (eindigt zodra een Care Action lukt)
 * - `done`: uitleg over munten en de Winkel, met een Klaar-knop
 */
export type BuddyTourStep = 'poke' | 'feed' | 'done';

const NEXT: Record<BuddyTourStep, BuddyTourStep | null> = { poke: 'feed', feed: 'done', done: null };

const storageKey = (childId: string) => `leapio:buddy-tour-done:${childId}`;

// Per kind en per toestel: een broer of zus op hetzelfde toestel krijgt de
// rondleiding ook. Lukt opslaan niet (privévenster), dan komt hij gewoon terug —
// hij is altijd over te slaan.
function readSeen(childId: string) {
  try {
    return localStorage.getItem(storageKey(childId)) === '1';
  } catch {
    return false;
  }
}

export function useBuddyTour(childId: string | undefined) {
  const [current, setCurrent] = useState<BuddyTourStep>('poke');
  const [finishedFor, setFinishedFor] = useState<string | null>(null);

  // Synchroon tijdens het renderen gelezen, zodat het scherm bij de eerste
  // render al weet of het een rondleiding toont (en niet eerst iets anders zegt).
  const active = !!childId && finishedFor !== childId && !readSeen(childId);

  const finish = useCallback(() => {
    if (!childId) return;
    setFinishedFor(childId);
    try {
      localStorage.setItem(storageKey(childId), '1');
    } catch {
      /* zie readSeen */
    }
  }, [childId]);

  /** Gaat alleen verder als de rondleiding nog op `from` staat, zodat dubbele signalen niets overslaan. */
  const advance = useCallback(
    (from: BuddyTourStep) => {
      setCurrent((s) => (s === from ? (NEXT[s] ?? s) : s));
      if (from === 'done') finish();
    },
    [finish]
  );

  return { step: active ? current : null, advance, finish };
}
