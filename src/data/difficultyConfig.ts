/**
 * Difficulty configuration per exercise type.
 * Keyed by "grade-stage" (e.g. "1-1" = Grade 1, Stage 1).
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
  // Grade 1
  "1-1": { operators: ['+', '-'], maxNumber: 10, allowNegative: false },
  "1-2": { operators: ['+', '-'], maxNumber: 10, allowNegative: false },
  "1-3": { operators: ['+', '-'], maxNumber: 15, allowNegative: false },
  "1-4": { operators: ['+', '-'], maxNumber: 20, allowNegative: false },
  // Grade 2
  "2-1": { operators: ['+', '-'], maxNumber: 20, allowNegative: false },
  "2-2": { operators: ['+', '-', '×'], maxNumber: 20, allowNegative: false },
  "2-3": { operators: ['+', '-', '×', '÷'], maxNumber: 50, allowNegative: false, maxDivisor: 10 },
  "2-4": { operators: ['+', '-', '×', '÷'], maxNumber: 100, allowNegative: false, maxDivisor: 10 },
};

export const DEFAULT_MATH_SUMS: MathSumsConfig = {
  operators: ['+', '-'], maxNumber: 10, allowNegative: false,
};

// ── Number Bonds (ExerciseNumberBond.tsx) ──────────────────────────────────

export interface NumberBondConfig {
  minTarget: number;
  maxTarget: number;
}

export const NUMBER_BOND_CONFIG: Record<string, NumberBondConfig> = {
  "1-1": { minTarget: 5, maxTarget: 8 },
  "1-2": { minTarget: 5, maxTarget: 10 },
  "1-3": { minTarget: 8, maxTarget: 12 },
  "1-4": { minTarget: 8, maxTarget: 15 },
  "2-1": { minTarget: 10, maxTarget: 15 },
  "2-2": { minTarget: 10, maxTarget: 18 },
  "2-3": { minTarget: 12, maxTarget: 20 },
  "2-4": { minTarget: 15, maxTarget: 20 },
};

export const DEFAULT_NUMBER_BOND: NumberBondConfig = {
  minTarget: 5, maxTarget: 10,
};

// ── Comparison (ExerciseComparison.tsx) ────────────────────────────────────

export interface ComparisonConfig {
  maxNumber: number;
}

export const COMPARISON_CONFIG: Record<string, ComparisonConfig> = {
  "1-1": { maxNumber: 10 },
  "1-2": { maxNumber: 10 },
  "1-3": { maxNumber: 15 },
  "1-4": { maxNumber: 20 },
  "2-1": { maxNumber: 20 },
  "2-2": { maxNumber: 50 },
  "2-3": { maxNumber: 50 },
  "2-4": { maxNumber: 100 },
};

export const DEFAULT_COMPARISON: ComparisonConfig = {
  maxNumber: 10,
};

// ── Dot Count (ExerciseDotCount.tsx) ──────────────────────────────────────

export interface DotCountConfig {
  minDots: number;
  maxDots: number;
}

export const DOT_COUNT_CONFIG: Record<string, DotCountConfig> = {
  "1-1": { minDots: 1, maxDots: 5 },
  "1-2": { minDots: 1, maxDots: 8 },
  "1-3": { minDots: 1, maxDots: 10 },
  "1-4": { minDots: 3, maxDots: 15 },
  "2-1": { minDots: 5, maxDots: 15 },
  "2-2": { minDots: 5, maxDots: 20 },
  "2-3": { minDots: 5, maxDots: 20 },
  "2-4": { minDots: 5, maxDots: 20 },
};

export const DEFAULT_DOT_COUNT: DotCountConfig = {
  minDots: 1, maxDots: 10,
};

// ── Compare Objects (ExerciseCompareObjects.tsx) ───────────────────────────

export interface CompareObjectsConfig {
  minObjects: number;
  maxObjects: number;
}

export const COMPARE_OBJECTS_CONFIG: Record<string, CompareObjectsConfig> = {
  // Grade 1
  "1-1": { minObjects: 1, maxObjects: 4 },
  "1-2": { minObjects: 1, maxObjects: 6 },
  "1-3": { minObjects: 2, maxObjects: 6 },
  "1-4": { minObjects: 2, maxObjects: 8 },
  // Grade 2
  "2-1": { minObjects: 3, maxObjects: 10 },
  "2-2": { minObjects: 5, maxObjects: 15 },
  "2-3": { minObjects: 5, maxObjects: 20 },
  "2-4": { minObjects: 5, maxObjects: 25 },
};

export const DEFAULT_COMPARE_OBJECTS: CompareObjectsConfig = {
  minObjects: 1, maxObjects: 6,
};
