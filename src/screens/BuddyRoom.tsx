import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, ShoppingBag, Sparkles, Volume2 } from 'lucide-react';
import { buddyCue, isSleeping, moodOf, type BuddyCue } from '@/lib/buddy/state';
import type { CareActionId } from '@/lib/buddy/catalog';
import { buddyMessage, careActionMessage } from '@/lib/buddy/messages';
import { BuddyFxProvider, useBuddy } from '@/hooks/useBuddy';
import { useSpeech } from '@/hooks/useSpeech';
import { useCurrentChild } from '@/hooks/useCompleteExercise';
import { useBuddyTour, type BuddyTourStep } from '@/hooks/useBuddyTour';
import { CarePanel } from '@/components/buddy/CarePanel';
import { BuddyStage } from '@/components/buddy/BuddyStage';
import forestScene from '@/assets/forest-scene.jpg';

/** Welke Care Action de Buddy nu vraagt — die knop wiebelt als hint voor het kind. */
const CUE_ACTION: Partial<Record<BuddyCue, CareActionId>> = {
  hunger: 'feed',
  fun: 'play',
  energy: 'sleep',
  hygiene: 'wash',
  ill: 'medicine',
};

/** Wat de Buddy zegt tijdens de rondleiding bij het eerste bezoek. Zonder emoji: het wordt voorgelezen. */
const TOUR_TEXT: Record<BuddyTourStep, (name: string) => string> = {
  poke: (name) => `Hoi! Ik ben ${name}. Tik eens op mij!`,
  feed: () => 'Hihi, dat kriebelt! Ik heb honger. Tik op Voeren en geef me iets lekkers.',
  done: () => 'Mmm, lekker! Met oefeningen verdien je munten. Daarmee koop je in de Winkel nog meer. Tik op Klaar!',
};

/** Een item dat in de Winkel gekocht is met "Geef aan ...", meegegeven bij het terugkeren. */
interface GiveState {
  give?: { action: CareActionId; itemId: string };
}

export function BuddyRoom() {
  return (
    <BuddyFxProvider>
      <BuddyRoomContent />
    </BuddyFxProvider>
  );
}

function BuddyRoomContent() {
  // `now` comes from the shared clock in BuddyFxProvider, so this screen and the
  // CarePanel below it tick together off a single timer.
  const { buddy, loaded, careFx, now, care } = useBuddy();
  const [seed, setSeed] = useState(0);
  const { data: child } = useCurrentChild();
  const tour = useBuddyTour(child?.id);
  const location = useLocation();
  const navigate = useNavigate();

  const mood = loaded && now ? moodOf(buddy, now) : 'neutral';
  const cue = loaded && now ? buddyCue(buddy, now) : 'ok';
  const sleeping = loaded && now ? isSleeping(buddy, now) : false;
  const minutesLeft =
    sleeping && buddy.sleepUntil ? Math.max(1, Math.ceil((buddy.sleepUntil - now) / 60000)) : 0;

  const messageFor = (s: number) =>
    careFx
      ? careActionMessage(careFx.action)
      : sleeping
        ? `Zzz... nog ${minutesLeft} minuten rust.`
        : buddyMessage(mood, s, cue);
  // De rondleiding wacht op een levende, wakkere Buddy: anders kan het kind de stappen niet doen.
  const tourStep = loaded && !buddy.dead && !sleeping ? tour.step : null;
  const message = tourStep ? TOUR_TEXT[tourStep](buddy.name) : messageFor(seed);

  // Veel kinderen van 5-7 lezen nog niet: de Buddy zegt zijn tekstballon ook hardop.
  const { speak } = useSpeech();

  // Eén keer bij binnenkomen, zodra de echte toestand geladen is.
  const greeted = useRef(false);
  useEffect(() => {
    if (!loaded || greeted.current) return;
    greeted.current = true;
    // Tijdens de rondleiding spreekt de stap zelf (effect hieronder).
    if (!tourStep) speak(message);
  }, [loaded, message, speak, tourStep]);

  // Elke stap van de rondleiding wordt één keer voorgelezen.
  useEffect(() => {
    if (tourStep) speak(TOUR_TEXT[tourStep](buddy.name));
    // Alleen bij een nieuwe stap; de naam verandert niet tijdens de rondleiding.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourStep]);

  // En bij elke Care Action ("Mmm, lekker!").
  const careFxAt = careFx?.at;
  useEffect(() => {
    if (!careFx) return;
    // In de rondleiding begint de volgende stap zelf met "Mmm, lekker!".
    if (tourStep === 'feed') tour.advance('feed');
    else speak(careActionMessage(careFx.action));
    // Alleen afgaan op een nieuwe Care Action, niet op elke render tijdens de animatie.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [careFxAt]);

  // Teruggekomen uit de Winkel met "Geef aan ...": meteen gebruiken, zodat het
  // kind de Buddy ziet smullen. De state wordt gewist zodat terug/vernieuwen
  // het niet nog eens geeft.
  const give = (location.state as GiveState | null)?.give;
  const givenFor = useRef<string | null>(null);
  useEffect(() => {
    // Eén keer per navigatie: loopt het effect opnieuw voor de state gewist is, dan gaat er geen tweede item af.
    if (!loaded || !give || givenFor.current === location.key) return;
    givenFor.current = location.key;
    navigate(location.pathname, { replace: true, state: null });
    care(give.action, give.itemId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, give]);

  const poke = () => {
    if (tourStep === 'poke') {
      tour.advance('poke');
      return;
    }
    if (tourStep) {
      speak(message);
      return;
    }
    const next = seed + 1;
    setSeed(next);
    speak(messageFor(next));
  };

  return (
    <main className="relative h-full w-full overflow-y-auto pb-32">
      <div
        className="absolute inset-x-0 top-0 h-[52vh] bg-cover bg-center"
        style={{ backgroundImage: `url(${forestScene})` }}
        aria-hidden
      />
      <div className="absolute inset-x-0 top-0 h-[52vh] bg-gradient-to-b from-transparent via-transparent to-background" aria-hidden />

      <div className="relative mx-auto w-full max-w-md px-4 pt-5 md:max-w-xl">
        <header className="flex items-center justify-between">
          <div className="rounded-2xl bg-white/90 px-3 py-2 shadow-sm backdrop-blur">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Jouw Buddy</p>
            <h1 className="text-lg font-black leading-tight text-foreground">{buddy.name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-2xl bg-white/90 px-3 py-2 shadow-sm backdrop-blur">
              <span className="text-xl" aria-hidden>
                🪙
              </span>
              <span className="text-lg font-black text-foreground" aria-label={`${buddy.munten} Munten`}>
                {buddy.munten}
              </span>
            </div>
            <Link
              to="/app/buddy-room/shop"
              className="flex min-h-12 items-center justify-center gap-1.5 rounded-2xl bg-edu-green px-3 py-2 text-base font-black text-white shadow-md active:scale-95"
            >
              <ShoppingBag className="h-5 w-5" aria-hidden />
              Winkel
            </Link>
          </div>
        </header>

        <section className="mt-2 flex flex-col items-center">
          <button
            type="button"
            onClick={() => speak(message)}
            aria-label={`Lees voor: ${message}`}
            className="mb-1 flex max-w-[19rem] items-center gap-2.5 rounded-3xl rounded-bl-md bg-white/95 py-2.5 pl-4 pr-2.5 text-left text-base font-bold text-foreground shadow-lg backdrop-blur active:scale-[0.98] md:max-w-sm md:text-lg"
          >
            <span className="flex-1">{message}</span>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-edu-blue text-white shadow-md" aria-hidden>
              <Volume2 className="h-5 w-5" />
            </span>
          </button>
          <BuddyStage
            name={buddy.name}
            mood={mood}
            cue={cue}
            fx={careFx}
            onPoke={poke}
            pointer={tourStep === 'poke'}
          />

          {tourStep === 'done' && (
            <button
              type="button"
              onClick={() => tour.advance('done')}
              className="mt-1 min-h-14 animate-care-nudge rounded-3xl bg-edu-green px-8 py-3 text-lg font-black text-white shadow-lg"
            >
              Klaar 👍
            </button>
          )}
          {tourStep && tourStep !== 'done' && (
            <button
              type="button"
              onClick={tour.finish}
              className="mt-1 rounded-full bg-white/80 px-3 py-1.5 text-xs font-bold text-muted-foreground"
            >
              Overslaan
            </button>
          )}
        </section>

        {buddy.dead && (
          <div className="mt-2 rounded-3xl bg-white p-4 text-center shadow-lg ring-1 ring-destructive/20">
            <p className="text-sm font-extrabold text-foreground">
              Je Buddy is heel moe en rust uit. Vraag hulp aan mama of papa.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Voor ouders: je kan de Buddy terugbrengen via het Ouderportaal.
            </p>
          </div>
        )}

        {!buddy.dead && buddy.needs.health <= 0 && (
          <div className="mt-2 rounded-3xl bg-white p-3 text-center shadow-md ring-1 ring-edu-teal/30">
            <p className="text-sm font-extrabold text-foreground">
              Je Buddy is ziek! Tik op 💊 Medicijn om je Buddy beter te maken.
            </p>
          </div>
        )}

        <section className="mt-4">
          <h2 className="mb-2 px-1 text-sm font-black text-foreground">
            {sleeping ? `💤 ${buddy.name} slaapt nog ${minutesLeft} min` : `Zorg voor ${buddy.name}`}
          </h2>
          <CarePanel
            disabled={buddy.dead || sleeping || careFx !== null}
            highlight={
              tourStep === 'feed' ? 'feed' : careFx || sleeping || tourStep ? undefined : CUE_ACTION[cue]
            }
            pointAt={tourStep === 'feed' ? 'feed' : undefined}
          />
        </section>

        <Link
          to="/app/map"
          className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-3xl bg-edu-yellow px-4 py-3 text-base font-black text-foreground shadow-lg active:scale-[0.98]"
        >
          <Sparkles className="h-5 w-5" aria-hidden />
          Oefenen en 🪙 verdienen
          <ChevronRight className="h-5 w-5" aria-hidden />
        </Link>
      </div>
    </main>
  );
}
