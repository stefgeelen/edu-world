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
      const { data, error } = await supabase
        .from('exercise_attempts')
        .select('exercise_id, score, max_score, stars, exercise:exercises(title, subject, stage)')
        .eq('child_id', childId!);
      if (error) throw error;

      const grouped = new Map<string, {
        title: string;
        subject: string;
        stage: string;
        scores: number[];
        bestStars: number;
      }>();

      for (const row of data ?? []) {
        const ex = row.exercise as { title: string; subject: string; stage: string } | null;
        if (!ex) continue;
        const scorePct = row.max_score > 0 ? row.score / row.max_score : 0;
        const existing = grouped.get(row.exercise_id);
        if (existing) {
          existing.scores.push(scorePct);
          existing.bestStars = Math.max(existing.bestStars, row.stars);
        } else {
          grouped.set(row.exercise_id, {
            title: ex.title,
            subject: ex.subject,
            stage: ex.stage,
            scores: [scorePct],
            bestStars: row.stars,
          });
        }
      }

      const results: ChildInsight[] = [];
      for (const [exerciseId, info] of grouped.entries()) {
        if (info.scores.length < 2) continue;
        const avgScorePct = info.scores.reduce((a, b) => a + b, 0) / info.scores.length;
        if (avgScorePct >= 0.65) continue;
        results.push({
          exerciseId,
          title: info.title,
          subject: info.subject,
          stage: info.stage,
          attemptCount: info.scores.length,
          avgScorePct,
          bestStars: info.bestStars,
        });
      }

      return results.sort((a, b) => a.avgScorePct - b.avgScorePct);
    },
    enabled: !!childId,
  });
}
