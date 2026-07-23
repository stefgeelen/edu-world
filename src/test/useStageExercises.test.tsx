import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createTestQueryClient, queryWrapper, fakeSupabaseChain } from './testUtils';

const useCurrentChildMock = vi.fn();
vi.mock('@/hooks/useCompleteExercise', () => ({
  useCurrentChild: () => useCurrentChildMock(),
}));

const fromMock = vi.fn();
const eqSpy = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...args: unknown[]) => fromMock(...args) },
}));

import { useStageExercises, REQUIRED_COMPLETIONS } from '@/hooks/useStageExercises';

const EXERCISES = [
  { id: 'ex-1', display_order: 1, title: 'Optellen', subject: 'math', xp_reward: 10, route: '/exercise-a' },
  { id: 'ex-2', display_order: 2, title: 'Lezen', subject: 'language', xp_reward: 10, route: '/exercise-b' },
];

function setup(attempts: { exercise_id: string; stars: number }[]) {
  fromMock.mockImplementation((table: string) => {
    const chain = fakeSupabaseChain(
      table === 'exercises' ? { data: EXERCISES, error: null } : { data: attempts, error: null }
    );
    // capture the eq() filter value used for the exercises table so we can assert on it
    if (table === 'exercises') {
      const original = chain.eq as (...a: unknown[]) => unknown;
      chain.eq = (...args: unknown[]) => { eqSpy(...args); return original(...args); };
    }
    return chain;
  });
}

// Note: use `null` (not `undefined`) to mean "no child" when calling this —
// a default parameter only kicks in for an *omitted* argument, and JS treats
// an explicitly-passed `undefined` the same as omitted, which would silently
// fall back to the default child instead of testing the no-child case.
function renderStage(stage: number | undefined, child: Record<string, unknown> | null = { id: 'child-1' }) {
  useCurrentChildMock.mockReturnValue({ data: child ?? undefined, isFetched: true });
  const queryClient = createTestQueryClient();
  return renderHook(() => useStageExercises(stage), { wrapper: queryWrapper(queryClient) });
}

describe('useStageExercises', () => {
  beforeEach(() => vi.clearAllMocks());

  it(`requires ${REQUIRED_COMPLETIONS} completions to be considered mastered (shared constant, sanity check)`, () => {
    expect(REQUIRED_COMPLETIONS).toBeGreaterThan(0);
  });

  it('merges each exercise with its completion count and best star rating', async () => {
    setup([
      { exercise_id: 'ex-1', stars: 2 },
      { exercise_id: 'ex-1', stars: 3 },
      { exercise_id: 'ex-1', stars: 1 },
    ]);

    const { result } = renderStage(1);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const ex1 = result.current.data!.find((e) => e.id === 'ex-1')!;
    expect(ex1.completions).toBe(3);
    expect(ex1.bestStars).toBe(3); // best of 2, 3, 1

    const ex2 = result.current.data!.find((e) => e.id === 'ex-2')!;
    expect(ex2.completions).toBe(0);
    expect(ex2.bestStars).toBe(0);
  });

  it('filters by the requested stage using the "stage-N" convention', async () => {
    setup([]);
    const { result } = renderStage(2);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(eqSpy).toHaveBeenCalledWith('stage', 'stage-2');
  });

  it('clamps an out-of-range stage into 1-3', async () => {
    setup([]);
    const { result } = renderStage(99);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(eqSpy).toHaveBeenCalledWith('stage', 'stage-3');
  });

  it('defaults to stage 1 when no stage argument is given', async () => {
    setup([]);
    const { result } = renderStage(undefined);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(eqSpy).toHaveBeenCalledWith('stage', 'stage-1');
  });

  it('returns zero completions for every exercise when there is no child yet', async () => {
    setup([{ exercise_id: 'ex-1', stars: 3 }]); // would count if child existed
    const { result } = renderStage(1, null);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data!.every((e) => e.completions === 0)).toBe(true);
  });
});
