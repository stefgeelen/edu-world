import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ChildInsight {
  exerciseId: string;
  title: string;
  subject: string;
  stage: string;
  /** Attempts counted, at most the last 10. */
  tries: number;
  /** Finished with only 1 heart left. */
  hard: number;
  /** Lost all hearts. */
  gameOver: number;
  /** Closed halfway through, after answering at least once. */
  abandoned: number;
  /** hard + gameOver + abandoned */
  struggles: number;
  /** struggles / tries, 0.0–1.0 */
  struggleShare: number;
}

/**
 * "Needs attention" = tried at least twice, and at least half of the last 10
 * tries were a struggle: finished with 1 heart left, lost all hearts, or
 * stopped halfway. The last-10 window lives in `child_exercise_insights`.
 */
export const MIN_TRIES = 2;
export const STRUGGLE_SHARE_THRESHOLD = 0.5;

export function useChildInsights(childId: string | undefined) {
  return useQuery({
    queryKey: ['child-insights', childId],
    queryFn: async (): Promise<ChildInsight[]> => {
      const { data, error } = await supabase.rpc('child_exercise_insights', {
        p_child_id: childId!,
      });
      if (error) throw error;

      return (data ?? [])
        .map((s) => {
          const struggles = s.hard + s.game_over + s.abandoned;
          return {
            exerciseId: s.exercise_id,
            title: s.title,
            subject: s.subject,
            stage: s.stage,
            tries: s.tries,
            hard: s.hard,
            gameOver: s.game_over,
            abandoned: s.abandoned,
            struggles,
            struggleShare: s.tries > 0 ? struggles / s.tries : 0,
          };
        })
        .filter((s) => s.tries >= MIN_TRIES && s.struggleShare >= STRUGGLE_SHARE_THRESHOLD)
        .sort((a, b) => b.struggleShare - a.struggleShare || b.tries - a.tries);
    },
    enabled: !!childId,
  });
}
