# Leapio — Technical Specification

> **Audience:** engineers and architects working on Leapio. Assumes the reader can read the code; this document exists to explain what is where, why it is shaped that way, and where the sharp edges are.
> **Last reviewed:** 2026-09-16 (full re-audit against `main` @ `2593ced`)
> **Companion docs:** [CONTEXT.md](../CONTEXT.md) (domain vocabulary — authoritative for naming), [CLAUDE.md](../CLAUDE.md) (working conventions), [EXERCISES.md](../EXERCISES.md) (didactic design), `wayfinder/buddy-care/` (Buddy Care design tickets).

---

## 1. Project Overview

Leapio is a gamified, Dutch-language (Flemish) learning web app for primary-school children. Children complete short interactive exercises in rekenen (math), lezen (reading) and schrijven (writing), earn XP, stars, badges and Munten, care for a Buddy companion, and progress through three stages (trimesters) per grade. Parents own the account, manage child profiles behind a PIN, set rewards and monitor progress. Admins manage users, subscriptions, exercise difficulty and beta signups.

**Actors**

| Actor | Surface | Entry |
|---|---|---|
| Child | `/app/*` game screens | Parent hands over the device after login |
| Parent | `/app/parent/*` portal, PIN-gated | `/auth` → PIN |
| Admin | `/admin/*` | `user_roles.role = 'admin'` |
| Prospect | `/`, `/beta` landing + signup | Public |

**Product status (matters architecturally):** the app ships as a beta aimed at the Flemish 1ste and 2de leerjaar, but only **grade-1 content actually exists**. `MAX_SUPPORTED_GRADE = 1` in [difficultyConfig.ts](../src/data/difficultyConfig.ts) gates the content-pool exercises and the grade-2 world theme. Grade-2 rows in `exercises` are provisioned per-route by an admin rather than shipped in a migration. Any work that assumes multi-grade content is live is wrong today.

---

## 2. Tech Stack

| Category | Library | Version |
|---|---|---|
| Framework | React | 18.3.1 |
| Language | TypeScript | 5.8.3 |
| Build | Vite (SWC) | 5.4.19 |
| Server state | TanStack React Query | 5.83.0 |
| Backend | Supabase (Postgres + GoTrue + Edge Functions) | 2.101.0 |
| Routing | React Router | 6.30.1 |
| Forms | React Hook Form + Zod | 7.61.1 / 3.25.76 |
| Animation | Framer Motion | 12.38.0 |
| Drag & drop | DnD Kit | 6.3.1 |
| UI | Shadcn/UI + Radix UI (49 primitives) | various |
| Styling | Tailwind CSS | 3.4.17 |
| Toasts | Sonner | 1.7.4 |
| Charts | Recharts | 2.15.4 |
| Icons | Lucide React | 0.462.0 |
| Confetti | canvas-confetti | 1.9.4 |
| Dates | date-fns | 3.6.0 |
| OTP input | input-otp (PIN entry) | 1.4.2 |
| SEO | react-helmet-async | 3.0.0 |
| RUM | @vercel/speed-insights | 2.0.0 |
| Unit/component tests | Vitest + Testing Library | 3.2.4 / 16.0.0 |
| E2E | Playwright | 1.57.0 |
| Hosting | Vercel (SPA) | — |
| AI services | Anthropic (handwriting), ElevenLabs (TTS) | via edge functions |

---

## 3. Project Structure

```
src/
├── screens/            # 34 top-level screens (18 of them exercises)
│   ├── admin/          #  8 admin screens
│   └── parent/         #  8 parent-portal screens
├── components/
│   ├── ui/             # 49 Radix/Shadcn primitives
│   ├── exercise/       # ExerciseShell, ExerciseNumpad, KwadraatGrid
│   ├── buddy/          # BuddyStage, CareActionBar, NeedBar
│   ├── feedback/       # BuddyToast
│   ├── beta/           # BetaSignupForm
│   └── figma/          # ImageWithFallback
├── context/            # AuthContext, GameContext, CelebrationContext
├── hooks/              # 22 hooks (data access, game logic, platform)
├── routes/             # publicRoutes, appRoutes, parentRoutes, adminRoutes
├── data/               # Static config & content pools (9 modules)
├── lib/                # Cross-cutting utilities
│   └── buddy/          # Buddy domain logic (catalog, constants, schedule, state, messages)
├── types/              # game.ts, stage.ts
├── integrations/
│   └── supabase/       # Generated types.ts + client singleton
├── pages/              # Index (landing), NotFound
└── test/               # 67 Vitest files + shared testUtils
supabase/
├── migrations/         # 26 SQL migrations (schema, RLS, RPCs)
└── functions/          # 4 Deno edge functions
e2e/                    # Playwright: onboarding.spec.ts
wayfinder/buddy-care/   # Feature design tickets (001-011)
```

---

## 4. Architecture

### 4.1 Provider & route tree

```
<ErrorBoundary>                         ← outermost; catches anything above the routers
  <QueryClientProvider>                 ← staleTime 30s default
    <TooltipProvider>
      <Toaster /> <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <OfflineBanner />             ← lazy
          <Routes>
            publicRoutes                  /, /beta, /auth, /auth/setup-pin,
                                          /auth/callback, /reset-password
            adminRoutes    <AdminRoute><ParentErrorBoundary><AdminDashboard/>
            parentRoutes   <ProtectedRoute><ParentPinGate><ParentErrorBoundary><ParentLayout/>
            appRoutes      <ProtectedRoute><ErrorBoundary><Layout/>
                                            └── <GameProvider>
                                                  └── <CelebrationProvider>
                                                        └── <Outlet/> + <TabBar/>
            *              NotFound
          </Routes>
          <InstallPrompt />             ← lazy
          <SpeedInsights />
```

Two deliberate placements:

- **`<ErrorBoundary>` sits *inside* `<ProtectedRoute>` for `/app`.** A crashing gameplay screen shows the forest fallback for `/app` only rather than blanking the whole app via the root boundary. The parent and admin trees already did this with `<ParentErrorBoundary>`.
- **`GameProvider` / `CelebrationProvider` live in `Layout`, not in `App`.** They depend on the current child, so they must not mount for unauthenticated or parent-portal routes.

`BuddyFxProvider` (from [useBuddy.tsx](../src/hooks/useBuddy.tsx)) is **not** in the global tree — it is mounted per-screen by `BuddyRoom`. Screens that call `useBuddy()` outside a provider (e.g. `BuddyShop`) fall back to an inert no-op context with a frozen clock, which is safe because nothing they render decays.

### 4.2 State layers

| Layer | What lives here | Technology | Lifetime |
|---|---|---|---|
| Auth session | `user`, `session`, `loading` | AuthContext + GoTrue | localStorage, auto-refreshed |
| Server state | Every DB read | React Query (`staleTime: 30s`) | In-memory, per tab |
| Game state | `selectedAvatar`, `xp`, `level`, `streak`, `badges` | GameContext, derived from `children` + `child_badges` | Per mount |
| Celebration | Reward/promotion popups | CelebrationContext | Per mount |
| Buddy FX + clock | Care animation, one 5s shared tick | BuddyFxContext | Per Buddy screen |
| PIN unlock | `parent_pin_ok` flag | `sessionStorage` | Per tab |
| Form state | Inputs, validation | React Hook Form + Zod (parent/admin), manual (auth screens) | Per mount |
| Exercise state | Answers, lives, progress, status | `useExerciseState` / local `useState` | Per exercise attempt |

### 4.3 Performance decisions already taken

These are load-bearing; removing them regresses something measurable.

| Decision | Where | Why |
|---|---|---|
| `staleTime: 30_000` global | [App.tsx](../src/App.tsx) | Read-mostly data was refetched on every mount (RQ default is 0). Mutations still invalidate explicitly. |
| `manualChunks` for react / supabase / framer-motion / react-query | [vite.config.ts](../vite.config.ts) | One eager import of a heavy lib otherwise silently balloons the main bundle with no build-time signal. |
| `InstallPrompt` + `OfflineBanner` lazy | App.tsx | Both pull in framer-motion; eager import dragged the animation library into the entry chunk. |
| `keepIdentity()` on the Supabase `User` object | [AuthContext.tsx](../src/context/AuthContext.tsx) | GoTrue hands back a *new* `User` on every hourly token refresh; reusing the previous object keeps `user` referentially stable so consumer effects don't fire on a no-op. |
| `useMemo` on the auth context value | AuthContext | Without it every token refresh re-renders the whole authenticated tree including the guards. |
| `child_exercise_stats` RPC | [migration](../supabase/migrations/20260911170000_child_exercise_stats_and_timeout.sql) | Three hooks used to download every attempt row a child had ever produced and aggregate in JS — a payload that grows for the life of the account. |
| One shared 5s clock in `BuddyFxProvider` | useBuddy.tsx | N Buddy consumers on a screen cost one timer, not N. |
| Canvas downscale to 450px long edge | [canvasRecognition.ts](../src/lib/canvasRecognition.ts) | Halves the per-call token cost of handwriting recognition. |
| `statement_timeout = 15s` on `authenticated`/`anon` | migration `20260911170000` | Caps a runaway query instead of holding a connection indefinitely. |

---

## 5. Routing

All route trees are lazy-loaded. Each route has its **own** `<Suspense>` boundary (a shared one meant a single broken import showed an eternal spinner for every route).

### 5.1 Public

| Path | Screen | Notes |
|---|---|---|
| `/` | `pages/Index` | Landing |
| `/beta` | `BetaLanding` | Beta signup → `beta_signups` |
| `/auth` | `Auth` | Email+password sign-up/sign-in, Google OAuth |
| `/auth/setup-pin` | `SetupParentPin` | Accepts `?redirect=` |
| `/auth/callback` | `AuthCallback` | Lands email confirmation + OAuth; the only screen that picks the session up and routes on into onboarding |
| `/reset-password` | `ResetPassword` | |

### 5.2 Child game (`/app/*`) — `<ProtectedRoute>` + `<Layout>`

| Path | Screen |
|---|---|
| `/app` | `AvatarSelection` — redirects to `/app/dashboard` if avatar set, `/app/add-child` if no child |
| `/app/add-child` | `AddChild` |
| `/app/dashboard` | `Dashboard` — hub, daily quests, buddy greeting, stats |
| `/app/map` | `QuestMap` — stage selector, themed per grade |
| `/app/stage/fluisterbos` | → redirect to `/app/stage/fluisterbos/1` |
| `/app/stage/fluisterbos/:stage` | `Fluisterbos` — exercise list for a stage |
| `/app/buddy-room` | `BuddyRoom` |
| `/app/buddy-room/shop` | `BuddyShop` |
| `/app/badges`, `/app/badges/:id` | `BadgeOverview`, `BadgeDetail` |
| `/app/progress` | `Progress` (Recharts) |

Exercise routes, all `/app/exercises/<family>/:id` where **`:id` is the stage number 1–3, not a database id**:

| Family route | Screen | Interaction |
|---|---|---|
| `math` | `Exercise` | Multiple choice |
| `bonds` | `ExerciseNumberBond` | Numpad |
| `split-box` | `ExerciseSplitBox` | Numpad + keyboard listener |
| `subtract-box` | `ExerciseSubtractBox` | Numpad + keyboard listener |
| `sum-split` | `ExerciseSumSplit` | Numpad |
| `comparison` | `ExerciseComparison` | Two variants: pick `<`/`>`/`=`, or fill the missing number via numpad |
| `compare-objects` | `ExerciseCompareObjects` | Pick links/rechts heeft meer, or gelijk |
| `dots` | `ExerciseDotCount` | Tap dots / pick option |
| `number-line` | `ExerciseNumberLine` | Pointer drag (645 lines) |
| `clock` | `ExerciseClock` | Pointer drag + trigonometry |
| `money` | `ExerciseMoney` | DnD Kit (the only DnD Kit consumer left) |
| `write-number` | `ExerciseWriteNumber` | Canvas + recognition edge function |
| `write-digit` | `ExerciseWriteDigit` | Canvas + recognition |
| `write-letter` | `ExerciseWriteLetter` | Canvas + recognition, stroke paths in `letterFilledPaths.ts` |
| `language` | `ExerciseLanguage` | Word/letter matching + TTS |
| `picture-word` | `ExercisePictureWord` | Image→word + TTS |
| `sentence-doctor` | `ExerciseSentenceDoctor` | Tap error, pick correction + TTS |
| `sound-house` | `ExerciseSoundHouse` | Auditory: hear a word, pick begin/middle/end window (TTS-dependent) |

### 5.3 Parent portal (`/app/parent/*`) — `<ProtectedRoute>` → `<ParentPinGate>` → `<ParentErrorBoundary>` → `<ParentLayout>`

`index` → `ParentChildren` · `child/:childId` → `ParentChildDetail` · `rewards` · `subscription` · `add-child` · `account` (incl. account deletion) · `feedback`.

### 5.4 Admin (`/admin/*`) — `<AdminRoute>` → `<ParentErrorBoundary>` → `<AdminDashboard>`

`index` → redirect to `users` · `users` · `subscriptions` · `stats` · `exercises` · `exercises/:familyKey` (`AdminExerciseFamily`, per-family difficulty config editor) · `beta` · `feedback`.

---

## 6. Data Layer

### 6.1 Tables (17)

| Table | Purpose | Key columns |
|---|---|---|
| `profiles` | One row per auth user | `user_type` (parent/teacher), `locale` |
| `children` | Child profiles | `parent_id`, `organization_id`, `grade`, `xp`, `level`, `streak`, `avatar_id`, `max_unlocked_stage`, `pending_promotion`, `last_active_date` |
| `exercises` | Exercise catalogue, one row per (route, grade) | `route`, `grade`, `stage`, `subject`, `xp_reward`, `display_order`, `is_active`, **`config` (jsonb)** |
| `exercise_attempts` | Every attempt | `score`, `max_score`, `stars`, `time_spent_seconds`, `answers` (jsonb) |
| `child_progress` | Per-child, per-subject rollup (**a real table maintained by `complete_exercise`, not a materialized view**) | unique `(child_id, subject)` |
| `trimester_progress` | Per-child, per-grade, per-trimester XP vs threshold | unique `(child_id, grade_level, trimester_number)` |
| `badges` / `child_badges` | Badge definitions / per-child progress | `progress`, `is_unlocked`, `unlocked_at` |
| `rewards` | Parent-defined goals ("do N of subject X") | `required_exercises`, `current_progress`, `is_completed` |
| `buddy_states` | One Buddy per child | `needs` (jsonb), `inventory` (jsonb), `munten`, `last_tick`, `sleep_until`, `health_zero_since`, `dead` |
| `subscriptions` | Plan + limits | `plan`, `status`, `max_children`, `stripe_*` |
| `organizations` / `organization_members` | School/org ownership path | `org_role` (owner/admin/teacher) |
| `parent_pins` | bcrypt PIN hash per user | `pin_hash` |
| `user_roles` | Platform roles | `app_role` (admin/moderator/user) |
| `feedback` | In-app parent feedback → admin triage | `category`, `status`, `admin_notes` |
| `beta_signups` | Public beta list | `email`, `child_grade`, `source`, `user_agent` |

**Enums:** `app_role`, `org_role`, `user_type`, `subject_type` (`math`/`reading`/`writing`/`other`), `subscription_plan` (`free`/`basic`/`family`/`school`), `subscription_status` (`trialing`/`active`/`past_due`/`canceled`/`expired`), `exercise_status`.

**Stripe columns exist but there is no payment integration in the codebase** — no Stripe SDK, no webhook function. Subscriptions are currently administered by hand via `/admin/subscriptions`.

### 6.2 RPCs

| RPC | Security | Caller | Purpose |
|---|---|---|---|
| `complete_exercise(child, exercise, score, max_score, stars, time_spent, answers)` | DEFINER + explicit ownership guard | `useCompleteExercise` | The single write path for gameplay. Returns `{attempt_id, xp_earned, leveled_up, new_level, streak, all_trimesters_completed, completed_rewards, munten_earned, munten_total}` |
| `child_exercise_stats(child)` | **INVOKER** (deliberate — RLS on `exercise_attempts` does the filtering, so there is no hand-written ownership check to keep in sync) | `useStageExercises`, `useStageMastery`, `useChildInsights` | Per-exercise aggregate: attempts, best stars, avg score, title/subject/stage |
| `buddy_get_or_create(child)` | DEFINER + `parent_id = auth.uid()` | `useBuddy` | Ticks and returns the Buddy row, creating it on first call |
| `buddy_care(child, action, item_id)` | DEFINER + ownership | `useBuddy` | Applies one Care Action; consumes a Care Item |
| `buddy_buy(child, item_id)` | DEFINER + ownership | `useBuddy` | Spends Munten, adds to inventory |
| `buddy_revive(child)` | DEFINER + ownership | `useBuddy` (parent portal) | Resets Needs to `REVIVAL_LEVEL`, clears death |
| `has_parent_pin()` / `set_parent_pin(pin)` / `verify_parent_pin(pin)` | DEFINER | `useParentPin` | bcrypt PIN lifecycle |
| `has_role(user, role)` | DEFINER | RLS policies, `useAdminRole` | Role check used inside policies |
| `_buddy_ensure_row`, `_buddy_tick`, `_buddy_item`, `_buddy_window_hours` | DEFINER, **EXECUTE revoked from `anon`/`authenticated`** | Internal only | Buddy simulation internals |

### 6.3 Exercise resolution chain

A child navigating to `/app/exercises/math/2` triggers three independent lookups:

1. **`useExerciseId()`** — strips `/app`, looks up `exercises` by `(route = '/exercises/math/2', grade = child.grade)`, `staleTime: Infinity`. Yields the UUID that `complete_exercise` needs.
2. **`useExerciseConfig(DEFAULT_MATH_SUMS)`** — same `(route, grade)` lookup, reads `config` jsonb. **Falls back to the `DEFAULT_*` literal** when the row has no config yet, so an unprovisioned grade never breaks the exercise.
3. **`useDifficultyLevel()`** — derives `{grade, stage, key}` from `child.grade` + the `:id` param, clamped to 1–3. Used by the two exercises that are *not* DB-driven.

> **Difficulty is DB-driven as of 2026-08-31.** The old static `MATH_SUMS_CONFIG["1-2"]`-style tables are gone. `src/data/difficultyConfig.ts` now only exports `DEFAULT_*` fallbacks plus `MAX_SUPPORTED_GRADE` / `clampToSupportedGrade`. Admins tune live values through `/admin/exercises/:familyKey`. `ExerciseLanguage` and `ExerciseSentenceDoctor` are exceptions — their word/sentence pools are grade-1 vocabulary by construction and still use `clampToSupportedGrade` directly.

### 6.4 React Query key registry

```typescript
// Auth / identity
['my-child', userId]                      ['my-children']
['has-parent-pin', userId]                ['user-role', userId]

// Exercise catalogue — route- AND grade-scoped, because `route` alone
// no longer identifies a row
['exercise-id', dbRoute, grade]           ['exercise-config', dbRoute, grade]

// Child progress
['stage-exercises-progress', childId, stage, grade]
['stage-mastery', childId, maxUnlockedStage, grade]
['child-progress', childId]               ['trimester-progress', childId, grade]
['child-insights', childId]               ['recent-attempts', childId]
['daily-quest-attempts-today', childId, todayKey]
['daily-quest-subject-week', childId, todayKey]

// Gamification
['game-badges', childId]                  ['child-rewards', childId]
['buddy-state', childId]

// Parent portal
['parent-children', userId]               ['parent-children-count', userId]
['parent-child', childId]                 ['parent-child-progress', childId]
['parent-child-trimesters', childId]      ['parent-buddy-state', childId]
['parent-rewards', userId]                ['parent-profile', userId]
['parent-subscription', userId]           ['parent-subscription-detail', userId]
['feedback', userId]

// Admin (unscoped — admin sees everything)
['admin-children']    ['admin-profiles']        ['admin-roles']
['admin-subscriptions']                          ['admin-subscriptions-detail']
['admin-stats']        ['admin-exercises']       ['admin-exercise-family', routePrefix]
['admin-beta-signups'] ['admin-feedback']
```

Note the parent portal keeps its **own** `parent-*` copies of child data rather than reusing the gameplay keys — the portal reads any child, gameplay reads "the" child. That is why `useCompleteExercise` has to invalidate both families.

Every child-scoped key carries `childId`; every parent-scoped key carries `userId`. Grade is part of catalogue keys because `route` alone no longer identifies a row.

### 6.5 Invalidation fan-out on exercise completion

`useCompleteExercise.onSuccess` invalidates **14** keys, then fires celebrations:

```
stage-exercises-progress · child-progress · trimester-progress
my-child · my-children · recent-attempts
child-rewards · parent-rewards · parent-rewards+userId
parent-children · parent-children+userId
game-badges · child-insights · buddy-state
```

Then, in order: reward popups → promotion popup → Munten buddy-toast → level-up buddy-toast → streak-milestone buddy-toast (milestones: 3, 5, 7, 10, 14, 30).

Note `['stage-mastery', …]` is **not** in the list — the only place that invalidates it is the admin exercise-family editor. It is keyed on `child.max_unlocked_stage`, and `['my-child']` *is* invalidated, so it re-keys indirectly, but only when that column actually changes. Mastery counts derived from attempt counts can therefore lag by up to `staleTime` (30s) after a completion. If a stage ever fails to unlock immediately after the last exercise of the previous one, this is the first place to look.

---

## 7. Auth & Security

### 7.1 Flow

1. `/auth` — email+password or Google OAuth. Both redirect to `${origin}/auth/callback`.
2. With email confirmation enabled, `signUp` resolves **without a session**; `AuthProvider.signUp` returns `needsEmailConfirmation` so the caller does not push an unauthenticated user into onboarding.
3. `/auth/callback` picks the session up and routes onward to PIN setup / add-child.
4. `/auth/setup-pin` — 4-digit PIN, validated and bcrypt-hashed server-side by `set_parent_pin`.
5. `/app/add-child` → `/app` (`AvatarSelection`) → `/app/dashboard`.

`AuthProvider` registers `onAuthStateChange` **before** calling `getSession()`, and locks the PIN session on `SIGNED_OUT` / `USER_UPDATED`.

### 7.2 Route guards

| Guard | Mechanism | Failure |
|---|---|---|
| `<ProtectedRoute>` | `user && !loading` | → `/auth` |
| `<ParentPinGate>` | `parentPinSession.isUnlocked()` | PIN entry, or → `/auth/setup-pin?redirect=…` if no PIN exists |
| `<AdminRoute>` | `useAdminRole()` → `user_roles` | → `/app/dashboard` |

### 7.3 PIN system

```typescript
parentPinSession.isUnlocked()  // sessionStorage['parent_pin_ok'] === '1'
parentPinSession.unlock() / .lock()
```

- Verification is server-side bcrypt (`verify_parent_pin`); the PIN never lives in client storage — only the boolean unlock flag does.
- Client throttle: 5 attempts → 60s lockout.
- **The throttle is component state.** `attempts` and `lockedUntil` are `useState` inside `ParentPinGate`, so a page reload resets both, and there is no server-side attempt counter or rate limit on `verify_parent_pin`. A 4-digit PIN with unlimited server-side attempts is brute-forceable. See §13 R1.
- The unlock flag survives for the tab's lifetime; it is not cleared on tab close beyond `sessionStorage` semantics, and any tab that shares the session is unlocked.

### 7.4 Authorization model

Three enforcement layers, in order of trust:

1. **RLS on every table.** `children` is reachable via `parent_id = auth.uid()` *or* membership in `children.organization_id`; child-owned tables (`exercise_attempts`, `child_badges`, `child_progress`, `rewards`, `buddy_states`, `trimester_progress`) are filtered through the child. `exercises` is readable by any authenticated user, writable only by `has_role(auth.uid(), 'admin')` — that admin write policy was added in `20260831140000`, before which the `is_active` toggle in `AdminExercises` had no RLS backing at all.
2. **Explicit guards inside `SECURITY DEFINER` RPCs.** Any DEFINER function taking a client-supplied `p_child_id` must re-check ownership itself, because RLS does not apply inside it. `complete_exercise` gained this guard in `20260911160000`; before that, any authenticated user could award XP, streak, badges, rewards and Munten to *any* child id.
3. **Edge functions** verify the caller with an anon-key client bound to the request's `Authorization` header, then escalate to a service-role client. `admin-delete-user` additionally requires an `admin` row in `user_roles` (403 otherwise). `delete-account` acts on the caller's own user only.

**Known inconsistency:** the four `buddy_*` RPCs require `children.parent_id = auth.uid()` and reject org-owned children (`parent_id IS NULL`), while `complete_exercise` accepts either the parent *or* an org member. An org-owned child therefore earns Munten on every completion but gets `Not authorized` when opening the Buddy Room. See §13 R2.

### 7.5 RLS failure mode

An RLS denial is not an error. Supabase returns `[]` or `null` with `error === null`. Code must treat an unexpected empty result as a possible authorization failure, not as "no data". `useStageMastery` is the model to copy: it surfaces `isError` explicitly so callers can tell "no stages yet" apart from "the query failed" — without it, a backend outage rendered as every stage being locked.

### 7.6 Secrets & configuration

| Variable | Where | Notes |
|---|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | Client bundle | Public by design; safety rests entirely on RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge functions only | Never in the client |
| `ANTHROPIC_API_KEY` | `recognize-digit` | Server-side only |
| `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `ELEVENLABS_MODEL_ID` | `synthesize-speech` | Voice/model overridable per environment |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` (GitHub secrets) | Keep-alive workflow | |

`.env` and `.env.*` are gitignored. The local `.env` carries both prefixed and unprefixed copies of the URL/key pair; only the `VITE_`-prefixed ones reach the bundle.

---

## 8. Exercise System

### 8.1 Completion flow

1. Route mounts → `useExerciseId()`, `useExerciseConfig()`, `useDifficultyLevel()` resolve (§6.3).
2. Questions are generated client-side from the resolved config, seeded where reproducibility matters (`seededRandom.ts`).
3. Child answers → correct/incorrect feedback: confetti + `progress += step`, or `lives -= 1`.
4. Progress reaches 100% **or** lives hit 0 → `completeExercise.mutate({exerciseId, score, maxScore, stars, timeSpent, answers})`. Stars map from remaining lives (3/2/1). Partial results *are* persisted on game over.
5. `complete_exercise` runs the whole gameplay transaction server-side (§8.2).
6. `onSuccess` → 14 invalidations → celebrations → navigate back to the stage screen.

### 8.2 What `complete_exercise` does (one round-trip, one transaction)

Insert `exercise_attempts` → upsert `child_progress` → upsert `trimester_progress` (and set `pending_promotion` when all three trimesters of the grade are complete) → single `UPDATE children` for xp/streak/`last_active_date`/level → advance matching `rewards` → upsert badges → ensure+tick the Buddy row and add Munten → return the aggregate result.

Design points worth preserving:

- **Level is computed inline** as `GREATEST(level, FLOOR(new_xp / 1000) + 1)`, algebraically identical to the old `WHILE xp >= level * 1000` loop but in the same statement as the XP update. `GREATEST` keeps a level from ever going backwards.
- **Streak** is computed against `(now() AT TIME ZONE 'Europe/Amsterdam')::date`, so a child's day boundary is Belgian local midnight, not UTC.
- **Badges:** `first-steps` is insert-once; `goal-oriented`/`book-master`/`legend`/`fire-streak` are absolute values recomputed in one multi-row upsert; `perfect` and `speed` increment by one and must stay separate because their `ON CONFLICT` expression reads the existing row.
- **Deliberately not async.** Moving badge/reward work off the request path would make unlocks eventually consistent and change what a child sees the instant they finish.
- **Trimester number** is parsed out of `exercises.stage` (`'stage-2'` → 2), clamped to 1–3.

### 8.3 Handwriting recognition

`ExerciseWriteNumber` / `ExerciseWriteDigit` / `ExerciseWriteLetter`:

canvas pointer strokes → `canvasToRecognitionBase64()` (downscale to ≤450px long edge, keep the transparent background because that is what the model has always received) → `invokeFunction('recognize-digit', …)` → edge function calls Anthropic `claude-haiku-4-5` with a lenient children's-handwriting prompt → `{recognized: number | null}`.

Every edge-function call goes through [invokeFunction.ts](../src/lib/invokeFunction.ts), which enforces a **12s deadline** (8s for TTS) and throws `EdgeFunctionTimeoutError` so a screen can offer a retry instead of leaving a child staring at a frozen question forever.

### 8.4 Text-to-speech

`useSpeech` / `speakText` calls the `synthesize-speech` edge function (ElevenLabs, Flemish voice), plays the returned base64 MP3, and **falls back to the Web Speech API** (`nl-NL`, rate 0.75) if the function fails. `lib/speechUnlock.ts` is imported by `Layout` for its side effect: iOS Safari requires a user gesture before any audio can play. Consumers: `ExerciseSoundHouse` (where audio is the exercise, not an enhancement), `ExerciseLanguage`, `ExercisePictureWord`, `ExerciseSentenceDoctor`, `BuddyBubble`, `BuddyToast`.

---

## 9. Buddy Care Subsystem

The newest and most stateful feature (migrations `20260911120000`, `20260914120000`; design in `wayfinder/buddy-care/`). **[CONTEXT.md](../CONTEXT.md) is authoritative for its vocabulary** — Avatar vs Buddy, Need, Care Action, Care Item, Eikel, Illness, Death, Buddy Room.

### 9.1 Model

Five **Needs** on 0–100: Hunger, Fun, Energy, Hygiene, Health. The first four decay on a timer; **Health has no timer of its own** — it drops only as a consequence of another Need sitting below `CRITICAL_THRESHOLD` (20), and regenerates while none is critical.

| Constant | Value | Meaning |
|---|---|---|
| `DECAY_PER_HOUR` | hunger 3, fun 2.5, energy 2, hygiene 1.5 | Per **active** hour |
| `ENERGY_PER_NIGHT_HOUR` | 4 | Energy charges overnight |
| `CRITICAL_THRESHOLD` | 20 | Below this a Need is critical |
| `HEALTH_DROP_PER_HOUR` | 2 | Per critical Need, per active hour |
| `HEALTH_REGEN_PER_HOUR` | 6 | While nothing is critical |
| `DEATH_AFTER_HOURS` | 24 active hours (≈2 school days) | Health at 0 for this long → Death |
| `SLEEP_MINUTES` | 30 | Normal rest duration; a sleep-comfort item shortens it by its `strength` % |
| `REVIVAL_LEVEL` | 55 | Needs after a parent revival (partial, not full) |
| `STARTING_MUNTEN` / per exercise | 40 / 8 | Economy |

### 9.2 Care Window — the clock only runs during school hours

Decay is **not** wall-clock. `lib/buddy/schedule.ts` and the SQL `_buddy_window_hours` implement identical windows:

- **Active hours:** Mon–Fri 07:00–19:00 `Europe/Amsterdam`. Needs decay.
- **Night (19:00–07:00, every day):** nothing decays, Energy charges.
- **Weekend daytime:** counts for neither. Free.
- Both sides clamp any span to 400 days as a safety net against a broken clock or a restored backup.

The effect: one visit per school day is comfortably enough, a skipped weekday is survivable, two in a row are not, and a free Saturday never costs a Buddy its life.

### 9.3 Client/server split

Simulation is **server-authoritative**. Decay, pricing, inventory and death are only ever committed by the RPCs, so a child cannot manipulate them from the client. The client mirror in `lib/buddy/state.ts` (`tick`, `applyCare`, `buyItem`, `moodOf`, `buddyCue`) exists to render a smooth live countdown between round-trips — it never persists anything.

This is a deliberate duplication with a maintenance cost: **the TS and SQL implementations of decay, the care window and the death rule must be changed together.** The migration headers and module docstrings cross-reference each other for exactly this reason.

### 9.4 Catalogue & economy

15 Care Items — five categories (food, toy, sleep-comfort, medicine, hygiene) × three strengths (≈15 / 35 / 70 Need points at 5 / 12 / 25 Munten). Feed, Play, Medicine and Wash **require** spending an item; **Sleep is free** and an item only shortens it. `buddy_care` re-validates category-vs-action and inventory server-side.

### 9.5 Presentation

`BuddyRoom` mounts `BuddyFxProvider` and renders `BuddyStage` (mood animation + care FX), `NeedBar` ×5 and `CareActionBar`. `buddyCue()` picks the single signal the Buddy shows, with fixed priority: **dead > napping > ill > night > lowest critical Need**. Night deliberately ranks below Illness so a sick Buddy can still ask for medicine after 19:00. `lib/buddy/messages.ts` holds the Dutch copy per mood and cue.

### 9.6 Naming divergence (open)

CONTEXT.md makes **Eikel** the canonical currency name, but the code and schema say `munten` throughout (`buddy_states.munten`, `STARTING_MUNTEN`, `MUNTEN_PER_EXERCISE`, and the user-facing string `"+N Munten voor je Buddy!"`). Either the domain doc or the implementation is wrong; today children see "Munten". See §13 R3.

---

## 10. Cross-Cutting Concerns

### 10.1 Error handling

| Function | Maps |
|---|---|
| `mapAuthError(err)` | Supabase auth codes → Dutch |
| `mapDbError(err)` | Postgres error codes → Dutch |
| `isSubscriptionLimitError(err)` | Matches `"subscription limit reached"` in the message → show `<SubscriptionLimitDialog>`, not a toast |

The subscription limit is enforced by the `enforce_max_children` **trigger** on `children`, which raises `'Subscription limit reached: max % children allowed'`. The client detects it by **substring match on that message** — a fragile coupling between a SQL string literal and a TS predicate. See §13 R5.

Boundaries: `<ErrorBoundary>` (root, and again inside `/app`) with a forest-themed fallback; `<ParentErrorBoundary>` for the parent and admin trees. **No external error reporting** — no Sentry, no log drain. Production render errors and RLS anomalies are invisible to the team. See §13 R4.

### 10.2 Offline & PWA

`manifest.json`, `icon-192/512`, theme-color and Apple meta tags are in place, and `useInstallPrompt` / `<InstallPrompt>` drive an A2HS prompt. `useOnlineStatus` / `<OfflineBanner>` surface connectivity.

**There is no service worker.** The app is installable but not offline-capable: an installed Leapio opened without connectivity shows a browser error, not the banner. The banner only helps a tab that is already loaded. See §13 R6.

### 10.3 SEO & marketing surface

`<SEO>` (react-helmet-async) plus `public/sitemap.xml` and `robots.txt`. `index.html` still carries Lovable scaffold leftovers: `meta name="author" content="Lovable"`, `twitter:site @Lovable`, `og:description "Lovable Generated Project"`, an OG image on a `pub-*.r2.dev` preview URL, and a `<!-- TODO: Update og:title -->`. Anything shared from Leapio today previews as a Lovable project. `SEO-AUDIT.md` covers this separately.

---

## 11. Testing & Quality Gates

### 11.1 Current state — verified by running it

`npm test`: **67 test files, 554 cases — 553 pass, 1 skipped**, ~31s. (13 unhandled GoTrue rejections are logged as noise from mocked auth in `parentPinSession.test.ts`; they do not fail the run.)

**Covered:** all 18 exercise screens · `Exercise`, `Dashboard`, `Fluisterbos`, `QuestMap` · the full admin portal (8 screens) · the full parent portal (8 screens) · auth (`Auth`, `AuthContext`, `ProtectedRoute`, `AdminRoute`, PIN session, password validation) · data hooks (`useCompleteExercise`, `useDailyQuests`, `useStageExercises`, `useStageMastery`, `useChildInsights`, `useTrimesterProgress`, `useDifficultyLevel`, `useExerciseId`, `useExerciseState`, `useAdminRole`, `useBuddy`) · Buddy logic (`buddyState`, `buddySchedule`, `buddyCatalog`) · pure logic (`generateMathQuestion`, `gradeFromAge`, `seededRandom`, `errorMessages`, `worldThemes`, `dailyQuests`, `addChildLogic`, `canvasRecognition`).

**Not covered:** `BuddyRoom` / `BuddyShop` screens · `AvatarSelection` · `Progress` · badge screens · landing pages · `AuthCallback` / `ResetPassword` · `GameContext` / `CelebrationContext` · the speech, online-status, install-prompt, greeting and exercise-config hooks · **the SQL itself** (no pgTAP; `complete_exercise` and the `buddy_*` RPCs are only exercised through mocks).

**E2E:** `e2e/onboarding.spec.ts` covers signup through the first exercise. Nothing else.

**Conventions:** shared helpers in `src/test/testUtils.tsx` (`createTestQueryClient`, `queryWrapper`, `fakeSupabaseChain`). Mock Supabase/auth at the module boundary; assert behaviour, not implementation. Anchor time-sensitive fixtures to `Date.now()` — Buddy hooks tick against the real clock and will decay a fixed past timestamp out from under a test.

### 11.2 The gate that does not exist

```bash
npm test        # Vitest — passes
npm run lint    # ESLint
npm run build   # vite build — does NOT type-check (SWC strips types)
# there is no `npm run typecheck`
```

`npx tsc --noEmit -p tsconfig.app.json` currently reports **17 errors**, and nothing in the build or CI runs it. Two are genuine stale-type bugs in shipping code:

- `src/integrations/supabase/types.ts` **does not contain `child_exercise_stats`**, so all three hooks that call it are type-errors and their result rows are typed `Json`. The generated types have not been regenerated since migration `20260911170000`.
- `Cannot find name 'BuildQuestion'` in `src/data/sentenceDoctorSentences.ts:22` and `Cannot find name 'Question'` in `src/screens/ExerciseSentenceDoctor.tsx:78` — type-only references to names that no longer exist.

The rest are in test files (mock-typing drift).

The only GitHub Actions workflow is `Supabase Keep-Alive` — a cron ping (Mon/Thu 08:00 UTC) that keeps the free-tier project from pausing, because a project left paused long enough is permanently deleted with no backups, which has already wiped `auth.users` once. **No workflow runs lint, tests, or type-checking on a push or PR.** See §13 R7.

---

## 12. Build, Deploy & Environments

| Concern | Current setup |
|---|---|
| Build | `vite build` (SWC). Vendor chunks: react, supabase, framer-motion, react-query |
| Host | Vercel; `vercel.json` rewrites everything to `/index.html` (SPA) |
| Dev server | Vite on port 8080, host `::`, HMR overlay off |
| RUM | `@vercel/speed-insights` |
| Migrations | Applied via Supabase CLI against a single hosted project. No staging project, no migration step in CI |
| DB safety | Free tier: **no automated backups.** The keep-alive workflow is the only thing standing between an idle period and permanent data loss |
| Lovable | `lovable-tagger` runs in dev mode only; `.lovable/` and scaffold metadata remain |

Single environment. A migration lands in production the moment it is pushed, and `main` is the deploy branch.

---

## 13. Known Risks & Technical Debt

Ordered by what I would fix first. Severity is about blast radius, not effort.

### R1 · PIN throttle is client-side only — **High (security)**
`ParentPinGate` keeps `attempts` and `lockedUntil` in component state, so reloading the page resets the lockout, and `verify_parent_pin` has no server-side counter. A 4-digit PIN is 10 000 candidates.
**Fix:** move the counter server-side — a `pin_attempts` column (or table) on `parent_pins`, incremented inside `verify_parent_pin` and reset on success, with a timestamped lockout the RPC itself enforces.

### R2 · Org-owned children cannot use the Buddy Room — **High (correctness)**
The four `buddy_*` RPCs require `children.parent_id = auth.uid()`; `complete_exercise` accepts parent *or* org member. An org-owned child (`parent_id IS NULL`) earns Munten on every completion and gets `Not authorized` opening the Buddy Room.
**Fix:** extract the ownership predicate `complete_exercise` uses into one shared SQL function and call it from all five. The duplicated inline check is exactly how this drifted.

### R3 · Munten vs Eikel — **Medium (product/domain)**
CONTEXT.md declares **Eikel** canonical; the schema column, the TS constants and the user-facing toast all say **Munten**. Children currently see "Munten".
**Fix:** decide, then make one change. If Eikel wins, rename the TS constants and every Dutch string now and keep `buddy_states.munten` as a legacy column name — renaming a live column for vocabulary is not worth the migration risk.

### R4 · No production error visibility — **Medium**
No Sentry, no log drain. Render errors reach the forest fallback and disappear; a silent RLS denial looks like empty data. Combined with R5, a subscription-limit regression would surface as "nothing happens" with nothing to read.
**Fix:** wire an error reporter into both boundaries and `mapDbError`.

### R5 · Subscription limit detected by string match — **Medium**
`isSubscriptionLimitError` substring-matches `'subscription limit reached'` against the exception text raised by the `enforce_max_children` trigger. Reword the SQL and the limit dialog silently becomes a generic toast.
**Fix:** raise with a dedicated `SQLSTATE` (e.g. a `P0001` variant or a custom class) and match on the code.

### R6 · PWA is installable but not offline-capable — **Medium**
Manifest, icons, install prompt and an offline banner all present; no service worker. An installed Leapio opened without connectivity shows a browser error page — the worst possible impression of the feature we advertise.
**Fix:** either add a minimal precache worker (app shell + avatars + picture pool) or drop the install prompt until one exists.

### R7 · Nothing gates a push — **Medium (process)**
No CI runs lint, tests or `tsc`. The project does not currently type-check (17 errors), which the Vite/SWC build cannot catch because it strips types without checking them.
**Fix, in order:** add `"typecheck": "tsc --noEmit -p tsconfig.app.json"`; regenerate `src/integrations/supabase/types.ts` (this alone clears the `child_exercise_stats` errors and restores typing on three hooks); fix the two dangling type names; add a PR workflow running lint + typecheck + test.

### R8 · Uncancelled timers that navigate and mutate — **Medium**
`useExerciseState` fires two bare `setTimeout`s that call `completeExercise.mutate()` and `navigate()`. Neither is cleared on unmount, and the hook backs most exercise screens. Five screens also keep their own uncleared timers: `Exercise`, `ExerciseCompareObjects`, `ExerciseComparison`, `ExerciseDotCount`, `ExerciseWriteNumber`. A child who taps back during the feedback pause gets a stray navigation, and possibly a duplicate attempt row.
**Fix:** hold the handle in a ref and clear it in a cleanup effect — the pattern the other 13 screens already use.
*Pointer/keyboard listeners are, by contrast, balanced everywhere now (`ExerciseClock` 2/2, `ExerciseWriteNumber` 7/7, `ExerciseSplitBox` and `ExerciseSubtractBox` 1/1) — the old "possible listener leak" risk is resolved.*

### R9 · Buddy logic duplicated in TS and SQL — **Medium (by design, needs guarding)**
Decay rates, the care window, the death rule and item strengths exist in `lib/buddy/*` and in the migrations. The split is correct (server authority + smooth client countdown), but the two can silently diverge, and divergence shows up as a Buddy that dies on screen and revives on refresh. `MUNTEN_PER_EXERCISE = 8` is also hard-coded as a literal `8` in `complete_exercise`.
**Fix:** a test that asserts the TS constants against values read from the DB, or generate one side from the other. At minimum, a comment block in both places listing every paired constant.

### R10 · `exercises.config` has no schema validation — **Medium**
`useExerciseConfig` casts the `jsonb` straight to the exercise's config type. An admin saving a malformed config through `/admin/exercises/:familyKey` ships a runtime error into a child's exercise, with a Suspense spinner or a crashed boundary as the only feedback.
**Fix:** Zod-parse the config per family at the boundary and fall back to `DEFAULT_*` on a parse failure, which is the behaviour the hook already promises for a missing row.

### R11 · Catalogue queries fire before the child resolves — **Low**
`useExerciseId` and `useExerciseConfig` default `grade` to 1 and have no `enabled` guard, so each issues one query keyed on grade 1 before `useCurrentChild` settles, then a second on the real grade. Harmless for grade-1 users (everyone, today) and self-correcting because grade is in the key — but it doubles the request and will look like a flash of wrong difficulty once grade 2 is live.
**Fix:** `enabled: isFetched` on both, as `useStageExercises` does.

### R12 · Stripe columns with no integration — **Low**
`subscriptions.stripe_customer_id` / `stripe_subscription_id` and the full plan/status enums exist; there is no Stripe SDK, no checkout, no webhook. Plans are set by hand in `/admin/subscriptions`. Fine as a placeholder — worth an explicit note so nobody assumes billing works.

### R13 · Lovable scaffold metadata in `index.html` — **Low (but public)**
`author: Lovable`, `twitter:site: @Lovable`, `og:description: "Lovable Generated Project"`, an OG image on a `r2.dev` preview URL, and an unresolved `TODO` on `og:title`. Every shared link previews as a Lovable project.

### R14 · Dead code in `GameContext` — **Low**
`hexToColorClass(hex)` ignores its argument and returns the constant `'bg-slate-400'`; badge colours come from `gradientFrom`/`gradientTo` anyway. `GameContext` also re-exports `avatars`/`badgesData` "for backwards compatibility" and mirrors `dbBadges` into `useState` via an effect when a derived value would do.
*(The `child as any` assertion previously flagged here is gone — `useCurrentChild` now returns a properly typed `Pick<Tables<'children'>, …>`.)*

### R15 · `zzdebug.test.tsx` and stray build artefacts — **Low**
A debug test file ships in the suite, and ~90 `vitest.config.ts.timestamp-*.mjs` files sit in the repo root. Cosmetic, but they make `ls` and test output noisy.

### 13.1 High-risk files

| File | Lines | Why |
|---|---|---|
| `supabase/migrations/…_harden_and_streamline_complete_exercise.sql` | 260 | The entire gameplay write path, and the authorization guard for it |
| `supabase/migrations/…_add_buddy_care.sql` + `…_buddy_care_window.sql` | 594 + 178 | Server-authoritative Buddy simulation; must stay in step with `lib/buddy/*` |
| `src/context/AuthContext.tsx` | 123 | Auth gate for the whole app; listener-before-getSession ordering, referential stability |
| `src/hooks/useCompleteExercise.ts` | 137 | 14 invalidations + every celebration trigger |
| `src/hooks/useBuddy.tsx` | 202 | Optimistic Buddy state, shared clock, three mutations |
| `src/hooks/useExerciseState.ts` | 125 | Shared by most exercises; uncancelled timers (R8) |
| `src/screens/ExerciseNumberLine.tsx` | 645 | Pointer-event drag logic |
| `src/screens/ExerciseWriteLetter.tsx` | 593 | Canvas + stroke paths + recognition |
| `src/screens/ExerciseWriteDigit.tsx` | 536 | Canvas + recognition |
| `src/screens/parent/ParentChildDetail.tsx` | 505 | Multiple queries, insights, revival |
| `src/screens/Dashboard.tsx` | 500 | Many queries, greeting effect, quest state |
| `src/hooks/useParentPin.ts` + `ParentPinGate.tsx` | — | Security-critical (R1) |
| `src/integrations/supabase/types.ts` | 941 | Generated; **currently stale** (R7) |

---

## 14. Architectural Decisions

Decisions already made, with the reasoning, so they are not silently reversed.

| # | Decision | Rationale |
|---|---|---|
| D1 | All gameplay mutation goes through one `SECURITY DEFINER` RPC, synchronously | A child must see badges, level and rewards the instant they finish. Decomposing into async jobs makes unlocks eventually consistent. |
| D2 | Difficulty lives in `exercises.config` (jsonb), with TS `DEFAULT_*` as fallback | Lets non-engineers tune difficulty per grade without a deploy; the fallback means an unprovisioned grade degrades rather than breaks. |
| D3 | Buddy simulation is server-authoritative, mirrored client-side for display only | A child must not be able to cheat decay or prices; the UI still needs a live countdown. Accepted cost: duplicated logic (R9). |
| D4 | Needs decay only inside a Care Window (school hours, weekdays) | The 24/7 model killed Buddies over a weekend through no fault of the child. |
| D5 | Aggregate on the server (`child_exercise_stats`), not in the browser | The per-attempt payload grows for the life of the account. |
| D6 | `:id` in exercise routes is the stage number, not a DB id | Routes stay human-readable and shareable; the UUID is resolved by `(route, grade)`. |
| D7 | The `fluisterbos` URL segment is a legacy slug, not a design statement | Re-parameterizing the URL would touch every `navigate()` call in every exercise for a cosmetic win; themes change what renders, not the route. |
| D8 | Per-route `<Suspense>` boundaries | One shared boundary meant a single broken import showed an eternal spinner everywhere. |
| D9 | `<ErrorBoundary>` inside the `/app` guard, not only at the root | A crashing exercise degrades `/app`, not the whole app. |
| D10 | `child_exercise_stats` is `SECURITY INVOKER` | RLS on `exercise_attempts` already scopes it; no hand-written ownership check to drift. The opposite choice in `complete_exercise` (DEFINER) is what required the R2-style guard. |
| D11 | PIN verified server-side, only a boolean in `sessionStorage` | The PIN itself never touches client storage. |
| D12 | Speech and recognition degrade instead of blocking | `speakText` falls back to Web Speech; `invokeFunction` deadlines at 12s so a child is never stuck. |

---

## 15. Conventions

**React Query**
- Keys are arrays, scoped by resource + `userId`/`childId` (+ `grade` for catalogue reads).
- Every mutation invalidates in `onSuccess`. Never navigate before invalidation is dispatched — `AddChild` must invalidate `['my-child']` before routing, or `AvatarSelection` bounces back to add-child.
- `enabled: !!child?.id` (or `isFetched`) for anything child-scoped.
- Surface `isError` when an empty array and a failure mean different things to the UI.

**Supabase**
- `if (error) throw error` after every call — never swallow.
- DB types are generated. **Regenerate after every migration**; never hand-edit `types.ts`.
- Any `SECURITY DEFINER` function taking a client-supplied id re-checks ownership itself.
- Treat an unexpected empty result as a possible RLS denial.

**Edge functions**
- Always call through `invokeFunction()` so the deadline applies.
- Verify the caller with an anon-key client bound to the request's `Authorization` header before escalating to service-role.

**Error handling**
- User-facing copy is Dutch, via `mapAuthError` / `mapDbError`.
- Subscription limits open `<SubscriptionLimitDialog>`, not a toast.

**Forms**
- React Hook Form + Zod. The auth screens still use manual validation — known debt; new screens should not copy them.

**Buddy**
- Vocabulary comes from CONTEXT.md, not from whatever the code happens to say.
- Any change to decay, the care window, death or item strengths is a **paired** change in `lib/buddy/*` **and** the SQL.

**Timers & listeners**
- Hold every `setTimeout` in a ref and clear it on unmount. Every `addEventListener` gets its `removeEventListener` in the same cleanup.

---

## 16. Suggested Next Steps

A sequence, not a backlog — each step makes the next one safer.

1. **Regenerate `types.ts`, add `npm run typecheck`, fix the 17 errors, add a PR workflow** (R7). Nothing else on this list is verifiable until the type gate exists.
2. **Server-side PIN throttling** (R1). The only genuine security hole.
3. **One shared ownership predicate for all child-scoped RPCs** (R2), which also prevents the next drift of this kind.
4. **Error reporting in both boundaries** (R4), then **replace the subscription-limit string match with a SQLSTATE** (R5) — the second is only safely testable once the first exists.
5. **Fix the uncancelled timers in `useExerciseState`** (R8). Small change, affects nearly every exercise.
6. **Zod-validate `exercises.config`** (R10) before grade-2 provisioning makes malformed configs likely.
7. **Decide Munten vs Eikel** (R3) before more Dutch copy is written against the wrong term.
8. **pgTAP (or equivalent) coverage for `complete_exercise` and the `buddy_*` RPCs.** They hold the most business logic in the system and are currently only tested through mocks.
9. **Service worker, or drop the install prompt** (R6).
10. **Clean `index.html` metadata** (R13) before any real marketing push.
