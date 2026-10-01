import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePracticeMenu } from '@/hooks/usePracticeMenu';
import { exerciseTypeEmoji } from '@/data/exerciseTypes';

/**
 * The Buddy's Wishes for today: a few types of exercise, each worth a bonus the
 * first time today. Tapping one starts that exercise straight away.
 */
export function WishesCard({ buddyName }: { buddyName: string }) {
  const navigate = useNavigate();
  const { data: menu } = usePracticeMenu();

  if (!menu || menu.wishes.length === 0) return null;
  const allDone = menu.wishes.every((w) => w.fulfilled);

  return (
    <section className="mt-4 rounded-3xl bg-white p-4 shadow-md" aria-labelledby="wishes-title">
      <h2 id="wishes-title" className="text-base font-black text-foreground">
        ⭐ {allDone ? `Alle wensen vervuld!` : `Wensen van ${buddyName}`}
      </h2>
      <ul className="mt-2 space-y-2">
        {menu.wishes.map((wish) => (
          <li key={wish.type_key}>
            <button
              type="button"
              disabled={wish.fulfilled}
              onClick={() => navigate(`/app${wish.route}`)}
              className={cn(
                'flex min-h-14 w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition active:scale-[0.98]',
                wish.fulfilled ? 'bg-emerald-50' : 'bg-amber-50 ring-2 ring-edu-yellow'
              )}
            >
              <span className="text-3xl leading-none" aria-hidden>
                {exerciseTypeEmoji(wish.type_key, wish.subject)}
              </span>
              <span className={cn('flex-1 text-base font-extrabold', wish.fulfilled ? 'text-emerald-700' : 'text-foreground')}>
                {wish.title}
              </span>
              {wish.fulfilled ? (
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-white" aria-label="Vervuld">
                  <Check className="h-5 w-5" strokeWidth={3} />
                </span>
              ) : (
                <span className="rounded-full bg-edu-yellow px-2.5 py-1 text-sm font-black text-foreground">
                  +{menu.wish_bonus} 🪙
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
