/**
 * Difficulty configuration per exercise type.
 * Keyed by "grade-stage" (e.g. "1-1" = Grade 1, Trimester 1).
 * Only Grade 1 with 3 trimesters is currently active.
 * Exercises without a config entry use the default.
 */

// ── Math Sums (Exercise.tsx) ───────────────────────────────────────────────

export interface MathSumsConfig {
  operators: string[];
  maxNumber: number;
  allowNegative: boolean;
  /** For division: max multiplier to generate clean divisions */
  maxDivisor?: number;
}

export const MATH_SUMS_CONFIG: Record<string, MathSumsConfig> = {
  "1-1": { operators: ['+', '-'], maxNumber: 6, allowNegative: false },
  "1-2": { operators: ['+', '-'], maxNumber: 10, allowNegative: false },
  "1-3": { operators: ['+', '-'], maxNumber: 20, allowNegative: false },
};

export const DEFAULT_MATH_SUMS: MathSumsConfig = {
  operators: ['+', '-'], maxNumber: 6, allowNegative: false,
};

// ── Number Bonds (ExerciseNumberBond.tsx) ──────────────────────────────────

export interface NumberBondConfig {
  minTarget: number;
  maxTarget: number;
}

export const NUMBER_BOND_CONFIG: Record<string, NumberBondConfig> = {
  "1-1": { minTarget: 3, maxTarget: 6 },
  "1-2": { minTarget: 5, maxTarget: 10 },
  "1-3": { minTarget: 8, maxTarget: 20 },
};

export const DEFAULT_NUMBER_BOND: NumberBondConfig = {
  minTarget: 3, maxTarget: 6,
};

// ── Comparison (ExerciseComparison.tsx) ────────────────────────────────────

export interface ComparisonConfig {
  maxNumber: number;
}

export const COMPARISON_CONFIG: Record<string, ComparisonConfig> = {
  "1-1": { maxNumber: 6 },
  "1-2": { maxNumber: 10 },
  "1-3": { maxNumber: 20 },
};

export const DEFAULT_COMPARISON: ComparisonConfig = {
  maxNumber: 6,
};

// ── Dot Count (ExerciseDotCount.tsx) ──────────────────────────────────────

export interface DotCountConfig {
  minDots: number;
  maxDots: number;
}

export const DOT_COUNT_CONFIG: Record<string, DotCountConfig> = {
  "1-1": { minDots: 1, maxDots: 6 },
  "1-2": { minDots: 1, maxDots: 10 },
  "1-3": { minDots: 1, maxDots: 20 },
};

export const DEFAULT_DOT_COUNT: DotCountConfig = {
  minDots: 1, maxDots: 6,
};

// ── Compare Objects (ExerciseCompareObjects.tsx) ───────────────────────────

export interface CompareObjectsConfig {
  minObjects: number;
  maxObjects: number;
}

export const COMPARE_OBJECTS_CONFIG: Record<string, CompareObjectsConfig> = {
  "1-1": { minObjects: 1, maxObjects: 6 },
  "1-2": { minObjects: 1, maxObjects: 10 },
  "1-3": { minObjects: 2, maxObjects: 20 },
};

export const DEFAULT_COMPARE_OBJECTS: CompareObjectsConfig = {
  minObjects: 1, maxObjects: 6,
};

// ── Subtract Box (ExerciseSubtractBox.tsx) ─────────────────────────────────

export interface SubtractBoxConfig {
  /** Maximum total tokens in the box (the minuend) */
  maxTotal: number;
}

export const SUBTRACT_BOX_CONFIG: Record<string, SubtractBoxConfig> = {
  "1-1": { maxTotal: 6 },
  "1-2": { maxTotal: 10 },
  "1-3": { maxTotal: 20 },
};

export const DEFAULT_SUBTRACT_BOX: SubtractBoxConfig = {
  maxTotal: 6,
};

// ── Split Box (ExerciseSplitBox.tsx) ───────────────────────────────────────

export interface SplitBoxConfig {
  minTarget: number;
  maxTarget: number;
}

export const SPLIT_BOX_CONFIG: Record<string, SplitBoxConfig> = {
  "1-1": { minTarget: 3, maxTarget: 6 },
  "1-2": { minTarget: 5, maxTarget: 10 },
  "1-3": { minTarget: 8, maxTarget: 20 },
};

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

export const SOUND_HOUSE_CONFIG: Record<string, SoundHouseConfig> = {
  "1-1": { allowedPositions: ['begin', 'end'], poolStage: 1 },
  "1-2": { allowedPositions: ['begin', 'middle', 'end'], poolStage: 2 },
  "1-3": { allowedPositions: ['begin', 'middle', 'end'], poolStage: 3 },
};

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

export const MONEY_CONFIG: Record<string, MoneyConfig> = {
  "1-1": { denominations: [1000, 500, 200, 100, 50], maxPriceCents: 1500 },
  "1-2": { denominations: [1000, 500, 200, 100, 50, 20, 10, 5], maxPriceCents: 2500 },
  "1-3": { denominations: [5000, 2000, 1000, 500, 200, 100, 50, 20, 10, 5], maxPriceCents: 6000 },
};

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

export const CLOCK_CONFIG: Record<string, ClockConfig> = {
  "1-1": { wholeHours: true, halfHours: false, quarterHours: false },
  "1-2": { wholeHours: true, halfHours: true, quarterHours: false },
  "1-3": { wholeHours: true, halfHours: true, quarterHours: false },
};

export const DEFAULT_CLOCK: ClockConfig = {
  wholeHours: true, halfHours: false, quarterHours: false,
};

// ── Picture Word (ExercisePictureWord.tsx) ─────────────────────────────────

export interface PictureWordConfig {
  optionCount: 3 | 4;
}

export const PICTURE_WORD_CONFIG: Record<string, PictureWordConfig> = {
  "1-1": { optionCount: 3 },
  "1-2": { optionCount: 3 },
  "1-3": { optionCount: 4 },
};

export const DEFAULT_PICTURE_WORD: PictureWordConfig = {
  optionCount: 3,
};

// ── Number Line (ExerciseNumberLine.tsx) ───────────────────────────────────

export interface NumberLineConfig {
  maxNumber: number;
}

export const NUMBER_LINE_CONFIG: Record<string, NumberLineConfig> = {
  "1-1": { maxNumber: 6 },
  "1-2": { maxNumber: 10 },
  "1-3": { maxNumber: 20 },
};

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

export const SUM_SPLIT_CONFIG: Record<string, SumSplitConfig> = {
  "1-3": { minSum: 11, maxSum: 18 },
};

export const DEFAULT_SUM_SPLIT: SumSplitConfig = {
  minSum: 11, maxSum: 18,
};
