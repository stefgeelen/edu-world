/**
 * Difficulty configuration defaults per exercise type.
 *
 * Per-grade/per-trimester values now live in the `exercises.config` DB
 * column, fetched via `useExerciseConfig()`. The DEFAULT_* constants here
 * are only the fallback used when a matching DB row has no config yet.
 *
 * ExerciseLanguage.tsx and ExerciseSentenceDoctor.tsx are NOT DB-driven —
 * their word/sentence pools are grade-1 vocabulary by construction, so they
 * keep using MAX_SUPPORTED_GRADE/clampToSupportedGrade below directly.
 */

/**
 * Highest grade with real content for the two content-pool-based exercises
 * above, and for worldThemes.ts's grade-2 theme unlock. Raise this once
 * their grade-2 content is authored.
 */
export const MAX_SUPPORTED_GRADE = 1;

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
