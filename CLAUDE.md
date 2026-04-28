# EduWorld — Claude Code Context

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
4. `/app` — avatar selection (auto-redirects to `/app/dashboard` if avatar set, back to `/app/add-child` if no child)
5. `/app/dashboard` — main game hub

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
- `child as any` in `GameContext` (line ~47) — type assertion suppressing type check
- Canvas exercises add many `document` event listeners — verify all are removed in cleanup

### Routing
- `AvatarSelection` redirects to `/app/add-child` if `!childLoading && !child` — timing-sensitive, requires cache to be invalidated before navigation
- Lazy-loaded routes share a single `<Suspense>` fallback — one broken import silently shows spinner forever

### Forms
- Auth forms use manual validation (not Zod) — inconsistent with React Hook Form + Zod used elsewhere
- Form state not reset after failed submission in some screens

## Running Tests
```bash
npm test          # run all tests (Vitest)
npm run lint      # ESLint
```

**What has tests:** Math question generation, difficulty config values.  
**What has NO tests:** Components, hooks, auth flow, navigation, Supabase integration, exercise interactions.

## High-Risk Files
| File | Why |
|------|-----|
| `src/context/AuthContext.tsx` | Session state, auth gate for whole app |
| `src/hooks/useCompleteExercise.ts` | Persists progress, triggers 13 query invalidations |
| `src/screens/Dashboard.tsx` | 514 lines, multiple queries, complex state |
| `src/screens/ExerciseWriteNumber.tsx` | Canvas + edge function + complex state machine |
| `src/screens/ExerciseNumberLine.tsx` | 618 lines, drag interactions, pointer events |
| `src/screens/ExerciseClock.tsx` | Pointer drag, potential missing listener cleanup |
| `src/hooks/useParentPin.ts` | Security-critical PIN verification |
| `src/routes/appRoutes.tsx` | All game routes, lazy loading, Suspense |
| `src/screens/AddChild.tsx` | Onboarding step — must invalidate cache before nav |
| `src/screens/AvatarSelection.tsx` | Timing-sensitive redirect logic |
