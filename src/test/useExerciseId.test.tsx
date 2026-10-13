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
let childGrade = 1;
vi.mock('@/hooks/useCompleteExercise', () => ({
  useCurrentChild: () => ({ data: { grade: childGrade } }),
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
  beforeEach(() => {
    vi.clearAllMocks();
    childGrade = 1;
  });

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

  it("looks up the child's own grade", async () => {
    childGrade = 2;
    const chain = fakeSupabaseChain({ data: { id: 'ex-g2' }, error: null });
    vi.spyOn(chain, 'eq');
    fromMock.mockReturnValue(chain);

    const { result } = renderHook(() => useExerciseId(), { wrapper: wrapperFor('/app/exercises/math/1') });

    await waitFor(() => expect(result.current).toBe('ex-g2'));
    expect(chain.eq).toHaveBeenCalledWith('grade', 2);
  });

  it('looks up the lower grade a Herhalen tile asked for', async () => {
    childGrade = 2;
    const chain = fakeSupabaseChain({ data: { id: 'ex-g1' }, error: null });
    vi.spyOn(chain, 'eq');
    fromMock.mockReturnValue(chain);

    const { result } = renderHook(() => useExerciseId(), { wrapper: wrapperFor('/app/exercises/dots/3?leerjaar=1') });

    await waitFor(() => expect(result.current).toBe('ex-g1'));
    expect(chain.eq).toHaveBeenCalledWith('route', '/exercises/dots/3');
    expect(chain.eq).toHaveBeenCalledWith('grade', 1);
  });

  it('ignores a leerjaar that is not a grade', async () => {
    childGrade = 2;
    const chain = fakeSupabaseChain({ data: { id: 'ex-g2' }, error: null });
    vi.spyOn(chain, 'eq');
    fromMock.mockReturnValue(chain);

    renderHook(() => useExerciseId(), { wrapper: wrapperFor('/app/exercises/math/1?leerjaar=abc') });

    await waitFor(() => expect(chain.eq).toHaveBeenCalledWith('grade', 2));
  });
});
