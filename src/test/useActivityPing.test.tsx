import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// The ping writes to the database on every mount and every tab focus, so the
// throttle is the whole point of the hook: without it a child switching back
// and forth produces a write per switch. These tests pin the throttle, the
// deliberate exception for a newly selected child, and the silence on failure.

let authUser: { id: string } | null = { id: 'parent-1' };
let child: { id: string } | null = { id: 'child-1' };

const rpcMock = vi.fn(() => Promise.resolve({ data: null, error: null }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => rpcMock(...(args as [])) },
}));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: authUser }) }));
vi.mock('@/hooks/useCompleteExercise', () => ({ useCurrentChild: () => ({ data: child }) }));

import { useActivityPing, __resetActivityPing } from '@/hooks/useActivityPing';

describe('useActivityPing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetActivityPing();
    authUser = { id: 'parent-1' };
    child = { id: 'child-1' };
  });

  it('records activity for the account and the selected child on mount', () => {
    renderHook(() => useActivityPing());

    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith('touch_activity', { p_child_id: 'child-1' });
  });

  it('does not ping again while the throttle window is open', () => {
    const { rerender, unmount } = renderHook(() => useActivityPing());
    rerender();
    unmount();
    renderHook(() => useActivityPing());

    expect(rpcMock).toHaveBeenCalledTimes(1);
  });

  it('pings again immediately when a different child is selected', () => {
    const { unmount } = renderHook(() => useActivityPing());
    unmount();

    child = { id: 'child-2' };
    renderHook(() => useActivityPing());

    expect(rpcMock).toHaveBeenCalledTimes(2);
    expect(rpcMock).toHaveBeenLastCalledWith('touch_activity', { p_child_id: 'child-2' });
  });

  it('sends a null child id when no child is selected yet', () => {
    child = null;
    renderHook(() => useActivityPing());

    expect(rpcMock).toHaveBeenCalledWith('touch_activity', { p_child_id: null });
  });

  it('does nothing at all when nobody is signed in', () => {
    authUser = null;
    renderHook(() => useActivityPing());

    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('pings on tab focus once the throttle has expired', () => {
    const nowSpy = vi.spyOn(Date, 'now');
    nowSpy.mockReturnValue(0);
    renderHook(() => useActivityPing());
    expect(rpcMock).toHaveBeenCalledTimes(1);

    nowSpy.mockReturnValue(6 * 60 * 1000);
    act(() => { window.dispatchEvent(new Event('focus')); });

    expect(rpcMock).toHaveBeenCalledTimes(2);
    nowSpy.mockRestore();
  });

  it('swallows a failed ping rather than surfacing it mid-session', async () => {
    rpcMock.mockReturnValueOnce(Promise.reject(new Error('offline')) as never);

    expect(() => renderHook(() => useActivityPing())).not.toThrow();
    await act(async () => { await Promise.resolve(); });
  });
});
