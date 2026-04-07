import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentChild } from '@/hooks/useCompleteExercise';

export interface TrimesterData {
  id: string;
  grade_level: number;
  trimester_number: number;
  xp_earned: number;
  xp_threshold: number;
  is_completed: boolean;
  completed_at: string | null;
}

/**
 * Fetches trimester progress for the current child's grade.
 * Returns an array of 4 trimesters (creating defaults for missing ones).
 */
export function useTrimesterProgress() {
  const { data: child, isLoading: childLoading } = useCurrentChild();

  const query = useQuery({
    queryKey: ['trimester-progress', child?.id, child?.grade],
    queryFn: async (): Promise<TrimesterData[]> => {
      const { data, error } = await supabase
        .from('trimester_progress')
        .select('*')
        .eq('child_id', child!.id)
        .eq('grade_level', child!.grade)
        .order('trimester_number');

      if (error) throw error;

      // Fill in missing trimesters with defaults
      const existing = new Map((data ?? []).map((t) => [t.trimester_number, t]));
      return [1, 2, 3, 4].map((n) =>
        existing.get(n) ?? {
          id: '',
          grade_level: child!.grade,
          trimester_number: n,
          xp_earned: 0,
          xp_threshold: 100,
          is_completed: false,
          completed_at: null,
        }
      );
    },
    enabled: !!child?.id,
  });

  return {
    trimesters: query.data ?? [],
    isLoading: childLoading || query.isLoading,
    child,
  };
}
