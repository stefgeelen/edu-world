

# Plan: Difficulty Scaling per Grade & Trimester

## Concept

Create a **difficulty configuration system** that each exercise reads to determine its parameters. The child's `grade` (leerjaar) and current `stage` (trimester) — both already available from the database — drive which difficulty preset is used.

No database changes are needed. This is purely frontend logic.

## Architecture

```text
src/
  data/
    difficultyConfig.ts      ← NEW: central config per exercise type
  hooks/
    useDifficultyLevel.ts     ← NEW: returns config for current child
  screens/
    Exercise.tsx              ← reads config instead of hardcoded ranges
    ExerciseNumberBond.tsx    ← reads config for target range
    ExerciseComparison.tsx    ← reads config for number range
    ... (other exercises as needed)
```

### 1. Create `src/data/difficultyConfig.ts`

A typed configuration file that defines per exercise type what changes per grade+trimester:

```typescript
// Each exercise type has a config keyed by "grade-trimester"
// e.g. "1-1" = Grade 1, Trimester 1

interface MathSumsConfig {
  operators: string[];        // ['+', '-'] or ['+', '-', '×', '÷']
  maxNumber: number;          // highest number in sums
  allowNegative: boolean;     // can answers go below 0?
}

const MATH_SUMS: Record<string, MathSumsConfig> = {
  "1-1": { operators: ['+', '-'], maxNumber: 10, allowNegative: false },
  "1-2": { operators: ['+', '-'], maxNumber: 10, allowNegative: false },
  "1-3": { operators: ['+', '-'], maxNumber: 15, allowNegative: false },
  "1-4": { operators: ['+', '-'], maxNumber: 20, allowNegative: false },
  "2-1": { operators: ['+', '-'], maxNumber: 20, allowNegative: false },
  "2-2": { operators: ['+', '-', '×'], maxNumber: 20, allowNegative: false },
  "2-3": { operators: ['+', '-', '×', '÷'], maxNumber: 50, allowNegative: false },
  "2-4": { operators: ['+', '-', '×', '÷'], maxNumber: 100, allowNegative: false },
};
// Similar configs for bonds, comparison, dots, number-line, etc.
// Exercises that stay the same simply have no config or a single default.
```

### 2. Create `src/hooks/useDifficultyLevel.ts`

A small hook that reads the child's grade and derives the current trimester from the route's stage parameter (already in the exercise route as the `:id` param / stage field):

```typescript
export function useDifficultyLevel() {
  const { data: child } = useCurrentChild();
  const location = useLocation();
  // Extract trimester from route param (e.g. /exercises/math/1 → stage-1 → trimester 1)
  const trimester = /* derive from route or exercise DB record */;
  const grade = child?.grade ?? 1;
  return { grade, trimester, key: `${grade}-${trimester}` };
}
```

### 3. Update `Exercise.tsx` (Sommen maken)

Replace the hardcoded `generateQuestion` with one that reads the config:

- Grade 1: only `+` and `-`, numbers up to 10-20, no negative answers
- Grade 2: adds `×` and `÷`, larger numbers
- Ensure subtraction never goes below 0 when `allowNegative: false` (swap num1/num2 if needed)
- For division: ensure clean division (no remainders)

### 4. Update other exercises as needed

Most exercises can remain unchanged initially. The system is opt-in: if an exercise has no config entry, it uses a sensible default. Priority exercises to configure:

- **ExerciseNumberBond**: target range scales (5-10 in T1 → 10-20 in T4)
- **ExerciseComparison**: number range scales
- **ExerciseDotCount**: dot count scales
- **ExerciseNumberLine**: line range scales

## What stays the same

Exercises like **Klokkijken**, **Geld rekenen**, **Letters schrijven**, **Zinnendokter** keep their current behavior — the config system simply doesn't define overrides for them.

## Technical details

- The `:id` in the route (e.g. `/exercises/math/1`) currently corresponds to the stage number. The `exercises` table also has a `stage` column (`stage-1` through `stage-4`). We use the child's `grade` from `useCurrentChild()` combined with the stage from the route to build the difficulty key.
- No DB migration needed — all config is frontend.
- The `useDifficultyLevel` hook is memoized and lightweight (reuses the existing `useCurrentChild` query).

