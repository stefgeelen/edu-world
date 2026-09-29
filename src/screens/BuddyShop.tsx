import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Sparkles } from 'lucide-react';
import { CATEGORY_LABEL, itemsByCategory, type CareItemCategory } from '@/lib/buddy/catalog';
import { useBuddy } from '@/hooks/useBuddy';
import { cn } from '@/lib/utils';

const CATEGORIES: { id: CareItemCategory; emoji: string; accent: string }[] = [
  { id: 'food', emoji: '🍽️', accent: 'bg-edu-orange' },
  { id: 'toy', emoji: '🎈', accent: 'bg-edu-pink' },
  { id: 'sleep-comfort', emoji: '🌙', accent: 'bg-edu-purple' },
  { id: 'medicine', emoji: '💊', accent: 'bg-edu-teal' },
  { id: 'hygiene', emoji: '🫧', accent: 'bg-edu-blue' },
];

export function BuddyShop() {
  const { buddy, buy } = useBuddy();

  return (
    <main className="h-full w-full overflow-y-auto pb-32">
      <div className="mx-auto w-full max-w-md px-4 pt-5">
        <header className="flex items-center justify-between">
          <Link
            to="/app/buddy-room"
            className="flex min-h-12 items-center gap-1.5 rounded-2xl bg-white px-4 py-2 text-base font-extrabold text-foreground shadow-sm active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" /> Terug
          </Link>
          <div className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-sm">
            <span className="text-xl" aria-hidden>
              🪙
            </span>
            <span className="text-lg font-black text-foreground">{buddy.munten}</span>
          </div>
        </header>

        <h1 className="mt-4 text-2xl font-black text-foreground">Winkel</h1>
        <p className="text-sm text-muted-foreground">
          Koop iets en geef het aan je Buddy. Elk ding gebruik je één keer.
        </p>
        <Link
          to="/app/map"
          className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-3xl bg-edu-yellow px-4 py-2.5 text-base font-black text-foreground shadow-md active:scale-[0.98]"
        >
          <Sparkles className="h-5 w-5" aria-hidden />
          Oefenen en 🪙 verdienen
          <ChevronRight className="h-5 w-5" aria-hidden />
        </Link>

        <div className="mt-4 space-y-6">
          {CATEGORIES.map((cat) => (
            <section key={cat.id}>
              <h2 className="mb-2.5 flex items-center gap-2 px-1 text-sm font-black text-foreground">
                <span className={cn('rounded-xl px-2 py-1 text-white', cat.accent)}>{cat.emoji}</span>
                {CATEGORY_LABEL[cat.id]}
              </h2>
              <div className="grid grid-cols-2 gap-2.5">
                {itemsByCategory(cat.id).map((item) => {
                  const owned = buddy.inventory[item.id] ?? 0;
                  const affordable = buddy.munten >= item.price;
                  const shortBy = item.price - buddy.munten;
                  return (
                    <div
                      key={item.id}
                      className="relative flex flex-col items-center rounded-3xl bg-white px-3 pt-3 pb-2.5 text-center shadow-sm ring-1 ring-black/5"
                    >
                      {owned > 0 && (
                        <span className="absolute right-2 top-2 rounded-full bg-edu-green px-1.5 py-0.5 text-[10px] font-black text-white">
                          ×{owned}
                        </span>
                      )}
                      <span className="text-4xl leading-none" aria-hidden>
                        {item.emoji}
                      </span>
                      <p className="mt-1.5 text-sm font-extrabold leading-tight text-foreground">
                        {item.name}
                      </p>
                      <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                        {item.description}
                      </p>
                      <button
                        type="button"
                        onClick={() => buy(item.id)}
                        disabled={!affordable}
                        aria-label={
                          affordable
                            ? `Koop ${item.name} voor ${item.price} Munten`
                            : `${item.name} kost ${item.price} Munten, je hebt er nog ${shortBy} nodig`
                        }
                        className={cn(
                          'mt-2 flex w-full items-center justify-center gap-1.5 rounded-2xl px-3 py-2.5 text-base font-black shadow-md transition active:scale-95',
                          affordable
                            ? 'bg-edu-green text-white'
                            : 'bg-muted text-muted-foreground shadow-none'
                        )}
                      >
                        {affordable ? (
                          <>
                            <span className="text-lg" aria-hidden>🪙</span>
                            <span className="tabular-nums">{item.price}</span>
                          </>
                        ) : (
                          <span className="text-sm">
                            Nog <span className="tabular-nums">{shortBy}</span> 🪙
                          </span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
