import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentChild } from '@/hooks/useCompleteExercise';
import { useExerciseId } from '@/hooks/useExerciseId';

export type IncompleteReason = 'game_over' | 'abandoned';

/**
 * Saves an attempt that never reaches `complete_exercise`: the child lost all
 * hearts, or closed the exercise halfway. Only the parent portal's
 * Aandachtspunten read these; nothing is paid out.
 *
 * Fire-and-forget: the child is already on their way back to the dashboard,
 * so a failure is logged, not shown.
 */
export function useRecordIncompleteExercise() {
  const queryClient = useQueryClient();
  const { data: child } = useCurrentChild();
  const exerciseId = useExerciseId();
  const childId = child?.id;

  return useCallback(
    (reason: IncompleteReason, progressPct: number, mistakes: number) => {
      if (!childId || !exerciseId) return;
      supabase
        .rpc('record_incomplete_exercise', {
          p_child_id: childId,
          p_exercise_id: exerciseId,
          p_reason: reason,
          p_progress_pct: Math.round(progressPct),
          p_mistakes: mistakes,
        })
        .then(({ error }) => {
          if (error) throw error;
          return queryClient.invalidateQueries({ queryKey: ['child-insights', childId] });
        })
        .then(undefined, (err) => console.error('Could not save incomplete exercise', err));
    },
    [childId, exerciseId, queryClient]
  );
}
