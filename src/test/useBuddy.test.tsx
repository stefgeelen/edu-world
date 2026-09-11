import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from './testUtils';

// --- Mocks -----------------------------------------------------------------
// useBuddy is the only write path into the Buddy economy. Decay and pricing are
// enforced server-side, so what matters on the client is the plumbing: the
// query is scoped per child, every mutation refreshes the cache, and an RPC
// that answers `ok: false` must be surfaced as a refusal rather than a success
// (the RPC returns a 200 with ok:false — it is not an error).

const rpcMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => rpcMock(...args) },
}));

const useCurrentChildMock = vi.fn();
vi.mock('@/hooks/useCompleteExercise', () => ({
  useCurrentChild: () => useCurrentChildMock(),
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock('sonner', () => ({
  toast: { success: (...a: unknown[]) => toastSuccess(...a), error: (...a: unknown[]) => toastError(...a) },
}));

vi.mock('@/lib/errorMessages', () => ({
  mapDbError: () => 'Er ging iets mis met de database.',
}));

import { useBuddy, BuddyFxProvider, CARE_FX_MS } from '@/hooks/useBuddy';

const ISO = (ms: number) => new Date(ms).toISOString();

// The hook ticks the row against the real clock on every render, so fixtures
// are anchored to "now" — a fixed past timestamp would decay the buddy to
// death before the first assertion runs.
let T0: number;

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    child_id: 'child-1',
    needs: { hunger: 80, fun: 75, energy: 85, hygiene: 80, health: 100 },
    munten: 40,
    inventory: { bes: 2 },
    last_tick: ISO(T0),
    sleep_until: null,
    health_zero_since: null,
    dead: false,
    ...overrides,
  };
}

/**
 * The mutations invalidate the buddy query, so a `buddy_care` call is always
 * followed by a `buddy_get_or_create` refetch. Responses are therefore routed
 * per RPC name — a single blanket response would let a care-result envelope
 * come back as the row on the refetch.
 */
let rpcResponses: Record<string, unknown>;

/** Applies a care/buy/revive result and makes the follow-up refetch agree with it. */
function setRpcResult(name: string, result: { ok: boolean; message: string; state: Record<string, unknown> }) {
  rpcResponses[name] = { data: result, error: null };
  rpcResponses.buddy_get_or_create = { data: result.state, error: null };
}

function renderUseBuddy(withProvider = true) {
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {withProvider ? <BuddyFxProvider>{children}</BuddyFxProvider> : children}
    </QueryClientProvider>
  );
  return { queryClient, ...renderHook(() => useBuddy(), { wrapper }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  T0 = Date.now();
  rpcResponses = { buddy_get_or_create: { data: makeRow(), error: null } };
  rpcMock.mockImplementation((name: string) => {
    const response = rpcResponses[name];
    return response instanceof Promise ? response : Promise.resolve(response ?? { data: null, error: null });
  });
  useCurrentChildMock.mockReturnValue({ data: { id: 'child-1' } });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useBuddy — loading the state', () => {
  it('loads the buddy through buddy_get_or_create for the current child', async () => {
    const { result } = renderUseBuddy();

    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(rpcMock).toHaveBeenCalledWith('buddy_get_or_create', { p_child_id: 'child-1' });
    expect(result.current.buddy.munten).toBe(40);
    expect(result.current.buddy.needs.hunger).toBe(80);
  });

  it('does not query at all until a child is known', async () => {
    useCurrentChildMock.mockReturnValue({ data: undefined });
    const { result } = renderUseBuddy();

    await act(async () => {});
    expect(rpcMock).not.toHaveBeenCalled();
    expect(result.current.loaded).toBe(false);
  });

  it('scopes the cache entry by child id so two children never share a buddy', async () => {
    const { result, queryClient } = renderUseBuddy();
    await waitFor(() => expect(result.current.loaded).toBe(true));

    expect(queryClient.getQueryData(['buddy-state', 'child-1'])).toBeTruthy();
    expect(queryClient.getQueryData(['buddy-state', 'child-2'])).toBeUndefined();
  });

  it('converts the row timestamps into epoch milliseconds', async () => {
    // Needs are pinned critical with health already at 0 so the tick the hook
    // runs on render preserves health_zero_since instead of clearing it — the
    // assertion is about the conversion, not about the decay.
    rpcResponses.buddy_get_or_create = {
      data: makeRow({
        needs: { hunger: 1, fun: 1, energy: 1, hygiene: 1, health: 0 },
        sleep_until: ISO(T0 + 600_000),
        health_zero_since: ISO(T0 - 3_600_000),
      }),
      error: null,
    };
    const { result } = renderUseBuddy();

    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.buddy.sleepUntil).toBe(T0 + 600_000);
    expect(result.current.buddy.healthZeroSince).toBe(T0 - 3_600_000);
  });

  it('reads null timestamps as null rather than epoch zero', async () => {
    const { result } = renderUseBuddy();

    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.buddy.sleepUntil).toBeNull();
    expect(result.current.buddy.healthZeroSince).toBeNull();
  });

  it('tolerates a row with no inventory yet', async () => {
    rpcResponses.buddy_get_or_create = { data: makeRow({ inventory: null }), error: null };
    const { result } = renderUseBuddy();

    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.buddy.inventory).toEqual({});
  });

  it('reports a dead buddy from the row', async () => {
    rpcResponses.buddy_get_or_create = { data: makeRow({ dead: true }), error: null };
    const { result } = renderUseBuddy();

    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.buddy.dead).toBe(true);
  });

  it('stays unloaded while the query is still in flight', async () => {
    rpcResponses.buddy_get_or_create = new Promise(() => {});
    const { result } = renderUseBuddy();

    await act(async () => {});
    expect(result.current.loaded).toBe(false);
    // A placeholder buddy is still rendered so the room does not flash empty.
    expect(result.current.buddy.needs.health).toBeGreaterThan(0);
  });
});

describe('useBuddy — care()', () => {
  it('sends the action and item to buddy_care', async () => {
    const { result } = renderUseBuddy();
    await waitFor(() => expect(result.current.loaded).toBe(true));

    setRpcResult('buddy_care', { ok: true, message: 'Bosbes gebruikt.', state: makeRow() });
    await act(async () => result.current.care('feed', 'bes'));

    await waitFor(() =>
      expect(rpcMock).toHaveBeenCalledWith('buddy_care', {
        p_child_id: 'child-1',
        p_action: 'feed',
        p_item_id: 'bes',
      })
    );
  });

  it('sends a null item for an action that needs none', async () => {
    const { result } = renderUseBuddy();
    await waitFor(() => expect(result.current.loaded).toBe(true));

    setRpcResult('buddy_care', { ok: true, message: 'Welterusten!', state: makeRow() });
    await act(async () => result.current.care('sleep'));

    await waitFor(() =>
      expect(rpcMock).toHaveBeenCalledWith('buddy_care', {
        p_child_id: 'child-1',
        p_action: 'sleep',
        p_item_id: null,
      })
    );
  });

  it('reflects the state the server returned in both the hook and the cache', async () => {
    const { result, queryClient } = renderUseBuddy();
    await waitFor(() => expect(result.current.loaded).toBe(true));

    setRpcResult('buddy_care', {
      ok: true,
      message: 'Bosbes gebruikt.',
      state: makeRow({ munten: 12, inventory: { bes: 1 } }),
    });
    await act(async () => result.current.care('feed', 'bes'));

    await waitFor(() => expect(result.current.buddy.munten).toBe(12));
    expect(result.current.buddy.inventory).toEqual({ bes: 1 });
    expect(queryClient.getQueryData(['buddy-state', 'child-1'])).toMatchObject({ munten: 12 });
  });

  it('invalidates the buddy query after a care action', async () => {
    const { result, queryClient } = renderUseBuddy();
    await waitFor(() => expect(result.current.loaded).toBe(true));
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    setRpcResult('buddy_care', { ok: true, message: 'ok', state: makeRow() });
    await act(async () => result.current.care('feed', 'bes'));

    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['buddy-state', 'child-1'] }));
  });

  it('celebrates a successful care action with its toast and animation', async () => {
    const { result } = renderUseBuddy();
    await waitFor(() => expect(result.current.loaded).toBe(true));

    setRpcResult('buddy_care', { ok: true, message: 'Bosbes gebruikt.', state: makeRow() });
    await act(async () => result.current.care('feed', 'bes'));

    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('Bosbes gebruikt.'));
    expect(toastError).not.toHaveBeenCalled();
    expect(result.current.careFx).toMatchObject({ action: 'feed', emoji: '🫐' });
  });

  it('plays the animation without an emoji for an item-less action', async () => {
    const { result } = renderUseBuddy();
    await waitFor(() => expect(result.current.loaded).toBe(true));

    setRpcResult('buddy_care', { ok: true, message: 'Welterusten!', state: makeRow() });
    await act(async () => result.current.care('sleep'));

    await waitFor(() => expect(result.current.careFx).toMatchObject({ action: 'sleep' }));
    expect(result.current.careFx?.emoji).toBeUndefined();
  });

  it('shows a refusal as an error and plays no animation when the RPC answers ok:false', async () => {
    // The RPC refuses (asleep, no item, dead) with a 200 + ok:false. Treating
    // that as success would celebrate an action that never happened.
    const { result } = renderUseBuddy();
    await waitFor(() => expect(result.current.loaded).toBe(true));

    setRpcResult('buddy_care', { ok: false, message: 'Je Buddy slaapt nu — wacht even.', state: makeRow() });
    await act(async () => result.current.care('feed', 'bes'));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Je Buddy slaapt nu — wacht even.'));
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(result.current.careFx).toBeNull();
  });

  it('still adopts the state a refused action returned, so a stale client self-corrects', async () => {
    const { result } = renderUseBuddy();
    await waitFor(() => expect(result.current.buddy.inventory).toEqual({ bes: 2 }));

    setRpcResult('buddy_care', {
      ok: false,
      message: 'Dat Care Item heb je niet meer.',
      state: makeRow({ inventory: {} }),
    });
    await act(async () => result.current.care('feed', 'bes'));

    await waitFor(() => expect(result.current.buddy.inventory).toEqual({}));
  });

  it('maps a database error to a readable message instead of leaking the raw error', async () => {
    const { result } = renderUseBuddy();
    await waitFor(() => expect(result.current.loaded).toBe(true));

    rpcResponses.buddy_care = { data: null, error: { message: 'permission denied for table buddy_states' } };
    await act(async () => result.current.care('feed', 'bes'));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Er ging iets mis met de database.'));
    expect(toastError).not.toHaveBeenCalledWith(expect.stringContaining('permission denied'));
    expect(result.current.careFx).toBeNull();
  });

  it('reports an error rather than calling the RPC when no child is loaded', async () => {
    useCurrentChildMock.mockReturnValue({ data: undefined });
    const { result } = renderUseBuddy();

    await act(async () => result.current.care('feed', 'bes'));

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(rpcMock).not.toHaveBeenCalledWith('buddy_care', expect.anything());
  });
});

describe('useBuddy — buy()', () => {
  it('buys through buddy_buy and refreshes the balance', async () => {
    const { result, queryClient } = renderUseBuddy();
    await waitFor(() => expect(result.current.loaded).toBe(true));
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    setRpcResult('buddy_buy', {
      ok: true,
      message: 'Feesttaart gekocht voor 25 Munten.',
      state: makeRow({ munten: 15, inventory: { bes: 2, taart: 1 } }),
    });
    await act(async () => result.current.buy('taart'));

    await waitFor(() => expect(result.current.buddy.munten).toBe(15));
    expect(result.current.buddy.inventory.taart).toBe(1);
    expect(rpcMock).toHaveBeenCalledWith('buddy_buy', { p_child_id: 'child-1', p_item_id: 'taart' });
    expect(toastSuccess).toHaveBeenCalledWith('Feesttaart gekocht voor 25 Munten.');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['buddy-state', 'child-1'] });
  });

  it('reports an unaffordable purchase without touching the balance', async () => {
    const { result } = renderUseBuddy();
    await waitFor(() => expect(result.current.loaded).toBe(true));

    setRpcResult('buddy_buy', { ok: false, message: 'Niet genoeg Munten.', state: makeRow({ munten: 40 }) });
    await act(async () => result.current.buy('toverdrank'));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Niet genoeg Munten.'));
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(result.current.buddy.munten).toBe(40);
    expect(result.current.buddy.inventory.toverdrank).toBeUndefined();
  });

  it('does not play the care animation for a purchase', async () => {
    const { result } = renderUseBuddy();
    await waitFor(() => expect(result.current.loaded).toBe(true));

    setRpcResult('buddy_buy', { ok: true, message: 'gekocht', state: makeRow() });
    await act(async () => result.current.buy('taart'));

    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    expect(result.current.careFx).toBeNull();
  });

  it('maps a database error on a purchase to a readable message', async () => {
    const { result } = renderUseBuddy();
    await waitFor(() => expect(result.current.loaded).toBe(true));

    rpcResponses.buddy_buy = { data: null, error: { message: 'deadlock detected' } };
    await act(async () => result.current.buy('taart'));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Er ging iets mis met de database.'));
  });
});

describe('useBuddy — reviveBuddy()', () => {
  beforeEach(() => {
    rpcResponses.buddy_get_or_create = { data: makeRow({ dead: true }), error: null };
  });

  it('revives through buddy_revive and clears the dead flag', async () => {
    const { result, queryClient } = renderUseBuddy();
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.buddy.dead).toBe(true);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    setRpcResult('buddy_revive', {
      ok: true,
      message: 'Je Buddy is er weer!',
      state: makeRow({ dead: false, needs: { hunger: 55, fun: 55, energy: 55, hygiene: 55, health: 55 } }),
    });
    await act(async () => result.current.reviveBuddy());

    await waitFor(() => expect(result.current.buddy.dead).toBe(false));
    expect(rpcMock).toHaveBeenCalledWith('buddy_revive', { p_child_id: 'child-1' });
    expect(toastSuccess).toHaveBeenCalledWith('Je Buddy is er weer!');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['buddy-state', 'child-1'] });
  });

  it('stays quiet when the revive is refused rather than claiming success', async () => {
    const { result } = renderUseBuddy();
    await waitFor(() => expect(result.current.loaded).toBe(true));

    setRpcResult('buddy_revive', { ok: false, message: 'Niet toegestaan.', state: makeRow({ dead: true }) });
    await act(async () => result.current.reviveBuddy());

    await act(async () => {});
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(result.current.buddy.dead).toBe(true);
  });
});

describe('BuddyFxProvider', () => {
  it('shares one animation between sibling consumers of useBuddy', async () => {
    // BuddyStage renders the animation that CareActionBar triggers; they are
    // siblings, each with its own useBuddy(), so the fx has to live in the
    // provider or the animation never reaches the stage.
    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <BuddyFxProvider>{children}</BuddyFxProvider>
      </QueryClientProvider>
    );
    const { result } = renderHook(() => ({ bar: useBuddy(), stage: useBuddy() }), { wrapper });

    act(() => result.current.bar.playCareFx('feed', '🫐'));

    expect(result.current.stage.careFx).toMatchObject({ action: 'feed', emoji: '🫐' });
  });

  it('clears the animation after its duration', async () => {
    vi.useFakeTimers();
    const { result } = renderUseBuddy();

    act(() => result.current.playCareFx('play', '🌲'));
    expect(result.current.careFx).not.toBeNull();

    act(() => void vi.advanceTimersByTime(CARE_FX_MS + 1));
    expect(result.current.careFx).toBeNull();
  });

  it('restarts the timer when a second action interrupts the first', async () => {
    vi.useFakeTimers();
    const { result } = renderUseBuddy();

    act(() => result.current.playCareFx('feed'));
    act(() => void vi.advanceTimersByTime(CARE_FX_MS - 100));
    act(() => result.current.playCareFx('wash'));

    // The first action's timer must not cut the second animation short.
    act(() => void vi.advanceTimersByTime(200));
    expect(result.current.careFx).toMatchObject({ action: 'wash' });

    act(() => void vi.advanceTimersByTime(CARE_FX_MS));
    expect(result.current.careFx).toBeNull();
  });

  it('does not fire its timeout after unmount', async () => {
    vi.useFakeTimers();
    const { result, unmount } = renderUseBuddy();

    act(() => result.current.playCareFx('feed'));
    unmount();

    // A surviving timer would call setState on an unmounted provider.
    expect(() => vi.advanceTimersByTime(CARE_FX_MS * 2)).not.toThrow();
  });

  it('works without a provider, so screens with no stage need not wrap themselves', async () => {
    const { result } = renderUseBuddy(false);
    await waitFor(() => expect(result.current.loaded).toBe(true));

    expect(() => act(() => result.current.playCareFx('feed', '🫐'))).not.toThrow();
    expect(result.current.careFx).toBeNull();
  });
});
