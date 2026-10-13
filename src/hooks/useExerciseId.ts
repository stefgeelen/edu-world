import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useExerciseGrade } from '@/hooks/useExerciseGrade';

/**
 * Resolves the database exercise ID from the current route.
 * Maps the app route (e.g. /app/exercise-bonds/1) to the DB route (/exercise-bonds/1).
 *
 * Filters by the exercise's grade (useExerciseGrade) so that once multiple grades share the same
 * `route` string (grade only disambiguates the row), this doesn't start
 * matching more than one exercise and erroring on `.maybeSingle()`.
 */
export function useExerciseId() {
  const location = useLocation();
  const grade = useExerciseGrade();

  // Strip /app prefix to match DB route format
  const dbRoute = location.pathname.replace(/^\/app/, '');

  const { data: exerciseId } = useQuery({
    queryKey: ['exercise-id', dbRoute, grade],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercises')
        .select('id')
        .eq('route', dbRoute)
        .eq('grade', grade)
        .maybeSingle();
      if (error) throw error;
      return data?.id ?? null;
    },
    staleTime: Infinity, // Route-to-ID mapping doesn't change
  });

  return exerciseId ?? undefined;
}
