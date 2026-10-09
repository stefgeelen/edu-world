# Leapio — Claude Code Context

## Stack
- **React 18.3** + **TypeScript 5.8** + **Vite 5.4** (SWC)
- **React Query 5.83** for server state
- **Supabase 2.101** for DB, auth, and edge functions
- **React Router 6.30** with lazy-loaded routes
- **React Hook Form 7.61** + **Zod 3.25** for forms
- **Framer Motion 12.38** for animations
- **Sonner 1.7** for toast notifications
- **Shadcn + Radix UI** for accessible components
- **Vitest 3.2** + **@testing-library/react 16** for tests

## Project Structure
```
src/
  screens/       # Full-page components (31 files, incl. 14 exercise types)
  components/    # Reusable UI (ui/, exercise/, feedback/, figma/)
  hooks/         # Custom hooks for data fetching and game logic
  context/       # AuthContext, GameContext, CelebrationContext
  routes/        # appRoutes, adminRoutes, parentRoutes, publicRoutes
  data/          # Static config (avatars, badges, buddyMessages, difficulty)
  lib/           # Utilities (errorMessages, confetti, speech, utils)
  types/         # game.ts, stage.ts
  integrations/  # Auto-generated Supabase types
  test/          # Vitest tests (math generation, difficulty config only)
```

## Auth Flow
1. `/auth` — sign up/login (email + password)
2. `/auth/setup-pin` — set 4-digit parental PIN (stored via Supabase, verified via `useParentPin`)
3. `/app/add-child` — create child profile (inserts to `children` table)
4. `/app` — redirect only (`AppStart`): to `/app/add-child` if no child, else `/app/home`. Will become the Buddy choice.
5. `/app/home` — the Buddy's room: the home screen of the app

## Child App Model (since Oct 2026)
Caring for the Buddy is the game; exercises are how you care for it. **Two tabs** (`TabBar`), hidden during onboarding and exercises; **no map**.
- Tab 1 `/app/home` (`BuddyRoom`, where the app opens) — the Buddy, Care Actions, Munten, Shop, growth countdown. Same dark night-sky look as tab 2 (forest fades into it); the Shop too.
- Tab 2 `/app/dashboard` (`Dashboard`, old dark starry "vitrine" style) — header with parent portal/logout, "Alle oefeningen" hero, **Snel starten** (open wishes first, then fresh types: `quickStarts`), the Buddy's **Wishes**, the trophy room (opens `/app/badges`), parent rewards.
- `/app/oefenen` (`Practice`, same dark style) — one tile per *type* of exercise (route family, e.g. `/exercises/clock`), grouped by subject. The child always picks. Shared dark pieces: `src/components/dashboard/Vitrine.tsx`.
- Exercises return to the dashboard when finished or closed.
- **Munten** are the only currency. Repeating a type on the same day pays less: 8, 8, 4, 2, 1, 1… (resets daily). **Wishes**: up to 3 types per day, +5 the first time today.
- **Buddy**: one of `BUDDY_SPECIES` (`src/lib/buddy/species.ts`: fixed name + one image per mood). Shown in the room, the dashboard header and the exercise speech bubble (`useGame().buddy`). For now everyone is Nootje; the old study-buddy avatars are gone.
- **Growth**: `buddy_states.growth_stage` 1..18 = (grade − 1) × 3 + calendar trimester (sep–dec, jan–mar, apr–aug). Never goes back within a grade. Care has no influence.
- XP, level and streak are **invisible to the child**. The columns stay: the parent portal (trimester progress, promotion) and badges still use them. Parent rewards count every exercise fully, repeats included.
- **Game-over pays nothing.** Losing all 3 hearts never calls `complete_exercise` (no Munten, XP, parent-reward progress or badges), in every exercise; the screen just navigates back. Only a finished run (all questions right, 1–3 hearts left → 1–3 stars) goes through `complete_exercise`.
- **Aandachtspunten** (parent portal, `ParentChildDetail` via `useChildInsights`): per exercise row (type + grade + stage), over its last 10 tries. A try is a *struggle* when finished with 1 heart (stars 1), game-over, or closed with the X after at least one answer. Flagged when ≥2 tries and struggles ≥ half; red at ≥ 75%. Game-overs and abandons are saved by `ExerciseShell` into `exercise_incomplete_attempts` (`record_incomplete_exercise` RPC, pays nothing); `child_exercise_insights` RPC merges them with `exercise_attempts` — see `supabase/migrations/20261009120000_exercise_struggle_insights.sql`. Closing the browser mid-exercise is not caught. Before 9 Oct 2026, picture-word and sound-house stored game-overs as 1-star attempts.
- All of this is decided server-side: `practice_menu` RPC (pickable exercises, payouts, wishes) and `complete_exercise` — see `supabase/migrations/20261001120000_buddy_centred_practice.sql`. The client only displays it.
- Paths live in `src/routes/paths.ts` (`APP_PATHS`, `EXERCISE_DONE_PATH`/`EXERCISE_CLOSE_PATH` → dashboard). Old URLs (`/app/map`, `/app/stage/*`, `/app/buddy-room`, `/app/progress`) redirect.

**Session:** Supabase handles localStorage persistence + auto token refresh.  
**PIN:** Verified and stored in `sessionStorage` via `useParentPin`. Cleared on auth state change.  
**Protected routes:** `<ProtectedRoute>` checks `user && !loading`. `<AdminRoute>` additionally checks `user_roles` table.

## React Query Conventions
- Query keys: always arrays, scoped by resource + user/child ID, e.g. `['my-child', user?.id]`, `['game-badges', child?.id]`
- Every mutation **must** call `queryClient.invalidateQueries()` on success
- Mutations use `onError` for error toast, `onSuccess` for invalidation + navigation
- No global `staleTime` or `retry` config — React Query defaults apply

## Supabase Conventions
- All queries check `if (error) throw error` — never swallow silently
- Auth state managed in `AuthContext` via `onAuthStateChange` (with cleanup)
- DB types are auto-generated at `src/integrations/supabase/types.ts` — never hand-write DB types
- RPC calls used for complex operations: `supabase.rpc('complete_exercise', {...})`

## Error Handling
- `mapDbError(err)` — converts Supabase DB errors to Dutch user messages
- `mapAuthError(err)` — converts Supabase auth errors to Dutch user messages
- `isSubscriptionLimitError(err)` — detects limit errors (shows modal, not toast)
- Top-level `<ErrorBoundary>` catches render errors with forest-themed fallback
- `<ParentErrorBoundary>` wraps all parent portal routes
- No Sentry or external error reporting — errors only log to console

## Known Bug Patterns to Watch For

### React Query
- Mutation succeeds but never calls `invalidateQueries` → stale UI
- Navigate away before invalidation resolves → wrong screen data on return
- Query key missing a scope variable (e.g. `childId`) → data leaks between children
- Over-invalidation in admin mutations (invalidates all `admin-*`) — acceptable but wasteful

### Supabase / Auth
- `onAuthStateChange` fires before `getSession` resolves → brief logged-out flash
- PIN session (`sessionStorage`) not cleared on tab close → stale PIN access
- RLS policy denials are silent (Supabase returns empty data, not an error) — check for `data === null` unexpectedly
- Edge function calls (`supabase.functions.invoke`) have no timeout config

### React / State
- `useEffect` with `// eslint-disable-next-line react-hooks/exhaustive-deps` → intentional stale closure, verify it's correct
- Hard-coded `setTimeout` delays (1500–1800ms) in exercises — not cancelled on unmount, can fire after navigation
- Canvas exercises add many `document` event listeners — verify all are removed in cleanup

### Routing
- `AppStart` redirects to `/app/add-child` if there is no child — timing-sensitive, requires cache to be invalidated before navigation
- Lazy-loaded routes share a single `<Suspense>` fallback — one broken import silently shows spinner forever

### Forms
- Auth forms use manual validation (not Zod) — inconsistent with React Hook Form + Zod used elsewhere
- Form state not reset after failed submission in some screens

## Running Tests
```bash
npm test          # run all tests (Vitest)
npm run lint      # ESLint
```

**What has tests** (72 files under `src/test/`, ~660 cases):
- All 14 exercise screens, plus `Exercise`, `BuddyRoom` (incl. first-visit tour, growth), `Dashboard`, `TabBar`, `Practice`, `BuddyShop`, the Prijzenkast (badge screens), app-route redirects, and the admin + parent portals
- Auth flow (`Auth`, `AuthContext`, `ProtectedRoute`, `AdminRoute`, PIN session, password validation)
- Data hooks (`useCompleteExercise`, `usePracticeMenu`, `useChildInsights` (struggle rule), `ExerciseShell` (saving game-overs/abandons), `useDifficultyLevel`, `useExerciseId`, `useExerciseState`, `useAdminRole`)
- Buddy care system (`buddyState`, `buddyCatalog`, `useBuddy`) — decay/illness/death rules, shop economy, catalog integrity, RPC plumbing
- Pure logic (`generateMathQuestion`, `gradeFromAge`, `seededRandom`, `errorMessages`, `addChildLogic`, Buddy growth + payout copy)
- E2E: `e2e/onboarding.spec.ts` (Playwright) — signup through first exercise only

**What still has NO tests:** `AppStart`, landing pages, `SetupParentPin`, `ResetPassword`, `AuthCallback`; `GameContext` / `CelebrationContext`; the `useSpeech` hook itself beyond its audio cache, online-status, install-prompt and exercise-config hooks.

**Conventions:** shared helpers live in `src/test/testUtils.tsx` (`createTestQueryClient`, `queryWrapper`, `fakeSupabaseChain`). Mock Supabase/auth at the module boundary and assert on behaviour, not implementation. Anchor time-sensitive fixtures to `Date.now()` — hooks that tick against the real clock will decay a fixed past timestamp out from under the test.

## High-Risk Files
| File | Why |
|------|-----|
| `src/context/AuthContext.tsx` | Session state, auth gate for whole app |
| `src/hooks/useCompleteExercise.ts` | Persists progress, triggers 13 query invalidations |
| `supabase/migrations/20261001120000_buddy_centred_practice.sql` | `practice_menu` + `complete_exercise`: unlocking, payouts, wishes, growth — no local DB to test against |
| `src/screens/ExerciseWriteNumber.tsx` | Canvas + edge function + complex state machine |
| `src/screens/ExerciseNumberLine.tsx` | 618 lines, drag interactions, pointer events |
| `src/screens/ExerciseClock.tsx` | Pointer drag, potential missing listener cleanup |
| `src/hooks/useParentPin.ts` | Security-critical PIN verification |
| `src/routes/appRoutes.tsx` | All game routes, lazy loading, Suspense |
| `src/screens/AddChild.tsx` | Onboarding step — must invalidate cache before nav |
| `src/screens/AppStart.tsx` | Timing-sensitive redirect logic |
