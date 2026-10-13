/**
 * Difficulty configuration defaults per exercise type.
 *
 * Per-grade/per-trimester values now live in the `exercises.config` DB
 * column, fetched via `useExerciseConfig()`. The DEFAULT_* constants here
 * are only the fallback used when a matching DB row has no config yet.
 *
 * ExerciseLanguage.tsx and ExerciseSentenceDoctor.tsx are NOT DB-driven:
 * their word and sentence pools live in code, per grade.
 */

/**
 * Highest grade a parent can pick or promote to. Grade 2 opened on
 * 2026-10-13 with maths (wayfinder/second-grade/map.md); its language
 * exercises still come from grade 1, under Herhalen.
 */
export const MAX_SUPPORTED_GRADE = 2;

export function clampToSupportedGrade(grade: number | null | undefined): number {
  return Math.max(1, Math.min(grade ?? 1, MAX_SUPPORTED_GRADE));
}

// ── Math Sums (Exercise.tsx) ───────────────────────────────────────────────

export interface MathSumsConfig {
  operators: string[];
  maxNumber: number;
  allowNegative: boolean;
  /** For division: max multiplier to generate clean divisions */
  maxDivisor?: number;
  /**
   * + and − only: 'with' = every sum goes over a ten (8 + 5, 38 + 25),
   * 'without' = none does (34 + 25). Unset = either.
   */
  bridge?: 'with' | 'without';
}

export const DEFAULT_MATH_SUMS: MathSumsConfig = {
  operators: ['+', '-'], maxNumber: 6, allowNegative: false,
};

// ── Number Bonds (ExerciseNumberBond.tsx) ──────────────────────────────────

export interface NumberBondConfig {
  minTarget: number;
  maxTarget: number;
}

export const DEFAULT_NUMBER_BOND: NumberBondConfig = {
  minTarget: 3, maxTarget: 6,
};

// ── Comparison (ExerciseComparison.tsx) ────────────────────────────────────

export interface ComparisonConfig {
  maxNumber: number;
}

export const DEFAULT_COMPARISON: ComparisonConfig = {
  maxNumber: 6,
};

// ── Dot Count (ExerciseDotCount.tsx) ──────────────────────────────────────

export interface DotCountConfig {
  minDots: number;
  maxDots: number;
}

export const DEFAULT_DOT_COUNT: DotCountConfig = {
  minDots: 1, maxDots: 6,
};

// ── Compare Objects (ExerciseCompareObjects.tsx) ───────────────────────────

export interface CompareObjectsConfig {
  minObjects: number;
  maxObjects: number;
}

export const DEFAULT_COMPARE_OBJECTS: CompareObjectsConfig = {
  minObjects: 1, maxObjects: 6,
};

// ── Subtract Box (ExerciseSubtractBox.tsx) ─────────────────────────────────

export interface SubtractBoxConfig {
  /** Maximum total tokens in the box (the minuend) */
  maxTotal: number;
}

export const DEFAULT_SUBTRACT_BOX: SubtractBoxConfig = {
  maxTotal: 6,
};

// ── Split Box (ExerciseSplitBox.tsx) ───────────────────────────────────────

export interface SplitBoxConfig {
  minTarget: number;
  maxTarget: number;
}

export const DEFAULT_SPLIT_BOX: SplitBoxConfig = {
  minTarget: 3, maxTarget: 6,
};

// ── Sound House (ExerciseSoundHouse.tsx) ───────────────────────────────────

export interface SoundHouseConfig {
  /** Welke posities toegestaan zijn voor deze stage. */
  allowedPositions: Array<'begin' | 'middle' | 'end'>;
  /** Stage-nummer doorgegeven aan de woordenpool generator. */
  poolStage: 1 | 2 | 3;
}

export const DEFAULT_SOUND_HOUSE: SoundHouseConfig = {
  allowedPositions: ['begin', 'end'],
  poolStage: 1,
};

// ── Money (ExerciseMoney.tsx) ─────────────────────────────────────────────

export interface MoneyConfig {
  /** Denomination values available (in cents) */
  denominations: number[];
  /** Maximum price in cents */
  maxPriceCents: number;
}

export const DEFAULT_MONEY: MoneyConfig = {
  denominations: [1000, 500, 200, 100, 50],
  maxPriceCents: 1500,
};

// ── Clock (ExerciseClock.tsx) ──────────────────────────────────────────────

export interface ClockConfig {
  wholeHours: boolean;
  halfHours: boolean;
  quarterHours: boolean;
}

export const DEFAULT_CLOCK: ClockConfig = {
  wholeHours: true, halfHours: false, quarterHours: false,
};

// ── Picture Word (ExercisePictureWord.tsx) ─────────────────────────────────

export interface PictureWordConfig {
  optionCount: 3 | 4;
}

export const DEFAULT_PICTURE_WORD: PictureWordConfig = {
  optionCount: 3,
};

// ── Number Line (ExerciseNumberLine.tsx) ───────────────────────────────────

export interface NumberLineConfig {
  maxNumber: number;
  /** Count by one of these (e.g. [10] or [2, 5, 10]). Unset = by ones. */
  steps?: number[];
  /** Points on the line. Unset = the whole line 0..maxNumber. */
  length?: number;
}

export const DEFAULT_NUMBER_LINE: NumberLineConfig = {
  maxNumber: 6,
};

// ── Sum Split / Splitsen via 10 (ExerciseSumSplit.tsx) ─────────────────────

export interface SumSplitConfig {
  /** Minimum sum (num1 + num2), should be > 10 to require crossing the ten. */
  minSum: number;
  /** Maximum sum. */
  maxSum: number;
}

export const DEFAULT_SUM_SPLIT: SumSplitConfig = {
  minSum: 11, maxSum: 18,
};

// ── Even or odd (ExerciseEvenOdd.tsx) ──────────────────────────────────────

export interface EvenOddConfig {
  /** Even or odd numbers 1..maxNumber; doubles and halves stay at or below it. */
  maxNumber: number;
  kinds: Array<'even-odd' | 'double' | 'half'>;
}

export const DEFAULT_EVEN_ODD: EvenOddConfig = {
  maxNumber: 20, kinds: ['even-odd'],
};

// ── Times tables (ExerciseTimesTables.tsx) ─────────────────────────────────

export interface TimesTablesConfig {
  /** Tables the child can pick, e.g. [2, 5, 10]. */
  tables: number[];
  /** Tables that also ask divisions (15 : 5). */
  divisionTables: number[];
}

export const DEFAULT_TIMES_TABLES: TimesTablesConfig = {
  tables: [2, 5, 10], divisionTables: [],
};

/** Runs without a mistake before a table counts as known (sticker). */
export const TABLE_STICKER_RUNS = 3;
