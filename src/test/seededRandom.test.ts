import { describe, it, expect } from 'vitest';
import { createSeededRng, hashStringToSeed, mulberry32, pickSeeded } from '@/lib/seededRandom';

/**
 * Daily quests and generated exercise content are seeded from stable keys
 * (child id + date) so a child sees the same set all day and across reloads.
 * If this PRNG ever stops being deterministic — or starts returning values
 * outside [0, 1) — quests reshuffle on every render and `pickSeeded` can index
 * past the end of an array.
 */

describe('hashStringToSeed', () => {
  it('returns the same seed for the same string', () => {
    expect(hashStringToSeed('child-1|2026-09-11')).toBe(hashStringToSeed('child-1|2026-09-11'));
  });

  it('returns different seeds for different strings', () => {
    expect(hashStringToSeed('child-1|2026-09-11')).not.toBe(hashStringToSeed('child-2|2026-09-11'));
    expect(hashStringToSeed('child-1|2026-09-11')).not.toBe(hashStringToSeed('child-1|2026-09-12'));
  });

  it('is sensitive to character order', () => {
    expect(hashStringToSeed('ab')).not.toBe(hashStringToSeed('ba'));
  });

  it('always returns a non-negative 32-bit integer', () => {
    const keys = ['', 'a', 'child-1', 'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz', '🫐 emoji key', '2026-09-11'];

    for (const key of keys) {
      const seed = hashStringToSeed(key);
      expect(Number.isInteger(seed), key).toBe(true);
      expect(seed, key).toBeGreaterThanOrEqual(0);
      expect(seed, key).toBeLessThanOrEqual(0xffffffff);
    }
  });

  it('handles the empty string without throwing', () => {
    expect(() => hashStringToSeed('')).not.toThrow();
  });
});

describe('mulberry32', () => {
  it('replays the identical sequence for the same seed', () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);

    expect(Array.from({ length: 20 }, a)).toEqual(Array.from({ length: 20 }, b));
  });

  it('produces a different sequence for a different seed', () => {
    const a = Array.from({ length: 10 }, mulberry32(1));
    const b = Array.from({ length: 10 }, mulberry32(2));

    expect(a).not.toEqual(b);
  });

  it('stays within [0, 1) across a long run', () => {
    const rng = mulberry32(hashStringToSeed('child-1|2026-09-11'));

    for (let i = 0; i < 5000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('advances rather than repeating the same value', () => {
    const rng = mulberry32(7);
    const values = new Set(Array.from({ length: 100 }, rng));

    expect(values.size).toBeGreaterThan(90);
  });

  it('spreads values across the unit interval rather than clustering', () => {
    const rng = mulberry32(hashStringToSeed('spread'));
    const buckets = new Array(10).fill(0);

    for (let i = 0; i < 10_000; i++) buckets[Math.floor(rng() * 10)]++;

    // A usable generator should not leave any tenth of the range empty or
    // dump more than half its draws into one.
    for (const [i, count] of buckets.entries()) {
      expect(count, `bucket ${i}`).toBeGreaterThan(500);
      expect(count, `bucket ${i}`).toBeLessThan(1500);
    }
  });

  it('works with a seed of 0', () => {
    const rng = mulberry32(0);
    const values = Array.from({ length: 5 }, rng);

    expect(values.every((v) => v >= 0 && v < 1)).toBe(true);
    expect(new Set(values).size).toBeGreaterThan(1);
  });
});

describe('createSeededRng', () => {
  it('gives the same sequence for the same key', () => {
    const key = 'child-1|2026-09-11';
    const a = Array.from({ length: 10 }, createSeededRng(key));
    const b = Array.from({ length: 10 }, createSeededRng(key));

    expect(a).toEqual(b);
  });

  it('gives different children different sequences on the same day', () => {
    const a = Array.from({ length: 10 }, createSeededRng('child-1|2026-09-11'));
    const b = Array.from({ length: 10 }, createSeededRng('child-2|2026-09-11'));

    expect(a).not.toEqual(b);
  });

  it('gives the same child a different sequence the next day', () => {
    const today = Array.from({ length: 10 }, createSeededRng('child-1|2026-09-11'));
    const tomorrow = Array.from({ length: 10 }, createSeededRng('child-1|2026-09-12'));

    expect(today).not.toEqual(tomorrow);
  });
});

describe('pickSeeded', () => {
  const items = ['a', 'b', 'c', 'd', 'e'] as const;

  it('always picks an element that is actually in the list', () => {
    const rng = createSeededRng('pick');

    for (let i = 0; i < 1000; i++) {
      expect(items).toContain(pickSeeded(items, rng));
    }
  });

  it('never runs off the end of the list, even for an rng that returns near-1', () => {
    // Math.floor(0.999... * length) must stay within bounds.
    const almostOne = () => 1 - Number.EPSILON;
    expect(pickSeeded(items, almostOne)).toBe('e');
  });

  it('picks the first element for an rng at 0', () => {
    expect(pickSeeded(items, () => 0)).toBe('a');
  });

  it('picks the same element for the same seed', () => {
    expect(pickSeeded(items, createSeededRng('quest-key'))).toBe(pickSeeded(items, createSeededRng('quest-key')));
  });

  it('can reach every element of the list', () => {
    const rng = createSeededRng('coverage');
    const seen = new Set(Array.from({ length: 500 }, () => pickSeeded(items, rng)));

    expect(seen.size).toBe(items.length);
  });

  it('handles a single-element list', () => {
    expect(pickSeeded(['only'], createSeededRng('x'))).toBe('only');
  });
});
