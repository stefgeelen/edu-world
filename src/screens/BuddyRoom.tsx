import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, Shield, ShoppingBag, Sprout, Trophy, Users, Volume2, Zap, type LucideIcon } from 'lucide-react';
import { buddyCue, isSleeping, moodOf, type BuddyCue } from '@/lib/buddy/state';
import type { CareActionId } from '@/lib/buddy/catalog';
import { buddyMessage, careActionMessage, growthCountdown } from '@/lib/buddy/messages';
import { BuddyFxProvider, useBuddy } from '@/hooks/useBuddy';
import { useSpeech } from '@/hooks/useSpeech';
import { useCurrentChild } from '@/hooks/useCompleteExercise';
import { useBuddyTour, type BuddyTourStep } from '@/hooks/useBuddyTour';
import { CarePanel } from '@/components/buddy/CarePanel';
import { BuddyStage } from '@/components/buddy/BuddyStage';
import { WishesCard } from '@/components/buddy/WishesCard';
import { MuntenChip } from '@/components/buddy/MuntenChip';
import { RewardTeller } from '@/components/buddy/RewardTeller';
import { GrowthMoment } from '@/components/buddy/GrowthMoment';
import { useAdminRole } from '@/hooks/useAdminRole';
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

/** Shop / trophy cabinet shortcut in the shared card style. */
function Tile({ to, label, icon: Icon, gradient }: { to: string; label: string; icon: LucideIcon; gradient: string }) {
  return (
    <Link
      to={to}
      aria-label={label}
      className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
    >
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-sm`} aria-hidden>
        <Icon className="h-5 w-5 text-white" strokeWidth={2.25} />
      </span>
      <span className="min-w-0 text-base font-black leading-tight text-slate-900">{label}</span>
    </Link>
  );
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
  const { isAdmin } = useAdminRole();
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
    <main className="relative h-full w-full overflow-y-auto pb-12">
      <div
        className="absolute inset-x-0 top-0 h-[52vh] bg-cover bg-center"
        style={{ backgroundImage: `url(${forestScene})` }}
        aria-hidden
      />
      <div className="absolute inset-x-0 top-0 h-[52vh] bg-gradient-to-b from-transparent via-transparent to-background" aria-hidden />

      <div className="relative mx-auto w-full max-w-md px-4 pt-5 md:max-w-xl">
        <header className="flex items-center gap-2">
          <div className="min-w-0 flex-1 rounded-2xl bg-white/90 px-3 py-2 shadow-sm backdrop-blur">
            <h1 className="truncate text-lg font-black leading-tight text-slate-900">{form.title}</h1>
            {countdown ? (
              <p className="flex items-center gap-1 truncate text-xs font-bold text-emerald-600">
                <Sprout className="h-3.5 w-3.5 shrink-0" aria-hidden /> {countdown}
              </p>
            ) : (
              <p className="text-xs font-bold text-slate-400">Jouw Buddy</p>
            )}
          </div>
          <span className="rounded-2xl bg-white/90 p-1.5 shadow-sm backdrop-blur">
            <MuntenChip amount={buddy.munten} size="lg" />
          </span>
          {isAdmin && (
            <Link
              to="/admin"
              aria-label="Admin"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/90 text-slate-500 shadow-sm backdrop-blur active:scale-95"
            >
              <Shield className="h-5 w-5" aria-hidden />
            </Link>
          )}
          <Link
            to={APP_PATHS.parent}
            aria-label="Ouderportaal"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/90 text-slate-500 shadow-sm backdrop-blur active:scale-95"
          >
            <Users className="h-5 w-5" aria-hidden />
          </Link>
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
          to={APP_PATHS.practice}
          className="group relative mt-5 flex w-full items-center justify-between overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-5 shadow-[0_8px_32px_rgba(16,185,129,0.25)] transition-all active:scale-[0.98]"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-white/40 bg-white/25">
              <Zap className="h-6 w-6 fill-white text-white" strokeWidth={2.5} aria-hidden />
            </div>
            <div className="text-left">
              <span className="block text-2xl font-black leading-tight text-white">Oefenen!</span>
              <span className="block text-sm font-bold text-emerald-50/90">Verdien munten voor {buddy.name}</span>
            </div>
          </div>
          <div className="relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/40 bg-white/25 transition-transform group-hover:translate-x-1">
            <ChevronRight className="h-5 w-5 text-white" strokeWidth={3} aria-hidden />
          </div>
        </Link>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <Tile to={APP_PATHS.shop} label="Winkel" icon={ShoppingBag} gradient="from-emerald-400 to-emerald-600" />
          <Tile to={APP_PATHS.badges} label="Prijzenkast" icon={Trophy} gradient="from-amber-400 to-amber-600" />
        </div>

        <WishesCard buddyName={buddy.name} />
        <RewardTeller />
      </div>

      {growthMoment.grew && (
        <GrowthMoment name={buddy.name} form={form} onDone={growthMoment.dismiss} />
      )}
    </main>
  );
}
