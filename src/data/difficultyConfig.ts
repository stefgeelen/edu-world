/**
 * Difficulty configuration per exercise type.
 * Keyed by "grade-stage" (e.g. "1-1" = Grade 1, Trimester 1).
 * Only Grade 1 with 3 trimesters is currently active.
 * Exercises without a config entry use the default.
 *
 * GRADE-2 PILOT: every "2-*" entry below is a PLACEHOLDER extrapolated from
 * the grade-1 progression, not a reviewed curriculum. Do not raise
 * MAX_SUPPORTED_GRADE until these are replaced with real values (Phase 1 —
 * content-authoring pass). Entries marked "needs new content pool" can't be
 * fixed by numbers alone: their underlying word/sentence pool is grade-1
 * vocabulary by construction and needs new authored content, not just a
 * bigger number.
 */

/**
 * Highest grade with real content today. Raise this as new grades ship.
 * Children with a higher `grade` value (from age-based onboarding) are
 * clamped to this ceiling everywhere content/exercises are read, so they
 * get the full grade-1 progression instead of falling through every
 * config's DEFAULT_* (easiest-tier) fallback.
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

export const MATH_SUMS_CONFIG: Record<string, MathSumsConfig> = {
  "1-1": { operators: ['+', '-'], maxNumber: 6, allowNegative: false },
  "1-2": { operators: ['+', '-'], maxNumber: 10, allowNegative: false },
  "1-3": { operators: ['+', '-'], maxNumber: 20, allowNegative: false },
  // placeholder — see GRADE-2 PILOT note above
  "2-1": { operators: ['+', '-'], maxNumber: 30, allowNegative: false },
  "2-2": { operators: ['+', '-', '×'], maxNumber: 50, allowNegative: false },
  "2-3": { operators: ['+', '-', '×', '÷'], maxNumber: 100, allowNegative: false, maxDivisor: 10 },
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
  // placeholder — see GRADE-2 PILOT note above
  "2-1": { minTarget: 10, maxTarget: 20 },
  "2-2": { minTarget: 15, maxTarget: 50 },
  "2-3": { minTarget: 20, maxTarget: 100 },
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
  // placeholder — see GRADE-2 PILOT note above
  "2-1": { maxNumber: 30 },
  "2-2": { maxNumber: 50 },
  "2-3": { maxNumber: 100 },
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
  // placeholder — see GRADE-2 PILOT note above. Also worth a product call:
  // counting individual dots past ~20-30 gets visually impractical, so
  // grade 2 may want a different exercise (e.g. grouped/skip counting)
  // rather than just a bigger maxDots.
  "2-1": { minDots: 5, maxDots: 20 },
  "2-2": { minDots: 10, maxDots: 30 },
  "2-3": { minDots: 10, maxDots: 40 },
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
  // placeholder — see GRADE-2 PILOT note above
  "2-1": { minObjects: 2, maxObjects: 20 },
  "2-2": { minObjects: 5, maxObjects: 30 },
  "2-3": { minObjects: 5, maxObjects: 50 },
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
  // placeholder — see GRADE-2 PILOT note above
  "2-1": { maxTotal: 30 },
  "2-2": { maxTotal: 50 },
  "2-3": { maxTotal: 100 },
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
  // placeholder — see GRADE-2 PILOT note above
  "2-1": { minTarget: 10, maxTarget: 20 },
  "2-2": { minTarget: 15, maxTarget: 50 },
  "2-3": { minTarget: 20, maxTarget: 100 },
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
  // placeholder, needs new content pool — soundHousePool.ts only has
  // grade-1 vocabulary (poolStage 1-3). Reusing poolStage 3 here just repeats
  // grade-1's hardest words; real grade-2 phonics needs its own word pool.
  "2-1": { allowedPositions: ['begin', 'middle', 'end'], poolStage: 3 },
  "2-2": { allowedPositions: ['begin', 'middle', 'end'], poolStage: 3 },
  "2-3": { allowedPositions: ['begin', 'middle', 'end'], poolStage: 3 },
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
  // placeholder — see GRADE-2 PILOT note above
  "2-1": { denominations: [5000, 2000, 1000, 500, 200, 100, 50, 20, 10, 5], maxPriceCents: 8000 },
  "2-2": { denominations: [5000, 2000, 1000, 500, 200, 100, 50, 20, 10, 5, 2, 1], maxPriceCents: 12000 },
  "2-3": { denominations: [5000, 2000, 1000, 500, 200, 100, 50, 20, 10, 5, 2, 1], maxPriceCents: 20000 },
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
  // placeholder — see GRADE-2 PILOT note above
  "2-1": { wholeHours: true, halfHours: true, quarterHours: false },
  "2-2": { wholeHours: true, halfHours: true, quarterHours: true },
  "2-3": { wholeHours: true, halfHours: true, quarterHours: true },
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
  // placeholder, needs new content pool — picturePool.ts is grade-1
  // vocabulary by construction; option count alone doesn't make this
  // grade-2 appropriate.
  "2-1": { optionCount: 4 },
  "2-2": { optionCount: 4 },
  "2-3": { optionCount: 4 },
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
  // placeholder — see GRADE-2 PILOT note above
  "2-1": { maxNumber: 30 },
  "2-2": { maxNumber: 50 },
  "2-3": { maxNumber: 100 },
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
  // placeholder — see GRADE-2 PILOT note above
  "2-1": { minSum: 11, maxSum: 20 },
  "2-2": { minSum: 15, maxSum: 50 },
  "2-3": { minSum: 20, maxSum: 100 },
};

export const DEFAULT_SUM_SPLIT: SumSplitConfig = {
  minSum: 11, maxSum: 18,
};
