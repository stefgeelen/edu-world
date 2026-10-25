import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowLeftRight, Award, BookOpen, ChevronRight, Crown, Flame, Gift, Heart, LayoutGrid, Lock, LogOut, Shield,
  Sparkles, Star, Target, Trophy, Users, Zap, type LucideIcon,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useGame, type Badge } from '@/context/GameContext';
import { useAdminRole } from '@/hooks/useAdminRole';
import { usePlayers } from '@/hooks/usePlayers';
import { useChildGreeting } from '@/hooks/useChildGreeting';
import { useKleuterSays } from '@/hooks/useKindergarten';
import { useChildRewards, rewardCountdown } from '@/hooks/useChildRewards';
import { quickStarts, isRepeated, usePracticeMenu, wishOpen, type PracticeOption } from '@/hooks/usePracticeMenu';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';
import { ExerciseTypeIcon } from '@/components/buddy/ExerciseTypeIcon';
import { APP_PATHS, startExerciseFrom, LOGIN_PATH } from '@/routes/paths';
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
  // Een kleuter kan het welkom niet lezen: de Buddy zegt het.
  useKleuterSays('dashboard', greeting);
  const { data: menu } = usePracticeMenu();
  const { data: rewards = [] } = useChildRewards();
  const { data: players = [] } = usePlayers();

  const starts = useMemo(() => (menu ? quickStarts(menu) : []), [menu]);
  const wishes = menu?.wishes ?? [];
  const wishesDone = wishes.filter(w => w.fulfilled).length;

  const start = (route: string) => {
    startExerciseFrom(APP_PATHS.dashboard);
    navigate(`/app${route}`);
  };

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
      navigate(LOGIN_PATH);
    }
  };

  return (
    <div className="h-full w-full bg-gradient-to-b from-[#2d1b54] via-[#1a103c] to-[#0a0618] overflow-y-auto flex flex-col relative" style={{ fontFamily: "'Nunito', sans-serif" }}>
      <StarryBackground />

      {FOREST_DECORATIONS.map((el, i) => (
        <div key={i} className={`absolute pointer-events-none select-none ${el.size} ${el.opacity}`} style={{ top: el.top, left: el.left }}>
          {el.icon}
        </div>
      ))}

      {/* ── Header Vitrine ──────────────────────────── */}
      <div className="relative z-10 px-4 sm:px-5 pt-4 sm:pt-6 lg:pt-8 pb-3 sm:pb-4 lg:pb-6 max-w-2xl lg:max-w-5xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden bg-gradient-to-br from-[#1a103c]/90 via-[#241650]/80 to-[#1a103c]/90 backdrop-blur-xl rounded-3xl p-3 sm:p-4 lg:px-5 border-[3px] border-amber-400/30 shadow-[0_8px_32px_rgba(251,191,36,0.12)]"
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
                <p className="text-[10px] font-bold text-amber-300/70 uppercase tracking-widest leading-none mb-0.5 sm:mb-1 truncate">
                  {`Met ${buddy.name}`}
                </p>
                <h2 className="text-base sm:text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 leading-tight line-clamp-2">
                  {greeting}
                </h2>
              </div>
            </button>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Only with brothers or sisters: back to "Wie speelt er?". */}
              {players.length > 1 && (
                <button onClick={() => navigate(APP_PATHS.whoIsPlaying)} className="w-9 h-9 sm:w-auto sm:h-10 sm:px-3 bg-[#0f0828]/80 rounded-full flex items-center justify-center gap-1.5 border-2 border-amber-400/40 active:scale-95 transition-all" title="Wie speelt er?" aria-label="Wissel van speler">
                  <ArrowLeftRight className="w-4 h-4 text-amber-300" />
                  <span className="hidden sm:inline text-xs font-black text-amber-200">Wissel</span>
                </button>
              )}
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

      {/* ── Content: on desktop centred between the header and the tab bar ── */}
      <div className="relative z-10 flex-1 flex flex-col lg:justify-center">
      <div className="px-4 sm:px-5 max-w-2xl lg:max-w-5xl mx-auto w-full grid gap-3 sm:gap-4 lg:gap-6 lg:grid-cols-[3fr_2fr] lg:pb-6">

        {/* ── Hero: alle oefeningen ────────────────── */}
        <motion.button
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          onClick={() => navigate(APP_PATHS.practice)}
          className="lg:col-span-2 relative overflow-hidden w-full px-4 py-3.5 sm:px-5 sm:py-4 lg:px-6 lg:py-5 rounded-3xl flex items-center justify-between bg-gradient-to-br from-emerald-500/95 via-teal-500/90 to-cyan-500/95 border-[3px] border-emerald-300/40 shadow-[0_8px_32px_rgba(16,185,129,0.25)] hover:shadow-[0_8px_40px_rgba(16,185,129,0.4)] transition-all group outline-none active:scale-[0.98]"
        >
          <Ornaments tone="border-white/60" />
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent pointer-events-none" />

          <div className="flex items-center gap-4 relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-white/25 backdrop-blur-sm border-2 border-white/40 flex items-center justify-center shadow-[0_0_16px_rgba(255,255,255,0.3)]">
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

        {/* ── Snel starten, met de wensen van de Buddy ── */}
        {starts.length > 0 && menu && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className={cn(VITRINE, 'p-4 lg:p-6 border-violet-500/30 shadow-[0_8px_32px_rgba(167,139,250,0.12)]')}
            aria-labelledby="quick-title"
          >
            <Ornaments tone="border-violet-400/40" />
            <div className="flex items-center justify-between gap-2 mb-3 relative z-10">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center shadow-[0_0_16px_rgba(167,139,250,0.4)]">
                  <Zap className="w-5 h-5 text-[#1a103c] fill-[#1a103c]" strokeWidth={2.5} />
                </div>
                <div className="min-w-0">
                  <h3 id="quick-title" className="text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-200 via-purple-200 to-violet-200 leading-none">
                    Snel starten
                  </h3>
                  {/* On a phone the wish meter needs the room. */}
                  <p className={cn('text-[10px] font-bold text-violet-300/60 uppercase tracking-widest mt-0.5 truncate', wishes.length > 0 && 'hidden sm:block')}>Eén tik en je bent weg</p>
                </div>
              </div>
              {wishes.length > 0 && <WishMeter buddyName={buddy.name} done={wishesDone} total={wishes.length} />}
            </div>

            <div className="grid grid-cols-2 gap-2 lg:gap-3 relative z-10">
              {starts.map(option => (
                <QuickStart key={option.type_key} option={option} repeated={isRepeated(option, menu)} wishBonus={menu.wish_bonus} onStart={() => start(option.route)} />
              ))}
            </div>
          </motion.section>
        )}

        {/* ── Rechterkolom op desktop ─────────────── */}
        <div className="flex flex-col gap-3 sm:gap-4 lg:gap-6">
          {/* ── Trofeeënkamer ──────────────────────── */}
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onClick={() => navigate(APP_PATHS.badges)}
            aria-label="Trofeeënkamer"
            className={cn(VITRINE, 'p-4 lg:p-6 lg:flex-1 lg:flex lg:flex-col w-full text-left border-amber-500/30 shadow-[0_8px_32px_rgba(251,191,36,0.12)] cursor-pointer hover:border-amber-400/60 hover:shadow-[0_8px_40px_rgba(251,191,36,0.25)] transition-all active:scale-[0.99] group')}
          >
            <Ornaments tone="border-amber-400/40" />

            <div className="flex items-center justify-between gap-2 relative z-10">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-[0_0_16px_rgba(251,191,36,0.4)]">
                  <Trophy className="w-5 h-5 text-[#1a103c]" strokeWidth={2.5} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 leading-none">
                    Trofeeënkamer
                  </h3>
                  <p className="text-[10px] font-bold text-amber-300/60 uppercase tracking-widest mt-0.5">
                    {unlockedBadges.length} / {badges.length} verdiend
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                <span className="flex items-center gap-1 sm:gap-1.5 lg:hidden">
                  {[0, 1, 2].map(i => <BadgeTile key={i} badge={showcaseBadges[i]} size="sm" />)}
                </span>
                <ChevronRight className="w-5 h-5 text-amber-400/60 group-hover:translate-x-0.5 group-hover:text-amber-300 transition-all" strokeWidth={3} />
              </div>
            </div>

            <div className="relative z-10 hidden lg:grid flex-1 grid-cols-3 gap-3 content-center py-4">
              {[0, 1, 2].map(i => <BadgeTile key={i} badge={showcaseBadges[i]} size="lg" />)}
            </div>

            {nextBadge && (() => {
              const Icon = BADGE_ICONS[nextBadge.icon] ?? Trophy;
              const pct = Math.min((nextBadge.progress / nextBadge.maxProgress) * 100, 100);
              return (
                <div className="relative z-10 mt-3 lg:mt-0 bg-[#0f0828]/60 rounded-2xl px-3 py-2.5 border border-[#3b2d71]">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 opacity-60" style={{ background: `linear-gradient(135deg, ${nextBadge.gradientFrom}, ${nextBadge.gradientTo})` }}>
                      <Icon className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-amber-300/70 uppercase tracking-wider leading-none">Volgende trofee</p>
                      <p className="text-xs font-bold text-white/90 truncate mt-0.5">{nextBadge.name}</p>
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

          {/* ── Beloningen ─────────────────────────── */}
          {rewards.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className={cn(VITRINE, 'p-4 lg:p-6 border-pink-500/30 shadow-[0_8px_32px_rgba(236,72,153,0.12)]')}
              aria-labelledby="rewards-title"
            >
              <Ornaments tone="border-pink-400/40" />
              <div className="flex items-center gap-2.5 mb-3 relative z-10">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center shadow-[0_0_16px_rgba(236,72,153,0.4)]">
                  <Gift className="w-5 h-5 text-[#1a103c]" strokeWidth={2.5} />
                </div>
                <h3 id="rewards-title" className="text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-200 via-rose-200 to-pink-200 leading-none">
                  Mijn beloningen
                </h3>
              </div>
              <ul className="space-y-2 relative z-10">
                {rewards.map(reward => {
                  const pct = Math.min(100, Math.round((reward.current_progress / Math.max(1, reward.required_exercises)) * 100));
                  return (
                    <li key={reward.id} className="bg-[#0f0828]/60 rounded-2xl px-3 py-2.5 border border-[#3b2d71]">
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
      </div>
      {/* Room for the tab bar. A spacer, not pb-32: Safari leaves the bottom
          padding of a flex scroll container out of the scroll height, so content
          that ends just behind the tab bar could not be scrolled into view. */}
      <div className="h-32 shrink-0" aria-hidden="true" />
    </div>
  );
}

/** One earned badge in the trophy room, or a locked spot. Small in the header, large as the desktop showcase. */
function BadgeTile({ badge, size }: { badge?: Badge; size: 'sm' | 'lg' }) {
  const box = size === 'sm' ? 'w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl' : 'w-full aspect-square max-h-24 rounded-2xl';
  if (!badge) {
    return (
      <div className={cn(box, 'bg-[#0f0828]/60 border-2 border-dashed border-[#3b2d71] flex items-center justify-center')}>
        <Lock className={size === 'sm' ? 'w-3.5 h-3.5 text-[#5b4d8a]' : 'w-5 h-5 text-[#5b4d8a]'} />
      </div>
    );
  }
  const Icon = BADGE_ICONS[badge.icon] ?? Trophy;
  return (
    <div
      className={cn(box, 'relative flex items-center justify-center border border-white/15 overflow-hidden')}
      style={{ background: `linear-gradient(135deg, ${badge.gradientFrom}, ${badge.gradientTo})`, boxShadow: `0 2px 10px ${badge.gradientFrom}55` }}
      title={badge.name}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent" />
      <Icon className={cn('text-white drop-shadow relative z-10', size === 'sm' ? 'w-4 h-4' : 'w-8 h-8')} strokeWidth={2.4} />
    </div>
  );
}

/** How many of today's wishes are done: one dot per wish, in the header of Snel starten. */
function WishMeter({ buddyName, done, total }: { buddyName: string; done: number; total: number }) {
  const allDone = done === total;
  return (
    <div
      role="status"
      aria-label={allDone ? 'Alle wensen vervuld!' : `Wensen van ${buddyName}: ${done} / ${total} vervuld`}
      className={cn(
        'shrink-0 flex flex-col items-end gap-1 rounded-2xl border px-2.5 py-1.5',
        allDone ? 'border-emerald-400/40 bg-emerald-500/10' : 'border-amber-400/30 bg-amber-500/10'
      )}
    >
      <span className={cn('text-[10px] font-black uppercase tracking-wider leading-none whitespace-nowrap', allDone ? 'text-emerald-300' : 'text-amber-300/80')}>
        {allDone ? 'Alle wensen vervuld! ⭐' : `Wensen van ${buddyName}`}
      </span>
      {!allDone && (
        <span className="flex items-center gap-1" aria-hidden>
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={cn('w-2.5 h-2.5 rounded-full', i < done ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.7)]' : 'bg-[#3b2d71]')} />
          ))}
          <span className="ml-0.5 text-[10px] font-black text-amber-200">{done}/{total}</span>
        </span>
      )}
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
        'relative flex items-center gap-2.5 rounded-2xl border-2 p-2.5 text-left transition-all active:scale-[0.97] min-h-[68px] lg:flex-col lg:justify-center lg:gap-2 lg:p-4 lg:text-center lg:min-h-[140px]',
        wish ? 'border-amber-400/50 bg-amber-500/10' : 'border-[#3b2d71] bg-[#0f0828]/60 hover:border-violet-400/50'
      )}
    >
      {wish && (
        <span className="absolute -top-2 right-2 rounded-full bg-amber-400 px-1.5 py-0.5 text-[9px] font-black uppercase text-[#1a103c] shadow">Wens</span>
      )}
      <ExerciseTypeIcon typeKey={option.type_key} subject={option.subject} size="sm" muted={repeated} />
      <span className="flex min-w-0 flex-1 lg:flex-none flex-col items-start lg:items-center gap-1 lg:gap-1.5">
        <span className="text-xs lg:text-sm font-bold leading-tight text-white/90">{option.title}</span>
        <Payout amount={payout} muted={repeated} />
      </span>
    </button>
  );
}
