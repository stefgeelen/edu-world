import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Flame, Star, Trophy, ChevronRight, Check, LogOut, Shield, Users, Zap, Sparkles, Gift, Award, BookOpen, Target, Crown, Heart, Lock, type LucideIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useGame } from '@/context/GameContext';
import { useAdminRole } from '@/hooks/useAdminRole';
import { cn } from '@/lib/utils';
import { ChildRewards } from '@/components/ChildRewards';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';
import { useChildProgress } from '@/hooks/useChildProgress';
import { BuddyBubble } from '@/components/BuddyBubble';
import { useBuddyMessage } from '@/hooks/useBuddyMessage';
import { useCurrentChild } from '@/hooks/useCompleteExercise';
import { useChildGreeting } from '@/hooks/useChildGreeting';
import { JourneyCard } from '@/components/JourneyCard';

/* ── Icon registry for db-driven badges ──────────────── */
const BADGE_ICONS: Record<string, LucideIcon> = {
  Sparkles, Flame, Star, Target, Trophy, BookOpen, Zap, Award, Heart, Crown,
};

/* ── Decorative forest elements ─────────────────────── */
const FOREST_DECORATIONS = [
  { icon: '🌲', top: '8%', left: '5%', size: 'text-5xl', opacity: 'opacity-30' },
  { icon: '✨', top: '15%', left: '90%', size: 'text-2xl', opacity: 'opacity-50 animate-pulse' },
  { icon: '🍄', top: '45%', left: '92%', size: 'text-3xl', opacity: 'opacity-30' },
  { icon: '🌲', top: '70%', left: '3%', size: 'text-6xl', opacity: 'opacity-20' },
  { icon: '🦋', top: '55%', left: '8%', size: 'text-2xl', opacity: 'opacity-40' },
  { icon: '✨', top: '80%', left: '88%', size: 'text-xl', opacity: 'opacity-40 animate-pulse' },
  { icon: '🌺', top: '90%', left: '15%', size: 'text-3xl', opacity: 'opacity-25' },
  { icon: '🦉', top: '3%', left: '75%', size: 'text-3xl', opacity: 'opacity-30' },
];

/* ── Starry sky background ──────────────────────────── */
function StarryBackground() {
  const stars = useMemo(() =>
    [...Array(50)].map((_, i) => ({
      key: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      width: `${Math.random() * 3 + 1}px`,
      height: `${Math.random() * 3 + 1}px`,
      animation: `pulse ${Math.random() * 2 + 2}s infinite ${Math.random() * 3}s`,
    })),
  []);
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {stars.map(s => (
        <div key={s.key} className="absolute rounded-full bg-white opacity-20" style={s} />
      ))}
    </div>
  );
}

/* ── Daily quest data ───────────────────────────────── */
/* DAILY_QUESTS removed — now derived from real activity */

        {/* Persoonlijke reis */}
        <JourneyCard />


export function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { selectedAvatar, xp, streak, level, badges } = useGame();
  const { isAdmin } = useAdminRole();
  const { progressData } = useChildProgress();
  const { getMessage, hasAvatar } = useBuddyMessage();
  const { data: child } = useCurrentChild();
  const { greeting, childName } = useChildGreeting();

  // Buddy greeting on mount
  const [buddyData, setBuddyData] = useState<{ message: string; mood: any; avatarUrl: string; avatarName: string } | null>(null);
  useEffect(() => {
    if (hasAvatar) {
      const result = getMessage('dashboard_welcome');
      if (result) {
        setBuddyData({ message: result.message, mood: result.mood, avatarUrl: result.avatarUrl!, avatarName: result.avatarName });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAvatar, childName]);

  // Dynamic stats from child_progress
  const totalExercises = progressData.reduce((s, p) => s + p.exercises_completed, 0);
  const avgScore = progressData.length > 0
    ? Math.round(progressData.reduce((s, p) => s + (p.average_score ?? 0), 0) / progressData.length * 100)
    : 0;
  const totalTimeSecs = progressData.reduce((s, p) => s + p.total_time_seconds, 0);
  const totalTimeLabel = totalTimeSecs >= 3600
    ? `${Math.round(totalTimeSecs / 3600)}u`
    : `${Math.round(totalTimeSecs / 60)}m`;

  // Today's exercise count from exercise_attempts
  const { data: todayAttempts = 0 } = useQuery({
    queryKey: ['today-attempts', child?.id],
    queryFn: async () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const { count, error } = await supabase
        .from('exercise_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('child_id', child!.id)
        .gte('completed_at', start.toISOString());
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!child?.id,
  });

  // Dynamic daily quests based on real activity
  const dailyQuests = [
    { title: 'Rond 1 oefening af', xp: '+50 XP', done: todayAttempts >= 1 },
    { title: 'Doe 3 oefeningen vandaag', xp: '+100 XP', done: todayAttempts >= 3 },
    { title: 'Behoud een reeks van 5 dagen', xp: '+150 XP', done: streak >= 5 },
  ];

  const xpRequired = level * 1000;
  const progress = Math.min((xp / xpRequired) * 100, 100);
  const completedQuests = dailyQuests.filter(q => q.done).length;

  // Trophy room: real badges from DB
  const unlockedBadges = useMemo(() => badges.filter(b => b.isUnlocked), [badges]);
  const showcaseBadges = useMemo(() => unlockedBadges.slice(0, 3), [unlockedBadges]);
  const nextBadge = useMemo(() => {
    const inProgress = badges
      .filter(b => !b.isUnlocked && b.progress > 0)
      .sort((a, b) => (b.progress / b.maxProgress) - (a.progress / a.maxProgress));
    return inProgress[0] ?? badges.find(b => !b.isUnlocked) ?? null;
  }, [badges]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    queryClient.clear();
    navigate('/auth');
  };

  return (
    <div className="h-full w-full bg-gradient-to-b from-[#2d1b54] via-[#1a103c] to-[#0a0618] overflow-y-auto pb-32 flex flex-col relative" style={{ fontFamily: "'Nunito', sans-serif" }}>
      <StarryBackground />

      {/* Decorations */}
      {FOREST_DECORATIONS.map((el, i) => (
        <div key={i} className={`absolute pointer-events-none select-none ${el.size} ${el.opacity}`} style={{ top: el.top, left: el.left }}>
          {el.icon}
        </div>
      ))}

      {/* ── Header Vitrine ──────────────────────────── */}
      <div className="relative z-10 px-4 sm:px-5 pt-4 sm:pt-6 pb-4 max-w-2xl lg:max-w-5xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden bg-gradient-to-br from-[#1a103c]/90 via-[#241650]/80 to-[#1a103c]/90 backdrop-blur-xl rounded-3xl p-3 sm:p-4 border-[3px] border-amber-400/30 shadow-[0_8px_32px_rgba(251,191,36,0.12)]"
        >
          {/* Ornament corners */}
          <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-amber-400/40 rounded-tl-md pointer-events-none" />
          <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-amber-400/40 rounded-tr-md pointer-events-none" />
          <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-amber-400/40 rounded-bl-md pointer-events-none" />
          <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-amber-400/40 rounded-br-md pointer-events-none" />

          <div className="flex items-center justify-between gap-3 relative z-10 min-w-0">
            {/* Avatar + greeting — interactive buddy */}
            <button
              onClick={() => {
                if (!hasAvatar) return;
                const result = getMessage('dashboard_greeting');
                if (result) setBuddyData({ message: result.message, mood: result.mood, avatarUrl: result.avatarUrl!, avatarName: result.avatarName });
              }}
              className="flex items-center gap-2.5 sm:gap-3 group outline-none active:scale-[0.98] transition-transform min-w-0 flex-1"
              aria-label="Praat met je studiemaatje"
            >
              <div className="relative shrink-0">
                <div className="absolute inset-0 rounded-full bg-amber-400/30 blur-md animate-pulse" />
                <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full border-[3px] border-amber-400 overflow-hidden shadow-lg shadow-amber-400/30 bg-[#2d1b54] group-hover:border-amber-300 transition-colors animate-buddy-idle-float">
                  {selectedAvatar ? (
                    <ImageWithFallback src={selectedAvatar.imageUrl} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-[#3b2d71] animate-pulse" />
                  )}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-400 border-2 border-[#1a103c] flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                </div>
              </div>
              <div className="text-left min-w-0 flex-1">
                <p className="text-[10px] font-bold text-amber-300/70 uppercase tracking-widest leading-none mb-0.5 sm:mb-1">
                  {selectedAvatar?.name ? `Met ${selectedAvatar.name}` : 'Studiemaatje'}
                </p>
                <h2 className="text-base sm:text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 leading-tight truncate">
                  {greeting}
                </h2>
                <p className="text-[10px] font-bold text-[#a78bfa] flex items-center gap-1 mt-0.5 truncate">
                  <Sparkles className="w-2.5 h-2.5 shrink-0" /> Tik om met {selectedAvatar?.name || 'je buddy'} te praten
                </p>
              </div>
            </button>

            {/* Action buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <div className="flex items-center gap-1 sm:gap-1.5 bg-[#0f0828]/80 backdrop-blur-sm px-2 sm:px-3 py-1.5 rounded-full border-2 border-orange-500/40 shadow-[0_0_12px_rgba(249,115,22,0.25)]">
                <Flame className="w-4 h-4 text-orange-400 fill-orange-400" />
                <span className="text-orange-300 font-black text-sm">{streak}</span>
              </div>
              {isAdmin && (
                <button onClick={() => navigate('/admin')} className="hidden sm:flex w-10 h-10 bg-[#0f0828]/80 rounded-full items-center justify-center border-2 border-[#3b2d71] active:scale-95 transition-all" title="Admin">
                  <Shield className="w-4 h-4 text-[#9d8bce]" />
                </button>
              )}
              <button onClick={() => navigate('/app/parent')} className="w-9 h-9 sm:w-10 sm:h-10 bg-[#0f0828]/80 rounded-full flex items-center justify-center border-2 border-[#3b2d71] active:scale-95 transition-all" title="Ouderportaal">
                <Users className="w-4 h-4 text-[#9d8bce]" />
              </button>
              <button onClick={handleSignOut} className="w-9 h-9 sm:w-10 sm:h-10 bg-[#0f0828]/80 rounded-full flex items-center justify-center border-2 border-[#3b2d71] active:scale-95 transition-all" title="Uitloggen">
                <LogOut className="w-4 h-4 text-[#9d8bce]" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Content ─────────────────────────────────── */}
      <div className="relative z-10 px-4 sm:px-5 max-w-2xl lg:max-w-5xl mx-auto w-full flex-1 grid gap-4 sm:gap-5 lg:grid-cols-2">

        {/* ── XP Vitrine ─────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative overflow-hidden bg-gradient-to-br from-[#1a103c]/90 via-[#241650]/80 to-[#1a103c]/90 backdrop-blur-xl rounded-3xl p-5 border-[3px] border-violet-500/30 shadow-[0_8px_32px_rgba(167,139,250,0.12)]"
        >
          {/* Ornament corners */}
          <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-violet-400/40 rounded-tl-md pointer-events-none" />
          <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-violet-400/40 rounded-tr-md pointer-events-none" />
          <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-violet-400/40 rounded-bl-md pointer-events-none" />
          <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-violet-400/40 rounded-br-md pointer-events-none" />

          <div className="flex justify-between items-center mb-4 relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center shadow-[0_0_16px_rgba(167,139,250,0.4)]">
                <Zap className="w-5 h-5 text-[#1a103c] fill-[#1a103c]" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-violet-300/60 uppercase tracking-widest leading-none mb-1">Huidig Niveau</p>
                <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 leading-none">{level}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-cyan-300">{xp}</span>
              <span className="text-xs font-bold text-[#7c6bae] ml-1">/ {xpRequired}</span>
              <p className="text-[10px] font-bold text-violet-300/60 uppercase tracking-widest mt-0.5">XP</p>
            </div>
          </div>

          <div className="h-4 w-full bg-[#0f0828] rounded-full overflow-hidden border-2 border-[#3b2d71] relative z-10">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, delay: 0.5, type: 'spring' }}
              className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-full shadow-[0_0_12px_rgba(34,211,238,0.4)]"
            />
          </div>
        </motion.div>

        {/* ── Hero Vitrine: Start met Leren ────────── */}
        <motion.button
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          onClick={() => navigate('/app/map')}
          className="lg:col-span-2 lg:order-first relative overflow-hidden w-full p-5 rounded-3xl flex items-center justify-between bg-gradient-to-br from-emerald-500/95 via-teal-500/90 to-cyan-500/95 border-[3px] border-emerald-300/40 shadow-[0_8px_32px_rgba(16,185,129,0.25)] hover:shadow-[0_8px_40px_rgba(16,185,129,0.4)] transition-all group outline-none active:scale-[0.98]"
        >
          {/* Ornament corners */}
          <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-white/60 rounded-tl-md pointer-events-none" />
          <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-white/60 rounded-tr-md pointer-events-none" />
          <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-white/60 rounded-bl-md pointer-events-none" />
          <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-white/60 rounded-br-md pointer-events-none" />

          {/* Shimmer overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent pointer-events-none" />

          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/25 backdrop-blur-sm border-2 border-white/40 flex items-center justify-center shadow-[0_0_16px_rgba(255,255,255,0.3)]">
              <Zap className="w-6 h-6 text-white fill-white drop-shadow" strokeWidth={2.5} />
            </div>
            <div className="text-left">
              <p className="text-[10px] font-bold text-emerald-50/80 uppercase tracking-widest leading-none mb-1">Jouw Avontuur</p>
              <span className="block text-xl font-black text-white leading-tight">Start {childName}'s avontuur</span>
              <span className="block text-xs font-bold text-emerald-50/90 mt-0.5">Ga verder met je quest! 🌟</span>
            </div>
          </div>
          <div className="relative z-10 w-10 h-10 rounded-full bg-white/25 backdrop-blur-sm border-2 border-white/40 flex items-center justify-center group-hover:translate-x-1 transition-transform">
            <ChevronRight className="w-5 h-5 text-white" strokeWidth={3} />
          </div>
        </motion.button>

        {/* ── Quest Vitrine ────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative overflow-hidden bg-gradient-to-br from-[#1a103c]/90 via-[#241650]/80 to-[#1a103c]/90 backdrop-blur-xl rounded-3xl p-5 border-[3px] border-cyan-500/30 shadow-[0_8px_32px_rgba(34,211,238,0.12)]"
        >
          {/* Ornament corners */}
          <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-cyan-400/40 rounded-tl-md pointer-events-none" />
          <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-cyan-400/40 rounded-tr-md pointer-events-none" />
          <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-cyan-400/40 rounded-bl-md pointer-events-none" />
          <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-cyan-400/40 rounded-br-md pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-sky-600 flex items-center justify-center shadow-[0_0_16px_rgba(34,211,238,0.4)]">
                <Sparkles className="w-5 h-5 text-[#1a103c]" strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-sky-300 to-cyan-200 leading-none">
                  Dagelijkse Quests
                </h3>
                <p className="text-[10px] font-bold text-cyan-300/60 uppercase tracking-widest mt-0.5">
                  {completedQuests} / {dailyQuests.length} voltooid
                </p>
              </div>
            </div>
            <div className="relative w-10 h-10 shrink-0">
              <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15" fill="none" stroke="rgb(59,45,113)" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15" fill="none"
                  stroke="url(#questGrad)" strokeWidth="3" strokeLinecap="round"
                  strokeDasharray={`${(completedQuests / dailyQuests.length) * 94.25} 94.25`}
                />
                <defs>
                  <linearGradient id="questGrad" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" />
                    <stop offset="100%" stopColor="#0ea5e9" />
                  </linearGradient>
                </defs>
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-cyan-200">
                {Math.round((completedQuests / dailyQuests.length) * 100)}%
              </span>
            </div>
          </div>

          <div className="space-y-2.5 relative z-10">
            {dailyQuests.map((quest, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-center justify-between p-3 rounded-2xl border-2 transition-all",
                  quest.done
                    ? "bg-emerald-500/10 border-emerald-500/30"
                    : "bg-[#0f0828]/60 border-[#3b2d71] hover:border-cyan-500/40"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border-2",
                    quest.done
                      ? "bg-gradient-to-br from-emerald-400 to-emerald-600 border-emerald-300/50 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                      : "bg-[#1a103c] border-[#5b4d8a]"
                  )}>
                    {quest.done
                      ? <Check className="w-4 h-4 text-white" strokeWidth={3} />
                      : <span className="text-[11px] font-black text-cyan-300/70">{i + 1}</span>}
                  </div>
                  <span className={cn(
                    "font-bold text-sm",
                    quest.done ? "text-emerald-300/70 line-through decoration-emerald-500/30" : "text-white/90"
                  )}>
                    {quest.title}
                  </span>
                </div>
                <span className={cn(
                  "font-black text-xs whitespace-nowrap px-2 py-1 rounded-full",
                  quest.done
                    ? "text-emerald-400/60 bg-emerald-500/5"
                    : "text-cyan-200 bg-cyan-500/10 border border-cyan-500/20"
                )}>
                  {quest.xp}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Trofeeënkamer ────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          onClick={() => navigate('/app/badges')}
          className="lg:col-span-2 relative overflow-hidden bg-gradient-to-br from-[#1a103c]/90 via-[#241650]/80 to-[#1a103c]/90 backdrop-blur-xl rounded-3xl p-5 border-[3px] border-amber-500/30 shadow-[0_8px_32px_rgba(251,191,36,0.12)] cursor-pointer hover:border-amber-400/60 hover:shadow-[0_8px_40px_rgba(251,191,36,0.25)] transition-all active:scale-[0.99] group"
        >
          {/* Ornament corners */}
          <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-amber-400/40 rounded-tl-md pointer-events-none" />
          <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-amber-400/40 rounded-tr-md pointer-events-none" />
          <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-amber-400/40 rounded-bl-md pointer-events-none" />
          <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-amber-400/40 rounded-br-md pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-[0_0_16px_rgba(251,191,36,0.4)]">
                <Trophy className="w-5 h-5 text-[#1a103c]" strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 leading-none">
                  Trofeeënkamer
                </h3>
                <p className="text-[10px] font-bold text-amber-300/60 uppercase tracking-widest mt-0.5">
                  {unlockedBadges.length} / {badges.length} verdiend
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-amber-400/60 group-hover:translate-x-0.5 group-hover:text-amber-300 transition-all" strokeWidth={3} />
          </div>

          {/* Showcase: 3 slots */}
          <div className="grid grid-cols-3 gap-2.5 mb-4 relative z-10 max-w-md mx-auto">
            {[0, 1, 2].map(i => {
              const badge = showcaseBadges[i];
              if (!badge) {
                return (
                  <div
                    key={i}
                    className="aspect-square max-h-32 rounded-2xl bg-[#0f0828]/60 border-2 border-dashed border-[#3b2d71] flex items-center justify-center"
                  >
                    <Lock className="w-4 h-4 text-[#5b4d8a]" />
                  </div>
                );
              }
              const Icon = BADGE_ICONS[badge.icon] ?? Trophy;
              return (
                <div
                  key={badge.id}
                  className="relative aspect-square max-h-32 rounded-2xl flex items-center justify-center border-2 border-white/10 shadow-lg overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${badge.gradientFrom}, ${badge.gradientTo})`,
                    boxShadow: `0 4px 20px ${badge.gradientFrom}55`,
                  }}
                  title={badge.name}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent" />
                  <Icon className="w-7 h-7 text-white drop-shadow-md relative z-10" strokeWidth={2.2} />
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-300 border-2 border-[#1a103c] flex items-center justify-center">
                    <Sparkles className="w-2 h-2 text-[#1a103c]" strokeWidth={3} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Next badge progress */}
          {nextBadge && (() => {
            const Icon = BADGE_ICONS[nextBadge.icon] ?? Trophy;
            const pct = Math.min((nextBadge.progress / nextBadge.maxProgress) * 100, 100);
            return (
              <div className="relative z-10 bg-[#0f0828]/60 rounded-2xl p-3 border border-[#3b2d71]">
                <div className="flex items-center gap-2.5 mb-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 opacity-60"
                    style={{ background: `linear-gradient(135deg, ${nextBadge.gradientFrom}, ${nextBadge.gradientTo})` }}
                  >
                    <Icon className="w-4 h-4 text-white" strokeWidth={2.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-amber-300/70 uppercase tracking-wider">Volgende trofee</p>
                    <p className="text-xs font-bold text-white/90 truncate">{nextBadge.name}</p>
                  </div>
                  <span className="text-[11px] font-black text-amber-200 whitespace-nowrap">
                    {nextBadge.progress}/{nextBadge.maxProgress}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-[#2d1b54] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${nextBadge.gradientFrom}, ${nextBadge.gradientTo})` }}
                  />
                </div>
              </div>
            );
          })()}
        </motion.div>

        {/* Rewards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="lg:col-span-2 bg-[#1a103c]/80 backdrop-blur-xl rounded-3xl p-5 border-[3px] border-[#3b2d71] shadow-xl"
        >
          <ChildRewards />
        </motion.div>
      </div>

      {/* Buddy Greeting */}
      {buddyData && (
        <BuddyBubble
          message={buddyData.message}
          mood={buddyData.mood}
          avatarUrl={buddyData.avatarUrl}
          avatarName={buddyData.avatarName}
          onDismiss={() => setBuddyData(null)}
        />
      )}
    </div>
  );
}
