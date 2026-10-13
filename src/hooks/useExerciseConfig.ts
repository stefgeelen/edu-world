import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useExerciseGrade } from '@/hooks/useExerciseGrade';

/**
 * Fetches the DB-driven difficulty config for the exercise at the current
 * route, scoped to the exercise's grade (useExerciseGrade). Falls back to `defaultConfig`
 * when the matching row has no config yet (e.g. a newly provisioned grade
 * an admin hasn't filled in), so a missing row never breaks the exercise.
 */
export function useExerciseConfig<T>(defaultConfig: T): T {
  const location = useLocation();
  const grade = useExerciseGrade();

  // Strip /app prefix to match DB route format
  const dbRoute = location.pathname.replace(/^\/app/, '');

  const { data: config } = useQuery({
    queryKey: ['exercise-config', dbRoute, grade],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercises')
        .select('config')
        .eq('route', dbRoute)
        .eq('grade', grade)
        .maybeSingle();
      if (error) throw error;
      return (data?.config as T | null) ?? null;
    },
  });

  return config ?? defaultConfig;
}
