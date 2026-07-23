import { describe, it, expect } from 'vitest';

// Scratch file used while debugging jsdom's missing PointerEvent constructor
// and other selector quirks for ExerciseClock/ExerciseNumberLine tests. Left
// as a no-op rather than deleted because this mounted folder doesn't allow
// removing files once written — safe to delete by hand.
describe.skip('scratch (unused)', () => {
  it('is intentionally empty', () => {
    expect(true).toBe(true);
  });
});
