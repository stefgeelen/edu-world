import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Star, Trophy, Heart } from 'lucide-react';
import { useChildProgress } from '@/hooks/useChildProgress';
import { useGame } from '@/context/GameContext';
import { useChildGreeting } from '@/hooks/useChildGreeting';

const SUBJECT_LABEL: Record<string, string> = {
  math: 'Rekenen',
  reading: 'Lezen',
  writing: 'Schrijven',
};

/**
 * Personal "Mijn reis" summary card for the dashboard.
 * Shows total stars, badges and the child's favourite subject.
 */
export function JourneyCard() {
  const { progressData, recentAttempts } = useChildProgress();
  const { badges } = useGame();
  const { childName, buddyName } = useChildGreeting();

  const totalStars = useMemo(
    () => recentAttempts.reduce((s, a) => s + (a as any).stars ?? 0, 0),
    [recentAttempts]
  );

  const unlockedBadges = useMemo(
    () => badges.filter((b) => b.isUnlocked).length,
    [badges]
  );

  const favouriteSubject = useMemo(() => {
    if (progressData.length === 0) return null;
    const top = [...progressData].sort(
      (a, b) => b.exercises_completed - a.exercises_completed
    )[0];
    if (!top || top.exercises_completed === 0) return null;
    return SUBJECT_LABEL[top.subject] ?? top.subject;
  }, [progressData]);

  const totalExercises = progressData.reduce(
    (s, p) => s + p.exercises_completed,
    0
  );

  // Buddy quote based on activity
  const quote = useMemo(() => {
    if (totalExercises === 0) {
      return `Klaar voor je eerste avontuur, ${childName}? ${buddyName} staat klaar!`;
    }
    if (favouriteSubject) {
      return `Wow ${childName}, je bent een echte ${favouriteSubject.toLowerCase()}-held!`;
    }
    return `Mooi bezig, ${childName}! ${buddyName} is trots op je.`;
  }, [totalExercises, favouriteSubject, childName, buddyName]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="lg:col-span-2 relative overflow-hidden bg-gradient-to-br from-[#1a103c]/90 via-[#241650]/80 to-[#1a103c]/90 backdrop-blur-xl rounded-3xl p-5 border-[3px] border-pink-500/30 shadow-[0_8px_32px_rgba(236,72,153,0.12)]"
    >
      {/* Ornament corners */}
      <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-pink-400/40 rounded-tl-md pointer-events-none" />
      <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-pink-400/40 rounded-tr-md pointer-events-none" />
      <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-pink-400/40 rounded-bl-md pointer-events-none" />
      <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-pink-400/40 rounded-br-md pointer-events-none" />

      <div className="flex items-center gap-2.5 mb-4 relative z-10">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-400 to-rose-600 flex items-center justify-center shadow-[0_0_16px_rgba(236,72,153,0.4)]">
          <Heart className="w-5 h-5 text-white fill-white" strokeWidth={2.5} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-200 via-rose-300 to-pink-200 leading-none truncate">
            {childName}'s reis
          </h3>
          <p className="text-[10px] font-bold text-pink-300/60 uppercase tracking-widest mt-0.5">
            Tot nu toe
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 relative z-10 mb-3">
        <Stat
          icon={<Star className="w-4 h-4 text-amber-300 fill-amber-300" />}
          value={totalStars}
          label="Sterren"
          color="amber"
        />
        <Stat
          icon={<Trophy className="w-4 h-4 text-amber-300" />}
          value={unlockedBadges}
          label="Trofeeën"
          color="amber"
        />
        <Stat
          icon={<Heart className="w-4 h-4 text-pink-300 fill-pink-300" />}
          value={favouriteSubject ?? '–'}
          label="Favoriet"
          color="pink"
          isText={typeof favouriteSubject === 'string'}
        />
      </div>

      {/* Buddy quote */}
      <div className="relative z-10 bg-[#0f0828]/60 rounded-2xl p-3 border border-[#3b2d71]">
        <p className="text-xs font-bold text-white/85 leading-snug">
          <span className="text-amber-300">"</span>
          {quote}
          <span className="text-amber-300">"</span>
        </p>
        <p className="text-[10px] font-bold text-pink-300/70 mt-1">
          — {buddyName}
        </p>
      </div>
    </motion.div>
  );
}

function Stat({
  icon,
  value,
  label,
  color,
  isText,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  color: 'amber' | 'pink';
  isText?: boolean;
}) {
  const ring =
    color === 'amber' ? 'border-amber-500/30' : 'border-pink-500/30';
  return (
    <div
      className={`bg-[#0f0828]/60 rounded-2xl p-2.5 border ${ring} flex flex-col items-center justify-center text-center`}
    >
      <div className="mb-1">{icon}</div>
      <div
        className={`font-black text-white leading-none ${
          isText ? 'text-sm' : 'text-lg'
        }`}
      >
        {value}
      </div>
      <div className="text-[9px] font-bold text-white/50 uppercase tracking-wider mt-0.5">
        {label}
      </div>
    </div>
  );
}
