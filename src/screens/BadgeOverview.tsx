import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Sparkles, Flame, Star, Target, Trophy, BookOpen, 
  Zap, Award, Heart, Crown, Lock, ChevronRight 
} from 'lucide-react';
import { useGame } from '@/context/GameContext';
import { cn } from '@/lib/utils';
import { useChildGreeting } from '@/hooks/useChildGreeting';
import { BuddyCompanion } from '@/components/BuddyCompanion';

const iconMap: Record<string, React.ComponentType<any>> = {
  Sparkles, Flame, Star, Target, Trophy, BookOpen, Zap, Award, Heart, Crown,
};

/** Animated starry background matching QuestMap / Dashboard */
function StarryBackground() {
  const stars = React.useMemo(() => 
    Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
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
          style={{ left: star.left, top: star.top, width: star.size, height: star.size }}
          animate={{ opacity: [0.2, 0.8, 0.2] }}
          transition={{ duration: star.duration, delay: star.delay, repeat: Infinity }}
        />
      ))}
    </div>
  );
}

export function BadgeOverview() {
  const navigate = useNavigate();
  const { badges } = useGame();
  const { childName } = useChildGreeting();
  const unlockedCount = badges.filter((b) => b.isUnlocked).length;
  const progressPercent = badges.length > 0 ? Math.round((unlockedCount / badges.length) * 100) : 0;
  const empty = unlockedCount === 0;

  return (
    <div className="h-full w-full overflow-y-auto pb-32 md:pb-40 relative" style={{ background: 'linear-gradient(to bottom, #2d1b54, #0a0618)' }}>
      <StarryBackground />

      {/* Floating forest decorations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-16 left-4 text-3xl opacity-20 animate-bounce" style={{ animationDuration: '4s' }}>🍄</div>
        <div className="absolute top-32 right-8 text-2xl opacity-15 animate-bounce" style={{ animationDuration: '5s' }}>✨</div>
        <div className="absolute bottom-48 left-12 text-3xl opacity-20 animate-bounce" style={{ animationDuration: '6s' }}>🌿</div>
        <div className="absolute bottom-32 right-6 text-2xl opacity-15 animate-bounce" style={{ animationDuration: '3.5s' }}>🦋</div>
      </div>

      <div className="relative z-10 flex flex-col pt-12 md:pt-16">
        {/* Header */}
        <div className="px-6 md:px-12 lg:px-16 mb-6 max-w-7xl mx-auto w-full">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 border border-amber-500/30 backdrop-blur-md mb-4">
              <Trophy className="w-5 h-5 text-amber-400" />
              <span className="text-sm font-bold text-amber-300 tracking-wide uppercase" style={{ fontFamily: "'Nunito', sans-serif" }}>
                {childName}'s prestaties
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight mb-2" style={{ fontFamily: "'Nunito', sans-serif" }}>
              🏆 Trofeeën Tuin
            </h1>
            <p className="text-lg text-purple-200/80 font-medium">
              {empty
                ? `${childName}, hier komen jouw trofeeën te staan!`
                : `${unlockedCount} van ${badges.length} badges ontgrendeld`}
            </p>
            <div className="mt-4 inline-flex">
              <BuddyCompanion situation="badges_overview" position="inline" size={48} />
            </div>
          </motion.div>
        </div>

        {/* Progress Card */}
        <div className="px-6 md:px-12 lg:px-16 mb-8 max-w-7xl mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="rounded-3xl p-5 border-2 border-amber-500/30 backdrop-blur-md"
            style={{ background: 'rgba(45, 27, 84, 0.6)' }}
          >
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-bold text-purple-200/80">Voortgang</span>
              <span className="text-2xl font-black text-amber-400">{progressPercent}%</span>
            </div>
            <div className="h-4 w-full bg-[#1a0e35] rounded-full overflow-hidden border-2 border-[#3b2d71]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 1, delay: 0.3, type: 'spring' }}
                className="h-full bg-gradient-to-r from-amber-400 to-yellow-400 relative"
                style={{ boxShadow: '0 0 12px rgba(251,191,36,0.4)' }}
              >
                <div className="absolute inset-0 bg-white/20" style={{
                  backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.2) 10px, rgba(255,255,255,0.2) 20px)',
                }} />
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Badge Grid */}
        <div className="px-6 md:px-12 lg:px-16 max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {badges.map((badge, index) => {
              const Icon = iconMap[badge.icon] || Star;
              const badgeProgress = Math.min((badge.progress / badge.maxProgress) * 100, 100);

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
                      "relative rounded-[2rem] p-6 md:p-8 border-2 transition-all duration-300 backdrop-blur-md",
                      badge.isUnlocked
                        ? "border-amber-500/40 hover:border-amber-400/60 badge-shimmer badge-glow"
                        : "border-[#3b2d71]/60 opacity-60 grayscale hover:opacity-70"
                    )}
                    style={{
                      background: badge.isUnlocked
                        ? `linear-gradient(135deg, ${badge.gradientFrom}20 0%, ${badge.gradientTo}20 100%), rgba(45, 27, 84, 0.5)`
                        : 'rgba(26, 14, 53, 0.6)',
                      boxShadow: badge.isUnlocked ? '0 8px 32px rgba(0,0,0,0.3)' : 'none',
                    }}
                  >
                    {/* Lock Overlay */}
                    {!badge.isUnlocked && (
                      <div className="absolute inset-0 rounded-[2rem] flex items-center justify-center z-10">
                        <div className="absolute top-4 right-4 w-10 h-10 bg-[#2d1b54] border-2 border-[#3b2d71] rounded-full flex items-center justify-center shadow-lg">
                          <Lock className="w-5 h-5 text-purple-300/60" />
                        </div>
                      </div>
                    )}

                    {/* Badge Icon */}
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          "w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center mb-4 transition-transform group-hover:scale-110",
                          !badge.isUnlocked && "bg-[#2d1b54]"
                        )}
                        style={{
                          background: badge.isUnlocked
                            ? `linear-gradient(135deg, ${badge.gradientFrom} 0%, ${badge.gradientTo} 100%)`
                            : undefined,
                          boxShadow: badge.isUnlocked
                            ? `0 8px 24px ${badge.gradientFrom}40`
                            : 'none',
                        }}
                      >
                        <Icon className={cn("w-10 h-10 md:w-12 md:h-12", badge.isUnlocked ? "text-white" : "text-purple-400/40")} strokeWidth={2} />
                      </div>

                      {/* Badge Name */}
                      <h3 className={cn(
                        "text-base md:text-lg font-black text-center mb-1 leading-tight",
                        badge.isUnlocked ? "text-white" : "text-purple-300/50"
                      )} style={{ fontFamily: "'Nunito', sans-serif" }}>
                        {badge.name}
                      </h3>

                      {/* Progress Bar (locked) */}
                      {!badge.isUnlocked && (
                        <div className="w-full mt-3">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-purple-300/50">
                              {badge.progress}/{badge.maxProgress}
                            </span>
                            <span className="text-xs font-bold text-purple-300/50">
                              {Math.round(badgeProgress)}%
                            </span>
                          </div>
                          <div className="h-2 w-full bg-[#1a0e35] rounded-full overflow-hidden border border-[#3b2d71]/50">
                            <div
                              className="h-full bg-gradient-to-r from-purple-500/60 to-purple-400/60 transition-all duration-500"
                              style={{ width: `${badgeProgress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Unlocked indicator */}
                      {badge.isUnlocked && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" style={{ boxShadow: '0 0 8px rgba(52,211,153,0.5)' }} />
                          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
                            Behaald
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Hover Arrow */}
                    <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight className="w-5 h-5 text-purple-300/50" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
