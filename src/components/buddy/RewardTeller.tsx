import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentChild } from '@/hooks/useCompleteExercise';
import { SUBJECT_EXERCISES } from '@/data/exerciseTypes';

/**
 * The real-world rewards a parent set up, as "Nog 12 rekenoefeningen tot je
 * ijsje!". Every finished exercise of that subject counts, repeats included.
 */
export function RewardTeller() {
  const { data: child } = useCurrentChild();
  const childId = child?.id;

  const { data: rewards = [] } = useQuery({
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

  if (rewards.length === 0) return null;

  return (
    <section className="mt-4 space-y-2" aria-label="Beloningen">
      {rewards.map((reward) => {
        const left = Math.max(0, reward.required_exercises - reward.current_progress);
        const pct = Math.min(100, Math.round((reward.current_progress / Math.max(1, reward.required_exercises)) * 100));
        const what = left === 1 ? SUBJECT_EXERCISES[reward.subject].replace(/en$/, '') : SUBJECT_EXERCISES[reward.subject];
        return (
          <div key={reward.id} className="rounded-3xl bg-white p-4 shadow-md">
            <p className="text-base font-extrabold text-foreground">
              <span aria-hidden>🎁 </span>
              Nog {left} {what} tot: {reward.title}
            </p>
            <div
              className="mt-2 h-3 overflow-hidden rounded-full bg-pink-100"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={reward.required_exercises}
              aria-valuenow={reward.current_progress}
              aria-label={reward.title}
            >
              <div className="h-full rounded-full bg-gradient-to-r from-pink-400 to-pink-500" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </section>
  );
}
