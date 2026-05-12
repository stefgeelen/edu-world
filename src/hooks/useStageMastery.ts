import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentChild } from '@/hooks/useCompleteExercise';
import { REQUIRED_COMPLETIONS } from '@/hooks/useStageExercises';

export interface StageMastery {
  stage: number;
  total: number;
  mastered: number;
  isCompleted: boolean;
  isCurrent: boolean;
  isLocked: boolean;
}

export const STAGE_NAMES: Record<number, string> = {
  1: 'Fluisterbomen',
  2: 'Borrelende Beek',
  3: 'Woordenwoud',
};

/**
 * Computes per-stage mastery (1..3) for the current child.
 * A stage is "completed" when ALL its exercises have been mastered (>= REQUIRED_COMPLETIONS attempts).
 * The first non-completed stage is the "current" one; others after it are "locked".
 */
export function useStageMastery() {
  const { data: child, isFetched } = useCurrentChild();
  const childId = child?.id;

  const query = useQuery({
    queryKey: ['stage-mastery', childId, child?.max_unlocked_stage],
    queryFn: async (): Promise<StageMastery[]> => {
      // Fetch all active exercises across stages 1-3
      const { data: exercises, error } = await supabase
        .from('exercises')
        .select('id, stage')
        .eq('is_active', true);
      if (error) throw error;

      // Per-child attempt counts
      const counts: Record<string, number> = {};
      if (childId) {
        const { data: attempts } = await supabase
          .from('exercise_attempts')
          .select('exercise_id')
          .eq('child_id', childId);
        for (const a of attempts ?? []) {
          counts[a.exercise_id] = (counts[a.exercise_id] ?? 0) + 1;
        }
      }

      // Group exercises by stage number
      const byStage = new Map<number, { total: number; mastered: number }>();
      for (const ex of exercises ?? []) {
        const n = parseInt(String(ex.stage).replace(/[^0-9]/g, ''), 10);
        if (!n || n < 1 || n > 3) continue;
        const entry = byStage.get(n) ?? { total: 0, mastered: 0 };
        entry.total += 1;
        if ((counts[ex.id] ?? 0) >= REQUIRED_COMPLETIONS) entry.mastered += 1;
        byStage.set(n, entry);
      }

      const stages: StageMastery[] = [1, 2, 3].map((n) => {
        const e = byStage.get(n) ?? { total: 0, mastered: 0 };
        return {
          stage: n,
          total: e.total,
          mastered: e.mastered,
          isCompleted: e.total > 0 && e.mastered >= e.total,
          isCurrent: false,
          isLocked: false,
        };
      });

      // Determine current/locked, respecting parent's max_unlocked_stage override
      const maxUnlocked = child?.max_unlocked_stage ?? 1;
      const firstIncomplete = stages.findIndex((s) => !s.isCompleted);
      stages.forEach((s, i) => {
        const stageNum = i + 1;
        if (stageNum <= maxUnlocked) {
          // Always unlocked by parent override
          s.isLocked = false;
          if (firstIncomplete !== -1 && i === firstIncomplete) s.isCurrent = true;
        } else {
          // Beyond parent override — use mastery-based locking
          if (firstIncomplete === -1) return; // all done
          if (i === firstIncomplete) s.isCurrent = true;
          if (i > firstIncomplete) s.isLocked = true;
        }
      });

      return stages;
    },
    enabled: isFetched,
  });

  const stages = query.data ?? [];
  const totalExercises = stages.reduce((s, x) => s + x.total, 0);
  const totalMastered = stages.reduce((s, x) => s + x.mastered, 0);
  const overallPct = totalExercises > 0 ? Math.round((totalMastered / totalExercises) * 100) : 0;

  return {
    stages,
    totalExercises,
    totalMastered,
    overallPct,
    isLoading: query.isLoading,
    child,
  };
}
