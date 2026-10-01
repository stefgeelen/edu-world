import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Sparkles } from 'lucide-react';
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
    <main className="h-full w-full overflow-y-auto pb-32">
      <div className="mx-auto w-full max-w-md px-4 pt-5 md:max-w-2xl">
        <header className="flex items-center justify-between">
          <Link
            to={APP_PATHS.home}
            className="flex min-h-12 items-center gap-1.5 rounded-2xl bg-white px-4 py-2 text-base font-extrabold text-foreground shadow-sm active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" /> Terug
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

        <h1 className="mt-4 text-2xl font-black text-foreground">Winkel</h1>
        <p className="text-sm text-muted-foreground">Tik op iets om het te kopen. Elk ding gebruik je één keer.</p>

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
                  active ? cn(c.accent, 'text-white shadow-lg') : 'bg-white text-foreground shadow-sm ring-1 ring-black/5'
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
                className="relative flex flex-col items-center rounded-3xl bg-white px-3 pb-3 pt-4 text-center shadow-sm ring-1 ring-black/5 transition active:scale-95"
              >
                {owned > 0 && (
                  <span className="absolute right-2 top-2 rounded-full bg-edu-green px-2 py-0.5 text-xs font-black text-white">
                    je hebt {owned}
                  </span>
                )}
                <span className="text-5xl leading-none" aria-hidden>
                  {item.emoji}
                </span>
                <span className="mt-2 text-base font-extrabold leading-tight text-foreground">{item.name}</span>
                <Hearts count={heartsFor(item)} className="mt-1 text-base" />
                <span
                  className={cn(
                    'mt-2 flex w-full items-center justify-center gap-1.5 rounded-2xl px-3 py-2.5 text-base font-black',
                    affordable ? 'bg-edu-green text-white shadow-md' : 'bg-muted text-muted-foreground'
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
          className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-3xl bg-edu-yellow px-4 py-2.5 text-base font-black text-foreground shadow-md active:scale-[0.98]"
        >
          <Sparkles className="h-5 w-5" aria-hidden />
          Oefenen en 🪙 verdienen
          <ChevronRight className="h-5 w-5" aria-hidden />
        </Link>
      </div>

      <Dialog open={chosen !== null} onOpenChange={(v) => !v && close()}>
        <DialogContent className="rounded-3xl text-center">
          {chosen && (
            <div className="flex flex-col items-center">
              <span className={cn('text-7xl leading-none', bought && 'animate-buddy-boop')} aria-hidden>
                {chosen.emoji}
              </span>
              <DialogTitle className="mt-3 text-2xl font-black">
                {bought ? `Gekocht! 🎉` : chosen.name}
              </DialogTitle>
              <DialogDescription className="mt-1 text-base">
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
                      className="min-h-12 w-full rounded-2xl bg-muted px-4 py-3 text-base font-extrabold text-foreground"
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
                      className="min-h-12 w-full rounded-2xl bg-muted px-4 py-3 text-base font-extrabold text-foreground"
                    >
                      Nee
                    </button>
                  </>
                ) : (
                  <>
                    <p className="rounded-2xl bg-muted px-4 py-3 text-base font-extrabold text-muted-foreground">
                      Je hebt nog <span className="tabular-nums">{chosen.price - buddy.munten}</span> 🪙 nodig.
                    </p>
                    <Link
                      to={APP_PATHS.practice}
                      className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-edu-yellow px-4 py-3 text-lg font-black text-foreground shadow-md"
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
