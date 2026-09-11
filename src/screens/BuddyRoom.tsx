import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { NEED_IDS } from '@/lib/buddy/constants';
import { buddyCue, isSleeping, moodOf } from '@/lib/buddy/state';
import { buddyMessage, careActionMessage } from '@/lib/buddy/messages';
import { BuddyFxProvider, useBuddy } from '@/hooks/useBuddy';
import { NeedBar } from '@/components/buddy/NeedBar';
import { CareActionBar } from '@/components/buddy/CareActionBar';
import { BuddyStage } from '@/components/buddy/BuddyStage';
import forestScene from '@/assets/forest-scene.jpg';

export function BuddyRoom() {
  return (
    <BuddyFxProvider>
      <BuddyRoomContent />
    </BuddyFxProvider>
  );
}

function BuddyRoomContent() {
  const { buddy, loaded, careFx } = useBuddy();
  const [now, setNow] = useState(0);
  const [seed, setSeed] = useState(0);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);

  const mood = loaded && now ? moodOf(buddy, now) : 'neutral';
  const cue = loaded && now ? buddyCue(buddy, now) : 'ok';
  const sleeping = loaded && now ? isSleeping(buddy, now) : false;
  const minutesLeft =
    sleeping && buddy.sleepUntil ? Math.max(1, Math.ceil((buddy.sleepUntil - now) / 60000)) : 0;

  return (
    <main className="relative min-h-screen pb-32">
      <div
        className="absolute inset-x-0 top-0 h-[52vh] bg-cover bg-center"
        style={{ backgroundImage: `url(${forestScene})` }}
        aria-hidden
      />
      <div className="absolute inset-x-0 top-0 h-[52vh] bg-gradient-to-b from-transparent via-transparent to-background" aria-hidden />

      <div className="relative mx-auto w-full max-w-md px-4 pt-5">
        <header className="flex items-center justify-between">
          <div className="rounded-2xl bg-white/90 px-3 py-2 shadow-sm backdrop-blur">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Buddy Room</p>
            <h1 className="text-lg font-black leading-tight text-foreground">{buddy.name}</h1>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-white/90 px-3 py-2 shadow-sm backdrop-blur">
            <span className="text-xl" aria-hidden>
              🪙
            </span>
            <span className="text-lg font-black text-foreground">{buddy.munten}</span>
            <span className="text-[11px] font-bold text-muted-foreground">Munten</span>
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
            <p className="text-sm font-extrabold text-foreground">Je Buddy rust uit na te lange verwaarlozing.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Een ouder kan je Buddy terugbrengen via het Ouderportaal. De Needs komen dan gedeeltelijk terug.
            </p>
          </div>
        )}

        {!buddy.dead && buddy.needs.health <= 0 && (
          <div className="mt-2 rounded-3xl bg-white p-3 text-center shadow-md ring-1 ring-edu-teal/30">
            <p className="text-sm font-extrabold text-foreground">
              Ziekte! Gebruik de Care Action Medicijn om je Buddy meteen te genezen.
            </p>
          </div>
        )}

        <section className="mt-4 grid grid-cols-2 gap-2">
          {NEED_IDS.map((id) => (
            <div key={id} className={id === 'health' ? 'col-span-2' : ''}>
              <NeedBar id={id} value={buddy.needs[id]} />
            </div>
          ))}
        </section>

        <section className="mt-4">
          <h2 className="mb-2 px-1 text-sm font-black text-foreground">Care Actions</h2>
          <CareActionBar disabled={buddy.dead || careFx !== null} />
        </section>

        <div className="mt-4 flex w-full items-center justify-center gap-2 rounded-3xl bg-edu-yellow/60 px-4 py-3 text-sm font-black text-foreground shadow-lg">
          <Sparkles className="h-4 w-4" />
          Verdien Munten door oefeningen te maken
        </div>
      </div>
    </main>
  );
}
