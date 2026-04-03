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
  Sparkles,
  Flame,
  Star,
  Target,
  Trophy,
  BookOpen,
  Zap,
  Award,
  Heart,
  Crown,
};

export function BadgeDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { badges } = useGame();

  const badge = badges.find((b) => b.id === id);

  React.useEffect(() => {
    if (badge?.isUnlocked) {
      // Trigger confetti for unlocked badges
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
      <div className="h-full w-full flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <p className="text-xl font-bold text-slate-600">Badge niet gevonden</p>
          <button
            onClick={() => navigate('/app/badges')}
            className="mt-4 px-6 py-3 bg-blue-500 text-white rounded-2xl font-bold"
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
    <div
      className="h-full w-full overflow-y-auto pb-32 md:pb-40 flex flex-col relative"
      style={{
        background: `linear-gradient(135deg, ${badge.gradientFrom}20 0%, ${badge.gradientTo}20 100%)`,
      }}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url(https://www.transparenttextures.com/patterns/cubes.png)] opacity-10 mix-blend-multiply pointer-events-none" />

      {/* Header */}
      <div className="pt-12 md:pt-16 px-6 md:px-12 lg:px-16 flex items-center gap-4 z-10 max-w-4xl mx-auto w-full">
        <button
          onClick={() => navigate('/app/badges')}
          className="p-3 md:p-4 bg-white hover:bg-slate-100 rounded-2xl shadow-lg border border-slate-200 transition-colors"
        >
          <ChevronLeft className="w-6 h-6 md:w-7 md:h-7 text-slate-600" />
        </button>
        <h2 className="text-xl md:text-2xl font-bold text-slate-800">Badge Details</h2>
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
              className="absolute inset-0 rounded-full blur-3xl opacity-50 animate-pulse"
              style={{
                background: `radial-gradient(circle, ${badge.gradientFrom} 0%, ${badge.gradientTo} 100%)`,
                transform: 'scale(1.5)',
              }}
            />
          )}

          {/* Badge Circle */}
          <div
            className={cn(
              "relative w-64 h-64 md:w-80 md:h-80 rounded-full flex items-center justify-center shadow-2xl border-8 border-white",
              !badge.isUnlocked && "grayscale opacity-60"
            )}
            style={{
              background: badge.isUnlocked
                ? `linear-gradient(135deg, ${badge.gradientFrom} 0%, ${badge.gradientTo} 100%)`
                : '#cbd5e1',
            }}
          >
            {/* Inner Pattern */}
            <div className="absolute inset-0 rounded-full overflow-hidden">
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.3) 20px, rgba(255,255,255,0.3) 40px)',
                }}
              />
            </div>

            {/* Icon */}
            <Icon className="w-32 h-32 md:w-40 md:h-40 text-white drop-shadow-2xl z-10" strokeWidth={2} />

            {/* Lock Overlay */}
            {!badge.isUnlocked && (
              <div className="absolute inset-0 rounded-full bg-slate-900/20 backdrop-blur-sm flex items-center justify-center">
                <div className="w-20 h-20 md:w-24 md:h-24 bg-slate-800 rounded-full flex items-center justify-center shadow-2xl">
                  <Lock className="w-10 h-10 md:w-12 md:h-12 text-white" />
                </div>
              </div>
            )}

            {/* Unlocked Check */}
            {badge.isUnlocked && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: 'spring' }}
                className="absolute -bottom-4 -right-4 w-16 h-16 md:w-20 md:h-20 bg-teal-500 rounded-full flex items-center justify-center shadow-xl border-4 border-white"
              >
                <Check className="w-8 h-8 md:w-10 md:h-10 text-white" strokeWidth={3} />
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
          <h1 className="text-4xl md:text-5xl font-black text-slate-800 mb-3">{badge.name}</h1>
          <p className="text-xl md:text-2xl text-slate-600 font-medium mb-6">{badge.description}</p>

          {/* Status Badge */}
          {badge.isUnlocked ? (
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-teal-500 text-white rounded-full font-bold text-lg shadow-lg">
              <Check className="w-5 h-5" strokeWidth={3} />
              Badge Behaald!
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-slate-300 text-slate-700 rounded-full font-bold text-lg shadow-lg">
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
          className="mt-12 w-full max-w-2xl"
        >
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl border-2 border-slate-100">
            <h3 className="text-xl md:text-2xl font-black text-slate-800 mb-4 flex items-center gap-2">
              <Target className="w-6 h-6 text-blue-500" />
              Vereisten
            </h3>
            <p className="text-lg md:text-xl text-slate-700 font-medium mb-6">{badge.requirement}</p>

            {/* Progress Bar */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-slate-600">Voortgang</span>
                <span className="text-lg font-black text-slate-800">
                  {badge.progress} / {badge.maxProgress}
                </span>
              </div>
              <div className="h-6 w-full bg-slate-200 rounded-full overflow-hidden relative border-2 border-slate-300 shadow-inner">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 1, delay: 0.5, type: 'spring' }}
                  className="h-full relative"
                  style={{
                    background: `linear-gradient(90deg, ${badge.gradientFrom} 0%, ${badge.gradientTo} 100%)`,
                  }}
                >
                  <div
                    className="absolute inset-0 bg-white/20"
                    style={{
                      backgroundImage:
                        'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.2) 10px, rgba(255,255,255,0.2) 20px)',
                    }}
                  />
                </motion.div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Nog {Math.max(0, badge.maxProgress - badge.progress)} te gaan!</span>
                <span className="text-sm font-bold text-slate-700">{Math.round(progressPercent)}%</span>
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
            className="px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-3xl font-extrabold text-lg shadow-lg shadow-blue-500/30 transition-transform active:scale-95 border-b-4 border-blue-700 active:border-b-0 active:translate-y-1"
          >
            Terug naar Badges
          </button>
        </motion.div>
      </div>
    </div>
  );
}