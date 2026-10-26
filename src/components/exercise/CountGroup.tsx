import React from 'react';
import { cn } from '@/lib/utils';
import { GETALBEELD_GRID } from '@/lib/getalbeeld';
import type { Group } from '@/lib/kleuterRekenen';

/** Waar de stippen van een dobbelsteen staan, op een raster van 3 × 3 (0..8). */
const DICE_PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

/**
 * Een groepje om te tellen (3de kleuterklas): losse voorwerpen in rijen van
 * hoogstens 5, een dobbelsteen (tot 6) of een getalbeeld zoals in de klas.
 * `size` 'md' is voor meer groepjes op één scherm. `thingClassName` geeft
 * losse voorwerpen een andere maat; geef groepjes die het kind vergelijkt
 * altijd dezelfde, anders lijkt het groepje met grotere prentjes "meer".
 */
export function CountGroup({
  group,
  size = 'lg',
  className,
  thingClassName,
}: {
  group: Group;
  size?: 'md' | 'lg';
  className?: string;
  thingClassName?: string;
}) {
  const md = size === 'md';
  const label = `${group.count}`;

  if (group.look === 'dice' && DICE_PIPS[group.count]) {
    const pips = new Set(DICE_PIPS[group.count]);
    return (
      <div
        data-count={label}
        className={cn(
          'grid grid-cols-3 grid-rows-3 rounded-2xl bg-white shadow-lg ring-4 ring-white/20',
          md ? 'w-28 h-28 p-3 gap-1.5' : 'w-36 h-36 p-4 gap-2',
          className,
        )}
      >
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} className="flex items-center justify-center">
            {pips.has(i) && <div className={cn('rounded-full bg-[#1a103c]', md ? 'w-5 h-5' : 'w-6 h-6')} />}
          </div>
        ))}
      </div>
    );
  }

  if (group.look === 'getalbeeld') {
    return (
      <div data-count={label} className={cn(GETALBEELD_GRID, 'w-fit', md ? 'gap-2' : 'gap-3', className)}>
        {Array.from({ length: group.count }, (_, i) => (
          <div
            key={i}
            className={cn('rounded-full bg-gradient-to-br from-amber-300 to-orange-400 shadow', md ? 'w-6 h-6' : 'w-9 h-9')}
          />
        ))}
      </div>
    );
  }

  // Losse voorwerpen: rijen van hoogstens 5, zodat ze goed te tellen zijn.
  const rows: number[] = [];
  for (let left = group.count; left > 0; left -= 5) rows.push(Math.min(5, left));
  return (
    <div data-count={label} className={cn('flex flex-col items-center', md ? 'gap-1' : 'gap-2', className)}>
      {rows.map((n, r) => (
        <div key={r} className={cn('flex', md ? 'gap-0.5' : 'gap-2')}>
          {Array.from({ length: n }, (_, i) => (
            <span key={i} aria-hidden className={cn('leading-none select-none', md ? 'text-2xl' : 'text-5xl', thingClassName)}>
              {group.thing.emoji}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Een klein getalbeeld onder een cijfer, zodat een kleuter het cijfer niet hoeft te kennen. */
export function MiniDots({ count }: { count: number }) {
  return (
    <div className={cn(GETALBEELD_GRID, 'w-fit gap-0.5')} aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      ))}
    </div>
  );
}
