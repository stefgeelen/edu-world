import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { useCelebration } from '@/context/CelebrationContext';

/**
 * Returns the current child's ID for the logged-in parent.
 * Reused across exercise hooks.
 */
export function useCurrentChild() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-child', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('children')
        .select('id, grade, xp, level, pending_promotion, avatar_id, streak')
        .eq('parent_id', user!.id)
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

interface CompleteExerciseResult {
  attempt_id: string;
  xp_earned: number;
  all_trimesters_completed: boolean;
  completed_rewards: { id: string; title: string }[];
  leveled_up?: boolean;
  new_level?: number;
  streak?: number;
}

/**
 * Mutation that calls the complete_exercise database function.
 * Automatically invalidates all progress-related queries and triggers celebrations.
 */
export function useCompleteExercise() {
  const queryClient = useQueryClient();
  const { data: child } = useCurrentChild();
  const { user } = useAuth();
  const { celebrateRewards, celebratePromotion } = useCelebration();

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
      queryClient.invalidateQueries({ queryKey: ['stage-exercises-progress'] });
      queryClient.invalidateQueries({ queryKey: ['child-progress'] });
      queryClient.invalidateQueries({ queryKey: ['trimester-progress'] });
      queryClient.invalidateQueries({ queryKey: ['my-child'] });
      queryClient.invalidateQueries({ queryKey: ['my-children'] });
      queryClient.invalidateQueries({ queryKey: ['recent-attempts'] });
      queryClient.invalidateQueries({ queryKey: ['child-rewards'] });
      queryClient.invalidateQueries({ queryKey: ['parent-rewards'] });
      queryClient.invalidateQueries({ queryKey: ['parent-rewards', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['parent-children'] });
      queryClient.invalidateQueries({ queryKey: ['parent-children', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['game-badges'] });

      // Trigger celebrations
      if (data?.completed_rewards && data.completed_rewards.length > 0) {
        celebrateRewards(data.completed_rewards);
      }
      if (data?.all_trimesters_completed) {
        celebratePromotion();
      }
    },
  });
}

