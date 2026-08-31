import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createTestQueryClient, queryWrapper } from './testUtils';

const useCurrentChildMock = vi.fn();
vi.mock('@/hooks/useCompleteExercise', () => ({
  useCurrentChild: () => useCurrentChildMock(),
}));

// useDailyQuests fires two queries against the same `exercise_attempts`
// table (today's attempts vs. the trailing-7-day subject counts). They're
// told apart by their `select()` string, which is more robust than relying
// on call order.
type TodayRow = { stars: number; time_spent_seconds: number; exercise: { subject: string; xp_reward: number } | null };
type WeekRow = { exercise: { subject: string } | null };

function mockSupabaseFrom(todayRows: TodayRow[], weekRows: WeekRow[]) {
  return (_table: string) => {
    const chain: Record<string, unknown> = {};
    let isWeekQuery = false;
    const methods = ['eq', 'gte', 'order', 'limit', 'lte', 'in', 'is', 'neq', 'insert', 'update', 'delete', 'upsert'];
    for (const m of methods) chain[m] = () => chain;
    chain.select = (cols: string) => {
      isWeekQuery = !cols.includes('time_spent_seconds');
      return chain;
    };
    chain.then = (onFulfilled: (v: { data: unknown; error: null }) => unknown) =>
      Promise.resolve({ data: isWeekQuery ? weekRows : todayRows, error: null }).then(onFulfilled);
    return chain;
  };
}

const fromMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => fromMock(table) },
}));

function renderUseDailyQuests() {
  const queryClient = createTestQueryClient();
  return renderHook(() => useDailyQuestsImport(), { wrapper: queryWrapper(queryClient) });
}

// Imported after the mocks above are registered.
import { useDailyQuests as useDailyQuestsImport } from '@/hooks/useDailyQuests';

describe('useDailyQuests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCurrentChildMock.mockReturnValue({ data: { id: 'child-1' }, isLoading: false });
  });

  it('shows the subject-nudge quest for the least-practiced subject over the trailing week', async () => {
    const weekRows: WeekRow[] = [
      ...Array(5).fill({ exercise: { subject: 'math' } }),
      { exercise: { subject: 'reading' } },
      // 0x writing -> least practiced
    ];
    fromMock.mockImplementation(mockSupabaseFrom([], weekRows));

    const { result } = renderUseDailyQuests();

    await waitFor(() => expect(result.current.quests).toHaveLength(3));
    expect(result.current.quests.some(q => q.title.includes('Schrijven'))).toBe(true);
  });

  it('returns the same 3 quest ids across two renders on the same day (seeded, not random)', async () => {
    const todayRows: TodayRow[] = [{ stars: 3, time_spent_seconds: 300, exercise: { subject: 'math', xp_reward: 50 } }];
    const weekRows: WeekRow[] = [{ exercise: { subject: 'math' } }];
    fromMock.mockImplementation(mockSupabaseFrom(todayRows, weekRows));

    const first = renderUseDailyQuests();
    await waitFor(() => expect(first.result.current.quests).toHaveLength(3));
    const firstIds = first.result.current.quests.map(q => q.id);

    const second = renderUseDailyQuests();
    await waitFor(() => expect(second.result.current.quests).toHaveLength(3));
    const secondIds = second.result.current.quests.map(q => q.id);

    expect(secondIds).toEqual(firstIds);
  });

  it('computes done flags from today\'s attempts', async () => {
    // 5 attempts, 2 perfect, 800s spent, 400 xp earned — high enough to
    // satisfy every threshold in the pool (including the hardest count-5 /
    // perfect-2 tiers), so whichever quest the seed lands on should be
    // done, EXCEPT the subject-nudge quest: 'writing' is the unique
    // least-practiced subject this week but wasn't attempted today.
    const todayRows: TodayRow[] = [
      { stars: 3, time_spent_seconds: 200, exercise: { subject: 'math', xp_reward: 80 } },
      { stars: 3, time_spent_seconds: 200, exercise: { subject: 'math', xp_reward: 80 } },
      { stars: 2, time_spent_seconds: 200, exercise: { subject: 'math', xp_reward: 80 } },
      { stars: 1, time_spent_seconds: 100, exercise: { subject: 'reading', xp_reward: 80 } },
      { stars: 1, time_spent_seconds: 100, exercise: { subject: 'reading', xp_reward: 80 } },
    ];
    const weekRows: WeekRow[] = [
      ...Array(5).fill({ exercise: { subject: 'math' } }),
      ...Array(3).fill({ exercise: { subject: 'reading' } }),
      // 0x writing -> unique least-practiced subject
    ];
    fromMock.mockImplementation(mockSupabaseFrom(todayRows, weekRows));

    const { result } = renderUseDailyQuests();
    await waitFor(() => expect(result.current.quests).toHaveLength(3));

    expect(result.current.quests.find(q => q.id === 'subject-nudge-writing')?.done).toBe(false);
    for (const quest of result.current.quests) {
      if (quest.id !== 'subject-nudge-writing') {
        expect(quest.done).toBe(true);
      }
    }
  });
});
