import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Heart, ShoppingBag, Sprout, Volume2 } from 'lucide-react';
import { buddyCue, isSleeping, moodOf, type BuddyCue } from '@/lib/buddy/state';
import type { CareActionId } from '@/lib/buddy/catalog';
import { buddyMessage, careActionMessage, growthCountdown } from '@/lib/buddy/messages';
import { BuddyFxProvider, useBuddy } from '@/hooks/useBuddy';
import { useSpeech } from '@/hooks/useSpeech';
import { useCurrentChild } from '@/hooks/useCompleteExercise';
import { useBuddyTour, type BuddyTourStep } from '@/hooks/useBuddyTour';
import { CarePanel } from '@/components/buddy/CarePanel';
import { BuddyStage } from '@/components/buddy/BuddyStage';
import { Ornaments, StarryBackground } from '@/components/dashboard/Vitrine';
import { VITRINE } from '@/components/dashboard/vitrineStyles';
import { cn } from '@/lib/utils';
import { GrowthMoment } from '@/components/buddy/GrowthMoment';
import { useGrowthMoment } from '@/hooks/useGrowthMoment';
import { daysUntilNextGrowth, growthForm } from '@/lib/buddy/growth';
import { APP_PATHS } from '@/routes/paths';
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
  const form = growthForm(buddy.growthStage);
  const growthMoment = useGrowthMoment(child?.id, buddy.growthStage, loaded);
  const countdown = loaded && now ? growthCountdown(buddy.name, daysUntilNextGrowth(now)) : null;

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
    <main
      className="relative h-full w-full overflow-y-auto bg-gradient-to-b from-[#2d1b54] via-[#1a103c] to-[#0a0618] pb-32"
      style={{ fontFamily: "'Nunito', sans-serif" }}
    >
      <StarryBackground />
      {/* The forest, at night: it fades into the same sky as the dashboard. */}
      <div
        className="absolute inset-x-0 top-0 h-[56vh] bg-cover bg-center opacity-80 brightness-[0.7] saturate-[0.85] [mask-image:linear-gradient(to_bottom,black_45%,transparent)]"
        style={{ backgroundImage: `url(${forestScene})` }}
        aria-hidden
      />
      <div className="absolute inset-x-0 top-0 h-[56vh] bg-gradient-to-b from-[#2d1b54]/70 via-[#2d1b54]/20 to-transparent" aria-hidden />

      <div className="relative z-10 mx-auto w-full max-w-md px-4 pt-4 sm:pt-6 md:max-w-xl">
        <header className={cn(VITRINE, 'flex items-center gap-2 border-amber-400/30 p-3 shadow-[0_8px_32px_rgba(251,191,36,0.12)]')}>
          <Ornaments tone="border-amber-400/40" />
          <div className="relative z-10 min-w-0 flex-1 pl-1">
            <p className="mb-0.5 text-[10px] font-bold uppercase leading-none tracking-widest text-amber-300/70">Jouw Buddy</p>
            <h1 className="truncate bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 bg-clip-text text-lg font-black leading-tight text-transparent">
              {form.title}
            </h1>
            {countdown && (
              <p className="mt-0.5 flex items-start gap-1 text-[11px] font-bold leading-tight text-emerald-300">
                <Sprout className="h-3.5 w-3.5 shrink-0" aria-hidden /> <span>{countdown}</span>
              </p>
            )}
          </div>
          <span
            className="relative z-10 flex shrink-0 items-center gap-1.5 rounded-full border-2 border-amber-500/40 bg-[#0f0828]/80 px-3 py-1.5"
            aria-label={`${buddy.munten} Munten`}
          >
            <span aria-hidden>🪙</span>
            <span className="text-sm font-black text-amber-200">{buddy.munten}</span>
          </span>
          <Link
            to={APP_PATHS.shop}
            className="relative z-10 flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-2xl border-2 border-emerald-300/40 bg-gradient-to-br from-emerald-500 to-teal-500 px-3 py-2 text-sm font-black text-white shadow-[0_4px_16px_rgba(16,185,129,0.3)] active:scale-95"
          >
            <ShoppingBag className="h-4 w-4" aria-hidden />
            Winkel
          </Link>
        </header>

        <section className="mt-2 flex flex-col items-center">
          <button
            type="button"
            onClick={() => speak(message)}
            aria-label={`Lees voor: ${message}`}
            className="mb-1 mt-3 flex max-w-[19rem] items-center gap-2.5 rounded-3xl rounded-bl-md border-2 border-[#3b2d71] bg-[#1a103c]/90 py-2.5 pl-4 pr-2.5 text-left text-base font-bold text-white shadow-lg backdrop-blur active:scale-[0.98] md:max-w-sm md:text-lg"
          >
            <span className="flex-1">{message}</span>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-sky-600 text-[#1a103c] shadow-md" aria-hidden>
              <Volume2 className="h-5 w-5" strokeWidth={2.5} />
            </span>
          </button>
          <BuddyStage
            name={buddy.name}
            mood={mood}
            cue={cue}
            fx={careFx}
            onPoke={poke}
            pointer={tourStep === 'poke'}
            growth={form}
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
              className="mt-1 rounded-full border-2 border-[#3b2d71] bg-[#0f0828]/80 px-3 py-1.5 text-xs font-bold text-[#9d8bce]"
            >
              Overslaan
            </button>
          )}
        </section>

        {buddy.dead && (
          <div className={cn(VITRINE, 'mt-2 border-rose-400/40 p-4 text-center')}>
            <Ornaments tone="border-rose-300/40" />
            <p className="relative z-10 text-sm font-extrabold text-white">
              Je Buddy is heel moe en rust uit. Vraag hulp aan mama of papa.
            </p>
            <p className="relative z-10 mt-1 text-xs text-[#a78bfa]">
              Voor ouders: je kan de Buddy terugbrengen via het Ouderportaal.
            </p>
          </div>
        )}

        {!buddy.dead && buddy.needs.health <= 0 && (
          <div className={cn(VITRINE, 'mt-2 border-teal-400/40 p-3 text-center')}>
            <Ornaments tone="border-teal-300/40" />
            <p className="relative z-10 text-sm font-extrabold text-white">
              Je Buddy is ziek! Tik op 💊 Medicijn om je Buddy beter te maken.
            </p>
          </div>
        )}

        <section className={cn(VITRINE, 'mt-4 border-violet-500/30 shadow-[0_8px_32px_rgba(167,139,250,0.12)]')} aria-labelledby="care-title">
          <Ornaments tone="border-violet-400/40" />
          <div className="relative z-10 mb-4 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-purple-600 shadow-[0_0_16px_rgba(167,139,250,0.4)]">
              <Heart className="h-5 w-5 fill-[#1a103c] text-[#1a103c]" strokeWidth={2.5} aria-hidden />
            </div>
            <h2 id="care-title" className="bg-gradient-to-r from-violet-200 via-purple-200 to-violet-200 bg-clip-text text-base font-black leading-none text-transparent">
              {sleeping ? `💤 ${buddy.name} slaapt nog ${minutesLeft} min` : `Zorg voor ${buddy.name}`}
            </h2>
          </div>
          <div className="relative z-10">
          <CarePanel
            disabled={buddy.dead || sleeping || careFx !== null}
            highlight={
              tourStep === 'feed' ? 'feed' : careFx || sleeping || tourStep ? undefined : CUE_ACTION[cue]
            }
            pointAt={tourStep === 'feed' ? 'feed' : undefined}
          />
          </div>
        </section>

      </div>

      {growthMoment.grew && (
        <GrowthMoment name={buddy.name} form={form} onDone={growthMoment.dismiss} />
      )}
    </main>
  );
}
