/*
 * Pictures of a number, for exercises that show "how many" next to a sum.
 * Up to 20 the child can count things one by one; above 20 (2de leerjaar)
 * tens become rods so the picture stays countable.
 */
import { GETALBEELD_GRID, inTens } from '@/lib/getalbeeld';

/** Above 20: one rod of ten per ten, the units as a getalbeeld. */
export function TensAndOnes({ count }: { count: number }) {
  const tens = Math.floor(count / 10);
  const ones = count % 10;
  return (
    <div className="flex items-end gap-1.5" aria-label={countLabel(count)}>
      {Array.from({ length: tens }).map((_, t) => (
        <div key={t} className="flex flex-col gap-0.5 p-0.5 rounded-md bg-orange-600/40 border border-orange-600">
          {Array.from({ length: 10 }).map((__, b) => (
            <div key={b} className="w-3 h-2 rounded-[2px] bg-gradient-to-br from-orange-400 to-orange-500" />
          ))}
        </div>
      ))}
      {ones > 0 && (
        <div className={`${GETALBEELD_GRID} gap-1 ml-1.5`}>
          {Array.from({ length: ones }).map((_, o) => (
            <div key={o} className="w-3.5 h-3.5 rounded-[3px] bg-gradient-to-br from-orange-400 to-orange-500 border border-orange-600" />
          ))}
        </div>
      )}
    </div>
  );
}

export function countLabel(count: number): string {
  if (count > 20) {
    const tens = Math.floor(count / 10);
    const ones = count % 10;
    return `${tens} tientallen en ${ones} ${ones === 1 ? 'eenheid' : 'eenheden'}`;
  }
  return `${count} ${count === 1 ? 'stip' : 'stippen'}`;
}

/**
 * Up to 20 things (one emoji) as getalbeelden, one per ten, so the child can
 * count them; above 20 the tens rods.
 */
export function ObjectsPicture({ count, emoji, label }: { count: number; emoji: string; label: string }) {
  if (count > 20) return <TensAndOnes count={count} />;
  return (
    <div className="flex flex-wrap items-start justify-center gap-4" role="img" aria-label={label} data-testid="count-picture">
      {inTens(count).map((size, g) => (
        <div key={g} className={`${GETALBEELD_GRID} gap-1.5 md:gap-2`}>
          {Array.from({ length: size }).map((_, i) => (
            <span key={i} className="text-3xl md:text-4xl leading-none" aria-hidden="true">{emoji}</span>
          ))}
        </div>
      ))}
    </div>
  );
}
