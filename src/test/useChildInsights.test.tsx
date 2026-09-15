import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createTestQueryClient, queryWrapper } from './testUtils';

// Powers the "needs practice" insights shown to parents. The threshold logic
// (needs >=2 attempts, average score below 65%) directly decides what a
// parent is told to worry about — worth pinning precisely.
//
// Grouping/averaging moved into the `child_exercise_stats` RPC, so these rows
// are the aggregates Postgres returns (one per exercise), not raw attempts.
// The SQL aggregation itself is not covered here.

const rpcMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => rpcMock(...args) },
}));

import { useChildInsights } from '@/hooks/useChildInsights';

function stat(
  exerciseId: string,
  attemptCount: number,
  avgScorePct: number,
  bestStars = 1,
  exercise = { title: 'Optellen', subject: 'math', stage: 'stage-1' }
) {
  return {
    exercise_id: exerciseId,
    attempt_count: attemptCount,
    best_stars: bestStars,
    avg_score_pct: avgScorePct,
    ...exercise,
  };
}

function render(data: unknown[]) {
  rpcMock.mockResolvedValue({ data, error: null });
  const queryClient = createTestQueryClient();
  return renderHook(() => useChildInsights('child-1'), { wrapper: queryWrapper(queryClient) });
}

describe('useChildInsights', () => {
  beforeEach(() => vi.clearAllMocks());

  it('flags an exercise with a weak average score across at least 2 attempts', async () => {
    const { result } = render([stat('ex-1', 2, 0.25)]);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0]).toMatchObject({ exerciseId: 'ex-1', attemptCount: 2 });
    expect(result.current.data![0].avgScorePct).toBeCloseTo(0.25);
  });

  it('ignores an exercise with only a single attempt, no matter how low the score', async () => {
    const { result } = render([stat('ex-1', 1, 0)]);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(0);
  });

  it('ignores an exercise once its average score is at or above the 65% threshold', async () => {
    const { result } = render([stat('ex-1', 2, 0.7)]);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(0);
  });

  it('sorts flagged exercises weakest-first', async () => {
    const { result } = render([stat('ex-strong-weak', 2, 0.4), stat('ex-weakest', 2, 0.1)]);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data!.map((r) => r.exerciseId)).toEqual(['ex-weakest', 'ex-strong-weak']);
  });

  it('handles the numeric average arriving as a string (Postgres numeric)', async () => {
    const { result } = render([stat('ex-1', 3, '0.32' as unknown as number)]);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].avgScorePct).toBeCloseTo(0.32);
  });

  it('is disabled when no childId is given', () => {
    rpcMock.mockResolvedValue({ data: [], error: null });
    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useChildInsights(undefined), { wrapper: queryWrapper(queryClient) });

    expect(result.current.fetchStatus).toBe('idle');
    expect(rpcMock).not.toHaveBeenCalled();
  });
});
