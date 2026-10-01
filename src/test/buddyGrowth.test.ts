import { describe, it, expect } from 'vitest';
import { daysUntilNextGrowth, growthForm, phaseOfMonth, MAX_GROWTH_STAGE } from '@/lib/buddy/growth';
import { growthCountdown } from '@/lib/buddy/messages';

// Middag in Vlaanderen, zodat de UTC-datum en de lokale datum gelijk zijn.
const at = (y: number, m: number, d: number) => Date.UTC(y, m - 1, d, 11, 0, 0);

describe('phaseOfMonth', () => {
  it('follows the Flemish school calendar: sep-dec, jan-mar, apr-aug', () => {
    expect([9, 10, 11, 12].map(phaseOfMonth)).toEqual([1, 1, 1, 1]);
    expect([1, 2, 3].map(phaseOfMonth)).toEqual([2, 2, 2]);
    expect([4, 5, 6, 7, 8].map(phaseOfMonth)).toEqual([3, 3, 3, 3, 3]);
  });
});

describe('growthForm', () => {
  it('starts as a baby with nothing on, in the first trimester of the 1st grade', () => {
    expect(growthForm(1)).toMatchObject({ stage: 1, grade: 1, phase: 1, title: 'Baby Nootje', accessories: [] });
  });

  it('adds something small each trimester and grows a little', () => {
    const [t1, t2, t3] = [growthForm(1), growthForm(2), growthForm(3)];
    expect(t2.accessories).toEqual(['🍃']);
    expect(t3.accessories).toEqual(['🌼']);
    expect(t1.scale).toBeLessThan(t2.scale);
    expect(t2.scale).toBeLessThan(t3.scale);
    expect(new Set([t1.title, t2.title, t3.title]).size).toBe(1);
  });

  it('becomes a new form with each grade', () => {
    const titles = [1, 4, 7, 10, 13, 16].map((s) => growthForm(s).title);
    expect(new Set(titles).size).toBe(6);
    expect(growthForm(4)).toMatchObject({ grade: 2, phase: 1, accessories: ['🎀'] });
  });

  it('only ever grows: every stage is at least as big as the one before', () => {
    for (let s = 2; s <= MAX_GROWTH_STAGE; s++) {
      expect(growthForm(s).scale).toBeGreaterThanOrEqual(growthForm(s - 1).scale);
    }
    expect(growthForm(MAX_GROWTH_STAGE)).toMatchObject({ grade: 6, phase: 3, title: 'Wijze Nootje', scale: 1 });
  });

  it('clamps nonsense stages from the server instead of crashing', () => {
    expect(growthForm(0).stage).toBe(1);
    expect(growthForm(99).stage).toBe(MAX_GROWTH_STAGE);
    expect(growthForm(Number.NaN).stage).toBe(1);
  });
});

describe('daysUntilNextGrowth', () => {
  it('counts down to 1 January in the first trimester', () => {
    expect(daysUntilNextGrowth(at(2026, 9, 1))).toBe(122);
    expect(daysUntilNextGrowth(at(2026, 12, 31))).toBe(1);
  });

  it('counts down to 1 April in the second trimester', () => {
    expect(daysUntilNextGrowth(at(2026, 1, 5))).toBe(86);
    expect(daysUntilNextGrowth(at(2028, 3, 31))).toBe(1);
  });

  it('has no fixed date in the third trimester: the next growth is the new school year', () => {
    expect(daysUntilNextGrowth(at(2026, 4, 1))).toBeNull();
    expect(daysUntilNextGrowth(at(2026, 8, 31))).toBeNull();
  });

  it('uses the Flemish date, not UTC: 23:30 UTC on 31 December is already New Year', () => {
    expect(daysUntilNextGrowth(Date.UTC(2025, 11, 31, 23, 30))).toBe(90);
  });
});

describe('growthCountdown', () => {
  it('says how many days are left, and "morgen" on the last one', () => {
    expect(growthCountdown('Nootje', 12)).toBe('Nog 12 dagen tot Nootje groeit');
    expect(growthCountdown('Nootje', 1)).toBe('Morgen groeit Nootje!');
    expect(growthCountdown('Nootje', null)).toBeNull();
  });
});
