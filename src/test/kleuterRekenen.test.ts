import { describe, it, expect } from 'vitest';
import { mulberry32 } from '@/lib/seededRandom';
import {
  KLEUTER_ROUNDS, howManyQuestionText, howManyRound, kleuterMax, moreLessRound, numberMatchRound, threeCounts,
} from '@/lib/kleuterRekenen';

// Rekenen in de 3de kleuterklas: tellen tot 5, 7 of 10, tien vragen per keer.

const seeds = Array.from({ length: 40 }, (_, i) => i + 1);

describe('kleuterMax', () => {
  it('counts further each trimester', () => {
    expect([1, 2, 3].map(kleuterMax)).toEqual([5, 7, 10]);
    expect(kleuterMax('2')).toBe(7);
    expect(kleuterMax(undefined)).toBe(10);
  });
});

describe('threeCounts', () => {
  it('always holds the answer and two other counts within reach', () => {
    for (const seed of seeds) {
      const rng = mulberry32(seed);
      for (let answer = 1; answer <= 5; answer++) {
        const c = threeCounts(answer, 5, rng);
        expect(new Set(c).size).toBe(3);
        expect(c).toContain(answer);
        for (const n of c) {
          expect(n).toBeGreaterThanOrEqual(1);
          expect(n).toBeLessThanOrEqual(5);
          expect(Math.abs(n - answer)).toBeLessThanOrEqual(3);
        }
      }
    }
  });

  it('does not always put the answer in the middle', () => {
    const rng = mulberry32(7);
    const middle = Array.from({ length: 60 }, () => {
      const c = [...threeCounts(5, 10, rng)].sort((a, b) => a - b);
      return c[1] === 5;
    });
    expect(middle.filter(Boolean).length).toBeLessThan(55);
  });
});

describe('howManyRound', () => {
  it('asks ten counts up to the trimester\'s maximum, never the same twice in a row', () => {
    for (const seed of seeds) {
      const round = howManyRound(5, mulberry32(seed));
      expect(round).toHaveLength(KLEUTER_ROUNDS);
      round.forEach((q, i) => {
        expect(q.group.count).toBeGreaterThanOrEqual(1);
        expect(q.group.count).toBeLessThanOrEqual(5);
        expect(q.choices).toContain(q.group.count);
        if (i > 0) expect(q.group.count).not.toBe(round[i - 1].group.count);
      });
    }
  });

  it('only shows a dice up to six', () => {
    for (const seed of seeds) {
      for (const q of howManyRound(10, mulberry32(seed))) {
        if (q.group.look === 'dice') expect(q.group.count).toBeLessThanOrEqual(6);
      }
    }
  });

  it('asks for the thing, or for dots on a dice or a getalbeeld', () => {
    const thing = { emoji: '🍎', plural: 'appels' };
    expect(howManyQuestionText({ count: 3, look: 'things', thing })).toBe('Hoeveel appels zie je?');
    expect(howManyQuestionText({ count: 3, look: 'dice', thing })).toBe('Hoeveel stippen staan er op de dobbelsteen?');
    expect(howManyQuestionText({ count: 3, look: 'getalbeeld', thing })).toBe('Hoeveel stippen zie je?');
  });
});

describe('moreLessRound', () => {
  it('points at the side with more or fewer, or at evenveel', () => {
    for (const seed of seeds) {
      for (const q of moreLessRound(10, mulberry32(seed))) {
        const { left, right } = q;
        if (left.count === right.count) expect(q.answer).toBe('equal');
        else if (q.ask === 'meer') expect(q.answer).toBe(left.count > right.count ? 'left' : 'right');
        else expect(q.answer).toBe(left.count < right.count ? 'left' : 'right');
        expect(left.thing).toBe(right.thing);
      }
    }
  });

  it('keeps unequal sides at least two apart above five, so a kleuter can tell', () => {
    for (const seed of seeds) {
      for (const q of moreLessRound(10, mulberry32(seed))) {
        if (q.answer !== 'equal') expect(Math.abs(q.left.count - q.right.count)).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('sometimes has evenveel, but not most of the time', () => {
    const all = seeds.flatMap((seed) => moreLessRound(7, mulberry32(seed)));
    const equal = all.filter((q) => q.answer === 'equal').length;
    expect(equal).toBeGreaterThan(0);
    expect(equal).toBeLessThan(all.length / 3);
  });
});

describe('numberMatchRound', () => {
  it('has exactly one group with the asked number, all drawn the same way', () => {
    for (const seed of seeds) {
      for (const q of numberMatchRound(7, mulberry32(seed))) {
        expect(q.groups.filter((g) => g.count === q.number)).toHaveLength(1);
        expect(new Set(q.groups.map((g) => g.look)).size).toBe(1);
        expect(q.groups.every((g) => g.look !== 'dice')).toBe(true); // tot 7: geen dobbelsteen
      }
    }
  });
});
