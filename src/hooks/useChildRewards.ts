import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentChild } from '@/hooks/useCompleteExercise';
import { SUBJECT_EXERCISES } from '@/data/exerciseTypes';

/**
 * The open real-world rewards a parent set up for the current child. Every
 * finished exercise of the reward's subject counts, repeats included.
 */
export function useChildRewards() {
  const { data: child } = useCurrentChild();
  const childId = child?.id;

  return useQuery({
    queryKey: ['child-rewards', childId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rewards')
        .select('id, title, subject, required_exercises, current_progress')
        .eq('child_id', childId!)
        .eq('is_completed', false)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!childId,
  });
}

/** "Nog 7 rekenoefeningen tot: IJsje" — singular for the last one. */
export function rewardCountdown(r: { title: string; subject: keyof typeof SUBJECT_EXERCISES; required_exercises: number; current_progress: number }) {
  const left = Math.max(0, r.required_exercises - r.current_progress);
  const what = left === 1 ? SUBJECT_EXERCISES[r.subject].replace(/en$/, '') : SUBJECT_EXERCISES[r.subject];
  return `Nog ${left} ${what} tot: ${r.title}`;
}
