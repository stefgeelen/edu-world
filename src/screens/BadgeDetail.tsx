import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sparkles, Flame, Star, Target, Trophy, BookOpen,
  Zap, Award, Heart, Crown, ChevronLeft, Lock, Check
} from 'lucide-react';
import { useGame } from '@/context/GameContext';
import { cn } from '@/lib/utils';
import { triggerConfetti } from '@/lib/confetti';

const iconMap: Record<string, React.ComponentType<any>> = {
  Sparkles, Flame, Star, Target, Trophy, BookOpen, Zap, Award, Heart, Crown,
};

function StarryBackground() {
  const stars = React.useMemo(() => 
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      delay: Math.random() * 3,
      duration: Math.random() * 2 + 2,
    })), []
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map(star => (
        <motion.div
          key={star.id}
          className="absolute rounded-full bg-white"
          style={{ left: `${star.x}%`, top: `${star.y}%`, width: star.size, height: star.size }}
          animate={{ opacity: [0.2, 0.8, 0.2], scale: [1, 1.3, 1] }}
          transition={{ duration: star.duration, delay: star.delay, repeat: Infinity }}
        />
      ))}
    </div>
  );
}

export function BadgeDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { badges } = useGame();

  const badge = badges.find((b) => b.id === id);

  React.useEffect(() => {
    if (badge?.isUnlocked) {
      setTimeout(() => {
        triggerConfetti('small', {
          colors: [badge.gradientFrom, badge.gradientTo, '#fbbf24'],
          originY: 0.5,
        });
      }, 300);
    }
  }, [badge?.isUnlocked, badge?.gradientFrom, badge?.gradientTo]);

  if (!badge) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gradient-to-b from-[#2d1b54] to-[#0a0618]">
        <div className="text-center">
          <p className="text-xl font-bold text-white/70">Badge niet gevonden</p>
          <button
            onClick={() => navigate('/app/badges')}
            className="mt-4 px-6 py-3 bg-amber-500 text-white rounded-2xl font-bold border-b-4 border-amber-700 active:border-b-0 active:translate-y-1 transition-all"
          >
            Terug naar badges
          </button>
        </div>
      </div>
    );
  }

  const Icon = iconMap[badge.icon] || Star;
  const progressPercent = Math.min((badge.progress / badge.maxProgress) * 100, 100);

  return (
    <div className="h-full w-full overflow-y-auto pb-32 md:pb-40 flex flex-col relative bg-gradient-to-b from-[#2d1b54] via-[#1a1040] to-[#0a0618]">
      <StarryBackground />

      {/* Floating forest decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {['🌿', '✨', '🍄', '🦋', '🌙'].map((emoji, i) => (
          <motion.div
            key={i}
            className="absolute text-2xl md:text-3xl opacity-30"
            style={{ left: `${15 + i * 18}%`, top: `${10 + (i % 3) * 25}%` }}
            animate={{ y: [0, -15, 0], rotate: [0, 10, -10, 0] }}
            transition={{ duration: 4 + i, repeat: Infinity, ease: 'easeInOut' }}
          >
            {emoji}
          </motion.div>
        ))}
      </div>

      {/* Header */}
      <div className="pt-12 md:pt-16 px-6 md:px-12 lg:px-16 flex items-center gap-4 z-10 max-w-4xl mx-auto w-full">
        <button
          onClick={() => navigate('/app/badges')}
          className="p-3 md:p-4 bg-[#1c1134]/60 backdrop-blur-md hover:bg-[#2d1b54]/80 rounded-2xl shadow-lg border-2 border-[#3b2d71] transition-colors"
        >
          <ChevronLeft className="w-6 h-6 md:w-7 md:h-7 text-white/80" />
        </button>
        <h2 className="text-xl md:text-2xl font-bold text-white/90">Badge Details</h2>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 md:px-12 py-12 z-10 max-w-4xl mx-auto w-full">
        {/* Badge Display */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 15 }}
          className="relative mb-8"
        >
          {/* Glow Effect */}
          {badge.isUnlocked && (
            <div
              className="absolute inset-0 rounded-full blur-3xl opacity-40 animate-pulse"
              style={{
                background: `radial-gradient(circle, ${badge.gradientFrom} 0%, ${badge.gradientTo} 100%)`,
                transform: 'scale(1.5)',
              }}
            />
          )}

          {/* Badge Circle */}
          <div
            className={cn(
              "relative w-56 h-56 md:w-72 md:h-72 rounded-full flex items-center justify-center shadow-[0_20px_60px_rgba(0,0,0,0.4)] border-[6px] border-[#3b2d71]",
              !badge.isUnlocked && "grayscale opacity-50",
              badge.isUnlocked && "badge-shimmer badge-glow"
            )}
            style={{
              background: badge.isUnlocked
                ? `linear-gradient(135deg, ${badge.gradientFrom} 0%, ${badge.gradientTo} 100%)`
                : '#1c1134',
            }}
          >
            {/* Inner shine */}
            <div className="absolute inset-0 rounded-full overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-1/3 bg-white/15 rounded-t-full" />
            </div>

            {/* Icon */}
            <Icon className="w-28 h-28 md:w-36 md:h-36 text-white drop-shadow-2xl z-10" strokeWidth={1.5} />

            {/* Lock Overlay */}
            {!badge.isUnlocked && (
              <div className="absolute inset-0 rounded-full bg-[#0a0618]/40 backdrop-blur-sm flex items-center justify-center">
                <div className="w-18 h-18 md:w-22 md:h-22 bg-[#1c1134] rounded-full flex items-center justify-center shadow-2xl border-2 border-[#3b2d71]">
                  <Lock className="w-10 h-10 md:w-12 md:h-12 text-[#9d8bce]" />
                </div>
              </div>
            )}

            {/* Unlocked Check */}
            {badge.isUnlocked && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: 'spring' }}
                className="absolute -bottom-3 -right-3 w-14 h-14 md:w-18 md:h-18 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-xl border-4 border-[#2d1b54]"
              >
                <Check className="w-7 h-7 md:w-9 md:h-9 text-white" strokeWidth={3} />
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Badge Info */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center max-w-lg"
        >
          <h1 className="text-3xl md:text-5xl font-black text-white mb-3">{badge.name}</h1>
          <p className="text-lg md:text-xl text-white/60 font-medium mb-6">{badge.description}</p>

          {/* Status Badge */}
          {badge.isUnlocked ? (
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-full font-bold text-lg shadow-lg shadow-emerald-500/30 border-b-[3px] border-emerald-700">
              <Check className="w-5 h-5" strokeWidth={3} />
              Badge Behaald!
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-[#1c1134]/80 text-[#9d8bce] rounded-full font-bold text-lg shadow-lg border-2 border-[#3b2d71]">
              <Lock className="w-5 h-5" />
              Nog Niet Behaald
            </div>
          )}
        </motion.div>

        {/* Requirements Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-10 w-full max-w-2xl"
        >
          <div className="bg-[#1c1134]/60 backdrop-blur-md rounded-3xl p-6 md:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.3)] border-2 border-[#3b2d71]">
            <h3 className="text-xl md:text-2xl font-black text-white mb-4 flex items-center gap-2">
              <Target className="w-6 h-6 text-amber-400" />
              Vereisten
            </h3>
            <p className="text-lg md:text-xl text-white/70 font-medium mb-6">{badge.requirement}</p>

            {/* Progress Bar */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-white/50">Voortgang</span>
                <span className="text-lg font-black text-amber-400">
                  {badge.progress} / {badge.maxProgress}
                </span>
              </div>
              <div className="h-5 w-full bg-[#2d1b54] rounded-full overflow-hidden relative border-2 border-[#3b2d71]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 1, delay: 0.5, type: 'spring' }}
                  className="h-full relative"
                  style={{
                    background: `linear-gradient(90deg, ${badge.gradientFrom} 0%, ${badge.gradientTo} 100%)`,
                    boxShadow: `0 0 12px ${badge.gradientFrom}80`,
                  }}
                >
                  <div className="absolute inset-x-0 top-0 h-1/2 bg-white/20 rounded-t-full" />
                </motion.div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-white/40">
                  {badge.isUnlocked ? '🎉 Voltooid!' : `Nog ${Math.max(0, badge.maxProgress - badge.progress)} te gaan!`}
                </span>
                <span className="text-sm font-bold text-white/60">{Math.round(progressPercent)}%</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8"
        >
          <button
            onClick={() => navigate('/app/badges')}
            className="px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-3xl font-extrabold text-lg shadow-lg shadow-amber-500/30 transition-all active:scale-95 border-b-[5px] border-amber-700 active:border-b-0 active:translate-y-1"
          >
            Terug naar Badges
          </button>
        </motion.div>
      </div>
    </div>
  );
}
