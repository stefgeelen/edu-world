import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// --- Mocks -----------------------------------------------------------------
// useCompleteExercise pulls in auth, celebration, buddy messaging and Supabase.
// Each is mocked so this test can isolate the one thing CLAUDE.md flags as
// high-risk: the mutation's 13 query invalidations + celebration side effects.

const rpcMock = vi.fn();
const maybeSingle = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
    from: () => ({
      select: () => ({
        eq: () => ({
          limit: () => ({
            maybeSingle,
          }),
        }),
      }),
    }),
  },
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

const celebrateRewards = vi.fn();
const celebratePromotion = vi.fn();
vi.mock('@/context/CelebrationContext', () => ({
  useCelebration: () => ({ celebrateRewards, celebratePromotion }),
}));

const getMessage = vi.fn(() => ({ message: 'Goed gedaan!', mood: 'happy', avatarUrl: null, avatarName: 'Milo' }));
vi.mock('@/hooks/useBuddyMessage', () => ({
  useBuddyMessage: () => ({ getMessage, hasAvatar: true }),
}));

const buddyCheer = vi.fn();
vi.mock('@/components/feedback/BuddyToast', () => ({
  buddyToast: { cheer: (...args: unknown[]) => buddyCheer(...args), oops: vi.fn() },
}));

import { useCompleteExercise } from '@/hooks/useCompleteExercise';

const INVALIDATED_KEYS = [
  'stage-exercises-progress',
  'child-progress',
  'trimester-progress',
  'my-child',
  'my-children',
  'recent-attempts',
  'child-rewards',
  'parent-rewards',
  'parent-children',
  'game-badges',
  'child-insights',
];

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

// useCompleteExercise depends on useCurrentChild(), a separate async query.
// Mutating immediately after renderHook() races that query — child?.id would
// still be undefined on the first render. Wait for it to settle first, same
// as the real UI does (buttons stay disabled/loading until child data loads).
async function waitForChildQuery(queryClient: QueryClient) {
  await waitFor(() => {
    expect(queryClient.getQueryState(['my-child', 'user-1'])?.status).toBe('success');
  });
}

describe('useCompleteExercise', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    maybeSingle.mockResolvedValue({ data: { id: 'child-1' }, error: null });
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it('sends the child id from useCurrentChild along with the exercise params', async () => {
    rpcMock.mockResolvedValue({
      data: { attempt_id: 'a1', xp_earned: 10, all_trimesters_completed: false, completed_rewards: [] },
      error: null,
    });

    const { result } = renderHook(() => useCompleteExercise(), { wrapper: makeWrapper(queryClient) });
    await waitForChildQuery(queryClient);

    result.current.mutate({ exerciseId: 'ex-1', score: 4, maxScore: 5, stars: 2, timeSpent: 30 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(rpcMock).toHaveBeenCalledWith('complete_exercise', expect.objectContaining({
      p_child_id: 'child-1',
      p_exercise_id: 'ex-1',
      p_score: 4,
      p_max_score: 5,
      p_stars: 2,
      p_time_spent: 30,
    }));
  });

  it('rejects without calling rpc when there is no child yet', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    rpcMock.mockResolvedValue({ data: {}, error: null });

    const { result } = renderHook(() => useCompleteExercise(), { wrapper: makeWrapper(queryClient) });
    await waitForChildQuery(queryClient);
    result.current.mutate({ exerciseId: 'ex-1', score: 1, maxScore: 1, stars: 1, timeSpent: 1 });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('propagates a Supabase RPC error instead of swallowing it', async () => {
    rpcMock.mockResolvedValue({ data: null, error: new Error('rpc failed') });

    const { result } = renderHook(() => useCompleteExercise(), { wrapper: makeWrapper(queryClient) });
    await waitForChildQuery(queryClient);
    result.current.mutate({ exerciseId: 'ex-1', score: 1, maxScore: 1, stars: 1, timeSpent: 1 });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(new Error('rpc failed'));
  });

  it('invalidates every progress-related query key on success', async () => {
    rpcMock.mockResolvedValue({
      data: { attempt_id: 'a1', xp_earned: 10, all_trimesters_completed: false, completed_rewards: [] },
      error: null,
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCompleteExercise(), { wrapper: makeWrapper(queryClient) });
    await waitForChildQuery(queryClient);
    result.current.mutate({ exerciseId: 'ex-1', score: 1, maxScore: 1, stars: 1, timeSpent: 1 });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    for (const key of INVALIDATED_KEYS) {
      expect(invalidateSpy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: [key] }));
    }
  });

  it('triggers the reward celebration when rewards were completed', async () => {
    const rewards = [{ id: 'r1', title: 'Sticker' }];
    rpcMock.mockResolvedValue({
      data: { attempt_id: 'a1', xp_earned: 10, all_trimesters_completed: false, completed_rewards: rewards },
      error: null,
    });

    const { result } = renderHook(() => useCompleteExercise(), { wrapper: makeWrapper(queryClient) });
    await waitForChildQuery(queryClient);
    result.current.mutate({ exerciseId: 'ex-1', score: 1, maxScore: 1, stars: 1, timeSpent: 1 });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(celebrateRewards).toHaveBeenCalledWith(rewards);
    expect(celebratePromotion).not.toHaveBeenCalled();
  });

  it('triggers the promotion celebration when all trimesters are completed', async () => {
    rpcMock.mockResolvedValue({
      data: { attempt_id: 'a1', xp_earned: 10, all_trimesters_completed: true, completed_rewards: [] },
      error: null,
    });

    const { result } = renderHook(() => useCompleteExercise(), { wrapper: makeWrapper(queryClient) });
    await waitForChildQuery(queryClient);
    result.current.mutate({ exerciseId: 'ex-1', score: 1, maxScore: 1, stars: 1, timeSpent: 1 });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(celebratePromotion).toHaveBeenCalled();
  });

  it('shows a buddy cheer on level up', async () => {
    rpcMock.mockResolvedValue({
      data: { attempt_id: 'a1', xp_earned: 10, all_trimesters_completed: false, completed_rewards: [], leveled_up: true, new_level: 3 },
      error: null,
    });

    const { result } = renderHook(() => useCompleteExercise(), { wrapper: makeWrapper(queryClient) });
    await waitForChildQuery(queryClient);
    result.current.mutate({ exerciseId: 'ex-1', score: 1, maxScore: 1, stars: 1, timeSpent: 1 });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(getMessage).toHaveBeenCalledWith('level_up');
    expect(buddyCheer).toHaveBeenCalled();
  });

  it('shows a buddy cheer only when the streak hits a milestone', async () => {
    rpcMock.mockResolvedValue({
      data: { attempt_id: 'a1', xp_earned: 10, all_trimesters_completed: false, completed_rewards: [], streak: 5 },
      error: null,
    });

    const { result } = renderHook(() => useCompleteExercise(), { wrapper: makeWrapper(queryClient) });
    await waitForChildQuery(queryClient);
    result.current.mutate({ exerciseId: 'ex-1', score: 1, maxScore: 1, stars: 1, timeSpent: 1 });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(buddyCheer).toHaveBeenCalledWith(expect.stringContaining('5 dagen'), expect.anything());
  });

  it('stays quiet on a non-milestone streak (e.g. 4 days)', async () => {
    rpcMock.mockResolvedValue({
      data: { attempt_id: 'a1', xp_earned: 10, all_trimesters_completed: false, completed_rewards: [], streak: 4 },
      error: null,
    });

    const { result } = renderHook(() => useCompleteExercise(), { wrapper: makeWrapper(queryClient) });
    await waitForChildQuery(queryClient);
    result.current.mutate({ exerciseId: 'ex-1', score: 1, maxScore: 1, stars: 1, timeSpent: 1 });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(buddyCheer).not.toHaveBeenCalled();
  });
});
