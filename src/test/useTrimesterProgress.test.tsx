import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createTestQueryClient, queryWrapper, fakeSupabaseChain } from './testUtils';

const useCurrentChildMock = vi.fn();
vi.mock('@/hooks/useCompleteExercise', () => ({
  useCurrentChild: () => useCurrentChildMock(),
}));

const fromMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...args: unknown[]) => fromMock(...args) },
}));

import { useTrimesterProgress } from '@/hooks/useTrimesterProgress';

function render(child: Record<string, unknown> | undefined, childLoading = false) {
  useCurrentChildMock.mockReturnValue({ data: child, isLoading: childLoading });
  const queryClient = createTestQueryClient();
  return renderHook(() => useTrimesterProgress(), { wrapper: queryWrapper(queryClient) });
}

describe('useTrimesterProgress', () => {
  beforeEach(() => vi.clearAllMocks());

  it('always returns exactly 4 trimesters, filling in gaps with zeroed defaults', async () => {
    fromMock.mockReturnValue(fakeSupabaseChain({
      data: [{ id: 't2', grade_level: 1, trimester_number: 2, xp_earned: 80, xp_threshold: 100, is_completed: false, completed_at: null }],
      error: null,
    }));

    const { result } = render({ id: 'child-1', grade: 1 });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.trimesters).toHaveLength(4);
    expect(result.current.trimesters.map((t) => t.trimester_number)).toEqual([1, 2, 3, 4]);

    const t1 = result.current.trimesters[0];
    expect(t1.xp_earned).toBe(0);
    expect(t1.is_completed).toBe(false);

    const t2 = result.current.trimesters[1];
    expect(t2.xp_earned).toBe(80);
  });

  it('is disabled until a child is loaded', () => {
    const { result } = render(undefined, true);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.trimesters).toEqual([]);
  });
});
