# EduWorld — Technical Specification

> **Maintainer:** Senior Technical Architect Agent (automated)
> **Last reviewed:** 2026-04-28
> **Source of truth:** This document is auto-updated after each Claude Code session where `src/` files change.

---

## 1. Project Overview

EduWorld is a gamified educational web application for Dutch primary school children (grades 1–6). Children complete interactive exercises in math and language, earn XP, collect badges, and progress through stages. Parents manage child profiles, set PIN access, and monitor progress. Admins manage users and subscriptions.

**Target users:**
- Children (ages 6–12) — primary users
- Parents/guardians — account owners, child management, progress monitoring
- Admins — platform analytics, user management, subscription tracking

---

## 2. Tech Stack

| Category | Library | Version |
|---|---|---|
| Framework | React | 18.3.1 |
| Language | TypeScript | 5.8.3 |
| Build | Vite (SWC) | 5.4.19 |
| Server state | TanStack React Query | 5.83.0 |
| Backend | Supabase (DB + Auth + Edge Functions) | 2.101.0 |
| Routing | React Router | 6.30.1 |
| Forms | React Hook Form + Zod | 7.61.1 / 3.25.76 |
| Animation | Framer Motion | 12.38.0 |
| Drag & Drop | DnD Kit | 6.3.1 |
| UI components | Shadcn/UI + Radix UI | various |
| Styling | Tailwind CSS | 3.4.17 |
| Toasts | Sonner | 1.7.4 |
| Charts | Recharts | 2.15.4 |
| Carousel | Embla Carousel | 8.6.0 |
| Icons | Lucide React | 0.462.0 |
| Confetti | Canvas-Confetti | 1.9.4 |
| Dates | date-fns | 3.6.0 |
| Testing | Vitest + Testing Library React | 3.2.4 / 16.0.0 |
| E2E (unused) | Playwright | 1.57.0 |

---

## 3. Project Structure

```
src/
├── screens/          # 26 full-page components (14 exercise types)
├── components/
│   ├── ui/           # 53 Radix/Shadcn primitives
│   ├── exercise/     # Reusable exercise containers
│   ├── feedback/     # BuddyToast, BuddyBubble
│   └── figma/        # ImageWithFallback, custom Figma-derived components
├── context/          # AuthContext, GameContext, CelebrationContext
├── hooks/            # 15 custom hooks (data fetching + game logic)
├── routes/           # appRoutes, parentRoutes, adminRoutes, publicRoutes
├── data/             # Static config: avatars, badges, buddyMessages, difficultyConfig
├── lib/              # errorMessages, confetti, utils, speechUnlock
├── types/            # game.ts (Avatar, Badge), stage.ts (StageExercise)
├── integrations/
│   └── supabase/     # Auto-generated types.ts + client singleton
└── test/             # Vitest tests (math generation, difficulty config)
```

---

## 4. Architecture

### 4.1 Component Hierarchy

```
<App>
  <QueryClientProvider>
  <BrowserRouter>
    <AuthProvider>
      <ErrorBoundary>
        <Routes>
          ├── publicRoutes           (/auth, /reset-password, /auth/setup-pin)
          ├── <ProtectedRoute>
          │     <Layout>             (provides GameProvider + CelebrationProvider)
          │       <GameProvider>
          │         <CelebrationProvider>
          │           <Outlet />     (all /app/* game screens)
          │         </CelebrationProvider>
          │       </GameProvider>
          │       <TabBar />
          │     </Layout>
          ├── <ProtectedRoute><ParentPinGate>
          │     <ParentErrorBoundary>
          │       parentRoutes       (/app/parent/*)
          └── <AdminRoute>
                <ParentErrorBoundary>
                  adminRoutes        (/admin/*)
```

### 4.2 State Layers

| Layer | What lives here | Technology |
|---|---|---|
| Auth session | `user`, `session`, `loading` | AuthContext + Supabase GoTrue |
| Game state | `selectedAvatar`, `xp`, `level`, `streak`, `badges` | GameContext (derived from DB) |
| Celebration | `rewards`, `promotion` popups | CelebrationContext |
| Server state | All DB data (child, progress, exercises, badges) | React Query |
| Form state | Input values, validation, submit state | React Hook Form + Zod |
| PIN session | `parent_pin_ok` flag | sessionStorage |
| UI state | exercise answers, lives, modal visibility | useState (local) |

---

## 5. Routing

### 5.1 Public Routes

| Path | Screen | Notes |
|---|---|---|
| `/` | `Index` | Landing page |
| `/auth` | `Auth` | Sign-up / sign-in |
| `/auth/setup-pin` | `SetupParentPin` | First-time PIN creation |
| `/reset-password` | `ResetPassword` | Password reset |

### 5.2 Child Game Routes (`/app/*`)

Protected by `<ProtectedRoute>`. All lazy-loaded, shared `<Suspense>` fallback.

| Path | Screen | Notes |
|---|---|---|
| `/app` | `AvatarSelection` | Redirects to `/app/dashboard` if avatar set; to `/app/add-child` if no child |
| `/app/add-child` | `AddChild` | Create child profile; must invalidate `['my-child']` before navigating |
| `/app/dashboard` | `Dashboard` | Game hub, daily quests, buddy greeting, stats |
| `/app/map` | `QuestMap` | Stage selector |
| `/app/stage/fluisterbos/:stage` | `Fluisterbos` | Exercise list per stage |
| `/app/exercises/math/:id` | `Exercise` | Math sums (multiple choice) |
| `/app/exercises/bonds/:id` | `ExerciseNumberBond` | Number decomposition |
| `/app/exercises/language/:id` | `ExerciseLanguage` | Word/letter matching |
| `/app/exercises/dots/:id` | `ExerciseDotCount` | Dot counting / subitizing |
| `/app/exercises/write-number/:id` | `ExerciseWriteNumber` | Canvas handwriting + ML recognition |
| `/app/exercises/number-line/:id` | `ExerciseNumberLine` | Drag onto number line (618 lines) |
| `/app/exercises/comparison/:id` | `ExerciseComparison` | Pick `>` / `<` |
| `/app/exercises/write-digit/:id` | `ExerciseWriteDigit` | Canvas digit drawing |
| `/app/exercises/money/:id` | `ExerciseMoney` | Coin/bill arithmetic |
| `/app/exercises/clock/:id` | `ExerciseClock` | Drag clock hands (387 lines) |
| `/app/exercises/sentence-doctor/:id` | `ExerciseSentenceDoctor` | Fix grammar/spelling |
| `/app/exercises/split-box/:id` | `ExerciseSplitBox` | Number decomposition visual |
| `/app/exercises/picture-word/:id` | `ExercisePictureWord` | Image-to-word matching |
| `/app/exercises/write-letter/:id` | `ExerciseWriteLetter` | Canvas letter drawing + RPC |
| `/app/badges` | `BadgeOverview` | Badge gallery |
| `/app/badges/:id` | `BadgeDetail` | Single badge detail |
| `/app/progress` | `Progress` | Charts & analytics (Recharts) |

### 5.3 Parent Portal Routes (`/app/parent/*`)

Protected by `<ProtectedRoute>` → `<ParentPinGate>`. Wrapped in `<ParentErrorBoundary>`.

| Path | Screen |
|---|---|
| `/app/parent` | `ParentChildren` |
| `/app/parent/child/:childId` | `ParentChildDetail` |
| `/app/parent/rewards` | `ParentRewards` |
| `/app/parent/subscription` | `ParentSubscription` |
| `/app/parent/add-child` | `ParentAddChild` |

### 5.4 Admin Routes (`/admin/*`)

Protected by `<AdminRoute>` (checks `user_roles` table). Wrapped in `<ParentErrorBoundary>`.

| Path | Screen |
|---|---|
| `/admin` | Redirects to `/admin/users` |
| `/admin/users` | `AdminUsers` |
| `/admin/subscriptions` | `AdminSubscriptions` |
| `/admin/stats` | `AdminStats` |

---

## 6. Data Layer

### 6.1 Supabase Tables

| Table | Purpose |
|---|---|
| `children` | Child profiles: name, grade, xp, level, streak, avatar_id, parent_id |
| `exercises` | Exercise definitions: title, subject, stage, xp_reward |
| `exercise_attempts` | Completion history: score, stars, time_spent_seconds, child_id |
| `badges` | Badge definitions: name, icon, gradient, criteria |
| `child_badges` | Per-child badge progress: progress, max_progress, is_unlocked |
| `child_progress` | Materialized view: subject stats (exercises_completed, avg_score, time) |
| `user_roles` | Admin access control |

### 6.2 RPC Calls

| RPC | Called from | Returns |
|---|---|---|
| `complete_exercise(p_child_id, p_exercise_id, p_score, p_max_score, p_stars, p_time_spent, p_answers)` | `useCompleteExercise` | `{attempt_id, xp_earned, leveled_up, new_level, streak, all_trimesters_completed, completed_rewards}` |
| `has_parent_pin()` | `useParentPin` | `boolean` |
| `set_parent_pin(p_pin)` | `useSetParentPin` | void |
| `verify_parent_pin(p_pin)` | `useVerifyParentPin` | `boolean` |

### 6.3 React Query Key Registry

All query keys are arrays scoped by resource + user/child ID:

```typescript
['my-child', user?.id]
['my-children', user?.id]
['game-badges', child?.id]
['child-progress', child?.id]
['stage-exercises-progress', childId, stage]
['trimester-progress', child?.id]
['recent-attempts', child?.id]
['today-attempts', child?.id]
['has-parent-pin', user?.id]
['child-rewards', child?.id]
['parent-rewards', user?.id]
['parent-children', user?.id]
['admin-users']
['admin-subscriptions']
```

### 6.4 Query Invalidation on Exercise Completion

`useCompleteExercise` invalidates 13 query keys on success:

```typescript
['stage-exercises-progress']
['child-progress']
['trimester-progress']
['my-child']
['my-children']
['recent-attempts']
['child-rewards']
['parent-rewards']
['parent-rewards', user?.id]
['parent-children']
['parent-children', user?.id]
['game-badges']
```

---

## 7. Auth & Security

### 7.1 Auth Flow

1. `/auth` — email + password sign-up or sign-in via `supabase.auth`
2. `/auth/setup-pin` — 4-digit parental PIN set server-side (bcrypt-hashed via `set_parent_pin` RPC)
3. `/app/add-child` — create first child profile (inserts to `children`)
4. `/app` — `AvatarSelection` auto-redirects based on `child.avatar_id`
5. `/app/dashboard` — main game hub

Session persisted in localStorage by Supabase. Auto-refreshed by Supabase client.

### 7.2 PIN System

```typescript
// sessionStorage flag set after successful RPC verify
parentPinSession.isUnlocked() // sessionStorage.getItem('parent_pin_ok') === '1'
parentPinSession.unlock()     // set
parentPinSession.lock()       // remove
```

- Max 5 attempts, then 60-second lockout (client-side)
- Server bcrypt-compares via `verify_parent_pin` RPC
- Cleared on `SIGNED_OUT`, `USER_UPDATED`, or manual sign-out
- **Known gap:** not cleared on tab close — stale PIN access possible across tabs

### 7.3 Route Guards

| Guard | Mechanism |
|---|---|
| `<ProtectedRoute>` | Checks `user && !loading`; redirects to `/auth` |
| `<ParentPinGate>` | Checks `parentPinSession.isUnlocked()`; shows PIN entry or redirects to setup |
| `<AdminRoute>` | Checks `useAdminRole()` which queries `user_roles`; redirects to `/app/dashboard` if not admin |

### 7.4 RLS (Row-Level Security)

All data access is DB-level filtered:
- `children` — filtered by `parent_id = auth.uid()`
- `exercise_attempts` — filtered by child's parent
- `child_badges` — filtered by child's parent

**Known risk:** RLS denials return empty data (`null` / `[]`), not errors. Code must check for unexpected nulls explicitly.

---

## 8. Exercise System

### 8.1 Exercise Completion Flow

1. Route `:id` → `useExerciseId()` extracts DB exercise ID
2. `useDifficultyLevel()` derives `grade` (from `child.grade`) + `stage` (from route)
3. Config lookup: `MATH_SUMS_CONFIG["grade-stage"]` or equivalent per exercise type
4. User interacts → correct/incorrect feedback with confetti / life loss
5. All questions done or lives = 0 → `completeExercise.mutate({exerciseId, score, stars, timeSpent})`
6. RPC `complete_exercise` runs server-side: inserts attempt, updates xp/level/streak/badges
7. On mutation success: invalidate 13 queries → celebrations → navigate back

### 8.2 Difficulty Configuration

Math sums example (grade-stage keyed):

| Key | Operators | Max Number |
|---|---|---|
| `1-1`, `1-2` | `+`, `-` | 10 |
| `1-3` | `+`, `-` | 15 |
| `1-4` | `+`, `-` | 20 |
| `2-1` | `+`, `-` | 20 |
| `2-2` | `+`, `-`, `×` | 20 |
| `2-3` | `+`, `-`, `×`, `÷` | 50 |
| `2-4` | `+`, `-`, `×`, `÷` | 100 |

Similar configs exist for: `NUMBER_BOND_CONFIG`, `COMPARISON_CONFIG`, `DOT_COUNT_CONFIG`, `CLOCK_CONFIG`.

### 8.3 Exercise Types

| Type | Interaction | Notable complexity |
|---|---|---|
| Math sums | Click option (4 choices) | Difficulty config + question generator |
| Number bond | Drag parts to target | DnD Kit |
| Language | Click or drag | — |
| Dot count | Click dots or select option | — |
| Write number | Canvas drawing + ML | Edge function, canvas events |
| Number line | Drag onto line | 618 lines, complex pointer events |
| Comparison | Click `>` / `<` | — |
| Write digit | Canvas drawing | Canvas events |
| Money | Drag coins | DnD Kit |
| Clock | Drag clock hands | Trigonometry, 387 lines, pointer events |
| Sentence doctor | Tap errors, select correction | — |
| Split box | Drag/click splits | — |
| Picture word | Match images to words | — |
| Write letter | Canvas drawing + ML | Edge function, canvas events |

---

## 9. Error Handling

### 9.1 Error Mapping (Dutch)

| Function | Source | Maps |
|---|---|---|
| `mapAuthError(err)` | `lib/errorMessages.ts` | Supabase auth codes → Dutch strings |
| `mapDbError(err)` | `lib/errorMessages.ts` | Postgres error codes → Dutch strings |
| `isSubscriptionLimitError(err)` | `lib/errorMessages.ts` | Subscription limit → shows modal, not toast |

### 9.2 Error Boundaries

| Boundary | Scope | Fallback |
|---|---|---|
| `<ErrorBoundary>` | Entire app (top-level) | Forest-themed "Oeps!" + reload button |
| `<ParentErrorBoundary>` | Parent portal + Admin routes | Cleaner error UI + reload button |

No external error reporting (no Sentry). Errors log to console only.

### 9.3 Toast Pattern

```typescript
// Success
toast.success('Goed gedaan! +10 XP');

// Error (in mutation onError)
onError: (e) => toast.error(mapDbError(e) || 'Er ging iets mis.');

// Buddy message
buddyToast.cheer('🔥 10 dagen op rij! Fantastisch!', { duration: 5500 });
```

---

## 10. Testing

### 10.1 What Is Tested

- `generateMathQuestion` — grade constraints, option count, no negative subtraction
- `difficultyConfig` — grade/stage value ranges, no definition gaps

### 10.2 What Is NOT Tested

- Components (no snapshot or unit tests)
- Hooks (`useCompleteExercise`, `useCurrentChild`, etc.)
- Auth flow end-to-end
- Query cache invalidation
- Canvas / pointer event exercises
- Route guards and navigation flows
- Supabase RPC calls

### 10.3 Test Commands

```bash
npm test        # Vitest (run once)
npm run lint    # ESLint
```

---

## 11. Known Risks

### 11.1 High-Risk Files

| File | Risk |
|---|---|
| `src/context/AuthContext.tsx` | Auth gate for entire app; `onAuthStateChange` order sensitivity |
| `src/hooks/useCompleteExercise.ts` | 13 query invalidations; central mutation; RPC result not null-checked |
| `src/screens/Dashboard.tsx` | Multiple queries, complex state, buddy greeting effect |
| `src/screens/ExerciseWriteNumber.tsx` | Canvas events + edge function + state machine |
| `src/screens/ExerciseNumberLine.tsx` | 618 lines; pointer events; potential missing cleanup |
| `src/screens/ExerciseClock.tsx` | Pointer drag; trigonometry; potential listener leak |
| `src/hooks/useParentPin.ts` | Security-critical PIN; sessionStorage persistence risk |
| `src/routes/appRoutes.tsx` | Single Suspense fallback — broken import = infinite spinner |
| `src/screens/AddChild.tsx` | Must invalidate `['my-child']` before navigating |
| `src/screens/AvatarSelection.tsx` | Timing-sensitive redirect on `!childLoading && !child` |

### 11.2 Systemic Risk Patterns

- **RLS silent failures:** `null` / `[]` returned instead of errors — check for unexpected nulls
- **setTimeout not cancelled on unmount:** Exercise screens use 1500–1800ms delays
- **`child as any` in GameContext ~line 47:** Suppresses type checking
- **Edge function calls have no timeout config**
- **PIN not cleared on tab close:** `sessionStorage` persists within tab session only
- **`onAuthStateChange` fires before `getSession` resolves:** Brief logged-out flash on load
- **Lazy-loaded routes share one Suspense boundary:** One broken import silently shows spinner forever

---

## 12. Conventions

### React Query
- Query keys: always arrays, scoped by resource + user/child ID
- Every mutation must call `queryClient.invalidateQueries()` in `onSuccess`
- Never navigate before invalidation resolves
- `enabled: !!child?.id` pattern for child-scoped queries

### Supabase
- Always `if (error) throw error` after every Supabase call
- DB types are auto-generated (`src/integrations/supabase/types.ts`) — never hand-write
- RPC calls: always check `data` is non-null before using

### Error Handling
- User-facing errors in Dutch via `mapAuthError` / `mapDbError`
- Subscription limit errors → modal (not toast) via `isSubscriptionLimitError`

### Forms
- Use React Hook Form + Zod everywhere (auth screens currently deviate — known debt)
- Reset form state after failed async submission
