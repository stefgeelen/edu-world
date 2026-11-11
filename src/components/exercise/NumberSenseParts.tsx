import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { GETALBEELD_GRID } from '@/lib/getalbeeld';
import { hundredGridCell, type LooseDot } from '@/lib/numberSense';

/*
 * The pictures of Getallen tot 100 (ExerciseNumberSense): the honderdveld,
 * the field of loose dots to group per ten, the H | T | E columns, and the
 * answer box. Gold is the child's own colouring; green and red stay for the
 * answer (design-system.md).
 */

type Status = 'idle' | 'correct' | 'incorrect';

// ── Honderdveld ───────────────────────────────────────────────────────────

/**
 * 10 × 10 squares with the thick cross through the middle, as on the class
 * sheet. Shows a picture in one square (`thing`), or the first `painted`
 * squares in gold. With `onPaint` the child colours: tapping or dragging to a
 * square colours everything up to and including it; tapping the last
 * coloured square again takes that one off.
 */
export function HundredGrid({
  thing,
  painted = 0,
  onPaint,
  status = 'idle',
  className,
  style,
}: {
  thing?: { number: number; emoji: string };
  painted?: number;
  onPaint?: (count: number) => void;
  status?: Status;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const lastCell = useRef(0);
  const thingCell = thing ? hundredGridCell(thing.number) : null;

  const cellAt = (e: React.PointerEvent): number | null => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return null;
    const col = Math.floor(((e.clientX - rect.left) / rect.width) * 10);
    const row = Math.floor(((e.clientY - rect.top) / rect.height) * 10);
    if (col < 0 || col > 9 || row < 0 || row > 9) return null;
    return row * 10 + col + 1;
  };

  const down = (e: React.PointerEvent) => {
    if (!onPaint) return;
    e.stopPropagation();
    const n = cellAt(e);
    if (n === null) return;
    dragging.current = true;
    lastCell.current = n;
    ref.current?.setPointerCapture?.(e.pointerId);
    onPaint(n === painted ? n - 1 : n);
  };

  const move = (e: React.PointerEvent) => {
    if (!onPaint || !dragging.current) return;
    const n = cellAt(e);
    if (n === null || n === lastCell.current) return;
    lastCell.current = n;
    onPaint(n);
  };

  const up = () => { dragging.current = false; };

  const paintBorder =
    status === 'correct' ? 'border-emerald-400' : status === 'incorrect' ? 'border-orange-400' : 'border-[#c9bdf0]';

  return (
    <div
      ref={ref}
      data-testid="hundred-grid"
      role={onPaint ? 'grid' : 'img'}
      aria-label={onPaint ? `Honderdveld, ${painted} vakjes gekleurd` : 'Honderdveld'}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onClick={onPaint ? (e) => e.stopPropagation() : undefined}
      className={cn(
        'grid grid-cols-10 aspect-square rounded-md border-[3px] bg-[#f8f5ff] select-none overflow-hidden',
        paintBorder,
        onPaint && 'cursor-pointer touch-none',
        className,
      )}
      style={style}
    >
      {Array.from({ length: 100 }).map((_, i) => {
        const row = Math.floor(i / 10);
        const col = i % 10;
        const isThing = thingCell && thingCell.row === row && thingCell.col === col;
        return (
          <div
            key={i}
            data-cell={i + 1}
            data-painted={i < painted ? 'true' : undefined}
            className={cn(
              'relative flex items-center justify-center border-[#5b4a96]',
              col < 9 && (col === 4 ? 'border-r-[3px] border-r-[#1a103c]' : 'border-r'),
              row < 9 && (row === 4 ? 'border-b-[3px] border-b-[#1a103c]' : 'border-b'),
              i < painted && 'bg-gradient-to-br from-amber-300 to-amber-400',
            )}
          >
            {isThing && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-[min(5.5vw,1.6rem)] leading-none"
                data-testid="grid-thing"
                aria-hidden
              >
                {thing!.emoji}
              </motion.span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Losse stippen, groepjes van 10 ────────────────────────────────────────

/** Group colours: no green or red, those mean right and wrong. */
const GROUP_COLORS = [
  'bg-sky-400 border-sky-600',
  'bg-amber-400 border-amber-600',
  'bg-violet-400 border-violet-600',
  'bg-pink-400 border-pink-600',
  'bg-cyan-300 border-cyan-500',
  'bg-orange-400 border-orange-600',
  'bg-fuchsia-400 border-fuchsia-600',
  'bg-yellow-300 border-yellow-500',
  'bg-indigo-400 border-indigo-600',
];

/**
 * The loose dots. `groupOf[i]` is the group a dot belongs to (null: loose),
 * `selected` the dots of the group being made. Tapping a dot calls `onTap`;
 * dragging from a loose dot over others calls `onSweep` for each new one.
 */
export function LooseDotsField({
  cols,
  rows,
  dots,
  groupOf,
  selected,
  onTap,
  onSweep,
  disabled,
}: {
  cols: number;
  rows: number;
  dots: LooseDot[];
  groupOf: (number | null)[];
  selected: number[];
  onTap: (i: number) => void;
  onSweep: (i: number) => void;
  disabled?: boolean;
}) {
  const sweeping = useRef(false);
  const swept = useRef(new Set<number>());

  const dotAt = (e: React.PointerEvent): number | null => {
    const el = document.elementFromPoint?.(e.clientX, e.clientY) as HTMLElement | null;
    const idx = el?.closest<HTMLElement>('[data-dot]')?.dataset.dot;
    return idx === undefined ? null : Number(idx);
  };

  const down = (i: number) => (e: React.PointerEvent) => {
    e.stopPropagation();
    if (disabled) return;
    // A touch is captured by the dot it starts on; let go, so the sweep
    // reaches the other dots. A mouse is never captured (release would throw).
    const target = e.target as HTMLElement;
    if (target.hasPointerCapture?.(e.pointerId)) target.releasePointerCapture(e.pointerId);
    sweeping.current = groupOf[i] === null && !selected.includes(i);
    swept.current = new Set([i]);
    onTap(i);
  };

  const move = (e: React.PointerEvent) => {
    if (!sweeping.current || disabled) return;
    const i = dotAt(e);
    if (i === null || swept.current.has(i)) return;
    swept.current.add(i);
    onSweep(i);
  };

  const stop = () => { sweeping.current = false; };

  return (
    <div
      data-testid="loose-dots"
      className="relative w-full touch-none select-none rounded-3xl bg-[#0f0828]/60 border-2 border-[#3b2d71]"
      style={{ aspectRatio: `${cols} / ${rows}`, maxWidth: `min(100%, ${cols * 3.4}rem)` }}
      onPointerMove={move}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onClick={(e) => e.stopPropagation()}
    >
      {dots.map((d, i) => {
        const group = groupOf[i];
        const isSelected = selected.includes(i);
        return (
          <button
            key={i}
            type="button"
            data-dot={i}
            data-group={group ?? undefined}
            data-selected={isSelected ? 'true' : undefined}
            aria-label={group !== null ? `Stip in groepje ${group + 1}` : isSelected ? 'Gekozen stip' : 'Stip'}
            onPointerDown={down(i)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTap(i); } }}
            className="absolute flex items-center justify-center -translate-x-1/2 -translate-y-1/2 max-w-[2.6rem] aspect-square"
            style={{
              // Inside a margin, so no dot touches the edge.
              left: `${4 + ((d.col + 0.5 + d.dx) / cols) * 92}%`,
              top: `${4 + ((d.row + 0.5 + d.dy) / rows) * 92}%`,
              width: `${60 / cols}%`,
            }}
          >
            <span
              className={cn(
                'block w-full aspect-square rounded-full border-2 transition-transform',
                group !== null
                  ? GROUP_COLORS[group % GROUP_COLORS.length]
                  : isSelected
                    ? 'bg-white border-amber-400 ring-4 ring-amber-400/60 scale-110'
                    : 'bg-[#c9bdf0] border-[#9d8bce]',
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

// ── H | T | E ─────────────────────────────────────────────────────────────

/**
 * Three columns as on the class sheet: H (honderdtallen, empty for now),
 * T with a rod per ten, E with a block per unit as a getalbeeld.
 */
export function PlaceValueColumns({ number }: { number: number }) {
  const tens = Math.floor(number / 10);
  const ones = number % 10;
  const head = 'py-1.5 text-center text-lg md:text-xl font-black text-[#1a103c] border-b-2 border-[#1a103c]';
  const cell = 'flex items-center justify-center p-2 md:p-3 min-h-[11rem] md:min-h-[13rem] short:min-h-[9rem]';
  return (
    <div
      className="grid grid-cols-3 w-full max-w-sm rounded-xl bg-[#f8f5ff] border-2 border-[#1a103c] overflow-hidden"
      role="img"
      aria-label={`${tens} ${tens === 1 ? 'tiental' : 'tientallen'} en ${ones} ${ones === 1 ? 'eenheid' : 'eenheden'}`}
      data-testid="place-value"
    >
      <div className={head}>H</div>
      <div className={cn(head, 'border-x-2')}>T</div>
      <div className={head}>E</div>
      <div className={cell} />
      <div className={cn(cell, 'border-x-2 border-[#1a103c]')}>
        <div className="flex flex-col gap-1.5" data-testid="tens-rods">
          {Array.from({ length: tens }).map((_, t) => (
            <div key={t} className="flex gap-px p-px rounded-sm bg-[#1a103c]">
              {Array.from({ length: 10 }).map((__, s) => (
                <div key={s} className="w-[0.4rem] md:w-2 h-2.5 md:h-3 bg-[#2d1b54]" />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className={cell}>
        {ones > 0 && (
          <div className={`${GETALBEELD_GRID} gap-1`} data-testid="ones-blocks">
            {Array.from({ length: ones }).map((_, o) => (
              <div key={o} className="w-3.5 h-3.5 md:w-4 md:h-4 rounded-[2px] bg-[#1a103c]" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Antwoordvak ───────────────────────────────────────────────────────────

/** The box the child types in (the numpad fills it), coloured by the answer. */
export function AnswerBox({
  value,
  status,
  active = true,
  disabled,
  label,
  onClick,
  small,
}: {
  value: string;
  status: Status;
  active?: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  small?: boolean;
}) {
  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      animate={status === 'incorrect' ? { x: [-5, 5, -4, 4, -2, 2, 0] } : { scale: 1 }}
      aria-label={label}
      className={cn(
        'rounded-2xl flex items-center justify-center border-2 transition-colors',
        small ? 'min-w-[4.5rem] h-16 md:h-20 px-2' : 'min-w-[5.5rem] md:min-w-[7.5rem] h-20 md:h-24 px-3',
        disabled ? 'bg-[#1c1134] border-[#3b2d71] text-[#3b2d71]' :
        status === 'correct' ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300' :
        status === 'incorrect' ? 'bg-orange-500/20 border-orange-400 text-orange-300' :
        value && !active ? 'bg-purple-500/70 border-purple-700 text-white' :
        value ? 'bg-purple-500 border-purple-700 text-white' :
        active ? 'bg-[#2d1b54]/40 border-dashed border-amber-300 text-[#a78bfa]/60' :
        'bg-[#2d1b54]/40 border-dashed border-[#a78bfa] text-[#a78bfa]/60',
      )}
    >
      <span className={cn('font-black', small ? 'text-4xl md:text-5xl' : 'text-5xl md:text-6xl')}>{value || '?'}</span>
    </motion.button>
  );
}
