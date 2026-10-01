import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, ChevronLeft, Lock, Trophy } from 'lucide-react';
import { useGame } from '@/context/GameContext';
import { cn } from '@/lib/utils';
import { badgeIcon } from '@/data/badgeIcons';
import { APP_PATHS } from '@/routes/paths';

/** The Prijzenkast: every badge, earned ones in colour, the rest with their progress. */
export function BadgeOverview() {
  const navigate = useNavigate();
  const { badges } = useGame();
  const unlocked = badges.filter((b) => b.isUnlocked).length;
  const pct = badges.length > 0 ? Math.round((unlocked / badges.length) * 100) : 0;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-slate-50">
      <header className="flex-shrink-0 border-b border-slate-200 bg-white px-4 pb-4 pt-6 shadow-sm">
        <div className="mx-auto w-full max-w-3xl space-y-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(APP_PATHS.home)}
              aria-label="Terug naar je Buddy"
              className="flex-shrink-0 rounded-2xl bg-slate-100 p-2.5 transition-colors hover:bg-slate-200 active:bg-slate-300"
            >
              <ChevronLeft className="h-5 w-5 text-slate-600" strokeWidth={2.5} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="mb-0.5 text-xs font-bold uppercase tracking-widest text-slate-400">Prijzenkast</p>
              <h1 className="truncate text-xl font-black text-slate-900">Jouw trofeeën</h1>
            </div>
            <span className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5">
              <Trophy className="h-4 w-4 text-amber-500" aria-hidden />
              <span className="text-sm font-black text-amber-700">
                {unlocked} / {badges.length}
              </span>
            </span>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">
                {unlocked === 0 ? 'Hier komen jouw trofeeën te staan!' : `${unlocked} van ${badges.length} verdiend`}
              </span>
              <span className="text-xs font-black text-amber-600">{pct}%</span>
            </div>
            <div className="h-3.5 overflow-hidden rounded-full bg-slate-100 shadow-inner">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500"
              />
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="mx-auto grid w-full max-w-3xl grid-cols-2 gap-3 pb-6 sm:grid-cols-3">
          {badges.map((badge, i) => {
            const Icon = badgeIcon(badge.icon);
            const progress = Math.min((badge.progress / Math.max(1, badge.maxProgress)) * 100, 100);
            return (
              <motion.button
                key={badge.id}
                type="button"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.4), type: 'spring', bounce: 0.15 }}
                onClick={() => navigate(`${APP_PATHS.badges}/${badge.id}`)}
                aria-label={`${badge.name}${badge.isUnlocked ? ', verdiend' : `, ${badge.progress} van ${badge.maxProgress}`}`}
                className={cn(
                  'relative flex flex-col items-center rounded-2xl border p-4 text-center transition-all hover:-translate-y-0.5 hover:shadow-md active:translate-y-0',
                  badge.isUnlocked ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'
                )}
              >
                <span className="absolute right-2 top-2" aria-hidden>
                  {badge.isUnlocked ? (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500">
                      <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                    </span>
                  ) : (
                    <Lock className="h-4 w-4 text-slate-300" />
                  )}
                </span>

                <span
                  aria-hidden
                  className={cn('mb-2 flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm', !badge.isUnlocked && 'bg-slate-200')}
                  style={badge.isUnlocked ? { background: `linear-gradient(135deg, ${badge.gradientFrom}, ${badge.gradientTo})` } : undefined}
                >
                  <Icon className={cn('h-7 w-7', badge.isUnlocked ? 'text-white' : 'text-slate-400')} strokeWidth={2.25} />
                </span>

                <p className={cn('mb-2 text-sm font-bold leading-tight', badge.isUnlocked ? 'text-slate-800' : 'text-slate-500')}>
                  {badge.name}
                </p>

                {badge.isUnlocked ? (
                  <span className="text-[10px] font-black uppercase tracking-wide text-emerald-600">Verdiend</span>
                ) : (
                  <div className="w-full space-y-1">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-amber-400" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">
                      {badge.progress}/{badge.maxProgress}
                    </span>
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
