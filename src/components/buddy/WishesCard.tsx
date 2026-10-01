import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePracticeMenu } from '@/hooks/usePracticeMenu';
import { ExerciseTypeIcon } from '@/components/buddy/ExerciseTypeIcon';
import { MuntenChip } from '@/components/buddy/MuntenChip';

/**
 * The Buddy's Wishes for today: a few types of exercise, each worth a bonus the
 * first time today. Tapping one starts that exercise straight away.
 */
export function WishesCard({ buddyName }: { buddyName: string }) {
  const navigate = useNavigate();
  const { data: menu } = usePracticeMenu();

  if (!menu || menu.wishes.length === 0) return null;
  const done = menu.wishes.filter((w) => w.fulfilled).length;
  const allDone = done === menu.wishes.length;

  return (
    <section className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" aria-labelledby="wishes-title">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-sm" aria-hidden>
          <Star className="h-5 w-5 fill-white text-white" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="wishes-title" className="text-base font-black leading-tight text-slate-900">
            {allDone ? 'Alle wensen vervuld!' : `Wensen van ${buddyName}`}
          </h2>
          <p className="text-xs font-semibold text-slate-500">
            {done} / {menu.wishes.length} vervuld
          </p>
        </div>
      </div>

      <ul className="space-y-2">
        {menu.wishes.map((wish) => (
          <li key={wish.type_key}>
            <button
              type="button"
              disabled={wish.fulfilled}
              onClick={() => navigate(`/app${wish.route}`)}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl border p-2 pr-3 text-left transition-all',
                wish.fulfilled
                  ? 'border-emerald-200 bg-emerald-50'
                  : 'border-slate-200 bg-slate-50 hover:border-amber-300 hover:bg-amber-50 active:scale-[0.99]'
              )}
            >
              <ExerciseTypeIcon typeKey={wish.type_key} subject={wish.subject} size="sm" muted={wish.fulfilled} />
              <span className={cn('flex-1 text-sm font-bold', wish.fulfilled ? 'text-emerald-700 line-through decoration-emerald-400/50' : 'text-slate-800')}>
                {wish.title}
              </span>
              {wish.fulfilled ? (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white" aria-label="Vervuld">
                  <Check className="h-4 w-4" strokeWidth={3} />
                </span>
              ) : (
                <>
                  <MuntenChip amount={`+${menu.wish_bonus}`} label={`+${menu.wish_bonus} Munten`} />
                  <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden />
                </>
              )}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
