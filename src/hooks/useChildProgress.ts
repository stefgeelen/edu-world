import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface ChildProgressData {
  subject: string;
  exercises_completed: number;
  total_xp: number;
  average_score: number | null;
  total_time_seconds: number;
}

export interface RecentAttempt {
  id: string;
  score: number;
  max_score: number;
  time_spent_seconds: number;
  completed_at: string;
  exercise: {
    title: string;
    subject: string;
    xp_reward: number;
  } | null;
}

export function useChildProgress() {
  const { user } = useAuth();

  const childQuery = useQuery({
    queryKey: ['my-children', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('children')
        .select('id, name, xp, level, streak')
        .eq('parent_id', user!.id)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const child = childQuery.data;

  const progressQuery = useQuery({
    queryKey: ['child-progress', child?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('child_progress')
        .select('subject, exercises_completed, total_xp, average_score, total_time_seconds')
        .eq('child_id', child!.id);
      if (error) throw error;
      return (data ?? []) as ChildProgressData[];
    },
    enabled: !!child?.id,
  });

  const attemptsQuery = useQuery({
    queryKey: ['recent-attempts', child?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercise_attempts')
        .select('id, score, max_score, time_spent_seconds, completed_at, exercise:exercises(title, subject, xp_reward)')
        .eq('child_id', child!.id)
        .order('completed_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as unknown as RecentAttempt[];
    },
    enabled: !!child?.id,
  });

  return {
    child,
    isLoading: childQuery.isLoading || progressQuery.isLoading,
    progressData: progressQuery.data ?? [],
    recentAttempts: attemptsQuery.data ?? [],
  };
}
