import { useQuery } from '@tanstack/react-query';
import { Gift } from 'lucide-react';
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
    <section className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" aria-labelledby="rewards-title">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-pink-400 to-pink-600 shadow-sm" aria-hidden>
          <Gift className="h-5 w-5 text-white" />
        </span>
        <h2 id="rewards-title" className="text-base font-black text-slate-900">
          Mijn beloningen
        </h2>
      </div>

      <ul className="space-y-3">
        {rewards.map((reward) => {
          const left = Math.max(0, reward.required_exercises - reward.current_progress);
          const pct = Math.min(100, Math.round((reward.current_progress / Math.max(1, reward.required_exercises)) * 100));
          const what = left === 1 ? SUBJECT_EXERCISES[reward.subject].replace(/en$/, '') : SUBJECT_EXERCISES[reward.subject];
          return (
            <li key={reward.id}>
              <p className="text-sm font-bold text-slate-800">
                Nog {left} {what} tot: {reward.title}
              </p>
              <div
                className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-pink-100"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={reward.required_exercises}
                aria-valuenow={reward.current_progress}
                aria-label={reward.title}
              >
                <div className="h-full rounded-full bg-gradient-to-r from-pink-400 to-pink-500" style={{ width: `${pct}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
