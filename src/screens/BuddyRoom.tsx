import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ShoppingBag, Sparkles } from 'lucide-react';
import { buddyCue, isSleeping, moodOf, type BuddyCue } from '@/lib/buddy/state';
import type { CareActionId } from '@/lib/buddy/catalog';
import { buddyMessage, careActionMessage } from '@/lib/buddy/messages';
import { BuddyFxProvider, useBuddy } from '@/hooks/useBuddy';
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
  const { buddy, loaded, careFx, now } = useBuddy();
  const [seed, setSeed] = useState(0);

  const mood = loaded && now ? moodOf(buddy, now) : 'neutral';
  const cue = loaded && now ? buddyCue(buddy, now) : 'ok';
  const sleeping = loaded && now ? isSleeping(buddy, now) : false;
  const minutesLeft =
    sleeping && buddy.sleepUntil ? Math.max(1, Math.ceil((buddy.sleepUntil - now) / 60000)) : 0;

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
            onClick={() => setSeed((s) => s + 1)}
            className="mb-1 max-w-[17rem] rounded-3xl rounded-bl-md bg-white/95 px-4 py-3 text-center text-sm font-bold text-foreground shadow-lg backdrop-blur"
          >
            {careFx
              ? careActionMessage(careFx.action)
              : sleeping
                ? `Zzz... nog ${minutesLeft} min rust.`
                : buddyMessage(mood, seed, cue)}
          </button>
          <BuddyStage name={buddy.name} mood={mood} cue={cue} fx={careFx} />
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
            highlight={careFx || sleeping ? undefined : CUE_ACTION[cue]}
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
