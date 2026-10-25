import { useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { usePlayingChildId } from '@/lib/playingChild';
import { useQuery } from '@tanstack/react-query';
import { useCelebration } from '@/context/CelebrationContext';
import { buddyToast } from '@/components/feedback/BuddyToast';
import { payoutMessage, type Payout } from '@/lib/buddy/payout';
import type { Tables } from '@/integrations/supabase/types';

/** The columns of `children` the gameplay side reads. */
export type CurrentChild = Pick<
  Tables<'children'>,
  'id' | 'name' | 'grade' | 'max_unlocked_stage'
>;

/**
 * Returns the child playing on this device: the one picked on "Wie speelt
 * er?", or, without a (still valid) pick, the oldest child that is not paused.
 * Reused across exercise hooks.
 *
 * Ordered by created_at so that the fallback always resolves to the same
 * child; without it "the" child was whichever row Postgres happened to return
 * first and could change between sessions.
 */
export function useCurrentChild() {
  const { user } = useAuth();
  const playingChildId = usePlayingChildId(user?.id);

  return useQuery<CurrentChild | null>({
    queryKey: ['my-child', user?.id, playingChildId],
    queryFn: async () => {
      if (playingChildId) {
        const { data, error } = await supabase
          .from('children')
          .select('id, name, grade, max_unlocked_stage')
          .eq('parent_id', user!.id)
          .eq('id', playingChildId)
          .eq('paused', false)
          .maybeSingle();
        if (error) throw error;
        if (data) return data;
      }
      const { data, error } = await supabase
        .from('children')
        .select('id, name, grade, max_unlocked_stage')
        .eq('parent_id', user!.id)
        .eq('paused', false)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

interface CompleteExerciseParams {
  exerciseId: string;
  score: number;
  maxScore: number;
  stars: number;
  timeSpent: number;
  answers?: unknown[];
}

/** The fields of complete_exercise's result the child side acts on. */
interface CompleteExerciseResult extends Payout {
  attempt_id: string;
  completed_rewards: { id: string; title: string }[];
  munten_total?: number;
}

/**
 * A failed call is retried only when it never reached the database (offline,
 * dropped connection). A database error has a code and would fail again.
 */
function isRetryable(failureCount: number, error: unknown): boolean {
  if (failureCount >= 3) return false;
  const code = (error as { code?: unknown })?.code;
  const message = (error as { message?: unknown })?.message;
  return !(typeof code === 'string' && code !== '') && message !== 'No child found';
}

/**
 * Mutation that calls the complete_exercise database function.
 * Invalidates what an exercise changes (payouts, Munten, rewards, badges) and
 * lets the Buddy react to what it earned.
 *
 * One exercise screen is one run, so `mutate` only goes through once per
 * mount: a double tap on the last answer can't pay twice. Every call of a run
 * carries the same `p_client_attempt_id`, so a retry after a dropped
 * connection is not paid twice by the server either.
 */
export function useCompleteExercise() {
  const queryClient = useQueryClient();
  const { data: child } = useCurrentChild();
  const { celebrateRewards } = useCelebration();
  const attemptId = useRef<string>(crypto.randomUUID());
  const sent = useRef(false);

  const mutation = useMutation({
    mutationFn: async (params: CompleteExerciseParams) => {
      if (!child?.id) throw new Error('No child found');

      const { data, error } = await supabase.rpc('complete_exercise', {
        p_child_id: child.id,
        p_exercise_id: params.exerciseId,
        p_score: params.score,
        p_max_score: params.maxScore,
        p_stars: params.stars,
        p_time_spent: params.timeSpent,
        p_answers: JSON.stringify(params.answers ?? []),
        p_client_attempt_id: attemptId.current,
      });

      if (error) throw error;
      return data as unknown as CompleteExerciseResult;
    },
    retry: isRetryable,
    onError: () => {
      buddyToast.oops('Oei, je Munten zijn niet bewaard. Probeer de oefening straks nog eens.');
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['practice-menu'] });
      queryClient.invalidateQueries({ queryKey: ['buddy-state'] });
      queryClient.invalidateQueries({ queryKey: ['child-rewards'] });
      queryClient.invalidateQueries({ queryKey: ['game-badges'] });
      // Parent portal, in case it is open on the same device.
      queryClient.invalidateQueries({ queryKey: ['parent-children'] });
      queryClient.invalidateQueries({ queryKey: ['parent-rewards'] });
      queryClient.invalidateQueries({ queryKey: ['child-insights'] });

      if (data?.completed_rewards && data.completed_rewards.length > 0) {
        celebrateRewards(data.completed_rewards);
      }

      const line = data ? payoutMessage(data) : null;
      if (line) buddyToast.cheer(line, { duration: 4000 });
    },
  });

  const { mutate: rawMutate } = mutation;
  const mutate = useCallback<typeof rawMutate>((...args) => {
    if (sent.current) return;
    sent.current = true;
    rawMutate(...args);
  }, [rawMutate]);

  return { ...mutation, mutate };
}

