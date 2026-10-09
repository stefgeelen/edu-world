import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
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
 * Returns the current child for the logged-in parent.
 * Reused across exercise hooks.
 *
 * Ordered by created_at so that a parent with several children always resolves
 * to the same one; without it "the" child was whichever row Postgres happened to
 * return first and could change between sessions.
 */
export function useCurrentChild() {
  const { user } = useAuth();

  return useQuery<CurrentChild | null>({
    queryKey: ['my-child', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('children')
        .select('id, name, grade, max_unlocked_stage')
        .eq('parent_id', user!.id)
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

/**
 * The fields of complete_exercise's result the child side acts on. It also
 * returns XP, level and streak; those only feed the parent portal and badges.
 */
interface CompleteExerciseResult extends Payout {
  attempt_id: string;
  completed_rewards: { id: string; title: string }[];
  munten_total?: number;
}

/**
 * Mutation that calls the complete_exercise database function.
 * Invalidates what an exercise changes (payouts, Munten, rewards, badges) and
 * lets the Buddy react to what it earned.
 */
export function useCompleteExercise() {
  const queryClient = useQueryClient();
  const { data: child } = useCurrentChild();
  const { celebrateRewards } = useCelebration();

  return useMutation({
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
      });

      if (error) throw error;
      return data as unknown as CompleteExerciseResult;
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
}

