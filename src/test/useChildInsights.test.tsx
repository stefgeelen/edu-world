import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createTestQueryClient, queryWrapper } from './testUtils';

// Powers the Aandachtspunten shown to parents. The rule (at least 2 tries, and
// at least half of the last 10 a struggle) directly decides what a parent is
// told to worry about — worth pinning precisely.
//
// The last-10 window and the per-outcome counts come from the
// `child_exercise_insights` RPC, so these rows are what Postgres returns (one
// per exercise). The SQL itself is not covered here.

const rpcMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => rpcMock(...args) },
}));

import { useChildInsights } from '@/hooks/useChildInsights';

function row(
  exerciseId: string,
  counts: { smooth?: number; hard?: number; game_over?: number; abandoned?: number },
  exercise = { title: 'Optellen', subject: 'math', stage: 'stage-1' }
) {
  const { smooth = 0, hard = 0, game_over = 0, abandoned = 0 } = counts;
  return {
    exercise_id: exerciseId,
    tries: smooth + hard + game_over + abandoned,
    smooth,
    hard,
    game_over,
    abandoned,
    last_try_at: '2026-10-09T10:00:00Z',
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

  it('flags an exercise the child always finishes, but with only 1 heart left', async () => {
    const { result } = render([row('ex-1', { hard: 3 })]);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0]).toMatchObject({ exerciseId: 'ex-1', tries: 3, hard: 3, struggles: 3, struggleShare: 1 });
  });

  it('counts losing all hearts and stopping halfway as struggles too', async () => {
    const { result } = render([row('ex-1', { smooth: 2, game_over: 1, abandoned: 1 })]);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data![0]).toMatchObject({ gameOver: 1, abandoned: 1, struggles: 2, struggleShare: 0.5 });
  });

  it('ignores an exercise with only a single try, no matter how it went', async () => {
    const { result } = render([row('ex-1', { game_over: 1 })]);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(0);
  });

  it('ignores an exercise when fewer than half of the tries were a struggle', async () => {
    const { result } = render([row('ex-1', { smooth: 6, hard: 4 })]);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(0);
  });

  it('flags an exercise at exactly half', async () => {
    const { result } = render([row('ex-1', { smooth: 5, hard: 5 })]);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
  });

  it('sorts by share of struggles, then by number of tries', async () => {
    const { result } = render([
      row('ex-half', { smooth: 2, hard: 2 }),
      row('ex-all-few', { hard: 2 }),
      row('ex-all-many', { hard: 2, game_over: 3 }),
    ]);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data!.map((r) => r.exerciseId)).toEqual(['ex-all-many', 'ex-all-few', 'ex-half']);
  });

  it('is disabled when no childId is given', () => {
    rpcMock.mockResolvedValue({ data: [], error: null });
    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useChildInsights(undefined), { wrapper: queryWrapper(queryClient) });

    expect(result.current.fetchStatus).toBe('idle');
    expect(rpcMock).not.toHaveBeenCalled();
  });
});
