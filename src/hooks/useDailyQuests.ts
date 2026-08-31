import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentChild } from '@/hooks/useCompleteExercise';
import { createSeededRng, pickSeeded } from '@/lib/seededRandom';
import { selectDailyQuests, type NudgeSubject, type SelectedQuest, type TodayMetrics } from '@/data/dailyQuests';

const NUDGE_SUBJECTS: NudgeSubject[] = ['math', 'reading', 'writing'];

function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function startOfToday(): Date {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start;
}

export interface UseDailyQuestsResult {
  quests: SelectedQuest[];
  isLoading: boolean;
}

export function useDailyQuests(): UseDailyQuestsResult {
  const { data: child, isLoading: childLoading } = useCurrentChild();
  const today = startOfToday();
  const todayKey = localDateKey(today);

  const todayQuery = useQuery({
    queryKey: ['daily-quest-attempts-today', child?.id, todayKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercise_attempts')
        .select('stars, time_spent_seconds, exercise:exercises(subject, xp_reward)')
        .eq('child_id', child!.id)
        .gte('completed_at', today.toISOString());
      if (error) throw error;

      const metrics: TodayMetrics = { attemptCount: 0, perfectCount: 0, timeSpentSeconds: 0, xpEarned: 0 };
      const subjectsAttempted = new Set<string>();

      for (const row of data ?? []) {
        const ex = row.exercise as { subject: string; xp_reward: number } | null;
        metrics.attemptCount += 1;
        if (row.stars >= 3) metrics.perfectCount += 1;
        metrics.timeSpentSeconds += row.time_spent_seconds;
        if (ex) {
          metrics.xpEarned += ex.xp_reward;
          subjectsAttempted.add(ex.subject);
        }
      }

      return { metrics, subjectsAttempted };
    },
    enabled: !!child?.id,
  });

  const weekQuery = useQuery({
    queryKey: ['daily-quest-subject-week', child?.id, todayKey],
    queryFn: async () => {
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await supabase
        .from('exercise_attempts')
        .select('exercise:exercises(subject)')
        .eq('child_id', child!.id)
        .gte('completed_at', sevenDaysAgo.toISOString());
      if (error) throw error;

      const counts: Record<NudgeSubject, number> = { math: 0, reading: 0, writing: 0 };
      for (const row of data ?? []) {
        const ex = row.exercise as { subject: string } | null;
        if (ex && (ex.subject === 'math' || ex.subject === 'reading' || ex.subject === 'writing')) {
          counts[ex.subject] += 1;
        }
      }
      return counts;
    },
    enabled: !!child?.id,
  });

  const isLoading = childLoading || todayQuery.isLoading || weekQuery.isLoading;

  if (isLoading || !todayQuery.data || !weekQuery.data) {
    return { quests: [], isLoading };
  }

  const rng = createSeededRng(`${child!.id}|${todayKey}`);

  const weekCounts = weekQuery.data;
  const minCount = Math.min(...NUDGE_SUBJECTS.map(s => weekCounts[s]));
  const leastPracticedSubjects = NUDGE_SUBJECTS.filter(s => weekCounts[s] === minCount);
  const nudgeSubject = pickSeeded(leastPracticedSubjects, rng);
  const nudgeSubjectAttemptedToday = todayQuery.data.subjectsAttempted.has(nudgeSubject);

  const quests = selectDailyQuests(rng, todayQuery.data.metrics, nudgeSubject, nudgeSubjectAttemptedToday);

  return { quests, isLoading: false };
}
