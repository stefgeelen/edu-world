import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import {
  CARE_ACTIONS,
  itemsByCategory,
  type CareActionId,
  type CareItem,
  type CareItemCategory,
} from '@/lib/buddy/catalog';
import { useBuddy } from '@/hooks/useBuddy';
import { cn } from '@/lib/utils';
import { APP_PATHS } from '@/routes/paths';
import { Ornaments, StarryBackground } from '@/components/dashboard/Vitrine';
import { DARK_DIALOG, DARK_ROW, VITRINE } from '@/components/dashboard/vitrineStyles';

/** Tabbladen van de Winkel, met korte kinderwoorden in plaats van de catalogusnamen. */
const CATEGORIES: { id: CareItemCategory; emoji: string; label: string; accent: string }[] = [
  { id: 'food', emoji: '🍽️', label: 'Eten', accent: 'bg-edu-orange' },
  { id: 'toy', emoji: '🎈', label: 'Spelen', accent: 'bg-edu-pink' },
  { id: 'sleep-comfort', emoji: '🌙', label: 'Slapen', accent: 'bg-edu-purple' },
  { id: 'medicine', emoji: '💊', label: 'Medicijn', accent: 'bg-edu-teal' },
  { id: 'hygiene', emoji: '🫧', label: 'Wassen', accent: 'bg-edu-blue' },
];

const isCategory = (v: string | null): v is CareItemCategory => CATEGORIES.some((c) => c.id === v);

/** De Care Action waarmee een item uit deze categorie gebruikt wordt. */
const actionFor = (category: CareItemCategory) =>
  (Object.keys(CARE_ACTIONS) as CareActionId[]).find((id) => CARE_ACTIONS[id].category === category)!;

/** Kracht als 1-3 hartjes: de zwakste, middelste of sterkste van zijn categorie. */
function heartsFor(item: CareItem) {
  const ranked = [...itemsByCategory(item.category)].sort((a, b) => a.strength - b.strength);
  return ranked.findIndex((i) => i.id === item.id) + 1;
}

function Hearts({ count, className }: { count: number; className?: string }) {
  return (
    <span className={cn('tracking-tight', className)} role="img" aria-label={`Kracht ${count} van 3`}>
      {'💛'.repeat(count)}
      {'🤍'.repeat(3 - count)}
    </span>
  );
}

export function BuddyShop() {
  const { buddy, buy, buyPending } = useBuddy();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const requested = params.get('cat');
  const category: CareItemCategory = isCategory(requested) ? requested : 'food';
  const tab = CATEGORIES.find((c) => c.id === category)!;

  const [chosen, setChosen] = useState<CareItem | null>(null);
  const [bought, setBought] = useState(false);

  const close = () => {
    setChosen(null);
    setBought(false);
  };

  return (
    <main
      className="relative h-full w-full overflow-y-auto bg-gradient-to-b from-[#2d1b54] via-[#1a103c] to-[#0a0618] pb-32"
      style={{ fontFamily: "'Nunito', sans-serif" }}
    >
      <StarryBackground />
      <div className="relative z-10 mx-auto w-full max-w-md px-4 pt-4 sm:pt-6 md:max-w-2xl">
        <header className={cn(VITRINE, 'border-amber-400/30 p-3 shadow-[0_8px_32px_rgba(251,191,36,0.12)] sm:p-4')}>
          <Ornaments tone="border-amber-400/40" />
          <div className="relative z-10 flex items-center gap-3">
            <Link
              to={APP_PATHS.home}
              aria-label="Terug naar je Buddy"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[#3b2d71] bg-[#0f0828]/80 transition-all active:scale-95"
            >
              <ChevronLeft className="h-5 w-5 text-[#9d8bce]" strokeWidth={2.5} />
            </Link>
            <div className="min-w-0 flex-1">
              <p className="mb-0.5 text-[10px] font-bold uppercase leading-none tracking-widest text-amber-300/70">Elk ding gebruik je één keer</p>
              <h1 className="truncate bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 bg-clip-text text-lg font-black leading-tight text-transparent sm:text-xl">
                Winkel
              </h1>
            </div>
            <span
              className="flex shrink-0 items-center gap-1.5 rounded-full border-2 border-amber-500/40 bg-[#0f0828]/80 px-3 py-1.5"
              aria-label={`${buddy.munten} Munten`}
            >
              <span aria-hidden>🪙</span>
              <span className="text-sm font-black text-amber-200">{buddy.munten}</span>
            </span>
          </div>
        </header>

        <div role="tablist" aria-label="Soort" className="mt-4 grid grid-cols-5 gap-1.5 md:gap-2.5">
          {CATEGORIES.map((c) => {
            const active = c.id === category;
            return (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setParams({ cat: c.id }, { replace: true })}
                className={cn(
                  'flex min-h-[4.5rem] flex-col items-center justify-center gap-1 rounded-2xl px-0.5 py-2 transition active:scale-95',
                  active ? cn(c.accent, 'text-white shadow-lg ring-2 ring-white/30') : cn(DARK_ROW, 'text-white/80')
                )}
              >
                <span className="text-2xl leading-none md:text-3xl" aria-hidden>
                  {c.emoji}
                </span>
                <span className="text-xs font-extrabold leading-none md:text-sm">{c.label}</span>
              </button>
            );
          })}
        </div>

        <div role="tabpanel" aria-label={tab.label} className="mt-4 grid grid-cols-2 gap-2.5 md:grid-cols-3">
          {itemsByCategory(category).map((item) => {
            const owned = buddy.inventory[item.id] ?? 0;
            const affordable = buddy.munten >= item.price;
            const shortBy = item.price - buddy.munten;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setChosen(item)}
                aria-label={
                  affordable
                    ? `${item.name}, kost ${item.price} Munten`
                    : `${item.name} kost ${item.price} Munten, je hebt er nog ${shortBy} nodig`
                }
                className={cn(DARK_ROW, "relative flex flex-col items-center px-3 pb-3 pt-4 text-center transition hover:border-violet-400/50 active:scale-95")}
              >
                {owned > 0 && (
                  <span className="absolute right-2 top-2 rounded-full bg-edu-green px-2 py-0.5 text-xs font-black text-white">
                    je hebt {owned}
                  </span>
                )}
                <span className="text-5xl leading-none" aria-hidden>
                  {item.emoji}
                </span>
                <span className="mt-2 text-base font-extrabold leading-tight text-white/90">{item.name}</span>
                <Hearts count={heartsFor(item)} className="mt-1 text-base" />
                <span
                  className={cn(
                    'mt-2 flex w-full items-center justify-center gap-1.5 rounded-2xl px-3 py-2.5 text-base font-black',
                    affordable ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-md' : 'bg-[#2d1b54] text-[#9d8bce]'
                  )}
                  aria-hidden
                >
                  {affordable ? (
                    <>
                      <span className="text-lg">🪙</span>
                      <span className="tabular-nums">{item.price}</span>
                    </>
                  ) : (
                    <span className="text-sm">
                      Nog <span className="tabular-nums">{shortBy}</span> 🪙
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <Link
          to={APP_PATHS.practice}
          className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-3xl border-[3px] border-emerald-300/40 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 px-4 py-2.5 text-base font-black text-white shadow-[0_8px_32px_rgba(16,185,129,0.25)] active:scale-[0.98]"
        >
          <Sparkles className="h-5 w-5" aria-hidden />
          Oefenen en 🪙 verdienen
          <ChevronRight className="h-5 w-5" aria-hidden />
        </Link>
      </div>

      <Dialog open={chosen !== null} onOpenChange={(v) => !v && close()}>
        <DialogContent className={cn(DARK_DIALOG, "text-center")}>
          {chosen && (
            <div className="flex flex-col items-center">
              <span className={cn('text-7xl leading-none', bought && 'animate-buddy-boop')} aria-hidden>
                {chosen.emoji}
              </span>
              <DialogTitle className="mt-3 text-2xl font-black text-white">
                {bought ? `Gekocht! 🎉` : chosen.name}
              </DialogTitle>
              <DialogDescription className="mt-1 text-base text-[#a78bfa]">
                {bought ? `${chosen.name} zit in je voorraad.` : chosen.description}
              </DialogDescription>
              {!bought && <Hearts count={heartsFor(chosen)} className="mt-2 text-xl" />}

              <div className="mt-5 w-full space-y-2">
                {bought ? (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        navigate(APP_PATHS.home, {
                          state: { give: { action: actionFor(chosen.category), itemId: chosen.id } },
                        })
                      }
                      className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-edu-green px-4 py-3 text-lg font-black text-white shadow-md active:scale-[0.98]"
                    >
                      Geef aan {buddy.name} <ChevronRight className="h-5 w-5" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={close}
                      className={cn(DARK_ROW, "min-h-12 w-full px-4 py-3 text-base font-extrabold text-white/90")}
                    >
                      Nog iets kopen
                    </button>
                  </>
                ) : buddy.munten >= chosen.price ? (
                  <>
                    <button
                      type="button"
                      disabled={buyPending}
                      onClick={() => buy(chosen.id, () => setBought(true))}
                      className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-edu-green px-4 py-3 text-lg font-black text-white shadow-md active:scale-[0.98] disabled:opacity-60"
                    >
                      ✔️ Ja, kopen voor 🪙 <span className="tabular-nums">{chosen.price}</span>
                    </button>
                    <button
                      type="button"
                      onClick={close}
                      className={cn(DARK_ROW, "min-h-12 w-full px-4 py-3 text-base font-extrabold text-white/90")}
                    >
                      Nee
                    </button>
                  </>
                ) : (
                  <>
                    <p className={cn(DARK_ROW, "px-4 py-3 text-base font-extrabold text-[#9d8bce]")}>
                      Je hebt nog <span className="tabular-nums">{chosen.price - buddy.munten}</span> 🪙 nodig.
                    </p>
                    <Link
                      to={APP_PATHS.practice}
                      className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-emerald-300/40 bg-gradient-to-br from-emerald-500 to-cyan-500 px-4 py-3 text-lg font-black text-white shadow-md"
                    >
                      <Sparkles className="h-5 w-5" aria-hidden />
                      Oefenen en 🪙 verdienen
                    </Link>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
