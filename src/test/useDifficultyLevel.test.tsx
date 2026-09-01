import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// Wrong difficulty scaling is invisible in the UI (a child just gets sums
// that are too easy/hard) so it's exactly the kind of bug that survives
// manual testing indefinitely. This pins the grade/stage/key derivation.

const useCurrentChildMock = vi.fn();
vi.mock('@/hooks/useCompleteExercise', () => ({
  useCurrentChild: () => useCurrentChildMock(),
}));

import { useDifficultyLevel } from '@/hooks/useDifficultyLevel';

function wrapperFor(path: string) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/app/exercise/:id" element={children as React.ReactElement} />
        </Routes>
      </MemoryRouter>
    );
  };
}

describe('useDifficultyLevel', () => {
  it('derives grade from the child and stage from the :id route param', () => {
    useCurrentChildMock.mockReturnValue({ data: { grade: 1 } });
    const { result } = renderHook(() => useDifficultyLevel(), { wrapper: wrapperFor('/app/exercise/3') });

    expect(result.current).toEqual({ grade: 1, stage: 3, key: '1-3' });
  });

  it('passes the child grade through unclamped, now that config is DB-driven per grade row', () => {
    useCurrentChildMock.mockReturnValue({ data: { grade: 4 } });
    const { result } = renderHook(() => useDifficultyLevel(), { wrapper: wrapperFor('/app/exercise/3') });

    expect(result.current).toEqual({ grade: 4, stage: 3, key: '4-3' });
  });

  it('defaults grade to 1 when there is no child yet', () => {
    useCurrentChildMock.mockReturnValue({ data: undefined });
    const { result } = renderHook(() => useDifficultyLevel(), { wrapper: wrapperFor('/app/exercise/2') });

    expect(result.current.grade).toBe(1);
  });

  it('clamps the stage to 1 when the route param is missing or non-numeric', () => {
    useCurrentChildMock.mockReturnValue({ data: { grade: 1 } });
    const { result } = renderHook(() => useDifficultyLevel(), { wrapper: wrapperFor('/app/exercise/abc') });

    expect(result.current.stage).toBe(1);
    expect(result.current.key).toBe('1-1');
  });

  it('clamps the stage to 3 when the route param is out of range', () => {
    useCurrentChildMock.mockReturnValue({ data: { grade: 1 } });
    const { result } = renderHook(() => useDifficultyLevel(), { wrapper: wrapperFor('/app/exercise/99') });

    expect(result.current.stage).toBe(3);
  });
});
