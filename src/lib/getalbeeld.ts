/*
 * Getalbeelden as the class uses them: two rows, filled column by column
 * from the left (top first, then bottom). So 1 is one dot top left, 2 is two
 * dots under each other, 3 is two on top and one below, 5 is three on top and
 * two below, 10 is two rows of five. Only the dots are drawn, no empty places.
 * Above 10 every ten gets its own picture, side by side.
 */

/** Tailwind classes for one getalbeeld (up to 10 children). */
export const GETALBEELD_GRID = 'grid grid-rows-2 grid-flow-col';

/** Splits a count into getalbeelden of at most ten: 13 → [10, 3]. */
export function inTens(count: number): number[] {
  const groups: number[] = [];
  for (let left = count; left > 0; left -= 10) groups.push(Math.min(10, left));
  return groups;
}
