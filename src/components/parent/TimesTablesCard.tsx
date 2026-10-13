import React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TABLE_STICKER_RUNS } from '@/data/difficultyConfig';
import { useTimesTables } from '@/hooks/useTimesTables';

const TABLES = Array.from({ length: 10 }, (_, i) => i + 1);

/**
 * The child's tables in the parent portal: a sticker per known table
 * (TABLE_STICKER_RUNS runs without a mistake), else how far along it is.
 * Shown from the 2de leerjaar on, or as soon as the child practised a table.
 */
export function TimesTablesCard({ childId, grade }: { childId: string; grade: number }) {
  const { data: progress = {}, isLoading } = useTimesTables(childId);
  const practised = Object.keys(progress).length > 0;
  if (isLoading || (grade < 2 && !practised)) return null;

  const known = Object.values(progress).filter((p) => p.sticker).length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-2">
        <h3 className="font-bold text-slate-900">Tafels</h3>
        <span className="text-xs font-bold text-slate-400">{known} van 10 gekend</span>
      </div>
      <div className="p-5 grid grid-cols-5 gap-2">
        {TABLES.map((table) => {
          const p = progress[table];
          const label = p?.sticker
            ? 'gekend'
            : p
            ? `${Math.min(p.flawlessRuns, TABLE_STICKER_RUNS)}/${TABLE_STICKER_RUNS} foutloos`
            : 'nog niet';
          return (
            <div
              key={table}
              className={cn(
                'relative rounded-xl border px-1 py-2 text-center',
                p?.sticker ? 'bg-amber-50 border-amber-200' : p ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-100',
              )}
              aria-label={`Tafel van ${table}: ${label}`}
            >
              {p?.sticker && <Star className="absolute -top-1.5 -right-1.5 w-4 h-4 text-amber-500 fill-amber-400" />}
              <p className={cn('text-lg font-black', p ? 'text-slate-900' : 'text-slate-300')}>{table}</p>
              <p className="text-[10px] font-bold text-slate-400 leading-tight">{label}</p>
            </div>
          );
        })}
      </div>
      <p className="px-5 pb-4 text-xs text-slate-400">
        Een tafel is gekend na {TABLE_STICKER_RUNS} keer zonder fout. Dan krijgt je kind er een sticker voor.
      </p>
    </div>
  );
}
