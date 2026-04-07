import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, X } from 'lucide-react';
import { fireConfetti } from '@/lib/confetti';

interface CompletedReward {
  id: string;
  title: string;
}

export function RewardCompletedPopup({
  rewards,
  onClose,
}: {
  rewards: CompletedReward[];
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(rewards.length > 0);

  useEffect(() => {
    if (rewards.length > 0) {
      setVisible(true);
      fireConfetti();
    }
  }, [rewards]);

  if (!visible || rewards.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
        onClick={() => { setVisible(false); onClose(); }}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-20 h-20 bg-gradient-to-br from-pink-400 to-purple-500 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-lg">
            <Gift className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">🎉 Beloning behaald!</h2>
          {rewards.map((r) => (
            <p key={r.id} className="text-lg font-bold text-pink-600 mb-1">
              {r.title}
            </p>
          ))}
          <p className="text-sm text-slate-500 mt-3 mb-6">
            Geweldig gedaan! Vraag je mama of papa om je beloning.
          </p>
          <button
            onClick={() => { setVisible(false); onClose(); }}
            className="px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-2xl font-bold text-sm shadow-md hover:shadow-lg transition-shadow"
          >
            Super! 🎊
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
