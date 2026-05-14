import React from 'react';

interface KwadraatGridProps {
  /** Number of filled dots in this grid (1–10) */
  count: number;
  /**
   * Combined fill-index offset. 0 for first grid, 10 for second.
   * Used only when crossedOut > 0 in multi-grid scenarios.
   */
  offset?: number;
  /**
   * Total dots across all grids (used to compute cross threshold).
   * Defaults to `count` for single-grid usage.
   */
  total?: number;
  /** How many dots are crossed out from the right across all grids */
  crossedOut?: number;
  /** Tailwind classes for filled dots */
  filledClassName?: string;
  /** Tailwind classes for crossed dots */
  crossedClassName?: string;
  /** Tailwind size classes for each dot */
  dotSizeClassName?: string;
}

/**
 * Renders a kwadraatbeelden grid: 2 rows × 5 columns, filled column-by-column
 * left-to-right (top cell first, then bottom). Only filled positions are visible —
 * empty positions are not rendered. Dots are removed right-to-left when crossedOut > 0.
 */
export function KwadraatGrid({
  count,
  offset = 0,
  total,
  crossedOut = 0,
  filledClassName = 'bg-gradient-to-br from-orange-400 to-orange-500 border-orange-600 shadow-sm',
  crossedClassName = 'bg-gradient-to-br from-slate-400 to-slate-500 border-slate-600 opacity-50',
  dotSizeClassName = 'w-9 h-9',
}: KwadraatGridProps) {
  const effectiveTotal = total ?? count;
  const crossThreshold = effectiveTotal - crossedOut;

  return (
    <div className="grid grid-rows-2 grid-flow-col gap-2">
      {Array.from({ length: count }).map((_, j) => {
        const combinedIndex = offset + j;
        const isCrossed = crossedOut > 0 && combinedIndex >= crossThreshold;
        return (
          <div
            key={j}
            className={`${dotSizeClassName} rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isCrossed ? crossedClassName : filledClassName}`}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-white/40" />
          </div>
        );
      })}
    </div>
  );
}
