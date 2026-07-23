import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createTestQueryClient, queryWrapper, fakeSupabaseChain } from './testUtils';

// The stage-locking algorithm decides what a child is allowed to play next.
// A bug here either locks a child out of content they've earned, or (worse)
// unlocks stage 3 content before stage 1 is mastered. REQUIRED_COMPLETIONS is
// imported from the real useStageExercises module so this test breaks if that
// constant ever drifts out of sync between the two hooks.

const useCurrentChildMock = vi.fn();
vi.mock('@/hooks/useCompleteExercise', () => ({
  useCurrentChild: () => useCurrentChildMock(),
}));

const fromMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...args: unknown[]) => fromMock(...args) },
}));

import { useStageMastery } from '@/hooks/useStageMastery';
import { REQUIRED_COMPLETIONS } from '@/hooks/useStageExercises';

const EXERCISES = [
  { id: 'ex-1a', stage: 'stage-1' }, { id: 'ex-1b', stage: 'stage-1' },
  { id: 'ex-2a', stage: 'stage-2' }, { id: 'ex-2b', stage: 'stage-2' },
  { id: 'ex-3a', stage: 'stage-3' }, { id: 'ex-3b', stage: 'stage-3' },
];

function mockAttempts(counts: Record<string, number>) {
  const attempts: { exercise_id: string }[] = [];
  for (const [id, count] of Object.entries(counts)) {
    for (let i = 0; i < count; i++) attempts.push({ exercise_id: id });
  }
  return attempts;
}

function setupSupabase(attemptCounts: Record<string, number>) {
  fromMock.mockImplementation((table: string) => {
    if (table === 'exercises') return fakeSupabaseChain({ data: EXERCISES, error: null });
    if (table === 'exercise_attempts') return fakeSupabaseChain({ data: mockAttempts(attemptCounts), error: null });
    throw new Error(`unexpected table ${table}`);
  });
}

function renderMastery(child: Record<string, unknown> | undefined) {
  useCurrentChildMock.mockReturnValue({ data: child, isFetched: true });
  const queryClient = createTestQueryClient();
  return renderHook(() => useStageMastery(), { wrapper: queryWrapper(queryClient) });
}

describe('useStageMastery', () => {
  beforeEach(() => vi.clearAllMocks());

  it('marks stage 1 completed once every exercise reaches REQUIRED_COMPLETIONS, and locks stage 3', async () => {
    setupSupabase({
      'ex-1a': REQUIRED_COMPLETIONS, 'ex-1b': REQUIRED_COMPLETIONS,
      'ex-2a': REQUIRED_COMPLETIONS, 'ex-2b': 1, // stage 2 not fully mastered
    });

    const { result } = renderMastery({ id: 'child-1', max_unlocked_stage: 1 });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const [s1, s2, s3] = result.current.stages;
    expect(s1.isCompleted).toBe(true);
    expect(s1.isLocked).toBe(false);
    expect(s2.isCompleted).toBe(false);
    expect(s2.isCurrent).toBe(true);
    expect(s3.isLocked).toBe(true);
    expect(s3.isCurrent).toBe(false);
  });

  it('does not lock a stage the parent has manually unlocked via max_unlocked_stage', async () => {
    setupSupabase({}); // no attempts at all — nothing mastered

    const { result } = renderMastery({ id: 'child-1', max_unlocked_stage: 3 });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const [, , s3] = result.current.stages;
    expect(s3.isLocked).toBe(false);
  });

  it('computes overall percentage across all stages', async () => {
    // 6 exercises total, 3 mastered (both stage-1 + one stage-2)
    setupSupabase({
      'ex-1a': REQUIRED_COMPLETIONS, 'ex-1b': REQUIRED_COMPLETIONS, 'ex-2a': REQUIRED_COMPLETIONS,
    });

    const { result } = renderMastery({ id: 'child-1', max_unlocked_stage: 1 });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.totalExercises).toBe(6);
    expect(result.current.totalMastered).toBe(3);
    expect(result.current.overallPct).toBe(50);
  });

  it('treats every stage as unmastered when there is no child yet (no attempts fetched)', async () => {
    setupSupabase({});

    const { result } = renderMastery(undefined);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.stages.every((s) => s.mastered === 0)).toBe(true);
    expect(result.current.stages[0].isCurrent).toBe(true);
  });
});
