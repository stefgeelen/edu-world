import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Loader2, Star, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { APP_PATHS } from '@/routes/paths';
import { useSpeech } from '@/hooks/useSpeech';
import { useBuddy } from '@/hooks/useBuddy';
import { isRepeated, usePracticeMenu, wishOpen, type PracticeOption } from '@/hooks/usePracticeMenu';
import { practiceGreeting } from '@/lib/buddy/messages';
import { SUBJECTS, type SubjectStyle } from '@/data/exerciseTypes';
import { ExerciseTypeIcon } from '@/components/buddy/ExerciseTypeIcon';
import { MuntenChip } from '@/components/buddy/MuntenChip';

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
              <p className="mb-0.5 text-xs font-bold uppercase tracking-widest text-slate-400">Oefenen</p>
              <h1 className="truncate text-xl font-black text-slate-900">Kies een oefening</h1>
            </div>
            <MuntenChip amount={buddy.munten} size="lg" />
          </div>

          <button
            type="button"
            onClick={() => speak(greeting)}
            aria-label={`Lees voor: ${greeting}`}
            className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 py-2 pl-3 pr-2 text-left transition-colors hover:bg-slate-100"
          >
            <span className="flex-1 text-sm font-bold text-slate-700">{greeting}</span>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-white" aria-hidden>
              <Volume2 className="h-4 w-4" />
            </span>
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="mx-auto w-full max-w-3xl space-y-8 pb-6">
          {waiting && (
            <div className="flex justify-center pt-10" role="status" aria-label="Oefeningen laden">
              <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
            </div>
          )}

          {isError && (
            <Message title="De oefeningen konden niet geladen worden" body="Controleer je internetverbinding en probeer het opnieuw.">
              <button
                type="button"
                onClick={() => refetch()}
                className="w-full rounded-2xl border-b-4 border-teal-600 bg-gradient-to-r from-teal-500 to-teal-400 py-3 font-black text-white transition-all active:translate-y-1 active:border-b-0"
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
                  <div className={cn('mb-4 flex items-center gap-3 rounded-2xl bg-gradient-to-r p-3', subject.gradient)}>
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

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {options.map((option, i) => (
                      <OptionCard
                        key={option.type_key}
                        option={option}
                        subject={subject}
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
    <div className="mx-auto w-full max-w-sm space-y-4 rounded-3xl border-2 border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/40">
      <h2 className="text-xl font-black text-slate-800">{title}</h2>
      <p className="text-sm font-medium text-slate-500">{body}</p>
      {children}
    </div>
  );
}

function OptionCard({
  option,
  subject,
  index,
  repeated,
  wishBonus,
  onStart,
}: {
  option: PracticeOption;
  subject: SubjectStyle;
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
        'relative flex flex-col items-center rounded-2xl border p-4 text-center transition-all hover:-translate-y-0.5 hover:shadow-md active:translate-y-0',
        repeated ? 'border-slate-200 bg-white' : cn(subject.bg, subject.border),
        wish && 'border-amber-300 ring-2 ring-amber-300'
      )}
    >
      {wish && (
        <span className="absolute right-2 top-2 flex items-center gap-0.5 rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-black text-white shadow-sm">
          <Star className="h-3 w-3 fill-white" aria-hidden /> Wens
        </span>
      )}

      <div className="mb-2">
        <ExerciseTypeIcon typeKey={option.type_key} subject={option.subject} muted={repeated} />
      </div>

      <p className={cn('mb-2 text-sm font-bold leading-tight', repeated ? 'text-slate-500' : 'text-slate-800')}>
        {option.title}
      </p>

      <span aria-hidden>
        <MuntenChip amount={`+${payout}`} muted={repeated} />
      </span>

      {repeated && (
        <span className="mt-1 text-[10px] font-semibold text-slate-400" aria-hidden>
          Ken ik al!
        </span>
      )}
    </motion.button>
  );
}
