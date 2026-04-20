import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { triggerConfetti } from '@/lib/confetti';

export function PromotionPopup({
  show,
  onClose,
}: {
  show: boolean;
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(show);

  useEffect(() => {
    if (show) {
      setVisible(true);
      triggerConfetti('large', { colors: ['#fbbf24', '#f59e0b', '#a78bfa', '#22d3ee'] });
    }
  }, [show]);

  if (!visible) return null;

  const close = () => { setVisible(false); onClose(); };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4"
        onClick={close}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', bounce: 0.5 }}
          className="bg-gradient-to-br from-[#2d1b54] to-[#1a103c] border-[3px] border-amber-400/60 rounded-3xl p-8 max-w-sm w-full text-center shadow-[0_20px_60px_rgba(251,191,36,0.3)]"
          onClick={(e) => e.stopPropagation()}
        >
          <motion.div
            animate={{ rotate: [0, -10, 10, -10, 0] }}
            transition={{ duration: 1, repeat: Infinity, repeatDelay: 1 }}
            className="w-24 h-24 bg-gradient-to-br from-amber-300 to-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-[0_10px_30px_rgba(251,191,36,0.5)]"
          >
            <Trophy className="w-12 h-12 text-white" strokeWidth={2.5} />
          </motion.div>
          <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-400 mb-2">
            🎉 Alle trimesters voltooid!
          </h2>
          <p className="text-base text-white/90 font-bold mb-2">
            Wauw! Je hebt het hele leerjaar afgerond.
          </p>
          <p className="text-sm text-[#a78bfa] mb-6">
            Vraag mama of papa om je naar het volgende leerjaar te helpen!
          </p>
          <button
            onClick={close}
            className="w-full px-8 py-4 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-2xl font-black text-base shadow-lg border-b-4 border-orange-700 active:border-b-0 active:translate-y-1 transition-all"
          >
            Geweldig! 🌟
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
