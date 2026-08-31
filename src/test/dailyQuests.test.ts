import { describe, it, expect } from 'vitest';
import { selectDailyQuests, type TodayMetrics } from '@/data/dailyQuests';

// selectDailyQuests is pure (no Supabase/React), so it's tested directly
// with a fixed rng instead of mocking anything — the cheapest, most precise
// place to pin down the selection + done-computation logic.

const rngReturning = (value: number) => () => value;

const EMPTY_METRICS: TodayMetrics = { attemptCount: 0, perfectCount: 0, timeSpentSeconds: 0, xpEarned: 0 };

describe('selectDailyQuests', () => {
  it('always returns exactly 3 quests: one count-tier, one secondary, and the subject nudge', () => {
    const quests = selectDailyQuests(rngReturning(0.4), EMPTY_METRICS, 'writing', false);

    expect(quests).toHaveLength(3);
    expect(quests[0].id).toMatch(/^count-/);
    expect(quests[2].id).toBe('subject-nudge-writing');
    expect(quests[2].title).toBe('Doe een Schrijven-oefening');
  });

  it('marks quests done based on the given metrics', () => {
    const metrics: TodayMetrics = { attemptCount: 3, perfectCount: 0, timeSpentSeconds: 700, xpEarned: 0 };
    const quests = selectDailyQuests(rngReturning(0.4), metrics, 'writing', true);

    // rng=0.4 deterministically picks 'count-3' then category 'time' -> 'time-10min'
    expect(quests).toEqual([
      { id: 'count-3', title: 'Doe 3 oefeningen vandaag', xp: '+100 XP', done: true },
      { id: 'time-10min', title: 'Oefen 10 minuten vandaag', xp: '+100 XP', done: true },
      { id: 'subject-nudge-writing', title: 'Doe een Schrijven-oefening', xp: '+75 XP', done: true },
    ]);
  });

  it('leaves quests undone when thresholds are not met', () => {
    const quests = selectDailyQuests(rngReturning(0.4), EMPTY_METRICS, 'math', false);
    expect(quests.every(q => q.done === false)).toBe(true);
  });

  it('produces a different selection for a different seed sequence', () => {
    const a = selectDailyQuests(rngReturning(0.1), EMPTY_METRICS, 'math', false);
    const b = selectDailyQuests(rngReturning(0.9), EMPTY_METRICS, 'math', false);
    expect(a.map(q => q.id)).not.toEqual(b.map(q => q.id));
  });
});
