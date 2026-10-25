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

/** What the Buddy says after an exercise: the Munten it got, and one line. */
export interface PayoutLine {
  munten: number;
  text: string;
}

/**
 * The Buddy's line after an exercise. A Wish beats everything; past the second
 * repeat of the same type the Buddy nudges the child towards something else.
 * The amount stays apart from the text, so the toast can show "+8" while the
 * voice says "8 Munten" (a "+" or the English word "Buddy" came out wrong).
 */
export function payoutMessage(p: Payout): PayoutLine | null {
  const munten = p.munten_earned ?? 0;
  if (munten <= 0) return null;
  if (p.wish_fulfilled) return { munten, text: 'Mijn wens is vervuld!' };
  if ((p.times_today ?? 1) > FULL_PAYOUT_TIMES) {
    return { munten, text: 'Deze ken ik al! Zullen we iets anders proberen?' };
  }
  return { munten, text: 'Dankjewel!' };
}

/** How the voice says an amount: "1 Munt", "8 Munten". */
export function spokenMunten(munten: number): string {
  return `${munten} ${munten === 1 ? 'Munt' : 'Munten'}`;
}
