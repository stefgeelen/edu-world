import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeftRight, Award, BookOpen, ChevronRight, Crown, Flame, Gift, Heart, LayoutGrid, Lock, Play, Shield,
  Sparkles, Star, Target, Trophy, Zap, type LucideIcon,
} from 'lucide-react';
import { useGame, type Badge } from '@/context/GameContext';
import { useAdminRole } from '@/hooks/useAdminRole';
import { usePlayers } from '@/hooks/usePlayers';
import { useBuddyRow } from '@/hooks/useBuddy';
import { useChildGreeting } from '@/hooks/useChildGreeting';
import { useKleuterSays } from '@/hooks/useKindergarten';
import { useChildRewards, rewardCountdown } from '@/hooks/useChildRewards';
import { quickStarts, isRepeated, usePracticeMenu, wishOpen, type PracticeMenu, type PracticeOption } from '@/hooks/usePracticeMenu';
import { ExerciseTypeIcon } from '@/components/buddy/ExerciseTypeIcon';
import { APP_PATHS, startExerciseFrom } from '@/routes/paths';
import { cn } from '@/lib/utils';
import { Payout, StarryBackground } from '@/components/dashboard/Vitrine';
import { DARK_ROW, VITRINE } from '@/components/dashboard/vitrineStyles';
import forestScene from '@/assets/forest-scene.jpg';

/* ── Icon registry for db-driven badges ──────────────── */
const BADGE_ICONS: Record<string, LucideIcon> = {
  Sparkles, Flame, Star, Target, Trophy, BookOpen, Zap, Award, Heart, Crown,
};

/** Round header buttons: parent portal, admin, switch player. */
const HEADER_BUTTON = 'h-11 min-w-11 bg-[#0f0828]/80 rounded-full flex items-center justify-center gap-1.5 border-2 active:scale-95 transition-all';

export function Dashboard() {
  const navigate = useNavigate();
  const { buddy, badges } = useGame();
  const { isAdmin } = useAdminRole();
  const { greeting } = useChildGreeting();
  // Een kleuter kan het welkom niet lezen: de Buddy zegt het.
  useKleuterSays('dashboard', greeting);
  const { data: menu } = usePracticeMenu();
  const { data: rewards = [] } = useChildRewards();
  const { data: players = [] } = usePlayers();
  const { data: buddyRow } = useBuddyRow();
  const munten = buddyRow?.munten;

  const starts = useMemo(() => (menu ? quickStarts(menu) : []), [menu]);
  const [firstStart, ...otherStarts] = starts;
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

  return (
    <div className="h-full w-full bg-gradient-to-b from-[#2d1b54] via-[#1a103c] to-[#0a0618] overflow-y-auto flex flex-col relative" style={{ fontFamily: "'Nunito', sans-serif" }}>
      <StarryBackground />

      {/* ── Bovenbalk: Munten links, de knoppen voor de ouder rechts ── */}
      <div className="relative z-10 px-4 sm:px-5 pt-4 sm:pt-6 max-w-2xl lg:max-w-5xl mx-auto w-full flex items-center gap-2">
        {munten != null && (
          <span
            className="flex items-center gap-1.5 rounded-full border-2 border-amber-500/40 bg-[#0f0828]/80 px-3.5 h-11"
            aria-label={`${munten} Munten`}
          >
            <span aria-hidden className="text-lg">🪙</span>
            <span className="text-lg font-black text-amber-200">{munten}</span>
          </span>
        )}
        <div className="flex-1" />
        {/* Only with brothers or sisters: back to "Wie speelt er?". */}
        {players.length > 1 && (
          <button onClick={() => navigate(APP_PATHS.whoIsPlaying)} className={cn(HEADER_BUTTON, 'px-3 border-amber-400/40')} title="Wie speelt er?" aria-label="Wissel van speler">
            <ArrowLeftRight className="w-5 h-5 text-amber-300" />
            <span className="hidden sm:inline text-sm font-black text-amber-200">Wissel</span>
          </button>
        )}
        {isAdmin && (
          <button onClick={() => navigate('/admin')} className={cn(HEADER_BUTTON, 'hidden sm:flex border-[#3b2d71]')} title="Admin" aria-label="Admin">
            <Shield className="w-5 h-5 text-[#9d8bce]" />
          </button>
        )}
        {/* Uitloggen staat in het ouderportaal, achter de PIN: een kind logt zo niet per ongeluk uit. */}
        <button onClick={() => navigate(APP_PATHS.parent)} className={cn(HEADER_BUTTON, 'border-[#3b2d71]')} title="Ouderportaal" aria-label="Ouderportaal">
          <Lock className="w-5 h-5 text-[#9d8bce]" />
        </button>
      </div>

      {/* ── Content: on desktop centred between the header and the tab bar ── */}
      <div className="relative z-10 flex-1 flex flex-col lg:justify-center">
        <div className="px-4 sm:px-5 pt-3 max-w-2xl lg:max-w-5xl mx-auto w-full grid gap-4 lg:gap-6 lg:grid-cols-[3fr_2fr] lg:pb-6">

          {/* ── Linkerkolom: de Buddy en wat je nu kunt spelen ── */}
          <div className="flex flex-col gap-4 min-w-0">
            <BuddyHero
              greeting={greeting}
              buddyName={buddy.name}
              buddyImage={buddy.art.happy}
              wishesDone={wishesDone}
              wishesTotal={wishes.length}
              onOpenBuddy={() => navigate(APP_PATHS.home)}
            />

            {firstStart && menu && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="flex flex-col gap-3"
                aria-label="Snel starten"
              >
                <PlayButton option={firstStart} menu={menu} onStart={() => start(firstStart.route)} />
                {otherStarts.length > 0 && (
                  <div className="grid grid-cols-3 gap-2.5 lg:gap-3">
                    {otherStarts.map(option => (
                      <QuickStart key={option.type_key} option={option} menu={menu} onStart={() => start(option.route)} />
                    ))}
                  </div>
                )}
              </motion.section>
            )}
          </div>

          {/* ── Rechterkolom op desktop ─────────────── */}
          <div className="flex flex-col gap-4 lg:gap-6 min-w-0">
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              onClick={() => navigate(APP_PATHS.practice)}
              className={cn(DARK_ROW, 'w-full flex items-center gap-3.5 px-4 py-3.5 text-left hover:border-emerald-400/50 transition-all active:scale-[0.98] group outline-none')}
            >
              <span className="w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                <LayoutGrid className="w-6 h-6 text-white" strokeWidth={2.5} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-lg font-black text-white leading-tight">Alle oefeningen</span>
                <span className="block text-sm font-bold text-[#c9bdf0]">Kies zelf wat je oefent</span>
              </span>
              <ChevronRight className="w-6 h-6 text-[#9d8bce] group-hover:translate-x-0.5 transition-transform" strokeWidth={3} />
            </motion.button>

            {/* ── Trofeeënkamer ──────────────────────── */}
            <motion.button
              type="button"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              onClick={() => navigate(APP_PATHS.badges)}
              aria-label="Trofeeënkamer"
              className={cn(VITRINE, 'p-4 lg:p-6 lg:flex-1 lg:flex lg:flex-col w-full text-left border-amber-500/30 cursor-pointer hover:border-amber-400/60 transition-all active:scale-[0.99] group')}
            >
              <div className="flex items-center justify-between gap-2 relative z-10">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 shrink-0 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-[#1a103c]" strokeWidth={2.5} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-black text-amber-200 leading-tight">Trofeeënkamer</h3>
                    <p className="text-sm font-bold text-[#c9bdf0]">
                      {unlockedBadges.length} / {badges.length} verdiend
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* On a phone the title needs the room; the room itself shows them. */}
                  <span className="hidden sm:flex items-center gap-1.5 lg:hidden">
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
                  <div className="relative z-10 mt-3 lg:mt-0">
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 opacity-70" style={{ background: `linear-gradient(135deg, ${nextBadge.gradientFrom}, ${nextBadge.gradientTo})` }}>
                        <Icon className="w-4 h-4 text-white" strokeWidth={2.5} />
                      </div>
                      <p className="flex-1 min-w-0 text-base font-bold text-white/90 truncate">
                        <span className="text-[#9d8bce]">Volgende: </span>{nextBadge.name}
                      </p>
                      <span className="text-sm font-black text-amber-200 whitespace-nowrap">
                        {nextBadge.progress}/{nextBadge.maxProgress}
                      </span>
                    </div>
                    <div className="h-2.5 w-full bg-[#1c1134] rounded-full overflow-hidden">
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
                transition={{ delay: 0.3 }}
                className={cn(VITRINE, 'p-4 lg:p-6 border-pink-500/30')}
                aria-labelledby="rewards-title"
              >
                <div className="flex items-center gap-3 mb-3 relative z-10">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center">
                    <Gift className="w-6 h-6 text-[#1a103c]" strokeWidth={2.5} />
                  </div>
                  <h3 id="rewards-title" className="text-lg font-black text-pink-200 leading-tight">
                    Mijn beloningen
                  </h3>
                </div>
                <ul className="space-y-2 relative z-10">
                  {rewards.map(reward => {
                    const pct = Math.min(100, Math.round((reward.current_progress / Math.max(1, reward.required_exercises)) * 100));
                    return (
                      <li key={reward.id} className="bg-[#0f0828]/60 rounded-2xl px-3 py-2.5 border border-[#3b2d71]">
                        <p className="text-base font-bold text-white/90">{rewardCountdown(reward)}</p>
                        <div className="mt-2 h-2.5 w-full bg-[#1c1134] rounded-full overflow-hidden" role="progressbar" aria-label={reward.title} aria-valuemin={0} aria-valuemax={reward.required_exercises} aria-valuenow={reward.current_progress}>
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

      {/* The Buddy's forest closes the page, and is the room for the tab bar. A
          block, not pb-32: Safari leaves the bottom padding of a flex scroll
          container out of the scroll height, so content that ends just behind
          the tab bar could not be scrolled into view. */}
      <div
        className="relative shrink-0 -mt-6 h-48 bg-cover bg-center opacity-70 brightness-[0.7] saturate-[0.85] [mask-image:linear-gradient(to_bottom,transparent,black_55%)] pointer-events-none"
        style={{ backgroundImage: `url(${forestScene})` }}
        aria-hidden="true"
      />
    </div>
  );
}

/** The Buddy, big, with a speech bubble: the greeting and how many wishes are left today. */
function BuddyHero({ greeting, buddyName, buddyImage, wishesDone, wishesTotal, onOpenBuddy }: {
  greeting: string;
  buddyName: string;
  buddyImage: string;
  wishesDone: number;
  wishesTotal: number;
  onOpenBuddy: () => void;
}) {
  const open = wishesTotal - wishesDone;
  const line = wishesTotal === 0
    ? 'Wat gaan we vandaag oefenen?'
    : open === 0
      ? 'Alle wensen vervuld. Dankjewel!'
      : `Help je mij met ${open === 1 ? 'nog 1 wens' : `${open} wensen`}?`;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-end gap-3"
    >
      <button
        onClick={onOpenBuddy}
        className="relative shrink-0 w-32 h-32 sm:w-40 sm:h-40 outline-none active:scale-95 transition-transform"
        aria-label="Naar je Buddy"
      >
        <div className="absolute inset-3 rounded-full bg-amber-400/20 blur-xl" />
        <img src={buddyImage} alt="" className="relative w-full h-full object-contain animate-buddy-idle-float drop-shadow-[0_8px_16px_rgba(0,0,0,0.4)]" draggable={false} />
      </button>

      <div className="relative flex-1 min-w-0 mb-6 sm:mb-8 rounded-3xl rounded-bl-md bg-[#1a103c]/95 border-2 border-amber-400/40 px-4 py-3">
        <div className="absolute bottom-3 -left-2 w-3.5 h-3.5 bg-[#1a103c] border-l-2 border-b-2 border-amber-400/40 rotate-45" aria-hidden />
        <h2 className="text-xl sm:text-2xl font-black text-amber-200 leading-tight">{greeting}</h2>
        <p className="mt-0.5 text-base sm:text-lg font-bold text-white/90 leading-snug">{line}</p>
        {wishesTotal > 0 && <WishStars buddyName={buddyName} done={wishesDone} total={wishesTotal} />}
      </div>
    </motion.div>
  );
}

/** How many of today's wishes are done: one star per wish, in the Buddy's speech bubble. */
function WishStars({ buddyName, done, total }: { buddyName: string; done: number; total: number }) {
  return (
    <div
      role="status"
      aria-label={done === total ? 'Alle wensen vervuld!' : `Wensen van ${buddyName}: ${done} / ${total} vervuld`}
      className="mt-2 flex items-center gap-1"
    >
      {Array.from({ length: total }, (_, i) => (
        <Star
          key={i}
          aria-hidden
          className={cn('w-6 h-6', i < done ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]' : 'text-[#4c3b82]')}
          strokeWidth={2.5}
        />
      ))}
    </div>
  );
}

const startLabel = (option: PracticeOption, payout: number, wish: boolean) =>
  `Start ${option.title}, ${payout} Munten${wish ? ', een wens van je Buddy' : ''}`;

/** The one big button: the first quick start, an open wish when there is one. */
function PlayButton({ option, menu, onStart }: { option: PracticeOption; menu: PracticeMenu; onStart: () => void }) {
  const wish = wishOpen(option);
  const payout = option.next_munten + (wish ? menu.wish_bonus : 0);
  return (
    <button
      type="button"
      onClick={onStart}
      aria-label={startLabel(option, payout, wish)}
      className="w-full flex items-center gap-4 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 border-b-[5px] border-orange-700/60 px-4 py-3.5 text-left shadow-[0_8px_28px_rgba(251,146,60,0.3)] active:scale-[0.98] active:border-b-2 transition-all outline-none"
    >
      <span className="w-14 h-14 shrink-0 rounded-full bg-white flex items-center justify-center shadow-md">
        <Play className="w-7 h-7 text-orange-500 fill-orange-500 ml-1" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-2xl font-black text-[#3a1d00] leading-tight">Speel!</span>
        <span className="block text-base font-extrabold text-[#5a2e00] leading-tight line-clamp-2">
          {wish ? `Wens: ${option.title}` : option.title}
        </span>
      </span>
      <span className="shrink-0 rounded-full bg-[#3a1d00]/15 px-2.5 py-1 text-base font-black text-[#3a1d00] whitespace-nowrap">
        +{payout} <span aria-hidden>🪙</span>
      </span>
    </button>
  );
}

/** One of the smaller quick starts under the play button. */
function QuickStart({ option, menu, onStart }: { option: PracticeOption; menu: PracticeMenu; onStart: () => void }) {
  const wish = wishOpen(option);
  const repeated = isRepeated(option, menu);
  const payout = option.next_munten + (wish ? menu.wish_bonus : 0);
  return (
    <button
      type="button"
      onClick={onStart}
      aria-label={startLabel(option, payout, wish)}
      className={cn(
        'relative flex flex-col items-center gap-2 rounded-2xl border-2 px-1.5 pt-3 pb-2.5 text-center transition-all active:scale-[0.97] lg:p-4',
        wish ? 'border-amber-400/70 bg-amber-500/10' : 'border-[#3b2d71] bg-[#0f0828]/60 hover:border-violet-400/50'
      )}
    >
      {wish && <Star aria-hidden className="absolute top-1.5 right-1.5 w-4 h-4 fill-amber-400 text-amber-400" />}
      <ExerciseTypeIcon typeKey={option.type_key} subject={option.subject} size="md" muted={repeated} />
      <span className="text-sm font-bold leading-tight text-white/90 line-clamp-2 min-h-[2.5em] flex items-center">{option.title}</span>
      <Payout amount={payout} muted={repeated} />
    </button>
  );
}

/** One earned badge in the trophy room, or a locked spot. Small in the header, large as the desktop showcase. */
function BadgeTile({ badge, size }: { badge?: Badge; size: 'sm' | 'lg' }) {
  const box = size === 'sm' ? 'w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl' : 'w-full aspect-square max-h-24 rounded-2xl';
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
