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
  const grade = child?.grade ?? 1;

  return useQuery({
    queryKey: ['stage-exercises-progress', childId, safeStage, grade],
    queryFn: async (): Promise<StageExercise[]> => {
      const { data: exercises, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('grade', grade)
        .eq('stage', `stage-${safeStage}`)
        .eq('is_active', true)
        .order('subject')
        .order('display_order');

      if (error) throw error;

      // Aggregated server-side — one row per attempted exercise rather than one
      // row per attempt ever made.
      const attemptsByExercise: Record<string, { count: number; bestStars: number }> = {};
      if (childId) {
        const { data: stats, error: statsError } = await supabase.rpc('child_exercise_stats', {
          p_child_id: childId,
        });
        if (statsError) throw statsError;

        for (const s of stats ?? []) {
          attemptsByExercise[s.exercise_id] = { count: s.attempt_count, bestStars: s.best_stars };
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
