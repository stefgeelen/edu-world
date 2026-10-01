/** What complete_exercise reports about the Munten an exercise earned. */
export interface Payout {
  munten_earned?: number;
  /** How many of this type the child has done today, this one included. */
  times_today?: number;
  wish_fulfilled?: boolean;
  wish_bonus?: number;
}

/** Vanaf de derde keer per dag levert hetzelfde type minder op (practice_munten_for). */
const FULL_PAYOUT_TIMES = 2;

/**
 * The Buddy's line after an exercise. A Wish beats everything; past the second
 * repeat of the same type the Buddy nudges the child towards something else.
 */
export function payoutMessage(p: Payout): string | null {
  const earned = p.munten_earned ?? 0;
  if (earned <= 0) return null;
  if (p.wish_fulfilled) return `⭐ Wens vervuld! +${earned} 🪙 voor je Buddy!`;
  if ((p.times_today ?? 1) > FULL_PAYOUT_TIMES) {
    return `🪙 +${earned}. Deze ken ik al! Zullen we iets anders proberen?`;
  }
  return `🪙 +${earned} Munten voor je Buddy!`;
}
