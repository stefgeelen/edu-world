import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useCurrentChild } from '@/hooks/useCompleteExercise';

/**
 * Returns the child's grade and the current stage (trimester) derived from
 * the route `:id` param. Produces a difficulty key like "1-2" (grade 1, stage 2).
 */
export function useDifficultyLevel() {
  const { data: child } = useCurrentChild();
  const { id } = useParams<{ id: string }>();

  return useMemo(() => {
    const grade = child?.grade ?? 1;
    // The :id param in exercise routes corresponds to stage number (1-3)
    const stage = Math.max(1, Math.min(3, Number(id) || 1));
    return { grade, stage, key: `${grade}-${stage}` };
  }, [child?.grade, id]);
}
