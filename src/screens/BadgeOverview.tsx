import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Sparkles, Flame, Star, Target, Trophy, BookOpen, 
  Zap, Award, Heart, Crown, Lock, ChevronRight 
} from 'lucide-react';
import { useGame } from '@/context/GameContext';
import { cn } from '@/lib/utils';

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

export function BadgeOverview() {
  const navigate = useNavigate();
  const { badges } = useGame();

  const unlockedCount = badges.filter((b) => b.isUnlocked).length;

  return (
    <div className="h-full w-full bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 overflow-y-auto pb-32 md:pb-40 flex flex-col pt-12 md:pt-16">
      {/* Header */}
      <div className="px-6 md:px-12 lg:px-16 mb-8 max-w-7xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 backdrop-blur-md shadow-sm border border-amber-200 mb-4">
            <Trophy className="w-5 h-5 text-amber-600" />
            <span className="text-sm font-bold text-amber-800 tracking-wide uppercase">Mijn Prestaties</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 tracking-tight leading-tight mb-3">
            Badge Collectie
          </h1>
          <p className="text-lg md:text-xl text-slate-600 font-medium">
            {unlockedCount} van {badges.length} badges verdiend
          </p>
        </motion.div>
      </div>

      {/* Progress Bar */}
      <div className="px-6 md:px-12 lg:px-16 mb-8 max-w-7xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl p-6 shadow-lg border-2 border-amber-200"
        >
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-bold text-slate-600">Voortgang</span>
            <span className="text-2xl font-black text-amber-600">
              {Math.round((unlockedCount / badges.length) * 100)}%
            </span>
          </div>
          <div className="h-6 w-full bg-amber-100 rounded-full overflow-hidden relative border-2 border-amber-200 shadow-inner">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(unlockedCount / badges.length) * 100}%` }}
              transition={{ duration: 1, delay: 0.3, type: 'spring' }}
              className="h-full bg-gradient-to-r from-amber-400 to-amber-500 relative"
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
        </motion.div>
      </div>

      {/* Badge Grid */}
      <div className="px-6 md:px-12 lg:px-16 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {badges.map((badge, index) => {
            const Icon = iconMap[badge.icon] || Star;
            const progressPercent = Math.min((badge.progress / badge.maxProgress) * 100, 100);

            return (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: index * 0.05, type: 'spring' }}
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(`/app/badges/${badge.id}`)}
                className="relative cursor-pointer group"
              >
                <div
                  className={cn(
                    "relative bg-white rounded-[2rem] p-6 md:p-8 shadow-lg border-2 transition-all duration-300",
                    badge.isUnlocked
                      ? "border-amber-200 hover:shadow-2xl hover:border-amber-300"
                      : "border-slate-200 opacity-60 grayscale hover:opacity-70"
                  )}
                  style={{
                    background: badge.isUnlocked
                      ? `linear-gradient(135deg, ${badge.gradientFrom}15 0%, ${badge.gradientTo}15 100%)`
                      : '#ffffff',
                  }}
                >
                  {/* Lock Overlay for Locked Badges */}
                  {!badge.isUnlocked && (
                    <div className="absolute inset-0 bg-slate-900/5 rounded-[2rem] flex items-center justify-center backdrop-blur-[1px] z-10">
                      <div className="absolute top-4 right-4 w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center shadow-lg">
                        <Lock className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  )}

                  {/* Badge Icon */}
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center mb-4 shadow-lg transition-transform group-hover:scale-110",
                        badge.isUnlocked ? badge.color : "bg-slate-300"
                      )}
                      style={{
                        background: badge.isUnlocked
                          ? `linear-gradient(135deg, ${badge.gradientFrom} 0%, ${badge.gradientTo} 100%)`
                          : undefined,
                      }}
                    >
                      <Icon className="w-10 h-10 md:w-12 md:h-12 text-white" strokeWidth={2} />
                    </div>

                    {/* Badge Name */}
                    <h3 className="text-base md:text-lg font-black text-slate-800 text-center mb-1 leading-tight">
                      {badge.name}
                    </h3>

                    {/* Progress Bar (only for locked badges) */}
                    {!badge.isUnlocked && (
                      <div className="w-full mt-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold text-slate-500">
                            {badge.progress}/{badge.maxProgress}
                          </span>
                          <span className="text-xs font-bold text-slate-500">
                            {Math.round(progressPercent)}%
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-slate-400 to-slate-500 transition-all duration-500"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Unlocked Badge */}
                    {badge.isUnlocked && (
                      <div className="flex items-center gap-1 mt-2">
                        <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                        <span className="text-xs font-bold text-teal-600 uppercase tracking-wide">
                          Behaald
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Hover Arrow */}
                  <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}