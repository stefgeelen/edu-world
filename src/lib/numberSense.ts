import { randomInt } from '@/lib/random';
import type { NumberSenseConfig } from '@/data/difficultyConfig';

/*
 * Getallen tot 100 (ExerciseNumberSense.tsx), 2de leerjaar, after the class
 * worksheet "Blok 3: Getallenkennis". Five kinds of question, each with its
 * own picture; the child picks one kind or "Door elkaar":
 *
 *   grid-find   a picture on the honderdveld: which number is that square?
 *   listen      the Buddy says a number; the child types it
 *   group-tens  loose dots: tap groups of ten, then fill in T and E
 *   place-value H | T | E columns with rods and blocks: which number?
 *   grid-color  a number: colour it on the honderdveld, row by row
 *
 * The honderdveld counts like the class one: 1–10 on the top row, 11–20 on
 * the second, …, 91–100 on the bottom row.
 */

export type NumberSenseKind = 'grid-find' | 'listen' | 'group-tens' | 'place-value' | 'grid-color';
export type NumberSenseMode = NumberSenseKind | 'mix';

export const NUMBER_SENSE_KINDS: NumberSenseKind[] = ['grid-find', 'listen', 'group-tens', 'place-value', 'grid-color'];

/** One loose dot of a group-tens question, in a cell of a cols × rows field, nudged by dx/dy (−0.25..0.25 of a cell). */
export interface LooseDot {
  col: number;
  row: number;
  dx: number;
  dy: number;
}

export type NumberSenseQuestion =
  | { kind: 'grid-find'; number: number; thing: GridThing }
  | { kind: 'listen'; number: number }
  | { kind: 'group-tens'; number: number; cols: number; rows: number; dots: LooseDot[] }
  | { kind: 'place-value'; number: number }
  | { kind: 'grid-color'; number: number };

export interface GridThing {
  emoji: string;
  /** "de ster", for the Buddy's question. */
  name: string;
}

export const GRID_THINGS: GridThing[] = [
  { emoji: '⭐', name: 'de ster' },
  { emoji: '❤️', name: 'het hartje' },
  { emoji: '🎵', name: 'de muzieknoot' },
  { emoji: '🍎', name: 'de appel' },
  { emoji: '⚽', name: 'de bal' },
  { emoji: '🐞', name: 'het lieveheersbeestje' },
  { emoji: '🌸', name: 'de bloem' },
  { emoji: '🚗', name: 'de auto' },
];

/** Questions in one run, per kind. Grouping takes longest, so fewer of those. */
export const RUN_LENGTH: Record<NumberSenseMode, number> = {
  'grid-find': 6,
  listen: 6,
  'group-tens': 4,
  'place-value': 6,
  'grid-color': 5,
  mix: 6,
};

// ── Honderdveld ───────────────────────────────────────────────────────────

/** Square of a number on the honderdveld, 0-based: 21 → row 2, col 0; 40 → row 3, col 9. */
export function hundredGridCell(n: number): { row: number; col: number } {
  return { row: Math.floor((n - 1) / 10), col: (n - 1) % 10 };
}

/** The number in a square of the honderdveld. */
export function hundredGridNumber(row: number, col: number): number {
  return row * 10 + col + 1;
}

// ── Getallen als woorden ──────────────────────────────────────────────────

const UNITS = ['', 'een', 'twee', 'drie', 'vier', 'vijf', 'zes', 'zeven', 'acht', 'negen'];
const TEENS = ['tien', 'elf', 'twaalf', 'dertien', 'veertien', 'vijftien', 'zestien', 'zeventien', 'achttien', 'negentien'];
const TENS = ['', '', 'twintig', 'dertig', 'veertig', 'vijftig', 'zestig', 'zeventig', 'tachtig', 'negentig'];

/**
 * A number from 0 to 100 as the Buddy says it: 47 → "zevenenveertig",
 * 22 → "tweeëntwintig". Words instead of digits, so the voice cannot misread.
 */
export function dutchNumberWord(n: number): string {
  if (n === 0) return 'nul';
  if (n === 100) return 'honderd';
  if (n < 10) return UNITS[n];
  if (n < 20) return TEENS[n - 10];
  const tens = TENS[Math.floor(n / 10)];
  const unit = UNITS[n % 10];
  if (!unit) return tens;
  // "tweeëntwintig", "drieëndertig": a trema where two e's would meet.
  return `${unit}${unit.endsWith('e') ? 'ën' : 'en'}${tens}`;
}

// ── Vragen ────────────────────────────────────────────────────────────────

function shuffled<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** `count` different numbers from min..max (fewer only if the range is smaller). */
function distinctNumbers(min: number, max: number, count: number): number[] {
  const all = Array.from({ length: Math.max(0, max - min + 1) }, (_, i) => min + i);
  return shuffled(all).slice(0, count);
}

/**
 * Loose dots for `count`, spread over a field with about a third of the cells
 * empty so it looks scattered, not like a getalbeeld. Never two in one cell.
 */
export function scatterDots(count: number): { cols: number; rows: number; dots: LooseDot[] } {
  const cols = count <= 30 ? 8 : 10;
  const rows = Math.max(3, Math.ceil((count * 1.35) / cols));
  const cells = shuffled(Array.from({ length: cols * rows }, (_, i) => i)).slice(0, count);
  const nudge = () => Math.round((Math.random() * 0.5 - 0.25) * 100) / 100;
  const dots = cells
    .sort((a, b) => a - b)
    .map((cell) => ({ col: cell % cols, row: Math.floor(cell / cols), dx: nudge(), dy: nudge() }));
  return { cols, rows, dots };
}

/**
 * The numbers of one kind, for a run. Ranges (with max = config.maxNumber):
 *   grid-find, grid-color  1..max (from 11 for colouring: tapping 3 squares teaches little)
 *   listen                 11..max (where tens and units are both heard)
 *   group-tens             21..maxDots (at least two groups to make)
 *   place-value            10..99 (H stays empty for now), at least one whole ten per run
 */
function numbersFor(kind: NumberSenseKind, count: number, config: NumberSenseConfig): number[] {
  const max = Math.min(100, Math.max(20, config.maxNumber));
  switch (kind) {
    case 'grid-find':
      return distinctNumbers(1, max, count);
    case 'grid-color':
    case 'listen':
      return distinctNumbers(11, max, count);
    case 'group-tens':
      return distinctNumbers(21, Math.min(99, Math.max(21, config.maxDots)), count);
    case 'place-value': {
      const top = Math.min(99, max);
      const numbers = distinctNumbers(10, top, count);
      if (count > 1 && !numbers.some((n) => n % 10 === 0)) {
        const tens = shuffled(Array.from({ length: Math.floor(top / 10) }, (_, i) => (i + 1) * 10));
        numbers[randomInt(0, numbers.length - 1)] = tens[0];
      }
      return numbers;
    }
  }
}

function questionFor(kind: NumberSenseKind, number: number): NumberSenseQuestion {
  switch (kind) {
    case 'grid-find':
      return { kind, number, thing: GRID_THINGS[randomInt(0, GRID_THINGS.length - 1)] };
    case 'group-tens':
      return { kind, number, ...scatterDots(number) };
    default:
      return { kind, number };
  }
}

/**
 * One run. A single kind asks RUN_LENGTH[kind] different numbers. "Door
 * elkaar" asks every kind once, plus one more (never a second grouping), in
 * random order.
 */
export function generateNumberSenseRun(mode: NumberSenseMode, config: NumberSenseConfig): NumberSenseQuestion[] {
  if (mode !== 'mix') {
    return numbersFor(mode, RUN_LENGTH[mode], config).map((n) => questionFor(mode, n));
  }
  const extra = shuffled(NUMBER_SENSE_KINDS.filter((k) => k !== 'group-tens'))[0];
  const kinds = shuffled([...NUMBER_SENSE_KINDS, extra]).slice(0, RUN_LENGTH.mix);
  return kinds.map((kind) => questionFor(kind, numbersFor(kind, 1, config)[0]));
}
