import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, ChevronLeft, Lock, Target } from 'lucide-react';
import { useGame } from '@/context/GameContext';
import { cn } from '@/lib/utils';
import { triggerConfetti } from '@/lib/confetti';
import { badgeIcon } from '@/data/badgeIcons';
import { APP_PATHS } from '@/routes/paths';

export function BadgeDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { badges } = useGame();
  const badge = badges.find((b) => b.id === id);

  useEffect(() => {
    if (!badge?.isUnlocked) return;
    // Cancelled on unmount so it can't fire on the next screen.
    const timer = setTimeout(() => {
      triggerConfetti('small', { colors: [badge.gradientFrom, badge.gradientTo, '#fbbf24'], originY: 0.4 });
    }, 300);
    return () => clearTimeout(timer);
  }, [badge?.isUnlocked, badge?.gradientFrom, badge?.gradientTo]);

  const back = () => navigate(APP_PATHS.badges);

  if (!badge) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-sm space-y-4 rounded-3xl border-2 border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/40">
          <h2 className="text-xl font-black text-slate-800">Deze trofee bestaat niet</h2>
          <button type="button" onClick={back} className="w-full rounded-2xl border-2 border-slate-200 py-3 font-bold text-slate-500 hover:bg-slate-50">
            Terug naar de prijzenkast
          </button>
        </div>
      </div>
    );
  }

  const Icon = badgeIcon(badge.icon);
  const pct = Math.min((badge.progress / Math.max(1, badge.maxProgress)) * 100, 100);
  const left = Math.max(0, badge.maxProgress - badge.progress);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-slate-50">
      <header className="flex-shrink-0 border-b border-slate-200 bg-white px-4 pb-4 pt-6 shadow-sm">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
          <button
            type="button"
            onClick={back}
            aria-label="Terug naar de prijzenkast"
            className="flex-shrink-0 rounded-2xl bg-slate-100 p-2.5 transition-colors hover:bg-slate-200 active:bg-slate-300"
          >
            <ChevronLeft className="h-5 w-5 text-slate-600" strokeWidth={2.5} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="mb-0.5 text-xs font-bold uppercase tracking-widest text-slate-400">Prijzenkast</p>
            <h1 className="truncate text-xl font-black text-slate-900">{badge.name}</h1>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-8">
        <div className="mx-auto flex w-full max-w-md flex-col items-center">
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', bounce: 0.4 }}
            className="relative"
          >
            <span
              aria-hidden
              className={cn('flex h-36 w-36 items-center justify-center rounded-[2rem] shadow-lg', !badge.isUnlocked && 'bg-slate-200')}
              style={badge.isUnlocked ? { background: `linear-gradient(135deg, ${badge.gradientFrom}, ${badge.gradientTo})` } : undefined}
            >
              <Icon className={cn('h-20 w-20', badge.isUnlocked ? 'text-white' : 'text-slate-400')} strokeWidth={1.75} />
            </span>
            <span
              className={cn(
                'absolute -bottom-2 -right-2 flex h-11 w-11 items-center justify-center rounded-full border-4 border-slate-50',
                badge.isUnlocked ? 'bg-emerald-500' : 'bg-slate-300'
              )}
              aria-hidden
            >
              {badge.isUnlocked ? <Check className="h-5 w-5 text-white" strokeWidth={3} /> : <Lock className="h-5 w-5 text-white" />}
            </span>
          </motion.div>

          <p className="mt-6 text-center text-base font-semibold text-slate-600">{badge.description}</p>
          <span
            className={cn(
              'mt-3 rounded-full px-4 py-1.5 text-sm font-black',
              badge.isUnlocked ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
            )}
          >
            {badge.isUnlocked ? 'Verdiend!' : 'Nog niet verdiend'}
          </span>

          <section className="mt-8 w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="req-title">
            <div className="mb-3 flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-sm" aria-hidden>
                <Target className="h-5 w-5 text-white" />
              </span>
              <h2 id="req-title" className="text-base font-black text-slate-900">
                Zo verdien je hem
              </h2>
            </div>
            <p className="text-sm font-bold text-slate-700">{badge.requirement}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">{badge.isUnlocked ? 'Voltooid!' : `Nog ${left} te gaan`}</span>
              <span className="text-xs font-black text-amber-600">
                {badge.progress} / {badge.maxProgress}
              </span>
            </div>
            <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-slate-100">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${badge.gradientFrom}, ${badge.gradientTo})` }}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
