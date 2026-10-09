import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Award, BookOpen, Check, ChevronRight, Crown, Flame, Gift, Heart, LayoutGrid, Lock, LogOut, Shield,
  Sparkles, Star, Target, Trophy, Users, Zap, type LucideIcon,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useGame } from '@/context/GameContext';
import { useAdminRole } from '@/hooks/useAdminRole';
import { useChildGreeting } from '@/hooks/useChildGreeting';
import { useChildRewards, rewardCountdown } from '@/hooks/useChildRewards';
import { quickStarts, isRepeated, usePracticeMenu, wishOpen, type PracticeOption } from '@/hooks/usePracticeMenu';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';
import { ExerciseTypeIcon } from '@/components/buddy/ExerciseTypeIcon';
import { APP_PATHS } from '@/routes/paths';
import { cn } from '@/lib/utils';
import { Ornaments, Payout, StarryBackground } from '@/components/dashboard/Vitrine';
import { VITRINE } from '@/components/dashboard/vitrineStyles';

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

export function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { buddy, badges } = useGame();
  const { isAdmin } = useAdminRole();
  const { greeting } = useChildGreeting();
  const { data: menu } = usePracticeMenu();
  const { data: rewards = [] } = useChildRewards();

  const starts = useMemo(() => (menu ? quickStarts(menu) : []), [menu]);
  const wishes = menu?.wishes ?? [];
  const wishesDone = wishes.filter(w => w.fulfilled).length;

  const start = (route: string) => navigate(`/app${route}`);

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
    try {
      await supabase.auth.signOut();
    } finally {
      queryClient.clear();
      navigate('/auth');
    }
  };

  return (
    <div className="h-full w-full bg-gradient-to-b from-[#2d1b54] via-[#1a103c] to-[#0a0618] overflow-y-auto pb-32 flex flex-col relative" style={{ fontFamily: "'Nunito', sans-serif" }}>
      <StarryBackground />

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
          <Ornaments tone="border-amber-400/40" />

          <div className="flex items-center justify-between gap-3 relative z-10 min-w-0">
            <button
              onClick={() => navigate(APP_PATHS.home)}
              className="flex items-center gap-2.5 sm:gap-3 group outline-none active:scale-[0.98] transition-transform min-w-0 flex-1"
              aria-label="Naar je Buddy"
            >
              <div className="relative shrink-0">
                <div className="absolute inset-0 rounded-full bg-amber-400/30 blur-md animate-pulse" />
                <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full border-[3px] border-amber-400 overflow-hidden shadow-lg shadow-amber-400/30 bg-[#2d1b54] group-hover:border-amber-300 transition-colors animate-buddy-idle-float">
                  <img src={buddy.art.happy} alt="" className="w-full h-full object-contain p-0.5" draggable={false} />
                </div>
              </div>
              <div className="text-left min-w-0 flex-1">
                <p className="text-[10px] font-bold text-amber-300/70 uppercase tracking-widest leading-none mb-0.5 sm:mb-1">
                  {`Met ${buddy.name}`}
                </p>
                <h2 className="text-base sm:text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 leading-tight truncate">
                  {greeting}
                </h2>
              </div>
            </button>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {isAdmin && (
                <button onClick={() => navigate('/admin')} className="hidden sm:flex w-10 h-10 bg-[#0f0828]/80 rounded-full items-center justify-center border-2 border-[#3b2d71] active:scale-95 transition-all" title="Admin" aria-label="Admin">
                  <Shield className="w-4 h-4 text-[#9d8bce]" />
                </button>
              )}
              <button onClick={() => navigate(APP_PATHS.parent)} className="w-9 h-9 sm:w-10 sm:h-10 bg-[#0f0828]/80 rounded-full flex items-center justify-center border-2 border-[#3b2d71] active:scale-95 transition-all" title="Ouderportaal" aria-label="Ouderportaal">
                <Users className="w-4 h-4 text-[#9d8bce]" />
              </button>
              <button onClick={handleSignOut} className="w-9 h-9 sm:w-10 sm:h-10 bg-[#0f0828]/80 rounded-full flex items-center justify-center border-2 border-[#3b2d71] active:scale-95 transition-all" title="Uitloggen" aria-label="Uitloggen">
                <LogOut className="w-4 h-4 text-[#9d8bce]" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Content ─────────────────────────────────── */}
      <div className="relative z-10 px-4 sm:px-5 max-w-2xl lg:max-w-5xl mx-auto w-full flex-1 grid gap-4 sm:gap-5 lg:grid-cols-2">

        {/* ── Hero: alle oefeningen ────────────────── */}
        <motion.button
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          onClick={() => navigate(APP_PATHS.practice)}
          className="lg:col-span-2 relative overflow-hidden w-full p-5 rounded-3xl flex items-center justify-between bg-gradient-to-br from-emerald-500/95 via-teal-500/90 to-cyan-500/95 border-[3px] border-emerald-300/40 shadow-[0_8px_32px_rgba(16,185,129,0.25)] hover:shadow-[0_8px_40px_rgba(16,185,129,0.4)] transition-all group outline-none active:scale-[0.98]"
        >
          <Ornaments tone="border-white/60" />
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent pointer-events-none" />

          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/25 backdrop-blur-sm border-2 border-white/40 flex items-center justify-center shadow-[0_0_16px_rgba(255,255,255,0.3)]">
              <LayoutGrid className="w-6 h-6 text-white drop-shadow" strokeWidth={2.5} />
            </div>
            <div className="text-left">
              <p className="text-[10px] font-bold text-emerald-50/80 uppercase tracking-widest leading-none mb-1">Jouw avontuur</p>
              <span className="block text-xl font-black text-white leading-tight">Alle oefeningen</span>
              <span className="block text-xs font-bold text-emerald-50/90 mt-0.5">Kies zelf wat je wil oefenen 🌟</span>
            </div>
          </div>
          <div className="relative z-10 w-10 h-10 rounded-full bg-white/25 backdrop-blur-sm border-2 border-white/40 flex items-center justify-center group-hover:translate-x-1 transition-transform">
            <ChevronRight className="w-5 h-5 text-white" strokeWidth={3} />
          </div>
        </motion.button>

        {/* ── Snel starten ─────────────────────────── */}
        {starts.length > 0 && menu && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className={cn(VITRINE, 'border-violet-500/30 shadow-[0_8px_32px_rgba(167,139,250,0.12)]')}
            aria-labelledby="quick-title"
          >
            <Ornaments tone="border-violet-400/40" />
            <div className="flex items-center gap-2.5 mb-4 relative z-10">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center shadow-[0_0_16px_rgba(167,139,250,0.4)]">
                <Zap className="w-5 h-5 text-[#1a103c] fill-[#1a103c]" strokeWidth={2.5} />
              </div>
              <div>
                <h3 id="quick-title" className="text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-200 via-purple-200 to-violet-200 leading-none">
                  Snel starten
                </h3>
                <p className="text-[10px] font-bold text-violet-300/60 uppercase tracking-widest mt-0.5">Eén tik en je bent weg</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 relative z-10">
              {starts.map(option => (
                <QuickStart key={option.type_key} option={option} repeated={isRepeated(option, menu)} wishBonus={menu.wish_bonus} onStart={() => start(option.route)} />
              ))}
            </div>
          </motion.section>
        )}

        {/* ── Wensen van de Buddy ─────────────────── */}
        {wishes.length > 0 && menu && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={cn(VITRINE, 'border-cyan-500/30 shadow-[0_8px_32px_rgba(34,211,238,0.12)]')}
            aria-labelledby="wishes-title"
          >
            <Ornaments tone="border-cyan-400/40" />
            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-sky-600 flex items-center justify-center shadow-[0_0_16px_rgba(34,211,238,0.4)]">
                  <Sparkles className="w-5 h-5 text-[#1a103c]" strokeWidth={2.5} />
                </div>
                <div>
                  <h3 id="wishes-title" className="text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-sky-300 to-cyan-200 leading-none">
                    {wishesDone === wishes.length ? 'Alle wensen vervuld!' : `Wensen van ${buddy.name}`}
                  </h3>
                  <p className="text-[10px] font-bold text-cyan-300/60 uppercase tracking-widest mt-0.5">
                    {wishesDone} / {wishes.length} vervuld
                  </p>
                </div>
              </div>
              <div className="relative w-10 h-10 shrink-0" aria-hidden>
                <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="rgb(59,45,113)" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15" fill="none"
                    stroke="url(#wishGrad)" strokeWidth="3" strokeLinecap="round"
                    strokeDasharray={`${(wishesDone / wishes.length) * 94.25} 94.25`}
                  />
                  <defs>
                    <linearGradient id="wishGrad" x1="0" x2="1" y1="0" y2="1">
                      <stop offset="0%" stopColor="#22d3ee" />
                      <stop offset="100%" stopColor="#0ea5e9" />
                    </linearGradient>
                  </defs>
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-cyan-200">
                  {Math.round((wishesDone / wishes.length) * 100)}%
                </span>
              </div>
            </div>

            <div className="space-y-2.5 relative z-10">
              {wishes.map((wish, i) => (
                <button
                  key={wish.type_key}
                  type="button"
                  disabled={wish.fulfilled}
                  onClick={() => start(wish.route)}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-2xl border-2 transition-all text-left",
                    wish.fulfilled
                      ? "bg-emerald-500/10 border-emerald-500/30"
                      : "bg-[#0f0828]/60 border-[#3b2d71] hover:border-cyan-500/40 active:scale-[0.99]"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border-2",
                      wish.fulfilled
                        ? "bg-gradient-to-br from-emerald-400 to-emerald-600 border-emerald-300/50 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                        : "bg-[#1a103c] border-[#5b4d8a]"
                    )}>
                      {wish.fulfilled
                        ? <Check className="w-4 h-4 text-white" strokeWidth={3} aria-label="Vervuld" />
                        : <span className="text-[11px] font-black text-cyan-300/70">{i + 1}</span>}
                    </div>
                    <span className={cn(
                      "font-bold text-sm",
                      wish.fulfilled ? "text-emerald-300/70 line-through decoration-emerald-500/30" : "text-white/90"
                    )}>
                      {wish.title}
                    </span>
                  </div>
                  <Payout amount={menu.wish_bonus} muted={wish.fulfilled} />
                </button>
              ))}
            </div>
          </motion.section>
        )}

        {/* ── Trofeeënkamer ────────────────────────── */}
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          onClick={() => navigate(APP_PATHS.badges)}
          aria-label="Trofeeënkamer"
          className={cn(VITRINE, 'w-full text-left lg:col-span-2 border-amber-500/30 shadow-[0_8px_32px_rgba(251,191,36,0.12)] cursor-pointer hover:border-amber-400/60 hover:shadow-[0_8px_40px_rgba(251,191,36,0.25)] transition-all active:scale-[0.99] group')}
        >
          <Ornaments tone="border-amber-400/40" />

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

          <div className="grid grid-cols-3 gap-2.5 mb-4 relative z-10 max-w-md mx-auto">
            {[0, 1, 2].map(i => {
              const badge = showcaseBadges[i];
              if (!badge) {
                return (
                  <div key={i} className="aspect-square max-h-32 rounded-2xl bg-[#0f0828]/60 border-2 border-dashed border-[#3b2d71] flex items-center justify-center">
                    <Lock className="w-4 h-4 text-[#5b4d8a]" />
                  </div>
                );
              }
              const Icon = BADGE_ICONS[badge.icon] ?? Trophy;
              return (
                <div
                  key={badge.id}
                  className="relative aspect-square max-h-32 rounded-2xl flex items-center justify-center border-2 border-white/10 shadow-lg overflow-hidden"
                  style={{ background: `linear-gradient(135deg, ${badge.gradientFrom}, ${badge.gradientTo})`, boxShadow: `0 4px 20px ${badge.gradientFrom}55` }}
                  title={badge.name}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent" />
                  <Icon className="w-7 h-7 text-white drop-shadow-md relative z-10" strokeWidth={2.2} />
                </div>
              );
            })}
          </div>

          {nextBadge && (() => {
            const Icon = BADGE_ICONS[nextBadge.icon] ?? Trophy;
            const pct = Math.min((nextBadge.progress / nextBadge.maxProgress) * 100, 100);
            return (
              <div className="relative z-10 bg-[#0f0828]/60 rounded-2xl p-3 border border-[#3b2d71]">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 opacity-60" style={{ background: `linear-gradient(135deg, ${nextBadge.gradientFrom}, ${nextBadge.gradientTo})` }}>
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
        </motion.button>

        {/* ── Beloningen ───────────────────────────── */}
        {rewards.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={cn(VITRINE, 'lg:col-span-2 border-pink-500/30 shadow-[0_8px_32px_rgba(236,72,153,0.12)]')}
            aria-labelledby="rewards-title"
          >
            <Ornaments tone="border-pink-400/40" />
            <div className="flex items-center gap-2.5 mb-4 relative z-10">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center shadow-[0_0_16px_rgba(236,72,153,0.4)]">
                <Gift className="w-5 h-5 text-[#1a103c]" strokeWidth={2.5} />
              </div>
              <h3 id="rewards-title" className="text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-200 via-rose-200 to-pink-200 leading-none">
                Mijn beloningen
              </h3>
            </div>
            <ul className="space-y-3 relative z-10">
              {rewards.map(reward => {
                const pct = Math.min(100, Math.round((reward.current_progress / Math.max(1, reward.required_exercises)) * 100));
                return (
                  <li key={reward.id} className="bg-[#0f0828]/60 rounded-2xl p-3 border border-[#3b2d71]">
                    <p className="text-sm font-bold text-white/90">{rewardCountdown(reward)}</p>
                    <div className="mt-2 h-2 w-full bg-[#2d1b54] rounded-full overflow-hidden" role="progressbar" aria-label={reward.title} aria-valuemin={0} aria-valuemax={reward.required_exercises} aria-valuenow={reward.current_progress}>
                      <div className="h-full rounded-full bg-gradient-to-r from-pink-400 to-rose-500" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </motion.section>
        )}
      </div>
    </div>
  );
}

function QuickStart({ option, repeated, wishBonus, onStart }: { option: PracticeOption; repeated: boolean; wishBonus: number; onStart: () => void }) {
  const wish = wishOpen(option);
  const payout = option.next_munten + (wish ? wishBonus : 0);
  return (
    <button
      type="button"
      onClick={onStart}
      aria-label={`Start ${option.title}, ${payout} Munten${wish ? ', een wens van je Buddy' : ''}`}
      className={cn(
        'relative flex flex-col items-center gap-2 rounded-2xl border-2 p-3 text-center transition-all active:scale-[0.97]',
        wish ? 'border-amber-400/50 bg-amber-500/10' : 'border-[#3b2d71] bg-[#0f0828]/60 hover:border-violet-400/50'
      )}
    >
      {wish && (
        <span className="absolute -top-2 right-2 rounded-full bg-amber-400 px-1.5 py-0.5 text-[9px] font-black uppercase text-[#1a103c] shadow">Wens</span>
      )}
      <ExerciseTypeIcon typeKey={option.type_key} subject={option.subject} size="sm" muted={repeated} />
      <span className="text-xs font-bold leading-tight text-white/90">{option.title}</span>
      <Payout amount={payout} muted={repeated} />
    </button>
  );
}
