import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Loader2, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { APP_PATHS } from '@/routes/paths';
import { useSpeech } from '@/hooks/useSpeech';
import { useBuddy } from '@/hooks/useBuddy';
import { isRepeated, usePracticeMenu, wishOpen, type PracticeOption } from '@/hooks/usePracticeMenu';
import { practiceGreeting } from '@/lib/buddy/messages';
import { SUBJECTS } from '@/data/exerciseTypes';
import { ExerciseTypeIcon } from '@/components/buddy/ExerciseTypeIcon';
import { Ornaments, Payout, StarryBackground } from '@/components/dashboard/Vitrine';
import { VITRINE } from '@/components/dashboard/vitrineStyles';

/** Every exercise the child can pick, per subject, in the dashboard's dark style. */
export function Practice() {
  const navigate = useNavigate();
  const { data: menu, isError, refetch } = usePracticeMenu();
  // Not `isLoading`: that is false while a retry is paused (app in the
  // background, or offline), which left this screen blank.
  const waiting = !menu && !isError;
  const { buddy } = useBuddy();
  const { speak } = useSpeech();

  const greeting = practiceGreeting(menu, buddy.name);
  const greeted = useRef(false);
  useEffect(() => {
    if (!menu || greeted.current) return;
    greeted.current = true;
    speak(greeting);
  }, [menu, greeting, speak]);

  return (
    <div className="relative flex h-full w-full flex-col overflow-y-auto bg-gradient-to-b from-[#2d1b54] via-[#1a103c] to-[#0a0618] pb-32" style={{ fontFamily: "'Nunito', sans-serif" }}>
      <StarryBackground />

      <div className="relative z-10 mx-auto w-full max-w-2xl px-4 pt-4 sm:px-5 sm:pt-6 lg:max-w-4xl">
        <header className={cn(VITRINE, 'border-amber-400/30 p-3 shadow-[0_8px_32px_rgba(251,191,36,0.12)] sm:p-4')}>
          <Ornaments tone="border-amber-400/40" />
          <div className="relative z-10 flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(APP_PATHS.dashboard)}
              aria-label="Terug naar het dashboard"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[#3b2d71] bg-[#0f0828]/80 transition-all active:scale-95"
            >
              <ChevronLeft className="h-5 w-5 text-[#9d8bce]" strokeWidth={2.5} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="mb-0.5 text-[10px] font-bold uppercase leading-none tracking-widest text-amber-300/70">Oefenen</p>
              <h1 className="truncate bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 bg-clip-text text-lg font-black leading-tight text-transparent sm:text-xl">
                Alle oefeningen
              </h1>
            </div>
            <span className="flex shrink-0 items-center gap-1.5 rounded-full border-2 border-amber-500/40 bg-[#0f0828]/80 px-3 py-1.5" aria-label={`${buddy.munten} Munten`}>
              <span aria-hidden>🪙</span>
              <span className="text-sm font-black text-amber-200">{buddy.munten}</span>
            </span>
          </div>

          <button
            type="button"
            onClick={() => speak(greeting)}
            aria-label={`Lees voor: ${greeting}`}
            className="relative z-10 mt-3 flex w-full items-center gap-3 rounded-2xl border-2 border-[#3b2d71] bg-[#0f0828]/60 py-2 pl-3 pr-2 text-left transition-colors hover:border-cyan-500/40"
          >
            <span className="flex-1 text-sm font-bold text-white/90">{greeting}</span>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-sky-600 text-[#1a103c]" aria-hidden>
              <Volume2 className="h-4 w-4" strokeWidth={2.5} />
            </span>
          </button>
        </header>

        <div className="mt-5 space-y-6 pb-6">
          {waiting && (
            <div className="flex justify-center pt-10" role="status" aria-label="Oefeningen laden">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-300" />
            </div>
          )}

          {isError && (
            <Message title="De oefeningen konden niet geladen worden" body="Controleer je internetverbinding en probeer het opnieuw.">
              <button
                type="button"
                onClick={() => refetch()}
                className="w-full rounded-2xl border-b-4 border-emerald-700 bg-gradient-to-r from-emerald-500 to-cyan-500 py-3 font-black text-white transition-all active:translate-y-1 active:border-b-0"
              >
                Opnieuw proberen
              </button>
            </Message>
          )}

          {menu && menu.exercises.length === 0 && (
            <Message title="Hier staan nog geen oefeningen" body="Ze worden nog gemaakt. Kom later nog eens terug!" />
          )}

          {menu &&
            SUBJECTS.map((subject) => {
              const options = menu.exercises.filter((o) => o.subject === subject.id);
              if (options.length === 0) return null;
              const Icon = subject.icon;
              return (
                <section key={subject.id} aria-labelledby={`subject-${subject.id}`}>
                  <div className={cn('mb-3 flex items-center gap-3 rounded-2xl border-2 border-white/10 bg-gradient-to-r p-3 shadow-lg', subject.gradient)}>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                      <Icon className="h-5 w-5 text-white" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 id={`subject-${subject.id}`} className="text-base font-black text-white">
                        {subject.label}
                      </h2>
                      <p className="text-xs font-semibold text-white/80">
                        {options.length} {options.length === 1 ? 'soort oefening' : 'soorten oefeningen'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                    {options.map((option, i) => (
                      <OptionCard
                        key={option.type_key}
                        option={option}
                        index={i}
                        repeated={isRepeated(option, menu)}
                        wishBonus={menu.wish_bonus}
                        onStart={() => navigate(`/app${option.route}`)}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
        </div>
      </div>
    </div>
  );
}

function Message({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <div className={cn(VITRINE, 'mx-auto w-full max-w-sm space-y-4 border-[#3b2d71] p-8 text-center')}>
      <h2 className="text-xl font-black text-white">{title}</h2>
      <p className="text-sm font-medium text-[#a78bfa]">{body}</p>
      {children}
    </div>
  );
}

function OptionCard({
  option,
  index,
  repeated,
  wishBonus,
  onStart,
}: {
  option: PracticeOption;
  index: number;
  repeated: boolean;
  wishBonus: number;
  onStart: () => void;
}) {
  const wish = wishOpen(option);
  const payout = option.next_munten + (wish ? wishBonus : 0);

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4), type: 'spring', bounce: 0.15 }}
      onClick={onStart}
      aria-label={`${option.title}, ${payout} Munten${wish ? ', een wens van je Buddy' : ''}${repeated ? ', die ken je al' : ''}`}
      className={cn(
        'relative flex flex-col items-center gap-2 rounded-2xl border-2 p-4 text-center backdrop-blur-sm transition-all hover:-translate-y-0.5 active:translate-y-0',
        wish
          ? 'border-amber-400/50 bg-amber-500/10 shadow-[0_0_16px_rgba(251,191,36,0.15)]'
          : 'border-[#3b2d71] bg-[#1a103c]/80 hover:border-violet-400/50'
      )}
    >
      {wish && (
        <span className="absolute -top-2 right-2 rounded-full bg-amber-400 px-1.5 py-0.5 text-[9px] font-black uppercase text-[#1a103c] shadow">
          Wens
        </span>
      )}
      <ExerciseTypeIcon typeKey={option.type_key} subject={option.subject} muted={repeated} />
      <p className={cn('text-sm font-bold leading-tight', repeated ? 'text-white/50' : 'text-white/90')}>{option.title}</p>
      <span aria-hidden>
        <Payout amount={payout} muted={repeated} />
      </span>
      {repeated && (
        <span className="text-[10px] font-semibold text-[#9d8bce]" aria-hidden>
          Ken ik al!
        </span>
      )}
    </motion.button>
  );
}
