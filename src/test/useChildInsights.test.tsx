import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createTestQueryClient, queryWrapper, fakeSupabaseChain } from './testUtils';

// Powers the "needs practice" insights shown to parents. The threshold logic
// (needs >=2 attempts, average score below 65%) directly decides what a
// parent is told to worry about — worth pinning precisely.

const fromMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...args: unknown[]) => fromMock(...args) },
}));

import { useChildInsights } from '@/hooks/useChildInsights';

function row(exerciseId: string, score: number, maxScore: number, stars: number, exercise: { title: string; subject: string; stage: string } | null) {
  return { exercise_id: exerciseId, score, max_score: maxScore, stars, exercise };
}

function render(data: unknown[]) {
  fromMock.mockReturnValue(fakeSupabaseChain({ data, error: null }));
  const queryClient = createTestQueryClient();
  return renderHook(() => useChildInsights('child-1'), { wrapper: queryWrapper(queryClient) });
}

const MATH = { title: 'Optellen', subject: 'math', stage: 'stage-1' };

describe('useChildInsights', () => {
  beforeEach(() => vi.clearAllMocks());

  it('flags an exercise with a weak average score across at least 2 attempts', async () => {
    const { result } = render([
      row('ex-1', 2, 10, 1, MATH), // 20%
      row('ex-1', 3, 10, 1, MATH), // 30%
    ]);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0]).toMatchObject({ exerciseId: 'ex-1', attemptCount: 2 });
    expect(result.current.data![0].avgScorePct).toBeCloseTo(0.25);
  });

  it('ignores an exercise with only a single attempt, no matter how low the score', async () => {
    const { result } = render([row('ex-1', 0, 10, 0, MATH)]);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(0);
  });

  it('ignores an exercise once its average score is at or above the 65% threshold', async () => {
    const { result } = render([
      row('ex-1', 7, 10, 2, MATH), // 70%
      row('ex-1', 7, 10, 2, MATH),
    ]);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(0);
  });

  it('sorts flagged exercises weakest-first', async () => {
    const { result } = render([
      row('ex-strong-weak', 4, 10, 1, MATH), row('ex-strong-weak', 4, 10, 1, MATH), // 40%
      row('ex-weakest', 1, 10, 0, MATH), row('ex-weakest', 1, 10, 0, MATH), // 10%
    ]);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data!.map((r) => r.exerciseId)).toEqual(['ex-weakest', 'ex-strong-weak']);
  });

  it('skips rows whose joined exercise record is missing (deleted/inactive exercise)', async () => {
    const { result } = render([row('ex-1', 1, 10, 0, null), row('ex-1', 1, 10, 0, null)]);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(0);
  });

  it('is disabled when no childId is given', () => {
    fromMock.mockReturnValue(fakeSupabaseChain({ data: [], error: null }));
    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useChildInsights(undefined), { wrapper: queryWrapper(queryClient) });

    expect(result.current.fetchStatus).toBe('idle');
    expect(fromMock).not.toHaveBeenCalled();
  });
});
