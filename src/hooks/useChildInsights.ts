import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ChildInsight {
  exerciseId: string;
  title: string;
  subject: string;
  stage: string;
  attemptCount: number;
  avgScorePct: number; // 0.0–1.0
  bestStars: number;
}

export function useChildInsights(childId: string | undefined) {
  return useQuery({
    queryKey: ['child-insights', childId],
    queryFn: async (): Promise<ChildInsight[]> => {
      // Grouped and averaged server-side; this used to pull every attempt row
      // the child had ever produced and reduce them in the browser.
      const { data, error } = await supabase.rpc('child_exercise_stats', {
        p_child_id: childId!,
      });
      if (error) throw error;

      // "Needs attention" = tried at least twice and still averaging under 65%.
      return (data ?? [])
        .filter((s) => s.attempt_count >= 2 && Number(s.avg_score_pct) < 0.65)
        .map((s) => ({
          exerciseId: s.exercise_id,
          title: s.title,
          subject: s.subject,
          stage: s.stage,
          attemptCount: s.attempt_count,
          avgScorePct: Number(s.avg_score_pct),
          bestStars: s.best_stars,
        }))
        .sort((a, b) => a.avgScorePct - b.avgScorePct);
    },
    enabled: !!childId,
  });
}
