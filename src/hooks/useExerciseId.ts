import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

/**
 * Resolves the database exercise ID from the current route.
 * Maps the app route (e.g. /app/exercise-bonds/1) to the DB route (/exercise-bonds/1).
 */
export function useExerciseId() {
  const location = useLocation();

  // Strip /app prefix to match DB route format
  const dbRoute = location.pathname.replace(/^\/app/, '');

  const { data: exerciseId } = useQuery({
    queryKey: ['exercise-id', dbRoute],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercises')
        .select('id')
        .eq('route', dbRoute)
        .maybeSingle();
      if (error) throw error;
      return data?.id ?? null;
    },
    staleTime: Infinity, // Route-to-ID mapping doesn't change
  });

  return exerciseId ?? undefined;
}
