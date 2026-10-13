import { randomInt } from '@/lib/random';
import type {
  EvenOddConfig,
  MathSumsConfig,
  NumberLineConfig,
} from '@/data/difficultyConfig';

/**
 * Question generators for the maths exercises. They live here instead of in
 * the screens so tests exercise the real logic (the screens are lazy routes).
 */

// ── Rekensom (Exercise.tsx) ────────────────────────────────────────────────

export interface MathQuestion {
  num1: number;
  num2: number;
  operator: string;
  answer: number;
}

/**
 * True when the sum or difference goes over a ten (8 + 5, 34 + 8, 52 − 7).
 * Landing exactly on a ten (34 + 6) is not over it.
 */
export function crossesTen(num1: number, operator: string, num2: number): boolean {
  if (operator === '+') return (num1 % 10) + (num2 % 10) > 10;
  if (operator === '-') return num1 % 10 < num2 % 10;
  return false;
}

/**
 * Second operand for sums up to 100, in the three shapes of the 2de leerjaar:
 * units (34 + 5), whole tens (34 + 20) or tens and units (34 + 25).
 */
function secondOperandUpTo100(limit: number): number {
  const shapes: Array<() => number> = [() => randomInt(1, 9)];
  if (limit >= 10) shapes.push(() => randomInt(1, Math.floor(limit / 10)) * 10);
  if (limit >= 11) shapes.push(() => randomInt(11, limit));
  const n = shapes[randomInt(0, shapes.length - 1)]();
  return Math.min(n, limit);
}

function plusOrMinus(config: MathSumsConfig, op: '+' | '-'): MathQuestion {
  const { maxNumber, allowNegative, bridge } = config;
  const max = Math.max(2, maxNumber);
  let fallback: MathQuestion | null = null;

  for (let i = 0; i < 200; i++) {
    let num1: number, num2: number;
    if (op === '+') {
      num1 = randomInt(1, max - 1);
      num2 = max > 20 ? secondOperandUpTo100(max - num1) : randomInt(1, max - num1);
    } else if (allowNegative) {
      num1 = randomInt(1, max);
      num2 = randomInt(1, max);
    } else {
      num1 = randomInt(1, max);
      num2 = max > 20 ? secondOperandUpTo100(num1) : randomInt(1, num1);
    }
    const q = { num1, num2, operator: op, answer: op === '+' ? num1 + num2 : num1 - num2 };
    fallback ??= q;
    if (!bridge) return q;
    if ((bridge === 'with') === crossesTen(num1, op, num2)) return q;
  }
  return fallback!;
}

/** Four answer options. Up to 100 the wrong ones include the classic ±10 slip. */
function answerOptions(ans: number, config: MathSumsConfig): number[] {
  const options = new Set([ans]);
  const candidates = config.maxNumber > 20 ? [ans + 10, ans - 10, ans + 1, ans - 1] : [];
  for (const c of candidates.sort(() => Math.random() - 0.5)) {
    if (options.size >= 3) break;
    if (config.allowNegative || c >= 0) options.add(c);
  }
  while (options.size < 4) {
    const candidate = ans + Math.floor(Math.random() * 10) - 5;
    if (candidate !== ans && (config.allowNegative || candidate >= 0)) {
      options.add(candidate);
    }
  }
  return Array.from(options).sort(() => Math.random() - 0.5);
}

export function generateMathQuestion(config: MathSumsConfig): { question: MathQuestion; options: number[] } {
  const { operators, maxNumber, maxDivisor } = config;
  const op = operators[Math.floor(Math.random() * operators.length)];

  let question: MathQuestion;
  if (op === '÷') {
    // Clean division: num2 * quotient = num1
    const divisor = Math.floor(Math.random() * (maxDivisor || 10)) + 1;
    const quotient = Math.floor(Math.random() * 10) + 1;
    question = { num1: divisor * quotient, num2: divisor, operator: op, answer: quotient };
  } else if (op === '×') {
    const num1 = Math.floor(Math.random() * Math.min(maxNumber, 12)) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    question = { num1, num2, operator: op, answer: num1 * num2 };
  } else {
    question = plusOrMinus(config, op === '-' ? '-' : '+');
  }

  return { question, options: answerOptions(question.answer, config) };
}

// ── Splitsen over het tiental (ExerciseSumSplit.tsx) ───────────────────────

export interface SumSplitQuestion {
  num1: number;
  num2: number;
  total: number;
  /** What num2 gives to num1 to reach the next ten. */
  leftPart: number;
  rightPart: number;
}

/**
 * num1 + num2 where num2 (2..9) is split to land on the next ten first:
 * 8 + 6 = 8 + 2 + 4, and from the 2de leerjaar on 38 + 6 = 38 + 2 + 4.
 * The sum always crosses a ten; num1 ends on 6..9 so both parts are ≥ 1.
 */
export function generateSumSplitQuestion(minSum: number, maxSum: number): SumSplitQuestion {
  const maxTens = Math.max(0, Math.floor((maxSum - 11) / 10));
  for (let i = 0; i < 100; i++) {
    const num1 = randomInt(0, maxTens) * 10 + randomInt(6, 9);
    const ten = Math.ceil((num1 + 1) / 10) * 10;
    const leftPart = ten - num1;
    const minN2 = Math.max(leftPart + 1, minSum - num1, 2);
    const maxN2 = Math.min(9, maxSum - num1);
    if (maxN2 < minN2) continue;
    const num2 = randomInt(minN2, maxN2);
    return { num1, num2, total: num1 + num2, leftPart, rightPart: num2 - leftPart };
  }
  return { num1: 8, num2: 6, total: 14, leftPart: 2, rightPart: 4 };
}

// ── Getallenlijn (ExerciseNumberLine.tsx) ──────────────────────────────────

export interface NumberLineSlot {
  value: number;
  isBlank: boolean;
  filled: boolean;
}

/**
 * A number line with three blanks. Without `steps`/`length` it is the whole
 * line 0..maxNumber by ones (1ste leerjaar). With them it is a piece of
 * `length` points counting by one of `steps`, somewhere within 0..maxNumber
 * (2de leerjaar: 0, 10, 20 … 100 or 37 … 47 or 20, 25, 30 …).
 */
export function makeNumberLineSlots(config: NumberLineConfig): NumberLineSlot[] {
  const { maxNumber } = config;
  const step = config.steps?.length ? config.steps[randomInt(0, config.steps.length - 1)] : 1;
  const length = Math.min(config.length ?? Math.floor(maxNumber / step) + 1, Math.floor(maxNumber / step) + 1);
  const lastStart = Math.floor((maxNumber - (length - 1) * step) / step);
  const start = randomInt(0, Math.max(0, lastStart)) * step;

  const values = Array.from({ length }, (_, i) => start + i * step);
  // Blanks never at either end, so the child always sees where the line starts and stops.
  const inner = values.slice(1, -1);
  for (let i = inner.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [inner[i], inner[j]] = [inner[j], inner[i]];
  }
  const blanks = new Set(inner.slice(0, Math.min(3, inner.length)));
  return values.map((value) => ({ value, isBlank: blanks.has(value), filled: false }));
}

// ── Even of oneven (ExerciseEvenOdd.tsx) ───────────────────────────────────

export type EvenOddQuestion =
  | { kind: 'even-odd'; number: number; answer: 'even' | 'oneven' }
  | { kind: 'double'; number: number; answer: number }
  | { kind: 'half'; number: number; answer: number };

/**
 * Doubles and halves stay within what the 2de leerjaar can do by heart:
 * doubles of 1..10 and of whole tens, halves of even numbers to 20 and of
 * even tens to 100.
 */
export function generateEvenOddQuestion(config: EvenOddConfig): EvenOddQuestion {
  const kinds = config.kinds.length ? config.kinds : ['even-odd' as const];
  const kind = kinds[randomInt(0, kinds.length - 1)];
  const max = config.maxNumber;

  if (kind === 'double') {
    const number = Math.random() < 0.5 || max < 20
      ? randomInt(1, Math.min(10, Math.floor(max / 2)))
      : randomInt(1, Math.floor(max / 20)) * 10;
    return { kind, number, answer: number * 2 };
  }
  if (kind === 'half') {
    const number = Math.random() < 0.5 || max < 20
      ? randomInt(1, Math.min(10, Math.floor(max / 2))) * 2
      : randomInt(1, Math.floor(max / 20)) * 20;
    return { kind, number, answer: number / 2 };
  }
  const number = randomInt(1, max);
  return { kind: 'even-odd', number, answer: number % 2 === 0 ? 'even' : 'oneven' };
}

// ── Tafels (ExerciseTimesTables.tsx) ───────────────────────────────────────

export interface TableQuestion {
  /** "3 × 5" or "15 : 5" (Flemish division sign). */
  num1: number;
  operator: '×' | ':';
  num2: number;
  answer: number;
}

/** Questions in one run of a table. */
export const TABLE_RUN_LENGTH = 10;

function shuffled<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * One run of the table of `table`: 1 × n … 10 × n in random order. With
 * `withDivision` half of the run is divisions (n : n … 10n : n), mixed in.
 * No fact comes twice.
 */
export function generateTableRun(table: number, withDivision: boolean): TableQuestion[] {
  const ks = Array.from({ length: 10 }, (_, i) => i + 1);
  const times = ks.map((k): TableQuestion => ({ num1: k, operator: '×', num2: table, answer: k * table }));
  if (!withDivision) return shuffled(times).slice(0, TABLE_RUN_LENGTH);

  const divisions = ks.map((k): TableQuestion => ({ num1: k * table, operator: ':', num2: table, answer: k }));
  const half = TABLE_RUN_LENGTH / 2;
  return shuffled([...shuffled(times).slice(0, half), ...shuffled(divisions).slice(0, half)]);
}
