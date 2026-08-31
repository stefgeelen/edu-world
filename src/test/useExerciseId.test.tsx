import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createTestQueryClient, queryWrapper, fakeSupabaseChain } from './testUtils';

// Maps the current app route to a database exercise ID (used to persist
// attempts). If this mapping breaks, exercises silently fail to save
// progress — worth pinning the /app-prefix-stripping specifically.

const fromMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...args: unknown[]) => fromMock(...args) },
}));

// useExerciseId now scopes its lookup by the child's grade; mock the child
// directly so this test doesn't need a real AuthProvider in the tree.
vi.mock('@/hooks/useCompleteExercise', () => ({
  useCurrentChild: () => ({ data: { grade: 1 } }),
}));

import { useExerciseId } from '@/hooks/useExerciseId';

function wrapperFor(path: string) {
  const queryClient = createTestQueryClient();
  const QueryWrapper = queryWrapper(queryClient);
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <MemoryRouter initialEntries={[path]}>
        <QueryWrapper>{children}</QueryWrapper>
      </MemoryRouter>
    );
  };
}

describe('useExerciseId', () => {
  beforeEach(() => vi.clearAllMocks());

  it('strips the /app prefix before looking up the route', async () => {
    fromMock.mockReturnValue(fakeSupabaseChain({ data: { id: 'ex-42' }, error: null }));

    const { result } = renderHook(() => useExerciseId(), { wrapper: wrapperFor('/app/exercise-bonds/1') });

    await waitFor(() => expect(result.current).toBe('ex-42'));
    expect(fromMock).toHaveBeenCalledWith('exercises');
  });

  it('returns undefined while no matching exercise route exists', async () => {
    fromMock.mockReturnValue(fakeSupabaseChain({ data: null, error: null }));

    const { result } = renderHook(() => useExerciseId(), { wrapper: wrapperFor('/app/not-a-real-route') });

    await waitFor(() => expect(result.current).toBeUndefined());
  });
});
