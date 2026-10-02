import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CARE_ACTIONS, itemsByCategory, type CareActionId } from '@/lib/buddy/catalog';
import { CRITICAL_THRESHOLD, NEED_EMOJI, NEED_IDS, NEED_LABEL, type NeedId } from '@/lib/buddy/constants';
import { useBuddy } from '@/hooks/useBuddy';
import { cn } from '@/lib/utils';
import { APP_PATHS } from '@/routes/paths';
import { DARK_DIALOG, DARK_ROW } from '@/components/dashboard/vitrineStyles';

/** Elke Need staat op één rij met de Care Action die hem aanvult. */
const NEED_ACTION: Record<NeedId, CareActionId> = {
  hunger: 'feed',
  fun: 'play',
  energy: 'sleep',
  hygiene: 'wash',
  health: 'medicine',
};

const BAR_COLOR: Record<NeedId, string> = {
  hunger: 'bg-edu-orange',
  fun: 'bg-edu-pink',
  energy: 'bg-edu-purple',
  hygiene: 'bg-edu-blue',
  health: 'bg-edu-green',
};

const ACTION_STYLE: Record<CareActionId, string> = {
  feed: 'bg-edu-orange shadow-edu-orange/40',
  play: 'bg-edu-pink shadow-edu-pink/40',
  sleep: 'bg-edu-purple shadow-edu-purple/40',
  medicine: 'bg-edu-teal shadow-edu-teal/40',
  wash: 'bg-edu-blue shadow-edu-blue/40',
};

/** Werkwoord op de knop van een item: wat er gebeurt als het kind tikt. */
const USE_VERB: Record<CareActionId, string> = {
  feed: 'Geef',
  play: 'Speel',
  sleep: 'Slaap',
  medicine: 'Geef',
  wash: 'Was',
};

export function CarePanel({
  disabled,
  highlight,
  pointAt,
}: {
  disabled?: boolean;
  /** Rondleiding: een wijzend handje onder deze knop. */
  pointAt?: CareActionId;
  /** De Care Action die de Buddy nu nodig heeft; die knop wiebelt als hint. */
  highlight?: CareActionId;
}) {
  const { buddy, care, buyAndCare, careBusy } = useBuddy();
  const [open, setOpen] = useState<CareActionId | null>(null);

  const off = disabled || careBusy;
  const action = open ? CARE_ACTIONS[open] : null;
  const items = action ? itemsByCategory(action.category) : [];
  const canDoAnything = items.some(
    (item) => (buddy.inventory[item.id] ?? 0) > 0 || buddy.munten >= item.price
  );

  const choose = (run: () => void) => {
    run();
    setOpen(null);
  };

  return (
    <>
      <div className="space-y-2">
        {NEED_IDS.map((need) => {
          const id = NEED_ACTION[need];
          const a = CARE_ACTIONS[id];
          const value = buddy.needs[need];
          const critical = value < CRITICAL_THRESHOLD;
          const owned = itemsByCategory(a.category).reduce(
            (sum, item) => sum + (buddy.inventory[item.id] ?? 0),
            0
          );
          const nudge = !off && highlight === id;

          return (
            <div
              key={need}
              className={cn(DARK_ROW, "flex items-center gap-3 py-2 pl-4 pr-2")}
            >
              <div className="min-w-0 flex-1">
                <p className="mb-1.5 flex items-center gap-1.5 text-sm font-extrabold text-white/90 md:text-base">
                  <span className="text-lg leading-none" aria-hidden>
                    {NEED_EMOJI[need]}
                  </span>
                  {NEED_LABEL[need]}
                  {critical && (
                    <span className="text-base leading-none" role="img" aria-label="Bijna leeg">
                      ❗
                    </span>
                  )}
                </p>
                <div
                  className="h-4 w-full overflow-hidden rounded-full border border-[#3b2d71] bg-[#2d1b54]"
                  role="meter"
                  aria-label={NEED_LABEL[need]}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(value)}
                >
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      BAR_COLOR[need],
                      critical && 'animate-pulse'
                    )}
                    style={{ width: `${Math.max(3, value)}%` }}
                  />
                </div>
              </div>

              <button
                type="button"
                disabled={off}
                onClick={() => setOpen(id)}
                className={cn(
                  'relative flex min-h-16 w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-white shadow-lg transition-transform active:scale-95 disabled:opacity-40 md:w-28',
                  ACTION_STYLE[id],
                  nudge && 'animate-care-nudge ring-4 ring-amber-300'
                )}
              >
                <span className="text-2xl leading-none" aria-hidden>
                  {a.emoji}
                </span>
                <span className="text-sm font-extrabold leading-none">{a.label}</span>
                {!off && pointAt === id && (
                  <span
                    className="pointer-events-none absolute -bottom-10 left-1/2 z-10 -translate-x-1/2 animate-bounce text-4xl drop-shadow-lg"
                    aria-hidden
                  >
                    👆
                  </span>
                )}
                {owned > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-1 text-xs font-extrabold text-foreground shadow">
                    {owned}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>

      <Dialog open={open !== null} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className={cn(DARK_DIALOG, "max-h-[90vh] overflow-y-auto")}>
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold text-white">
              {action?.emoji} {action?.label}
            </DialogTitle>
            <DialogDescription className="text-base text-[#a78bfa]">
              {open === 'sleep'
                ? 'Slapen is gratis. Met een dekentje of kussen is je Buddy sneller uitgerust.'
                : 'Kies wat je wil geven.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {open === 'sleep' && (
              <button
                type="button"
                onClick={() => choose(() => care('sleep'))}
                className="flex min-h-16 w-full items-center gap-3 rounded-2xl bg-edu-purple px-4 py-3 text-left text-white shadow-md active:scale-[0.98]"
              >
                <span className="text-3xl leading-none">🌙</span>
                <span className="flex-1">
                  <span className="block text-base font-extrabold">Gewoon slapen</span>
                  <span className="block text-xs opacity-90">Gratis, duurt 30 minuten</span>
                </span>
              </button>
            )}

            {open &&
              items.map((item) => {
                const count = buddy.inventory[item.id] ?? 0;
                const affordable = buddy.munten >= item.price;
                const usable = count > 0 || affordable;
                const run =
                  count > 0 ? () => care(open, item.id) : () => buyAndCare(open, item.id);

                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={!usable}
                    onClick={() => choose(run)}
                    aria-label={
                      count > 0
                        ? `${USE_VERB[open]} ${item.name}, je hebt er ${count}`
                        : affordable
                          ? `Koop ${item.name} voor ${item.price} Munten en gebruik het meteen`
                          : `${item.name} kost ${item.price} Munten, je hebt er nog ${item.price - buddy.munten} nodig`
                    }
                    className={cn(DARK_ROW, "flex min-h-16 w-full items-center gap-3 px-3 py-2.5 text-left transition hover:border-violet-400/50 active:scale-[0.98] disabled:opacity-50")}
                  >
                    <span className="text-3xl leading-none" aria-hidden>
                      {item.emoji}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-extrabold leading-tight text-white">
                        {item.name}
                      </span>
                      <span className="block text-xs text-[#a78bfa]">{item.description}</span>
                    </span>
                    {count > 0 ? (
                      <span
                        className={cn(
                          'flex shrink-0 flex-col items-center rounded-xl px-3 py-1.5 text-white',
                          ACTION_STYLE[open]
                        )}
                        aria-hidden
                      >
                        <span className="text-sm font-black leading-tight">{USE_VERB[open]}</span>
                        <span className="text-[11px] font-bold leading-tight opacity-90">je hebt {count}</span>
                      </span>
                    ) : affordable ? (
                      <span
                        className="flex shrink-0 flex-col items-center rounded-xl bg-edu-green px-3 py-1.5 text-white"
                        aria-hidden
                      >
                        <span className="text-[11px] font-bold leading-tight">Koop en {USE_VERB[open].toLowerCase()}</span>
                        <span className="text-sm font-black leading-tight tabular-nums">🪙 {item.price}</span>
                      </span>
                    ) : (
                      <span
                        className="shrink-0 rounded-xl bg-[#2d1b54] px-3 py-2 text-sm font-black text-[#9d8bce]"
                        aria-hidden
                      >
                        Nog <span className="tabular-nums">{item.price - buddy.munten}</span> 🪙
                      </span>
                    )}
                  </button>
                );
              })}

            {open && open !== 'sleep' && !canDoAnything ? (
              <Link
                to={APP_PATHS.practice}
                onClick={() => setOpen(null)}
                className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 border-emerald-300/40 bg-gradient-to-br from-emerald-500 to-cyan-500 px-4 py-3 text-base font-black text-white shadow-md"
              >
                <Sparkles className="h-5 w-5" aria-hidden />
                Oefenen en 🪙 verdienen
                <ChevronRight className="h-5 w-5" aria-hidden />
              </Link>
            ) : (
              <Link
                to={`${APP_PATHS.shop}?cat=${action?.category ?? 'food'}`}
                onClick={() => setOpen(null)}
                className={cn(DARK_ROW, "block px-4 py-3 text-center text-sm font-extrabold text-white/90")}
              >
                🛍️ Naar de Winkel →
              </Link>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
