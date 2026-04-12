

# Codebase Architecture Review — Findings & Recommendations

## Overall Assessment
The codebase is well-structured with good use of TypeScript, TanStack Query, and a clear separation of concerns. However, there are several scalability and correctness issues that should be addressed.

---

## Critical Issues

### 1. Double XP — `addXp()` and `complete_exercise` both add XP
Every exercise screen calls `addXp()` from GameContext (which updates local state) **and** calls `completeExercise.mutate()` (which updates the database via the `complete_exercise` RPC, which also adds XP to the `children` table). This means:
- XP is added to the database correctly via the RPC
- XP is also inflated in local state via `addXp()`, causing the UI to show more XP than actually earned until the next page load

**Fix:** Remove all `addXp()` calls from exercise screens. The `complete_exercise` RPC already handles XP. After mutation succeeds, query invalidation will sync the UI. Remove `addXp` from GameContext entirely (as planned in `.lovable/plan.md` Step 5).

**Affected files:** `Exercise.tsx`, `ExerciseComparison.tsx`, `ExerciseNumberBond.tsx`, `ExerciseNumberLine.tsx`, `ExerciseDotCount.tsx`, `ExerciseWriteNumber.tsx`, `ExerciseWriteDigit.tsx`, `ExerciseWriteLetter.tsx`, and `useExerciseState.ts` — approximately 10 files.

### 2. Duplicate child queries — Same data fetched 4+ times
The current child is fetched independently in:
- `GameContext` (`queryKey: ['game-child']`)
- `useCurrentChild` (`queryKey: ['my-child']`)
- `useChildProgress` (`queryKey: ['my-children']`)
- `ChildRewards` (`queryKey: ['my-child-for-rewards']`)

Each uses a different query key, so TanStack Query treats them as separate queries. This means 4 parallel requests to the same table on every page load.

**Fix:** Standardize on one query key (e.g. `['my-child', user?.id]`) and one shared hook (`useCurrentChild`). All components should import from that single hook. GameContext should consume `useCurrentChild` instead of running its own query.

### 3. `StarryBackground` re-randomizes on every render
In `Dashboard.tsx` and `QuestMap.tsx`, `StarryBackground` uses `Math.random()` inline in JSX without memoization. Every re-render generates new random positions, causing layout thrashing and unnecessary DOM updates. `BadgeOverview.tsx` already has the fix using `useMemo`.

**Fix:** Apply the same `useMemo` pattern from `BadgeOverview.tsx` to `Dashboard.tsx` and `QuestMap.tsx`.

---

## Moderate Issues

### 4. Hardcoded stats on Dashboard
The "Statistieken" card shows hardcoded values (`92%`, `45`, `3u`). This should pull from `child_progress` data, which already exists in the database.

### 5. Hardcoded daily quests
`DAILY_QUESTS` in `Dashboard.tsx` is a static array. These should be dynamic — either derived from real exercise data or stored in the database.

### 6. Exercise.tsx duplicates `useExerciseState` logic
`Exercise.tsx` manually reimplements the same state management (lives, progress, correctCount, startTime, completeExercise) that `useExerciseState.ts` already provides. This creates maintenance risk and inconsistency.

**Fix:** Refactor `Exercise.tsx` to use `useExerciseState` like the other exercise screens.

### 7. Missing `StrictMode` in main.tsx
React `StrictMode` is not used, which means double-render issues in development won't be caught early.

### 8. Stale closure in Exercise.tsx
`generateQuestion` is not wrapped in `useCallback` and is called from a `useEffect` with `[id]` deps, but also called from `handleSelect` which closes over stale `progress` state. The `progress + 20 >= 100` check uses the stale value from the closure.

### 9. `useStageExercises` fetches ALL attempts without pagination
The query `exercise_attempts.select('exercise_id, stars').eq('child_id', childId)` fetches every attempt ever made. As usage grows, this will become slow. Should be bounded or aggregated server-side.

---

## Minor / Cosmetic Issues

### 10. Dashboard "Statistieken" links to `/app/progress` but Progress was removed from tab bar
The route still exists but is no longer discoverable via navigation. Either remove the route or restore access.

### 11. Fluisterbos uses light theme while rest of app uses dark Fluisterbos theme
The stage detail page (`Fluisterbos.tsx`) still uses a white/light design (`bg-slate-50`, `bg-white`). This is visually inconsistent with Dashboard, QuestMap, and BadgeOverview.

### 12. No error boundaries
No React error boundaries exist. A crash in one exercise screen will crash the entire app.

---

## Proposed Implementation Plan

### Phase 1 — Critical fixes (data integrity)
1. **Remove `addXp()` from all exercise screens and `useExerciseState`** — prevent double XP
2. **Remove `addXp` from GameContext** — XP comes from database only
3. **Unify child query** — single `useCurrentChild` hook with consistent query key `['my-child', userId]`, used everywhere

### Phase 2 — Performance
4. **Memoize `StarryBackground`** in Dashboard and QuestMap
5. **Add server-side aggregation** for exercise attempts (database function returning counts + best stars per exercise, replacing client-side aggregation in `useStageExercises`)

### Phase 3 — Consistency & correctness
6. **Refactor `Exercise.tsx`** to use `useExerciseState` hook
7. **Make Dashboard stats dynamic** from `child_progress`
8. **Restyle Fluisterbos** to match dark theme (or keep as deliberate contrast)
9. **Add a top-level `ErrorBoundary`** component

This plan addresses data integrity first (double XP is actively causing incorrect data), then performance, then consistency.

