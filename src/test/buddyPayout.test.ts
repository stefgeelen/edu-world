import { describe, it, expect } from 'vitest';
import { payoutMessage, spokenMunten } from '@/lib/buddy/payout';
import { practiceGreeting } from '@/lib/buddy/messages';
import type { PracticeMenu } from '@/hooks/usePracticeMenu';

describe('payoutMessage', () => {
  it('cheers a fresh exercise', () => {
    expect(payoutMessage({ munten_earned: 8, times_today: 1 })).toEqual({ munten: 8, text: 'Dankjewel!' });
    expect(payoutMessage({ munten_earned: 8, times_today: 2 })).toEqual({ munten: 8, text: 'Dankjewel!' });
  });

  it('nudges towards something new from the third time the same type is done today', () => {
    expect(payoutMessage({ munten_earned: 4, times_today: 3 })).toEqual({ munten: 4, text: 'Deze ken ik al! Zullen we iets anders proberen?' });
  });

  it('puts a fulfilled wish first', () => {
    expect(payoutMessage({ munten_earned: 13, times_today: 1, wish_fulfilled: true })).toEqual({ munten: 13, text: 'Mijn wens is vervuld!' });
  });

  it('stays quiet when nothing was earned (a child without a Buddy, or an old server)', () => {
    expect(payoutMessage({})).toBeNull();
    expect(payoutMessage({ munten_earned: 0 })).toBeNull();
  });
});

describe('spokenMunten', () => {
  it('says the amount without a plus sign, singular for one', () => {
    expect(spokenMunten(8)).toBe('8 Munten');
    expect(spokenMunten(1)).toBe('1 Munt');
  });
});

describe('practiceGreeting', () => {
  const menu = (fulfilled: boolean[]): PracticeMenu => ({
    day: '2026-10-01',
    wish_bonus: 5,
    full_munten: 8,
    exercises: [],
    wishes: fulfilled.map((f, i) => ({
      type_key: `/exercises/t${i}`,
      title: i === 0 ? 'Klok lezen' : 'Geld tellen',
      subject: 'math',
      route: `/exercises/t${i}/1`,
      fulfilled: f,
    })),
  });

  it('names the first wish still open', () => {
    expect(practiceGreeting(menu([true, false]), 'Nootje')).toBe('Mijn wens: Geld tellen! Maar kies gerust wat jij wil.');
  });

  it('is happy once every wish is fulfilled', () => {
    expect(practiceGreeting(menu([true, true]), 'Nootje')).toMatch(/Al mijn wensen zijn vervuld/);
  });

  it('falls back to a plain invitation without wishes or before loading', () => {
    expect(practiceGreeting(undefined, 'Nootje')).toBe('Waar heb je zin in? Nootje kijkt mee!');
    expect(practiceGreeting(menu([]), 'Nootje')).toBe('Waar heb je zin in? Nootje kijkt mee!');
  });
});
