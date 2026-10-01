import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { APP_PATHS } from '@/routes/paths';
import { useSpeech } from '@/hooks/useSpeech';
import { useBuddy } from '@/hooks/useBuddy';
import { isRepeated, usePracticeMenu, wishOpen, type PracticeOption } from '@/hooks/usePracticeMenu';
import { practiceGreeting } from '@/lib/buddy/messages';
import { SUBJECTS, exerciseTypeEmoji } from '@/data/exerciseTypes';

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

  const start = (option: PracticeOption) => navigate(`/app${option.route}`);

  return (
    <main className="h-full w-full overflow-y-auto pb-12">
      <div className="mx-auto w-full max-w-md px-4 pt-5 md:max-w-2xl">
        <header className="flex items-center justify-between">
          <Link
            to={APP_PATHS.home}
            className="flex min-h-12 items-center gap-1.5 rounded-2xl bg-white px-4 py-2 text-base font-extrabold text-foreground shadow-sm active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden /> Terug
          </Link>
          <div className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-sm">
            <span className="text-xl" aria-hidden>
              🪙
            </span>
            <span className="text-lg font-black text-foreground" aria-label={`${buddy.munten} Munten`}>
              {buddy.munten}
            </span>
          </div>
        </header>

        <h1 className="mt-4 text-2xl font-black text-foreground">Kies een oefening</h1>

        <button
          type="button"
          onClick={() => speak(greeting)}
          aria-label={`Lees voor: ${greeting}`}
          className="mt-2 flex w-full items-center gap-2.5 rounded-3xl rounded-bl-md bg-white py-2.5 pl-4 pr-2.5 text-left text-base font-bold text-foreground shadow-md active:scale-[0.99]"
        >
          <span className="flex-1">{greeting}</span>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-edu-blue text-white" aria-hidden>
            <Volume2 className="h-5 w-5" />
          </span>
        </button>

        {waiting && (
          <div className="mt-10 flex justify-center" role="status" aria-label="Oefeningen laden">
            <Loader2 className="h-8 w-8 animate-spin text-edu-teal" />
          </div>
        )}

        {isError && (
          <div className="mt-6 rounded-3xl bg-white p-6 text-center shadow-md">
            <p className="text-lg font-black text-foreground">De oefeningen konden niet geladen worden</p>
            <p className="mt-1 text-sm text-muted-foreground">Controleer je internetverbinding en probeer het opnieuw.</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-4 min-h-12 rounded-2xl bg-edu-green px-6 py-2.5 text-base font-black text-white shadow-md"
            >
              Opnieuw proberen
            </button>
          </div>
        )}

        {menu && menu.exercises.length === 0 && (
          <div className="mt-6 rounded-3xl bg-white p-6 text-center shadow-md">
            <span className="text-5xl" aria-hidden>
              🌱
            </span>
            <p className="mt-2 text-lg font-black text-foreground">Hier staan nog geen oefeningen</p>
            <p className="mt-1 text-sm text-muted-foreground">Ze worden nog gemaakt. Kom later nog eens terug!</p>
          </div>
        )}

        {menu &&
          SUBJECTS.map((subject) => {
            const options = menu.exercises.filter((o) => o.subject === subject.id);
            if (options.length === 0) return null;
            return (
              <section key={subject.id} className="mt-6" aria-labelledby={`subject-${subject.id}`}>
                <h2 id={`subject-${subject.id}`} className="mb-2 px-1 text-lg font-black text-foreground">
                  <span aria-hidden>{subject.emoji}</span> {subject.label}
                </h2>
                <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
                  {options.map((option) => (
                    <OptionTile
                      key={option.type_key}
                      option={option}
                      repeated={isRepeated(option, menu)}
                      wishBonus={menu.wish_bonus}
                      onStart={() => start(option)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
      </div>
    </main>
  );
}

function OptionTile({
  option,
  repeated,
  wishBonus,
  onStart,
}: {
  option: PracticeOption;
  repeated: boolean;
  wishBonus: number;
  onStart: () => void;
}) {
  const wish = wishOpen(option);
  const payout = option.next_munten + (wish ? wishBonus : 0);

  return (
    <button
      type="button"
      onClick={onStart}
      aria-label={`${option.title}, ${payout} Munten${wish ? ', een wens van je Buddy' : ''}${repeated ? ', die ken je al' : ''}`}
      className={cn(
        'relative flex min-h-[8.5rem] flex-col items-center justify-center gap-1.5 rounded-3xl bg-white px-2 py-3 text-center shadow-md ring-1 ring-black/5 transition active:scale-95',
        wish && 'ring-4 ring-edu-yellow',
        repeated && 'opacity-80'
      )}
    >
      {wish && (
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-edu-yellow px-2.5 py-0.5 text-xs font-black text-foreground shadow">
          ⭐ Wens
        </span>
      )}
      <span className="text-4xl leading-none" aria-hidden>
        {exerciseTypeEmoji(option.type_key, option.subject)}
      </span>
      <span className="text-sm font-extrabold leading-tight text-foreground">{option.title}</span>
      <span
        className={cn(
          'rounded-full px-2.5 py-0.5 text-sm font-black tabular-nums',
          repeated ? 'bg-muted text-muted-foreground' : 'bg-amber-100 text-amber-800'
        )}
        aria-hidden
      >
        🪙 {payout}
      </span>
      {repeated && (
        <span className="text-[11px] font-bold leading-none text-muted-foreground" aria-hidden>
          Ken ik al!
        </span>
      )}
    </button>
  );
}
