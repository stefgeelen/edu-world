import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createTestQueryClient, queryWrapper } from './testUtils';

const rpcMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => rpcMock(...args) },
}));

let childFixture: { id: string } | null = { id: 'child-1' };
vi.mock('@/hooks/useCompleteExercise', () => ({ useCurrentChild: () => ({ data: childFixture }) }));

import { isRepeated, usePracticeMenu, wishOpen, type PracticeOption } from '@/hooks/usePracticeMenu';

const menu = { day: '2026-10-01', wish_bonus: 5, full_munten: 8, exercises: [], wishes: [] };

beforeEach(() => {
  vi.clearAllMocks();
  childFixture = { id: 'child-1' };
});

describe('usePracticeMenu', () => {
  it('asks the server for this child’s menu, scoped by child id', async () => {
    rpcMock.mockResolvedValue({ data: menu, error: null });
    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => usePracticeMenu(), { wrapper: queryWrapper(queryClient) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(rpcMock).toHaveBeenCalledWith('practice_menu', { p_child_id: 'child-1' });
    expect(result.current.data).toEqual(menu);
    // Scoped by child: a sibling's menu must never be served from cache.
    expect(queryClient.getQueryData(['practice-menu', 'child-1'])).toEqual(menu);
  });

  it('waits for a child before asking anything', () => {
    childFixture = null;
    const { result } = renderHook(() => usePracticeMenu(), { wrapper: queryWrapper(createTestQueryClient()) });
    expect(result.current.fetchStatus).toBe('idle');
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('surfaces a server error instead of showing an empty list', async () => {
    rpcMock.mockResolvedValue({ data: null, error: new Error('boom') });
    const { result } = renderHook(() => usePracticeMenu(), { wrapper: queryWrapper(createTestQueryClient()) });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('practice option helpers', () => {
  const base: PracticeOption = {
    type_key: '/exercises/clock',
    exercise_id: 'e1',
    title: 'Klok',
    subject: 'math',
    route: '/exercises/clock/1',
    done_today: 0,
    next_munten: 8,
    wished: false,
  };

  it('calls a type repeated once it pays less than a fresh one', () => {
    expect(isRepeated(base, { full_munten: 8 })).toBe(false);
    expect(isRepeated({ ...base, done_today: 2, next_munten: 4 }, { full_munten: 8 })).toBe(true);
  });

  it('keeps a wish open only until the first one of that type today', () => {
    expect(wishOpen({ ...base, wished: true })).toBe(true);
    expect(wishOpen({ ...base, wished: true, done_today: 1 })).toBe(false);
    expect(wishOpen(base)).toBe(false);
  });
});
