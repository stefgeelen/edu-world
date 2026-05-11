import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentChild } from '@/hooks/useCompleteExercise';
import type { StageExercise } from '@/types/stage';

export const REQUIRED_COMPLETIONS = 5;

/**
 * Fetches all exercises for stage-1 and merges per-child attempt data.
 * Returns a flat list of StageExercise objects with completions & bestStars.
 */
export function useStageExercises(stage: number = 1) {
  const { data: child, isFetched } = useCurrentChild();
  const childId = child?.id;
  const safeStage = Math.max(1, Math.min(3, stage || 1));

  return useQuery({
    queryKey: ['stage-exercises-progress', childId, safeStage],
    queryFn: async (): Promise<StageExercise[]> => {
      const { data: exercises, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('stage', `stage-${safeStage}`)
        .eq('is_active', true)
        .order('subject')
        .order('display_order');

      if (error) throw error;

      let attemptsByExercise: Record<string, { count: number; bestStars: number }> = {};
      if (childId) {
        const { data: attempts } = await supabase
          .from('exercise_attempts')
          .select('exercise_id, stars')
          .eq('child_id', childId);

        if (attempts) {
          for (const a of attempts) {
            if (!attemptsByExercise[a.exercise_id]) {
              attemptsByExercise[a.exercise_id] = { count: 0, bestStars: 0 };
            }
            attemptsByExercise[a.exercise_id].count++;
            attemptsByExercise[a.exercise_id].bestStars = Math.max(
              attemptsByExercise[a.exercise_id].bestStars,
              a.stars
            );
          }
        }
      }

      return (exercises || []).map((ex) => ({
        id: ex.id,
        order: ex.display_order,
        title: ex.title,
        subject: ex.subject as StageExercise['subject'],
        xpReward: ex.xp_reward,
        route: ex.route,
        completions: attemptsByExercise[ex.id]?.count ?? 0,
        bestStars: attemptsByExercise[ex.id]?.bestStars ?? 0,
      }));
    },
    enabled: isFetched,
  });
}
