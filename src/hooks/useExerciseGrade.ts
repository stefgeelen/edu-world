import { useSearchParams } from 'react-router-dom';
import { useCurrentChild } from '@/hooks/useCompleteExercise';

/** Query parameter that opens an exercise from a lower grade (Herhalen). */
export const REVIEW_GRADE_PARAM = 'leerjaar';

/**
 * The grade whose version of the exercise to load: the child's own grade, or
 * the lower grade a Herhalen tile asked for (`?leerjaar=1`). Grade alone
 * tells two rows with the same route apart.
 */
export function useExerciseGrade(): number {
  const { data: child } = useCurrentChild();
  const [params] = useSearchParams();
  const asked = Number(params.get(REVIEW_GRADE_PARAM));
  if (Number.isInteger(asked) && asked >= 1 && asked <= 6) return asked;
  return child?.grade ?? 1;
}
