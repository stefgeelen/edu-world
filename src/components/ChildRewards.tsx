import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

const SUBJECT_LABELS: Record<string, string> = {
  math: '🔢 Rekenen',
  reading: '📖 Lezen',
  writing: '✏️ Schrijven',
};

export function ChildRewards({ childId }: { childId?: string }) {
  const { user } = useAuth();

  const { data: child } = useQuery({
    queryKey: ['my-child-for-rewards', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('children')
        .select('id')
        .eq('parent_id', user!.id)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !childId,
  });

  const cId = childId ?? child?.id;

  const { data: rewards = [] } = useQuery({
    queryKey: ['child-rewards', cId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rewards')
        .select('id, title, subject, required_exercises, current_progress, is_completed')
        .eq('child_id', cId!)
        .eq('is_completed', false)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!cId,
  });

  if (rewards.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
        <Gift className="w-5 h-5 text-pink-500" />
        Mijn Beloningen
      </h3>
      {rewards.map((reward) => {
        const pct = Math.min(Math.round((reward.current_progress / reward.required_exercises) * 100), 100);
        return (
          <motion.div
            key={reward.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-bold text-sm text-slate-800">{reward.title}</p>
                <p className="text-xs text-slate-500">{SUBJECT_LABELS[reward.subject] ?? reward.subject}</p>
              </div>
              <span className="text-xs font-black text-blue-600">{pct}%</span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-pink-400 to-pink-500 rounded-full"
              />
            </div>
            <p className="text-[10px] font-bold text-slate-400 mt-1">
              {reward.current_progress} / {reward.required_exercises} oefeningen
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}
