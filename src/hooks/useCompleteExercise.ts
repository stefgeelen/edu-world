import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';

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
        .select('id, grade, xp, level, pending_promotion')
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

/**
 * Mutation that calls the complete_exercise database function.
 * Automatically invalidates all progress-related queries.
 */
export function useCompleteExercise() {
  const queryClient = useQueryClient();
  const { data: child } = useCurrentChild();

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
      return data as { attempt_id: string; xp_earned: number; all_trimesters_completed: boolean; completed_rewards: { id: string; title: string }[] };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stage-exercises-progress'] });
      queryClient.invalidateQueries({ queryKey: ['child-progress'] });
      queryClient.invalidateQueries({ queryKey: ['trimester-progress'] });
      queryClient.invalidateQueries({ queryKey: ['my-child'] });
      queryClient.invalidateQueries({ queryKey: ['my-children'] });
      queryClient.invalidateQueries({ queryKey: ['recent-attempts'] });
      queryClient.invalidateQueries({ queryKey: ['child-rewards'] });
      queryClient.invalidateQueries({ queryKey: ['parent-rewards'] });
    },
  });
}
