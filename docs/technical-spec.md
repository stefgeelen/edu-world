# Leapio — Technical Specification

> **Audience:** engineers and architects working on Leapio. Assumes the reader can read the code; this document exists to explain what is where, why it is shaped that way, and where the sharp edges are.
> **Last reviewed:** 2026-10-24 (full review against `main` @ `d1ed0c8`: several children and paused children, Buddy choice, struggle-based Aandachtspunten, game-over pays nothing, 2de leerjaar + Tafels + Herhalen + Meetkunde, test exercises, payout lock-down, release safety + CI, leapio.be, beta-only signup, push notifications; touched `7eb517b`: letterSounds.ts — Buddy zegt letterklank). Previous full review 2026-10-02 @ `ca97805`.
> **Companion docs:** [CONTEXT.md](../CONTEXT.md) (domain vocabulary — authoritative for naming), [CLAUDE.md](../CLAUDE.md) (working conventions), [EXERCISES.md](../EXERCISES.md) (didactic design), [uitleg-oefeningen.md](uitleg-oefeningen.md) (the Buddy's exercise explanations), `wayfinder/buddy-care/` (Buddy Care design tickets), `wayfinder/buddy-centred-app/map.md` (decisions behind the October 2026 redesign), `wayfinder/second-grade/map.md` (2de leerjaar rollout).

---

## 1. Project Overview

Leapio is a gamified, Dutch-language (Flemish) learning web app for primary-school children. **Since October 2026 the child app is built around caring for a Buddy companion**: exercises in rekenen (math), lezen (reading), schrijven (writing) and, since 2026-10-14, meetkunde (geometry) earn Munten, Munten buy care for the Buddy, and the Buddy grows on fixed calendar moments through the school years. The child picks one of four Buddies (Nootje, Vosje, Prikkel, Loeka) and may swap once per school year. Munten and badges are the only rewards the child sees. XP, levels, the streak and trimester progress are still computed server-side, but only the parent portal and the badges read them. Parents own the account, manage child profiles behind a PIN, set rewards, choose which children play when the package is too small, receive push notifications and see Aandachtspunten. Admins manage users and packages, the beta waiting list (who may create an account), exercise difficulty and test/live status, push notifications, and read engagement statistics.

**Actors**

| Actor | Surface | Entry |
|---|---|---|
| Child | `/app/*` game screens | Parent hands over the device after login; "Wie speelt er?" when several children can play |
| Parent | `/app/parent/*` portal, PIN-gated | `/toegang` (`LOGIN_PATH`, unlinked during the beta) → PIN |
| Admin | `/admin/*` | `user_roles.role = 'admin'` |
| Prospect | `/`, `/beta` landing + waiting-list signup, `/privacy`, `/voorwaarden` | Public |

**Product status (matters architecturally):** the app is a closed beta: only an email on the waiting list (`beta_signups`) can create an account (trigger on `auth.users`, §7.1). Content exists for the **1ste and 2de leerjaar**: `MAX_SUPPORTED_GRADE = 2` in [difficultyConfig.ts](../src/data/difficultyConfig.ts) (raised on 2026-10-13, when the parent could start picking the 2de). Grade 2 has its own maths rows (`20261013120000`), Tafels, Helft en dubbel and Meetkunde; its taal (reading/writing) is still open, so a grade-2 child reaches the 1ste-leerjaar reading/writing exercises only through **Herhalen** (§9.8). The beta marketing pages still target the 1ste leerjaar. Grades above 2 have no content.

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
| CI | GitHub Actions (`ci.yml`: tsc, Vitest, build on Node 22) | — |
| AI services | Anthropic (handwriting), ElevenLabs (TTS) | via edge functions |
| Mail | Supabase built-in mailer (auth mails, templates in `supabase/templates/`), Brevo API (beta confirmation) | — |
| Push | Web Push (`npm:web-push` in the edge function, VAPID) | — |

Versions are the `package.json` ranges (unchanged since 2026-10-02).

---

## 3. Project Structure

```
src/
├── screens/            # 41 top-level screens (22 of them exercises) + letterFilledPaths.ts
│   ├── admin/          #  9 files: AdminDashboard (shell) + 8 admin screens
│   └── parent/         #  8 files: ParentLayout + 7 parent-portal screens
├── components/
│   ├── ui/             # 49 Radix/Shadcn primitives
│   ├── exercise/       # ExerciseShell, ExerciseParts (prompt, action bar, Controleer/Wis), ExplainButton,
│   │                   #   SpeakerButton, ExerciseModePicker, ExerciseNumpad, GeometryFigure, CountPicture, KwadraatGrid
│   ├── buddy/          # BuddyStage, CarePanel, GrowthMoment, ExerciseTypeIcon
│   ├── dashboard/      # Vitrine (StarryBackground, Ornaments, Payout) + vitrineStyles — the shared dark look
│   ├── admin/          # ChangePlanDialog, ExerciseConfigForm
│   ├── parent/         # ChooseActiveChildrenDialog, PushNotificationsSettings, PushNudge, TimesTablesCard
│   ├── auth/           # NightSky (onboarding background)
│   ├── legal/          # LegalPage (/privacy, /voorwaarden)
│   ├── feedback/       # BuddyToast
│   ├── beta/           # BetaSignupForm
│   └── figma/          # ImageWithFallback
├── context/            # AuthContext, GameContext, CelebrationContext
├── hooks/              # 28 hooks (data access, game logic, platform)
├── routes/             # publicRoutes, appRoutes, parentRoutes, adminRoutes, paths.ts (APP_PATHS, LOGIN_PATH, exercise origin)
├── data/               # Static config & content pools (10 modules, incl. exerciseExplanations, exerciseConfigFields, letterSounds)
├── lib/                # Cross-cutting utilities (incl. playingChild, geometryQuestions, getalbeeld, reloadOnStaleChunk, push)
│   └── buddy/          # Buddy domain logic (catalog, constants, schedule, state, messages, growth, payout, species)
├── types/              # game.ts
├── integrations/
│   └── supabase/       # Generated types.ts + client singleton
├── pages/              # Index (landing), NotFound (404 in the landing style)
└── test/               # 98 Vitest files + setup.ts + shared testUtils
supabase/
├── migrations/         # 45 SQL migrations (schema, RLS, RPCs)
├── functions/          # 6 Deno edge functions + _shared/requireUser.ts
└── templates/          # Auth mail templates (pasted into Supabase by hand)
e2e/                    # Playwright: onboarding.spec.ts
.github/workflows/      # ci.yml, supabase-keepalive.yml
brand/                  # Logo set (SVG/PNG/PDF) of the 2026-10 L-sprong logo
wayfinder/buddy-care/   # Feature design tickets (001-011)
wayfinder/buddy-centred-app/  # map.md: decisions of the Oct 2026 redesign
wayfinder/second-grade/ # map.md: the 2de-leerjaar rollout
```

---

## 4. Architecture

### 4.1 Provider & route tree

```
main.tsx: installStaleChunkReload()     ← vite:preloadError → reload once (§12)
<ErrorBoundary>                         ← outermost; catches anything above the routers
  <QueryClientProvider>                 ← staleTime 30s default
    <TooltipProvider>
      <Toaster /> <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ActivityTracker />           ← touch_activity ping, throttled
          <OfflineBanner />             ← lazy
          <Routes>
            publicRoutes                  /, /beta, /privacy, /voorwaarden, /toegang (LOGIN_PATH),
                                          /auth (→ /), /auth/setup-pin, /auth/meldingen,
                                          /auth/callback, /reset-password
            adminRoutes    <AdminRoute><ParentErrorBoundary><AdminDashboard/>
            parentRoutes   <ProtectedRoute><ParentPinGate><ParentErrorBoundary><ParentLayout/>
            appRoutes      <ProtectedRoute><ErrorBoundary><Layout/>
                                            └── <GameProvider>          ← badges + the child's Buddy species
                                                  └── <CelebrationProvider>
                                                        └── <Outlet/> + <TabBar/>   ← two tabs; hidden on /app, onboarding, exercises
            *              NotFound (lazy)
          </Routes>
          <InstallPrompt />             ← lazy
          <SpeedInsights />
```

Two deliberate placements:

- **`<ErrorBoundary>` sits *inside* `<ProtectedRoute>` for `/app`.** A crashing gameplay screen shows the forest fallback for `/app` only rather than blanking the whole app via the root boundary. The parent and admin trees already did this with `<ParentErrorBoundary>`.
- **`GameProvider` / `CelebrationProvider` live in `Layout`, not in `App`.** They depend on the current child, so they must not mount for unauthenticated or parent-portal routes.

`BuddyFxProvider` (from [useBuddy.tsx](../src/hooks/useBuddy.tsx)) is **not** in the global tree — it is mounted per-screen by `BuddyRoom`. Screens that call `useBuddy()` outside a provider (`BuddyShop`, `Practice` for the Munten chip) fall back to an inert no-op context with a frozen clock, which is safe because nothing they render decays.

### 4.2 State layers

| Layer | What lives here | Technology | Lifetime |
|---|---|---|---|
| Auth session | `user`, `session`, `loading` | AuthContext + GoTrue | localStorage, auto-refreshed |
| Server state | Every DB read | React Query (`staleTime: 30s`) | In-memory, per tab |
| Game state | `buddy` (the child's species, from `buddy_states.species`), `badges` (avatars and XP/level/streak are gone from the context) | GameContext, derived from `buddy_states` + `child_badges` | Per mount |
| Celebration | Reward popup only (the promotion popup is gone) | CelebrationContext | Per mount |
| Playing child | Which child plays on this device | `localStorage['leapio.playing-child.<userId>']` via `lib/playingChild.ts` (`useSyncExternalStore`; memory fallback) | Per device, per parent |
| Per-device flags | Buddy tour done, last growth stage shown, install-banner dismissal | `localStorage`, keyed per child where relevant | Per device |
| Exercise origin | Dashboard or `/app/oefenen`, where the running exercise returns to | `sessionStorage['leapio.exercise-origin']` + module variable (`paths.ts`) | Per tab |
| Buddy FX + clock | Care animation, one 5s shared tick | BuddyFxContext | Per Buddy screen |
| PIN unlock | `parent_pin_ok` flag | `sessionStorage` | Per tab |
| Spoken-once | Lines the Buddy already read aloud (greeting), per child | `sessionStorage` via `lib/spokenOnce.ts` | Per tab |
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
| In-memory audio cache, last 60 lines | [useSpeech.ts](../src/hooks/useSpeech.ts) | The Buddy repeats a small set of sentences on every tap; without it each repeat was an ElevenLabs call. |
| One `practice_menu` RPC for list + Herhalen + payouts + Wishes | migration `20261001120000`, current version `20261014180000` | One round-trip feeds the Dashboard and the exercise list, and the payout shown is by construction the payout earned. |
| `statement_timeout = 15s` on `authenticated`/`anon` | migration `20260911170000` | Caps a runaway query instead of holding a connection indefinitely. |
| Hashed `/assets/*` cached for a year, everything else `no-cache` | [vercel.json](../vercel.json) | A new release is picked up on the next navigation; old chunks 404 instead of being served `index.html` (§12). |

---

## 5. Routing

All route trees are lazy-loaded. Each route has its **own** `<Suspense>` boundary (a shared one meant a single broken import showed an eternal spinner for every route).

### 5.1 Public

| Path | Screen | Notes |
|---|---|---|
| `/` | `pages/Index` | Landing (night-sky Buddy design). No login button since 2026-10-19 |
| `/beta` | `BetaLanding` | Waiting-list signup → `beta_signups` (records `?bron=`/`utm_source` in `source`), then fires the confirmation mail (§7.6) |
| `/privacy`, `/voorwaarden` | `Privacy`, `Terms` | Static, via `components/legal/LegalPage` |
| `/toegang` (`LOGIN_PATH`) | `Auth` | Email+password sign-up/sign-in, Google OAuth. Deliberately not linked from the public site during the beta |
| `/auth` | — | Redirects to `/` (the old login address) |
| `/auth/setup-pin` | `SetupParentPin` | Accepts `?redirect=`; a first-time PIN continues to `/auth/meldingen?redirect=…` |
| `/auth/meldingen` | `SetupNotifications` | Inside `<ProtectedRoute>`. One-time push question (§10.5); navigates on by itself when status is `on`, `denied` or `unsupported` |
| `/auth/callback` | `AuthCallback` | Lands email confirmation + OAuth; the only screen that picks the session up and routes on into onboarding |
| `/reset-password` | `ResetPassword` | |
| `*` | `pages/NotFound` | 404 in the landing-page style |

Onboarding screens (`/toegang`, `/auth/*`, `/app`, add-child, Wie speelt er?, Kies je Buddy) use the dark night-sky look and a dark Suspense fallback (`LoadingSpinner tone="dark"`).

### 5.2 Child game (`/app/*`) — `<ProtectedRoute>` + `<Layout>`

All child paths live in [paths.ts](../src/routes/paths.ts) (`APP_PATHS`). Before opening an exercise a screen calls `startExerciseFrom(origin)` (the dashboard or `/app/oefenen`, kept in sessionStorage); exercise screens leave through `exerciseExitPath()`, which returns that origin, else the dashboard. No screen hard-codes a return route. `exerciseUrl(option)` appends `?leerjaar=N` for a Herhalen tile from a lower grade.

| Path | Screen |
|---|---|
| `/app` | `AppStart` — redirect only: load error → retry screen (`LoadError`); several playable children and no remembered pick → `wie-speelt-er`; no child → `add-child`; Buddy never chosen or a new school year (`buddyChoiceMode`) → `kies-je-buddy`; else `home` |
| `/app/add-child` | `AddChild` (night-sky onboarding; grade follows a changed age) |
| `/app/wie-speelt-er` | `WhoIsPlaying` — one tile per child (`my_players`), paused children locked; the pick is stored per device |
| `/app/kies-je-buddy` | `ChooseBuddy` — first choice, or once per school year stay/swap (`buddy_choose`) |
| `/app/home` | `BuddyRoom` — **tab 1, where the app opens**: Buddy, care panel, Munten, growth countdown, first-visit tour |
| `/app/dashboard` | `Dashboard` — **tab 2**: header (parent portal, logout, "Wissel" with several children), "Alle oefeningen", Snel starten (`quickStarts`; open Wishes first, labelled "Wens"; the header counts Wishes), trophy strip and parent-reward countdowns (beside Snel starten on desktop) |
| `/app/oefenen` | `Practice` — one tile per exercise type, grouped by subject (`SUBJECTS`: Rekenen, Lezen, Schrijven, Meetkunde, Andere), "Test" label on admin-only rows, Herhalen folded behind a button at the bottom |
| `/app/shop` | `BuddyShop` — five category tabs, `?cat=` selects one |
| `/app/badges`, `/app/badges/:id` | `BadgeOverview`, `BadgeDetail` (the Prijzenkast) |

Redirects kept for bookmarks and installed home-screen apps: `/app/buddy-room` → `/app/home`, `/app/buddy-room/shop` → `/app/shop` (keeps `?cat=`), `/app/map` and `/app/stage/*` → `/app/oefenen`, `/app/progress` → `/app/home`. Removed screens: `AvatarSelection` (replaced by `AppStart` + `ChooseBuddy`), `QuestMap`, `Fluisterbos` (stage), `Progress`, the old XP `Dashboard`.

`TabBar` has two tabs (Buddy → `home`, also lit on `shop`; Dashboard → `dashboard`, also lit on `oefenen` and `badges`) and hides itself on `/app`, `add-child`, `wie-speelt-er`, `kies-je-buddy` and `/app/exercises/*`.

Exercise routes, all `/app/exercises/<family>/:id` where **`:id` is the stage number 1–3, not a database id**. The row is resolved by `(route, grade)`; grade is the child's, or `?leerjaar=` for Herhalen (§6.3):

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
| `number-line` | `ExerciseNumberLine` | Pointer drag; some questions are written on a canvas and checked by `recognize-digit` |
| `clock` | `ExerciseClock` | Pointer drag + trigonometry |
| `money` | `ExerciseMoney` | DnD Kit (the only DnD Kit consumer left) |
| `write-number` | `ExerciseWriteNumber` | Canvas + `recognize-digit` edge function |
| `write-digit` | `ExerciseWriteDigit` | Canvas tracing, checked locally by pixel overlap with the reference glyph (no edge function) |
| `write-letter` | `ExerciseWriteLetter` | Canvas tracing between three lines, checked locally; stroke paths in `letterFilledPaths.ts` |
| `language` | `ExerciseLanguage` | Word/letter matching + TTS |
| `picture-word` | `ExercisePictureWord` | Image→word + TTS |
| `sentence-doctor` | `ExerciseSentenceDoctor` | Tap error, pick correction + TTS |
| `sound-house` | `ExerciseSoundHouse` | Auditory: hear a word, pick begin/middle/end window (TTS-dependent) |
| `even-odd` | `ExerciseEvenOdd` | Grade 2: even/oneven, dubbel, helft (per `config.kinds`), getalbeelden per ten |
| `half-double` | `ExerciseHalfDouble` | Grade 2: `ExerciseModePicker` (helft / dubbel / door elkaar), then numpad |
| `times-tables` | `ExerciseTimesTables` | Grade 2: the child picks a table, numpad; a table earns a sticker after 3 runs without a mistake (`TABLE_STICKER_RUNS`, client-side). Runs also go to `times_table_runs` |
| `geometry-terms` | `ExerciseGeometryTerms` | Grade 2 (Meetkunde): `ExerciseModePicker` per topic, questions from `lib/geometryQuestions.ts`, drawn by `GeometryFigure` (SVG), tap in the drawing |

Shared exercise parts (since 2026-10): every screen renders inside `ExerciseShell` (header with close, progress, hearts and the child's Buddy as `ExplainButton`; records game-overs and abandons, §8.1) and uses `ExercisePrompt`, `ExerciseActionBar`, `CheckButton` ("Controleer") and `ClearButton` ("Wis") from `ExerciseParts.tsx`; the reading exercises share `SpeakerButton`. Explanation texts live in `data/exerciseExplanations.ts`.

### 5.3 Parent portal (`/app/parent/*`) — `<ProtectedRoute>` → `<ParentPinGate>` → `<ParentErrorBoundary>` → `<ParentLayout>`

`index` → `ParentChildren` (with `PushNudge`; paused children marked, `ChooseActiveChildrenDialog` → `set_active_children` when there are more children than the package allows; "Kiest zelf een Buddy" for a child without a choice) · `child/:childId` → `ParentChildDetail` (Aandachtspunten from `child_exercise_insights`, `TimesTablesCard`, grade/trimester changes, revival) · `rewards` · `subscription` · `add-child` · `account` (incl. account deletion and the Meldingen card, `PushNotificationsSettings`) · `feedback`.

### 5.4 Admin (`/admin/*`) — `<AdminRoute>` → `<ParentErrorBoundary>` → `<AdminDashboard>`

`index` → redirect to `users` · `users` (`ChangePlanDialog` → `admin_set_subscription`; warns how many children a smaller package pauses) · `subscriptions` · `stats` (engagement + home-screen adoption, from `admin_engagement_stats`) · `exercises` (per family, "Test" when any row is `admin_only`) · `exercises/:familyKey` (`AdminExerciseFamily`: per-row settings form `ExerciseConfigForm` driven by `data/exerciseConfigFields.ts`, raw-JSON fallback, Test/Live switch for all rows of the family) · `beta` (waiting list with source; "Toegang geven" inserts an email with source `admin · toegang`; "Verwijder" deletes a row) · `meldingen` (`AdminPush`: push switch + `admin_push_stats`) · `feedback`.

---

## 6. Data Layer

### 6.1 Tables (23: 19 + 4 for push)

| Table | Purpose | Key columns |
|---|---|---|
| `profiles` | One row per auth user | `user_type` (parent/teacher), `locale`, `last_seen_at`, `installed_at`, `last_standalone_at` |
| `children` | Child profiles | `parent_id`, `organization_id`, `grade`, `xp`, `level`, `streak`, `max_unlocked_stage`, `pending_promotion`, `last_active_date`, `last_opened_at`, **`paused`** (written only by `sync_paused_children`; a `BEFORE UPDATE` trigger reverts any other change), **`keep_active`** (the parent's pick). `avatar_id`/`avatar_url` remain but nothing reads them since the avatars were removed |
| `exercises` | Exercise catalogue, one row per (route, grade) | `route`, `grade`, `stage`, `subject`, `xp_reward`, `display_order`, `is_active`, **`config` (jsonb)**, **`admin_only`** ("Test": visible and playable only for admins, §7.4) |
| `exercise_attempts` | Every **finished** attempt (game-overs are no longer stored here) | `score`, `max_score`, `stars` (1–3), `time_spent_seconds`, `answers` (jsonb), `client_attempt_id` (unique when set) + `completion_result` (jsonb) for the one-payout-per-run wrapper. Two `BEFORE INSERT` triggers: refuse a paused child, refuse an `admin_only` exercise for a non-admin |
| `exercise_incomplete_attempts` | Game-overs and abandons (since 2026-10-09); pays nothing | `reason` (`game_over`/`abandoned`), `progress_pct`, `mistakes`. Parent/admin SELECT; writes only via `record_incomplete_exercise` |
| `times_table_runs` | One row per finished Tafels run (since 2026-10-13) | `table_number` 1–10, `mistakes` 0–2. Parent/admin SELECT; writes only via `record_times_table_run` |
| `child_progress` | Per-child, per-subject rollup (**a real table maintained by `complete_exercise`, not a materialized view**) | unique `(child_id, subject)` |
| `trimester_progress` | Per-child, per-grade, per-trimester XP vs threshold | unique `(child_id, grade_level, trimester_number)` |
| `badges` / `child_badges` | Badge definitions / per-child progress | `progress`, `is_unlocked`, `unlocked_at` |
| `rewards` | Parent-defined goals ("do N of subject X") | `required_exercises`, `current_progress`, `is_completed` |
| `buddy_states` | One Buddy per child | `needs` (jsonb), `inventory` (jsonb), `munten`, `last_tick`, `sleep_until`, `health_zero_since`, `dead`, **`growth_stage`** (1..18), **`wishes_day`** + **`wishes`** (text[] of type keys), **`species`** (`nootje`/`vosje`/`prikkel`/`loeka`, default `nootje`), **`species_school_year`** (start year of the school year of the last choice; NULL = never chose). A `BEFORE UPDATE` trigger refuses Munten/inventory/species changes for a paused child |
| `subscriptions` | Plan + limits | `plan`, `status`, `max_children` (follows `plan_max_children(plan)` when set through `admin_set_subscription`), `stripe_*`. Most parents have no row and count as Gratis (1 child) |
| `organizations` / `organization_members` | School/org ownership path | `org_role` (owner/admin/teacher) |
| `parent_pins` | bcrypt PIN hash per user | `pin_hash` |
| `user_roles` | Platform roles | `app_role` (admin/moderator/user) |
| `feedback` | In-app parent feedback → admin triage | `category`, `status`, `admin_notes` |
| `beta_signups` | Beta waiting list; also the allow-list for new accounts (§7.1) | `email` (unique, stored lowercase), `full_name`, `child_grade`, `source` (page + `?bron=`/`utm_source`, or `admin · toegang`), `user_agent`, `confirmation_sent_at`. Anyone may INSERT; admin SELECT and DELETE |
| `push_settings` | Singleton (`id = true`): the admin push switch | `mode` (`off`/`admins`/`all`), starts `off` |
| `push_subscriptions` | One row per device with push on | `parent_id`, unique `endpoint`, `p256dh`, `auth`, `user_agent`, `last_success_at`. Parent SELECT own; writes only via RPC |
| `push_preferences` | Which kinds a parent wants (no row = all on) | `buddy`, `insights`. Parent SELECT/INSERT/UPDATE own |
| `push_notifications` | Log of every notification, also the source for limits and stats | `kind` (`buddy_needs`/`buddy_ill`/`buddy_gone`/`insight`/`test`), `child_id`, `exercise_id`, `status` (`pending`/`sent`/`failed`), `devices`, `sent_at`. Admin SELECT only |

**Enums:** `app_role`, `org_role`, `user_type`, `subject_type` (`math`/`reading`/`writing`/`other`/`geometry`), `subscription_plan` (`free`/`basic`/`family`/`school`), `subscription_status` (`trialing`/`active`/`past_due`/`canceled`/`expired`), `exercise_status`.

**Triggers worth knowing:** `enforce_max_children` (`BEFORE INSERT` on `children`, raises the subscription-limit message, R5), `guard_children_paused`, `children_after_delete_sync` (a removed child frees a place), `block_paused_child_attempt`, `block_paused_child_buddy`, `guard_admin_only_attempt`, and `on_auth_user_created_beta_check` on **`auth.users`** (§7.1).

**Stripe columns exist but there is no payment integration in the codebase** — no Stripe SDK, no webhook function. Packages are requested by mail and set by an admin in Admin → Gebruikers (`admin_set_subscription`), which also pauses or unpauses children.

### 6.2 RPCs

| RPC | Security | Caller | Purpose |
|---|---|---|---|
| `complete_exercise(child, exercise, score, max_score, stars, time_spent, answers, client_attempt_id)` | DEFINER + `_can_access_child`; `authenticated` only | `useCompleteExercise` | **Thin wrapper** (since 2026-10-14, `20261014210000`): locks the child row, returns the stored `completion_result` plus `duplicate: true` when `p_client_attempt_id` was already seen for this child, else calls `_complete_exercise_core` and stores the result on the attempt row. `p_client_attempt_id` defaults to NULL so an old client still works (without the duplicate protection). Result: `{attempt_id, xp_earned, leveled_up, new_level, streak, all_trimesters_completed, completed_rewards, munten_earned, munten_total, times_today, wish_fulfilled, wish_bonus}`; the client acts only on rewards and the Munten fields. |
| `_complete_exercise_core(…7 args)` | DEFINER, EXECUTE revoked from everyone | `complete_exercise` only | The game rules (§8.2), current body from `20261013210000` (renamed, unchanged, by `20261014210000`). **Change the rules here**, never by redefining `complete_exercise` with the old 7 arguments. |
| `practice_menu(child)` | DEFINER + `_can_access_child` | `usePracticeMenu` | `{day, wish_bonus, full_munten, exercises[{type_key, exercise_id, title, subject, route, done_today, next_munten, wished, admin_only}], review[{…, grade, admin_only}], wishes[{type_key, title, subject, route, fulfilled}]}`. **Writes** today's Wishes on the first call of the day; an `admin_only` type never becomes a Wish. Current body in `20261014180000`. |
| `child_exercise_insights(child)` | **INVOKER** (RLS on `exercise_attempts` and `exercise_incomplete_attempts` filters) | `useChildInsights` | Per exercise, over its last 10 tries (finished + incomplete merged): `tries`, `smooth` (2–3 stars), `hard` (1 star), `game_over`, `abandoned`, `last_try_at`, title/subject/stage. The flagging rule (≥2 tries, struggles ≥ half) is client-side in `useChildInsights`; red at ≥ 75% in `ParentChildDetail`. |
| `record_incomplete_exercise(child, exercise, reason, progress_pct, mistakes)` | DEFINER + `_can_access_child` | `useRecordIncompleteExercise` (from `ExerciseShell`) | Inserts a game-over/abandon row; clamps the numbers. Pays nothing. Fire-and-forget on the client |
| `child_exercise_stats(child)` | INVOKER | **No client caller since 2026-10-09** (replaced by `child_exercise_insights`) | Per-exercise aggregate; still in the database |
| `record_times_table_run(child, table, mistakes)` / `child_times_tables(child)` | DEFINER + `_can_access_child` + not paused / INVOKER | `useTimesTables` | Store a finished Tafels run; per-table counts for stickers. Munten still come from `complete_exercise` |
| `buddy_get_or_create(child)` | DEFINER + `parent_id = auth.uid()`; `authenticated` only | `useBuddy` | Advances `growth_stage`, ticks and returns the Buddy row, creating it on first call |
| `buddy_care(child, action, item_id)` | DEFINER + ownership; `authenticated` only | `useBuddy` | Applies one Care Action; consumes a Care Item |
| `buddy_buy(child, item_id)` | DEFINER + ownership; `authenticated` only | `useBuddy` | Spends Munten, adds to inventory |
| `buddy_revive(child)` | DEFINER + ownership; `authenticated` only | `useBuddy` (parent portal) | Resets Needs to `REVIVAL_LEVEL`, clears death |
| `buddy_choose(child, species)` | DEFINER + `parent_id = auth.uid()` | `ChooseBuddy` | Sets `species` + `species_school_year`; refuses a second choice in the same school year (`buddy_school_year(day)`, Europe/Amsterdam, September start) |
| `my_players()` | DEFINER, `auth.uid()` | `usePlayers` | The caller's children oldest first: `{id, name, species (null until chosen), paused}` |
| `set_active_children(child_ids)` | DEFINER, own children only | `ChooseActiveChildrenDialog` | Sets `keep_active`, then `sync_paused_children` |
| `admin_set_subscription(user, plan, status)` | DEFINER + admin check inside | `ChangePlanDialog` | Updates the newest `subscriptions` row (or creates one), `max_children = plan_max_children(plan)`, then `sync_paused_children` |
| `sync_paused_children(parent)`, `parent_child_allowance(parent)` | DEFINER, EXECUTE revoked | Triggers and the RPCs above | Allowance = `max_children` of an `active`/`trialing` subscription, else 1. Ranks children `keep_active DESC, created_at`; those beyond the allowance are paused. Unpausing resets the Buddy's `last_tick` so paused time does not decay it |
| `plan_max_children(plan)`, `buddy_school_year(day)`, `_can_see_exercise(admin_only)` | IMMUTABLE/STABLE helpers | Internal, policies | Gratis 1, Basis 2, Familie 5, School 999 ("onbeperkt"); school year = start year; "not admin_only or caller is admin" |
| `has_parent_pin()` / `set_parent_pin(pin)` / `verify_parent_pin(pin)` | DEFINER | `useParentPin` | bcrypt PIN lifecycle |
| `has_role(user, role)` | DEFINER | RLS policies, `useAdminRole` | Role check used inside policies |
| `touch_activity(child?, standalone?)` | DEFINER | `ActivityTracker` (`useActivityPing`) | Stamps `last_seen_at` / `last_opened_at`, and `installed_at` / `last_standalone_at` when running standalone. Client-throttled to 5 min. Dropped and recreated (not replaced) when `p_standalone` was added, so a one-argument call is unambiguous. |
| `admin_engagement_stats()` | DEFINER + admin check inside | `useAdminEngagement` | One JSON payload for `/admin/stats`: tiles, funnel, cohorts, activity, install adoption |
| `save_push_subscription(endpoint, p256dh, auth, user_agent)` / `remove_push_subscription(endpoint)` | DEFINER + `auth.uid()` | `lib/push.ts` | Upsert on `endpoint` re-assigns the device to the caller (another parent on the same browser) |
| `push_claim_due()` | DEFINER, **service_role only** | `send-push-notifications` (cron) | Every push rule: window, 1/day + 3/7 days, Buddy step via `_buddy_tick`, red Aandachtspunt, dedupe. Inserts the chosen rows as `pending` and returns them. Advisory lock against overlapping runs |
| `push_claim_test()` | DEFINER + `auth.uid()` | `send-push-notifications` (parent test) | Logs a `test` row; max 3/hour |
| `admin_set_push_mode(mode)` / `admin_push_stats()` | DEFINER + admin check inside | `AdminPush` | Switch; JSON with devices, sent, failed, played-within-24h overall and per kind |
| `_push_in_window(at)`, `_push_cron_active()`, `_push_cron_secret()`, `_buddy_display_name(species)` | Internal (EXECUTE revoked; `_push_cron_secret` granted to `service_role`) | pg_cron, the RPCs above, the edge function | Send window (Europe/Brussels); "should cron call at all"; the Vault secret; Buddy name for copy |
| `_buddy_ensure_row`, `_buddy_tick`, `_buddy_item`, `_buddy_window_hours`, `_child_practice_options`, `_child_review_options`, `_can_access_child` | DEFINER, **EXECUTE revoked from `anon`/`authenticated`** | Internal only | Buddy simulation; pickable exercises per child (own grade; lower grades for Herhalen; both skip `admin_only` rows for non-admins); the shared ownership predicate, which since `20261014210000` returns `false` (never NULL) for a signed-out caller or a child with neither parent nor organisation |
| `enforce_beta_signup_list()` | DEFINER trigger function, EXECUTE revoked | `BEFORE INSERT` on `auth.users` | Raises `not on beta list` (P0001) unless `lower(email)` is in `beta_signups` |
| `exercise_type_key(route)`, `practice_munten_for(n)`, `practice_wish_bonus()`, `_practice_day_start()`, `buddy_growth_target(grade, day)`, `buddy_next_growth(current, target)` | IMMUTABLE/STABLE SQL helpers | Internal | The economy and growth rules in one place each (§9.7, §9.8) |

### 6.3 Exercise resolution chain

A child navigating to `/app/exercises/math/2` triggers three independent lookups. The grade used is **`useExerciseGrade()`**: `?leerjaar=N` (a Herhalen tile from a lower grade) when present, else `child.grade`, else 1 while the child loads (R11).

1. **`useExerciseId()`** — strips `/app`, looks up `exercises` by `(route = '/exercises/math/2', grade)`, `staleTime: Infinity`. Yields the UUID that `complete_exercise` and `record_incomplete_exercise` need. RLS hides an `admin_only` row from a non-admin, so a direct link to a test exercise finds nothing.
2. **`useExerciseConfig(DEFAULT_MATH_SUMS)`** — same `(route, grade)` lookup, reads `config` jsonb. **Falls back to the `DEFAULT_*` literal** when the row has no config yet, so an unprovisioned grade never breaks the exercise.
3. **`useDifficultyLevel()`** — derives `{grade, stage, key}` from `child.grade` + the `:id` param, clamped to 1–3. Used by the exercises that are *not* DB-driven.

> **Difficulty is DB-driven as of 2026-08-31.** The old static `MATH_SUMS_CONFIG["1-2"]`-style tables are gone. `src/data/difficultyConfig.ts` exports `DEFAULT_*` fallbacks (now including even/odd, half/double, geometry, times tables), `TABLE_STICKER_RUNS`, plus `MAX_SUPPORTED_GRADE = 2` / `clampToSupportedGrade`. Grade-2 maths rows ship in migrations (`20261013120000`, `…180000`, `20261014120000`, `…150100`), idempotent so an admin-created row is updated, not duplicated. Admins tune live values through the form at `/admin/exercises/:familyKey`. `ExerciseLanguage` and `ExerciseSentenceDoctor` are exceptions — their word/sentence pools are grade-1 vocabulary by construction and still use `clampToSupportedGrade` directly.

### 6.4 React Query key registry

```typescript
// Auth / identity
['my-child', userId, playingChildId]      ← invalidated by the ['my-child'] prefix
['players', userId]                       ← my_players, for Wie speelt er?
['has-parent-pin', userId]                ['user-role', userId]

// Exercise catalogue — route- AND grade-scoped, because `route` alone
// no longer identifies a row (grade = useExerciseGrade, incl. ?leerjaar=)
['exercise-id', dbRoute, grade]           ['exercise-config', dbRoute, grade]

// Child app
['practice-menu', childId]                ['buddy-state', childId]
['child-rewards', childId]                ['game-badges', childId]
['child-insights', childId]               ['times-tables', childId]

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
['admin-stats-subscriptions']                    ['admin-engagement']
['admin-exercises']    ['admin-exercise-family', routePrefix]
['admin-beta-signups'] ['admin-feedback']   ['admin-push-stats']

// Push notifications (parent, per device / per account)
['push-status', userId]   ['push-preferences', userId]   ['push-devices', userId]
```

Removed with the map and the daily quests: `stage-exercises-progress`, `stage-mastery`, `child-progress`, `trimester-progress`, `recent-attempts`, `daily-quest-*`. (`AdminExerciseFamily` now invalidates `['practice-menu']` on a toggle or Test/Live switch, but its `is_active` toggle still also invalidates the dead `['stage-mastery']`; see R20.)

Note the parent portal keeps its **own** `parent-*` copies of child data rather than reusing the gameplay keys — the portal reads any child, gameplay reads "the" child. That is why `useCompleteExercise` has to invalidate both families.

Every child-scoped key carries `childId`; every parent-scoped key carries `userId`. Grade is part of catalogue keys because `route` alone no longer identifies a row. `my-child` also carries the device's playing-child pick, so switching child on "Wie speelt er?" is a different cache entry, not a refetch race.

### 6.5 Invalidation fan-out on exercise completion

`useCompleteExercise.onSuccess` invalidates **7** key prefixes (unscoped, so every child's entry), then fires celebrations:

```
practice-menu · buddy-state · child-rewards · game-badges
parent-children · parent-rewards · child-insights
```

Then: reward popup (`celebrateRewards`) → one Buddy toast from `payoutMessage()` ("⭐ Wens vervuld!", "Deze ken ik al!" from the 3rd repeat, else "+N Munten"). The level-up, streak-milestone and promotion celebrations are gone. `onError` shows a Buddy toast that the Munten were not saved.

Since 2026-10-14 the hook guards the payout from the client side too: `mutate` goes through **once per mounted screen** (a `sent` ref), every call of that run carries one `crypto.randomUUID()` as `p_client_attempt_id`, and React Query retries up to 3 times only for failures that never reached the database (no error `code`). `useRecordIncompleteExercise` invalidates `['child-insights', childId]` after saving a game-over or abandon.

`practice-menu` must be invalidated on every completion because each one changes what the next attempt of its type pays. Parent-portal mutations that reach into the child's keys: opening a trimester invalidates `['practice-menu', childId]`; changing the grade invalidates `['my-child']`, `['practice-menu', childId]` and `['buddy-state', childId]` (the Buddy grows into the new grade's form); `set_active_children` invalidates `['parent-children']`, `['players']` and `['my-child']`; adding a child in the portal invalidates `['parent-children']`, `['parent-children-count']` and `['players']`. `ChooseBuddy` invalidates `['buddy-state', childId]` before navigating home.

---

## 7. Auth & Security

### 7.1 Flow

1. `/toegang` (`LOGIN_PATH`; `/auth` redirects to `/`) — email+password or Google OAuth. Both redirect to `${origin}/auth/callback`. The URL is not linked from the site during the beta; this is obscurity, not access control.
2. **Beta gate (since 2026-10-19):** a `BEFORE INSERT` trigger on `auth.users` (`on_auth_user_created_beta_check` → `enforce_beta_signup_list`) refuses a new account, email signup or first Google sign-in alike, whose email is not in `beta_signups`. Existing accounts and email changes are unaffected. The app maps `not on beta list` (and, after Google, `Database error saving new user`) to a Dutch message pointing at `/beta` (`mapAuthError`, `AuthCallback`). To open up: `DROP TRIGGER on_auth_user_created_beta_check ON auth.users`. An admin gives access by adding the email in Admin → Beta; note that the public `/beta` form inserts into the same table (R24).
3. With email confirmation enabled, `signUp` resolves **without a session**; `AuthProvider.signUp` returns `needsEmailConfirmation` so the caller does not push an unauthenticated user into onboarding. Auth mails use the Leapio templates in `supabase/templates/` (pasted into the Supabase dashboard by hand; sender and footer still Supabase's built-in mailer).
4. `/auth/callback` picks the session up and routes onward: existing user → `/app`, new user → `/auth/setup-pin?redirect=/app/add-child`.
5. `/auth/setup-pin` — 4-digit PIN, validated and bcrypt-hashed server-side by `set_parent_pin`; a first PIN continues to `/auth/meldingen` (push question), then the redirect.
6. `/app/add-child` → `/app` (`AppStart`) → `/app/kies-je-buddy` → `/app/home`.

`AuthProvider` registers `onAuthStateChange` **before** calling `getSession()`, and locks the PIN session on `SIGNED_OUT` / `USER_UPDATED`.

### 7.2 Route guards

| Guard | Mechanism | Failure |
|---|---|---|
| `<ProtectedRoute>` | `user && !loading` | → `LOGIN_PATH` |
| `<ParentPinGate>` | `parentPinSession.isUnlocked()` | PIN entry, or → `/auth/setup-pin?redirect=…` if no PIN exists |
| `<AdminRoute>` | `useAdminRole()` → `user_roles` | no user → `LOGIN_PATH`; not admin → `/app/home` |

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

1. **RLS on every table.** `children` is reachable via `parent_id = auth.uid()` *or* membership in `children.organization_id`; child-owned tables (`exercise_attempts`, `child_badges`, `child_progress`, `rewards`, `buddy_states`, `trimester_progress`) are filtered through the child. `exercises` is readable by any authenticated user **except `admin_only` rows, which only admins see** (`_can_see_exercise`, since `20261014180000`), and writable only by `has_role(auth.uid(), 'admin')` — that admin write policy was added in `20260831140000`. `exercise_incomplete_attempts` and `times_table_runs` are SELECT-only for the parent (inline `parent_id = auth.uid()`) and admins; writes go through DEFINER RPCs. `beta_signups`: anyone may insert, admins select and delete.
2. **Explicit guards inside `SECURITY DEFINER` RPCs.** Any DEFINER function taking a client-supplied `p_child_id` must re-check ownership itself, because RLS does not apply inside it. `complete_exercise` gained this guard in `20260911160000`; before that, any authenticated user could award XP, streak, badges, rewards and Munten to *any* child id. Since `20261014210000` every function that pays or changes the Buddy is EXECUTE-revoked from `anon`.
3. **Triggers as the last line** for rules a client could otherwise route around: a paused child cannot insert an attempt or change Munten/inventory/species; a non-admin cannot insert an attempt on an `admin_only` exercise; nobody but `sync_paused_children` can change `children.paused`; only a waiting-list email can create an `auth.users` row.
4. **Edge functions** verify the caller with an anon-key client bound to the request's `Authorization` header (`_shared/requireUser.ts`), then escalate to a service-role client where needed. `recognize-digit` and `synthesize-speech` require a signed-in user since 2026-10-14 (they were open to anyone holding the public anon key), cap the payload (2 MB base64 image, 500 characters of text), time out the upstream call after 10s and no longer return provider details. `admin-delete-user` additionally requires an `admin` row in `user_roles` (403 otherwise). `delete-account` acts on the caller's own user only. `send-push-notifications` checks the cron secret or a user itself (`verify_jwt = false`). `beta-signup-confirmation` is callable with the anon key by design and limits itself (§7.6, R25).

**Ownership predicate.** Migration `20261001120000` extracted `_can_access_child(children)` (parent, or member of the child's organisation). `complete_exercise`, `practice_menu`, `record_incomplete_exercise` and `record_times_table_run` use it. `20261014210000` fixed a hole in it: with no signed-in user `auth.uid()` is NULL, the predicate evaluated to NULL and `IF NOT NULL` did not raise, so a signed-out caller (and any signed-in user, for a child with neither parent nor organisation) passed. It now always returns true or false. **The `buddy_*` RPCs, including the newer `buddy_choose`, still inline `parent_id = auth.uid()`**, so an org member who is not the parent gets `Not authorized` on the Buddy. For a child with no parent at all, `complete_exercise` and `practice_menu` skip the Buddy part (no row, no Munten, no Wishes). See §13 R2.

### 7.5 RLS failure mode

An RLS denial is not an error. Supabase returns `[]` or `null` with `error === null`. Code must treat an unexpected empty result as a possible authorization failure, not as "no data". `Practice` is the model to copy: it treats `!menu && !isError` as waiting (not `isLoading`, which is false while a retry is paused in a background tab) and renders an explicit error with a retry, so "no exercises yet" and "the call failed" never look the same.

### 7.6 Secrets & configuration

| Variable | Where | Notes |
|---|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | Client bundle | Public by design; safety rests entirely on RLS |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Every edge function that checks the caller (`requireUser`, `admin-delete-user`, `delete-account`, `send-push-notifications`) | Injected by Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | `admin-delete-user`, `delete-account`, `beta-signup-confirmation`, `send-push-notifications` | Never in the client |
| `ANTHROPIC_API_KEY` | `recognize-digit` | Server-side only |
| `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `ELEVENLABS_MODEL_ID` | `synthesize-speech` | Voice/model overridable per environment |
| `BREVO_API_KEY`, `BETA_MAIL_SENDER` (optional, defaults to the info@ address) | `beta-signup-confirmation` | Transactional mail via the Brevo HTTP API (10s timeout). The function returns 500 when the key is missing |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` (GitHub secrets) | Keep-alive workflow | CI uses a dead local URL and a placeholder key instead, so tests never reach the real project |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | `send-push-notifications` | Web Push signing. The public half is also hard-coded in `src/lib/pushConfig.ts` (public by design); rotating the pair invalidates every stored subscription |
| Vault `push_cron_secret` | Database only | Created by the migration with a random value; pg_cron sends it as `x-push-cron-secret`, the function compares it via `_push_cron_secret()`. Never in an env var or file |

`.env` and `.env.*` are gitignored. The local `.env` carries both prefixed and unprefixed copies of the URL/key pair; only the `VITE_`-prefixed ones reach the bundle.

**Edge functions (6 + `_shared`):**

| Function | Caller | Gate | Notes |
|---|---|---|---|
| `recognize-digit` | `ExerciseWriteNumber`, `ExerciseNumberLine` | `requireUser` | Anthropic `claude-haiku-4-5`; image ≤ 2 MB base64 |
| `synthesize-speech` | `useSpeech` | `requireUser` | ElevenLabs; text ≤ 500 chars |
| `delete-account` | `ParentAccount` | Caller's own JWT | |
| `admin-delete-user` | `AdminUsers` | JWT + `user_roles` admin; `verify_jwt = false` in `config.toml` | |
| `send-push-notifications` | pg_cron, parent test | Cron secret or `requireUser`; `verify_jwt = false` | §10.5 |
| `beta-signup-confirmation` | `BetaSignupForm` (fire-and-forget, `supabase.functions.invoke`, not `invokeFunction`) | None beyond the anon key; self-limiting | Claims the row first (`UPDATE … SET confirmation_sent_at WHERE email = … AND confirmation_sent_at IS NULL AND created_at >= now() − 15 min`), so at most one mail per address ever and never for rows older than 15 minutes (admin-added rows are never mailed because only the form calls it). On a Brevo error the claim is released for a retry |

---

## 8. Exercise System

### 8.1 Completion flow

1. Route mounts → `useExerciseId()`, `useExerciseConfig()`, `useDifficultyLevel()` resolve (§6.3).
2. Questions are generated client-side from the resolved config, seeded where reproducibility matters (`seededRandom.ts`).
3. Child answers → correct/incorrect feedback: confetti + `progress += step`, or `lives -= 1`. Tapping the Buddy in the header (`ExplainButton`) speaks the exercise's explanation and, in arithmetic, the current question; any other tap or the next question stops it.
4. **Progress reaches 100%** (1–3 hearts left) → `completeExercise.mutate({exerciseId, score, maxScore, stars, timeSpent, answers})`. Stars map from remaining lives (3/2/1). This is the only path that pays.
5. **Lives hit 0 → game over pays nothing** (since 2026-10-09, every exercise): no `complete_exercise` call, so no Munten, XP, reward progress or badges; the screen just navigates back. `ExerciseShell` sees the last heart go and calls `record_incomplete_exercise('game_over')`. **Closing with the X** after at least one answer, before finishing, records `'abandoned'`. Both rows feed only the parent's Aandachtspunten. Closing the browser mid-exercise records nothing. (Before 2026-10-09 eight of the exercises paid out for a game-over, and picture-word and sound-house stored it as 1 star.)
6. `complete_exercise` runs the whole gameplay transaction server-side (§8.2), at most once per run (`p_client_attempt_id`).
7. `onSuccess` → 7 invalidations → reward popup + payout toast; the screen navigates to `exerciseExitPath()` (where the exercise was started).

Tafels additionally calls `record_times_table_run` for a finished run; that row only drives the sticker shown to the child and the parent's `TimesTablesCard`.

### 8.2 What `complete_exercise` does (one round-trip, one transaction)

Wrapper (`complete_exercise`): lock the child row → `_can_access_child` → if this `p_client_attempt_id` already has an attempt for the child, return its stored result with `duplicate: true` → else call the core and store `client_attempt_id` + `completion_result` on the new attempt row.

Core (`_complete_exercise_core`): lock the child row (`SELECT … FOR UPDATE`) → count today's attempts of this exercise **type** (`exercise_type_key`) → insert `exercise_attempts` (the paused and test-exercise triggers fire here) → upsert `child_progress` → single `UPDATE children` for xp/streak/`last_active_date`/level → upsert `trimester_progress` (and set `pending_promotion` when all three trimesters of the grade are complete) — **skipped for a Herhalen exercise from a lower grade** (since `20261013210000`) → advance matching `rewards` (repeats count fully) → upsert badges → if the child has a parent: ensure+tick the Buddy row, decide the Wish, add `practice_munten_for(n) + wish bonus` → return the aggregate result.

Design points worth preserving:

- **Level is computed inline** as `GREATEST(level, FLOOR(new_xp / 1000) + 1)`, algebraically identical to the old `WHILE xp >= level * 1000` loop but in the same statement as the XP update. `GREATEST` keeps a level from ever going backwards.
- **Streak** is computed against `(now() AT TIME ZONE 'Europe/Amsterdam')::date`, so a child's day boundary is Belgian local midnight, not UTC.
- **Row lock first.** Two simultaneous completions would otherwise both count as "the first of this type today" and both claim the full payout and the Wish bonus.
- **Badges:** `first-steps` is insert-once; `goal-oriented` (50), `book-master` (20), `legend` (500) count total exercises and `fire-streak` the streak, recomputed in one multi-row upsert; `perfect` and `speed` increment by one and must stay separate because their `ON CONFLICT` expression reads the existing row. `goal-oriented` and `legend` used XP and level until `20261001120000`, which also recalculated existing progress. `champion`, `collector` and `rainbow` have **no** server-side rule and cannot be earned (R19).
- **Deliberately not async.** Moving badge/reward work off the request path would make unlocks eventually consistent and change what a child sees the instant they finish.
- **Trimester number** is parsed out of `exercises.stage` (`'stage-2'` → 2), clamped to 1–3.

### 8.3 Handwriting recognition

`ExerciseWriteNumber` and the written questions of `ExerciseNumberLine`:

canvas pointer strokes → `canvasToRecognitionBase64()` (downscale to ≤450px long edge, keep the transparent background because that is what the model has always received) → `invokeFunction('recognize-digit', …)` → edge function (signed-in users only) calls Anthropic `claude-haiku-4-5` with a lenient children's-handwriting prompt → `{recognized: number | null}` (plus `isCorrect` when a `target` is sent).

`ExerciseWriteDigit` and `ExerciseWriteLetter` do **not** call the model: they compare the traced pixels with a reference glyph on the canvas (share of drawn pixels inside the zone), so they cost nothing per answer.

Every edge-function call goes through [invokeFunction.ts](../src/lib/invokeFunction.ts), which enforces a **12s deadline** (8s for TTS) and throws `EdgeFunctionTimeoutError` so a screen can offer a retry instead of leaving a child staring at a frozen question forever. On a non-2xx response it reads the body supabase-js attaches as `context` and throws the function's own `error` (plus `details`), falling back to the generic error only when the body has nothing usable.

### 8.4 Text-to-speech

`useSpeech` / `speakText` calls the `synthesize-speech` edge function (ElevenLabs, Flemish voice; signed-in users only), plays the returned base64 MP3, and **falls back to the Web Speech API** (`nl-NL`, rate 0.75) if the function fails; where `speechSynthesis` is missing it no longer crashes. `speakLines` / `stopSpeaking` (added for `ExplainButton`) play a sequence and cancel it. `lib/speechUnlock.ts` is imported by `Layout` for its side effect: iOS Safari requires a user gesture before any audio can play. Decoded audio for the **last 60 lines** is cached in memory (LRU), because the Buddy repeats a small sentence set on every arrival, Care Action and tap; `lib/spokenOnce.ts` keeps the greeting from being re-read within a session. Consumers: `ExerciseSoundHouse` (where audio is the exercise, not an enhancement), `ExerciseLanguage`, `ExercisePictureWord`, `ExerciseSentenceDoctor`, `ExplainButton` (every exercise), `BuddyBubble`, `BuddyToast`, `BuddyRoom`, `ChooseBuddy` (each Buddy introduces itself), `GrowthMoment`, `Practice`. Reading exercises never read aloud what the child must read; counting exercises never say the count. **Letter schrijven and Klankhuis say the letter's *klank* ("buh", "puh", "kuh"), not its alphabet name ("bee", "pee", "kay")**; the mapping lives in `src/data/letterSounds.ts` (`LETTER_SOUND` record + `letterSound()` helper, added 2026-10-24).

---

## 9. Buddy Care Subsystem

The most stateful feature, and since October 2026 the centre of the child app (migrations `20260911120000`, `20260914120000`, `20261001120000`, `20261009150000` (species), `20261009200000` (paused children), `20261014210000` (lock-down); design in `wayfinder/buddy-care/` and `wayfinder/buddy-centred-app/`). **[CONTEXT.md](../CONTEXT.md) is authoritative for its vocabulary** — Buddy, Need, Care Action, Care Item, Munt, Illness, Death, Buddy Room.

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
| `STARTING_MUNTEN` | 40 | Economy. Per-exercise payout: see §9.8 |

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

`BuddyRoom` mounts `BuddyFxProvider` and renders `BuddyStage` (the species' image for the current mood, `species.art[mood]`; care FX, growth scale + accessories, poke-to-hop; side by side with the care panel on tablet and desktop) and `CarePanel` (each Need on a row with its Care Action; replaces `NeedBar` + `CareActionBar`). `buddyCue()` picks the single signal the Buddy shows, with fixed priority: **dead > napping > ill > night > lowest critical Need**, and `CUE_ACTION` maps the cue to the button that wiggles. Night deliberately ranks below Illness so a sick Buddy can still ask for medicine after 19:00; the evening no longer *looks* asleep, because care is allowed then. `lib/buddy/messages.ts` holds the Dutch copy per mood, cue and Care Action, plus `growthCountdown` and `practiceGreeting`.

Other moving parts, all client-only:

- **Buy-and-care** (`useBuddy().buyAndCare`): `buddy_buy` then `buddy_care` in sequence, so the server still validates price, stock and category. If the care call is refused after the buy succeeded, the item stays in the inventory. Care buttons are disabled while a mutation is in flight.
- **Give from the Shop:** after a purchase, "Geef aan …" navigates to `/app/home` with `location.state.give = {action, itemId}`; `BuddyRoom` uses it once per `location.key` and clears the state with a `replace` navigation, so back/refresh cannot spend a second item.
- **Tour** (`useBuddyTour`): `poke → feed → done`, read synchronously from `localStorage['leapio:buddy-tour-done:<childId>']` so the first render already knows. Paused while the Buddy sleeps or is dead.
- **Growth moment** (`useGrowthMoment`): compares `growth_stage` with `localStorage['leapio:buddy-growth-seen:<childId>']`; the first visit on a device only records.
- Successful Care Actions and purchases no longer toast; only refusals do.

### 9.6 Naming (resolved)

CONTEXT.md now names the currency **Munt / Munten** and lists Eikel as the replaced working name (changed 2026-10-01), so domain doc, schema (`buddy_states.munten`), constants and copy agree. See §13 R3.

### 9.7 Growth

`growth_stage` 1..18 = `(grade − 1) × 3 + calendar trimester` (sep–dec = 1, jan–mar = 2, apr–aug = 3), computed by `buddy_growth_target` and applied in `buddy_get_or_create` through `buddy_next_growth`: **within the same grade the stage never decreases** (otherwise every September, before a parent raises the grade, the calendar would shrink the Buddy back to trimester 1); a **grade change is followed in either direction**, so a wrong grade can be corrected. It is persisted rather than derived for exactly that reason. Care has no influence. The migration back-filled every existing Buddy.

Client side, [growth.ts](../src/lib/buddy/growth.ts) maps a stage to a `GrowthForm` (title built from the species name, scale, emoji accessories; six forms, placeholder art) and computes `daysUntilNextGrowth` (null in trimester 3, where the next step is a grade change with no date). `phaseOfMonth` must match `buddy_growth_target`.

### 9.8 Practice economy

| Rule | SQL | TS mirror |
|---|---|---|
| Type of an exercise = route minus last segment (`/exercises/clock/2` → `/exercises/clock`) | `exercise_type_key` | `TYPE_ICON` keys in `data/exerciseTypes.ts` |
| Payout for the n-th attempt of a type today: 8, 8, 4, 2, 1… | `practice_munten_for` | `payout.ts` `FULL_PAYOUT_TIMES = 2` (only for the message) |
| Wish bonus +5, first attempt of a wished type today | `practice_wish_bonus` | — (the client reads `wish_bonus` from the menu) |
| Day boundary: midnight Europe/Amsterdam | `_practice_day_start` | — |
| Pickable exercises: per type, the version from the highest open trimester of the child's grade; a trimester is open if `max_unlocked_stage` ≥ it **or** every active exercise of the previous one has ≥ 5 attempts. `admin_only` rows are skipped for non-admins, also when counting | `_child_practice_options` | — (moved from the deleted `useStageMastery`) |
| **Herhalen**: per type, the version from the highest lower grade, highest trimester; normal Munten; does not count towards the own grade's trimesters | `_child_review_options`, returned as `review` | `exerciseUrl()` adds `?leerjaar=` |
| Wishes: up to 3 type keys, ordered by `md5(child_id ‖ day ‖ type_key)`, stored on `buddy_states` the first time `practice_menu` runs that day; never an `admin_only` type | `practice_menu` | — |
| Subject grouping: Rekenen, Lezen, Schrijven, Meetkunde, Andere | `exercises.subject` | `SUBJECTS` in `data/exerciseTypes.ts` |

The client never computes a payout. `usePracticeMenu` exposes `isRepeated`, `wishOpen` and `quickStarts` (open Wishes, then types not done today, then least done; test exercises excluded) over what the server returned.

### 9.9 Species choice

`BUDDY_SPECIES` in [species.ts](../src/lib/buddy/species.ts) defines Nootje, Vosje, Prikkel and Loeka: fixed name, intro line, one image per mood (lines in `data/buddyMessages.ts`). The column `buddy_states.species` has a CHECK on the same four ids, so a new species is a paired change (TS + migration). `buddyChoiceMode(species_school_year, now)` returns `first` (never chose), `yearly` (a new school year started) or null; `AppStart` routes to `ChooseBuddy` for the first two. `buddy_choose` enforces once per school year server-side; swapping changes only the species, never Munten, inventory, Needs or growth. Existing Buddies were set to Nootje with `species_school_year = 2026`, so their first stay-or-swap comes in September 2027. `my_players` hides the species until the child chose, and the parent portal shows "Kiest zelf een Buddy"; the parent never picks it.

### 9.10 Paused children

`children.paused` is a stored outcome, recomputed by `sync_paused_children(parent)` whenever the package (`admin_set_subscription`), the parent's pick (`set_active_children`) or the set of children (delete trigger) changes. Nothing is deleted. A paused child cannot finish an exercise, earn, spend, use items or change Buddy (triggers, §6.1); it never becomes the playing child (`useCurrentChild` filters `paused = false`) and is shown locked on "Wie speelt er?". Its Buddy is frozen: on unpause `last_tick` (and a running `health_zero_since`) restart at that moment, so paused time does not decay it. `push_claim_due` skips paused children.

---

## 10. Cross-Cutting Concerns

### 10.1 Error handling

| Function | Maps |
|---|---|
| `mapAuthError(err)` | Supabase auth codes → Dutch |
| `mapDbError(err)` | Postgres error codes → Dutch |
| `isSubscriptionLimitError(err)` | Matches `"subscription limit reached"` in the message → show `<SubscriptionLimitDialog>`, not a toast |
| (inside `mapDbError` / `mapAuthError`) | `Child is paused`, `not on beta list` / `Database error saving new user` → their own Dutch messages, also by substring |

Loading failures that would otherwise be read as "no data" show `LoadError` with a retry (`lib/queryStatus.ts` `loadFailed`): `AppStart` and `WhoIsPlaying` since 2026-10-14, so an offline start no longer sends a known family to "kind toevoegen".

The subscription limit is enforced by the `enforce_max_children` **trigger** on `children`, which raises `'Subscription limit reached: max % children allowed'`. The client detects it by **substring match on that message** — a fragile coupling between a SQL string literal and a TS predicate. See §13 R5.

Boundaries: `<ErrorBoundary>` (root, and again inside `/app`) with a forest-themed fallback; `<ParentErrorBoundary>` for the parent and admin trees. **No external error reporting** — no Sentry, no log drain. Production render errors and RLS anomalies are invisible to the team. See §13 R4.

### 10.2 Offline & PWA

`manifest.json` (`start_url: /app`, theme and background `#1d1145` night purple, separate `any` and `maskable` icon entries), `icon-192/512`, a real 180px `apple-touch-icon`, PNG favicons, theme-color and Apple meta tags are in place. Since 2026-10 the icon is the "L-sprong" logo (full set in `brand/leapio-logo/`); the app icons are rasterised from `src/assets/brand/icon-leapio.svg` by `scripts/build-icons.sh` (headless Chrome, always at 512px then scaled down); the PNGs are committed because the build has no image step.

`useInstallPrompt` reports an `InstallMode`: `installed` · `native` (`beforeinstallprompt` available) · `ios-safari` (guided Share → *Zet op beginscherm* steps) · `ios-other` (asks to open in Safari) · `none`. Dismissal is stored as a timestamp and holds for 14 days. `lib/platform.ts` `isStandalone()` also feeds `touch_activity`. `useOnlineStatus` / `<OfflineBanner>` surface connectivity.

**The only service worker is `public/sw.js`, for push** (§10.5): no fetch handler, nothing cached. The app is installable but not offline-capable: an installed Leapio opened without connectivity shows a browser error, not the banner. The banner only helps a tab that is already loaded; since 2026-10-14 such a tab that is offline at `/app` shows a retry screen instead of "kind toevoegen". See §13 R6.

### 10.3 SEO & marketing surface

`<SEO>` (react-helmet-async) plus `public/sitemap.xml` (`/`, `/beta`, `/privacy`, `/voorwaarden`) and `robots.txt` (lists the sitemap). The Lovable scaffold metadata in `index.html` was cleaned up on 2026-09-28: own `og-image.jpg` (1200×630, with size and alt), no Lovable author/twitter tags, Leapio descriptions. Every absolute URL (OG image, `og:url`, sitemap, `robots.txt`, the canonical of both marketing pages, pinned to `https://leapio.be` rather than the current origin) points at `https://leapio.be` (live since 2026-10-16; `leapio.vercel.app` 308-redirects there). The landing page is the night-sky Buddy design (2026-10-02) with no login button; the beta page is narrowed to the 1ste leerjaar. `/beta` still sets its own `og:image` to `src/assets/beta-hero.jpg`, which shows "XP" coins (R18). `/privacy` and `/voorwaarden` are short static pages (`LegalPage`). Every contact link uses the single info@ address. `SEO-AUDIT.md` covers SEO separately.

### 10.4 Activity & install telemetry

`<ActivityTracker>` (in `App`) calls `touch_activity(p_child_id, p_standalone)` on load and on tab focus, throttled to once per 5 minutes in module state, fire-and-forget. It is the only usage signal besides a completed exercise: it separates "opens the app and stalls" from "never came back", and counts home-screen installs (`installed_at`) versus installed use (`last_standalone_at`). `admin_engagement_stats` turns it into the `/admin/stats` screen.

### 10.5 Push notifications (since 2026-10-24)

Web Push to parents; FSD module 17 holds the product rules.

```
pg_cron 'send-push-notifications'  */15 * * * *
  └─ SELECT net.http_post(... functions/v1/send-push-notifications,
                          header x-push-cron-secret = Vault push_cron_secret)
     WHERE _push_cron_active()          -- switch not 'off' AND inside the window
        └─ edge function (verify_jwt = false)
             ├─ header present → compare with _push_cron_secret() → push_claim_due()
             │     └─ per returned row: send to every push_subscriptions row of the parent
             │          (npm:web-push, TTL 4 h, tag kind:child) → status sent/failed,
             │          404/410 → delete subscription
             └─ no header → requireUser → push_claim_test() as the user → send
```

- **All rules live in `push_claim_due`**, not in the function: change them there. It calls `_buddy_tick` (a write) for each active child of a candidate parent, so the Buddy state the parent is told about is current.
- Client: `lib/push.ts` (`pushSupport`, `readPushStatus`, `enablePush`, `disablePush`, `currentPushEndpoint`, `deviceLabel`), `hooks/usePushNotifications.ts` (`usePushStatus`, `usePushPreferences`, `useOtherPushDevices`). `enablePush` calls `Notification.requestPermission()` before any other await, because Safari only prompts inside a user gesture. `readPushStatus` re-saves an existing subscription, so the device follows whoever is logged in.
- iOS: `PushManager` only exists in the home-screen app; in Safari `pushSupport()` returns `needs-install` and the UI reuses `AddToHomeScreen`.
- The service worker claims open clients on activate so a notification tap can `navigate()` an existing window; otherwise it opens a new one. Only same-origin URLs.
- Status is per device, preferences per account. An empty `VAPID_PUBLIC_KEY` makes every device report `unsupported` (kill switch on the client side).

---

## 11. Testing & Quality Gates

### 11.1 Current state — verified by running it

`npx vitest run` (2026-10-24, local Node 25): **98 test files, 873 cases, all passing**, ~31s. The run still **exits 1**: Vitest reports 18 unhandled rejections (`storage.getItem is not a function` inside GoTrue's initial-session load, one per file in most exercise-screen tests, `Practice` and `parentPinSession`). On 2026-10-02 the GoTrue noise did not fail the run. The likely cause is the local Node 25, whose built-in `localStorage` global shadows jsdom's; CI pins Node 22. Whether CI is green today was not verified here (no `gh` access). See R26.

**Covered:** all 22 exercise screens · `ExerciseShell` (saving game-overs/abandons), `ExplainButton`, exercise explanations, the exercise origin (`exerciseOrigin`) · `AppStart`, `WhoIsPlaying`, `ChooseBuddy`, `BuddyRoom` (incl. the tour, give-from-shop, growth), `BuddyShop`, `Dashboard`, `TabBar`, `Practice`, the Prijzenkast (badge screens), the app-route redirects · the full admin portal (`AdminDashboard` + 8 screens, incl. package switching, Beta give-access/remove, push) · the full parent portal (incl. `TimesTablesCard`, push screens) · `BetaSignupForm`, `signupSource`, `SetupParentPin`, `InstallPrompt` · auth (`Auth`, `AuthContext`, `ProtectedRoute`, `AdminRoute`, PIN session, password validation) · data hooks (`useCompleteExercise`, `usePracticeMenu`, `useChildInsights` (struggle rule), `useDifficultyLevel`, `useExerciseId`, `useExerciseState`, `useAdminRole`, `useBuddy`, `useActivityPing`, `useInstallPrompt`, `useSpeech`) · Buddy logic (`buddyState`, `buddySchedule`, `buddyCatalog`, `buddySpecies`, growth, payout copy) · pure logic (`generateMathQuestion`, grade-2 maths, `halfDouble`, `geometryQuestions`, `getalbeeld`, `gradeFromAge`, `seededRandom`, `errorMessages`, `addChildLogic`, `canvasRecognition`, `invokeFunction`, `exerciseConfigForm`, `platform`, `push`, `reloadOnStaleChunk`, `speakLines`).

**Not covered:** landing pages, `Privacy`/`Terms`, `NotFound` · `AuthCallback` / `ResetPassword` · `GameContext` / `CelebrationContext` · the online-status and exercise-config hooks · **the SQL itself** (no pgTAP; `complete_exercise`, `_complete_exercise_core`, `practice_menu`, `sync_paused_children`, the triggers, `push_claim_due` and the `buddy_*` RPCs are only exercised through mocks) · the edge functions.

**E2E:** `e2e/onboarding.spec.ts` covers signup through the first exercise (uses `LOGIN_PATH`). Not run in CI; with the beta trigger it needs an email on the waiting list.

**Conventions:** shared helpers in `src/test/testUtils.tsx` (`createTestQueryClient`, `queryWrapper`, `fakeSupabaseChain`). Mock Supabase/auth at the module boundary; assert behaviour, not implementation. Anchor time-sensitive fixtures to `Date.now()` — Buddy hooks tick against the real clock and will decay a fixed past timestamp out from under a test.

### 11.2 The gate (since 2026-10-14)

```bash
npm test                              # Vitest
npm run lint                          # ESLint — NOT in CI, currently 33 errors
npm run build                         # vite build — does NOT type-check (SWC strips types)
npx tsc --noEmit -p tsconfig.app.json # 0 errors (2026-10-24); run by CI, no npm script
```

`.github/workflows/ci.yml` runs on every push and PR to `main`: `npm ci` → `tsc --noEmit -p tsconfig.app.json` → `npm test` → `npm run build`, on Node 22, with `VITE_SUPABASE_URL` pointed at a closed local port so a stray request fails fast instead of reaching production. The eight remaining type errors (two dangling type names in Sentence Doctor, six in test helpers) were fixed in the same commit (`b9599b1`).

Gaps: **lint is not in CI** and does not pass (33 errors, 26 of them `no-explicit-any`, mostly `AdminFeedback`, `send-push-notifications`, `ParentFeedback`, `ExerciseSentenceDoctor`; 21 warnings); CI does not block a Vercel deploy (Vercel builds `main` in parallel, so a red CI run is a signal after the fact, not a gate); migrations and edge functions are outside CI.

`Supabase Keep-Alive` (Mon/Thu 08:00 UTC) still pings the free-tier project so it never pauses, because a project left paused long enough is permanently deleted with no backups, which has already wiped `auth.users` once. See §13 R7.

---

## 12. Build, Deploy & Environments

| Concern | Current setup |
|---|---|
| Build | `vite build` (SWC). Vendor chunks: react, supabase, framer-motion, react-query |
| Host | Vercel. `vercel.json` (since 2026-10-14): SPA rewrite to `/index.html` for everything **except `/assets/*`**, so a missing old chunk 404s instead of returning HTML; `Cache-Control: public, max-age=31536000, immutable` on `/assets/*`, `no-cache` on everything else; `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, a restrictive `Permissions-Policy`. No CSP. 308 redirect from `leapio.vercel.app` to `leapio.be` (path kept) |
| Release safety | `lib/reloadOnStaleChunk.ts`, installed in `main.tsx`: on `vite:preloadError` (an open tab asking for a chunk of the previous release) reload once, at most once a minute per tab (sessionStorage); otherwise the error reaches the error boundary |
| CI | `.github/workflows/ci.yml` (§11.2) |
| Dev server | Vite on port 8080, host `::`, HMR overlay off |
| RUM | `@vercel/speed-insights` |
| Migrations | Applied by hand via Supabase CLI against the single hosted project. No staging project, no migration step in CI |
| Scheduled jobs | pg_cron + pg_net (since 2026-10-24): `send-push-notifications` every 15 min. Edge functions are deployed by hand (`supabase functions deploy <name>`) |
| Auth mail | Templates in `supabase/templates/` are pasted into the Supabase dashboard by hand (the files are the source of truth); logo served from `public/email-logo-v2.png` |
| DB safety | Free tier: **no automated backups.** The keep-alive workflow is the only thing standing between an idle period and permanent data loss |
| Lovable | `lovable-tagger` runs in dev mode only; `.lovable/` remains. The public metadata no longer references Lovable. |
| Domain | `leapio.be` (registered and DNS at OVH, mail on OVH MX Plan with SPF/DKIM/DMARC; site on Vercel, `www` redirects to the bare domain) |

Single environment: localhost and production talk to the same database, so a local migration or delete is real. A migration lands in production the moment it is pushed, and `main` is the deploy branch. `supabase/config.toml` links one project only.

---

## 13. Known Risks & Technical Debt

Ordered by what I would fix first. Severity is about blast radius, not effort. Status as of 2026-10-24.

### R1 · PIN throttle is client-side only — **High (security)**, still open
`ParentPinGate` keeps `attempts` and `lockedUntil` in component state, so reloading the page resets the lockout, and `verify_parent_pin` has no server-side counter (no migration touched it since April). A 4-digit PIN is 10 000 candidates.
**Fix:** move the counter server-side — a `pin_attempts` column (or table) on `parent_pins`, incremented inside `verify_parent_pin` and reset on success, with a timestamped lockout the RPC itself enforces.

### R2 · Org access to the Buddy — **Medium (correctness)**, narrowed 2026-10-01 and 2026-10-14
`_can_access_child` exists and `complete_exercise`, `practice_menu`, `record_incomplete_exercise` and `record_times_table_run` use it; since `20261014210000` it never returns NULL, which closed a hole that let a signed-out caller (and anyone, for a child with neither parent nor organisation) through. A parentless org child does not break completion; it simply has no Buddy, no Munten and no Wishes. Still open: the `buddy_*` RPCs, including `buddy_choose` (2026-10-09), and `my_players`/`set_active_children` inline `parent_id = auth.uid()`, and the RLS on `exercise_incomplete_attempts` / `times_table_runs` is parent-only, so an org member (teacher) gets `Not authorized` on the Buddy and sees no Aandachtspunten. Matters once school accounts are real.
**Fix:** call `_can_access_child` from the `buddy_*` RPCs, and decide what owns `buddy_states.parent_id` for an org child.

### R3 · Munten vs Eikel — **Resolved 2026-10-01**
CONTEXT.md now names **Munt/Munten** canonical and lists Eikel as the replaced working name, matching schema, constants and copy (§9.6).

### R4 · No production error visibility — **Medium**, still open
No Sentry, no log drain. Render errors reach the forest fallback and disappear; a silent RLS denial looks like empty data; `record_incomplete_exercise` and the beta confirmation mail fail into `console.error` only. Combined with R5, a subscription-limit regression would surface as "nothing happens" with nothing to read.
**Fix:** wire an error reporter into both boundaries and `mapDbError`.

### R5 · Errors detected by string match — **Medium**, still open and wider
`isSubscriptionLimitError` substring-matches `'subscription limit reached'` against the exception text raised by the `enforce_max_children` trigger. Since October the same pattern covers `Child is paused` (paused-child triggers), `not on beta list` and GoTrue's generic `Database error saving new user` (the beta trigger, as seen after a Google sign-in). Reword the SQL and the dialog or message silently becomes a generic toast.
**Fix:** raise with dedicated `SQLSTATE`s (the beta trigger already uses `P0001`, but so does every plain `RAISE`) or a custom code in `DETAIL`/`HINT`, and match on that.

### R6 · PWA is installable but not offline-capable — **Medium**, still open (narrowed 2026-10-14)
Manifest, icons, install prompt and an offline banner all present; the only service worker (`sw.js`, 2026-10-24) handles push and caches nothing. An installed Leapio opened without connectivity shows a browser error page. The commit "Lock down … the offline start" (`6943f84`) did **not** add caching: it makes `AppStart` and `WhoIsPlaying` show a retry screen when loading fails, so a loaded-but-offline tab no longer sends a known family to "kind toevoegen".
**Fix:** a fetch handler in the existing `sw.js` that precaches the app shell (the hashed assets are now immutable, which makes this simpler), or drop the install prompt until one exists.

### R7 · Nothing gates a push — **Mostly resolved 2026-10-14**, still Medium (process) for what remains
`ci.yml` now runs `tsc` (0 errors), the tests and the build on every push and PR to `main`. Remaining: lint is not in CI and fails (33 errors); CI runs alongside the Vercel deploy rather than before it, so a red run does not stop a release; migrations and edge functions are deployed by hand with no check at all (R22); there is no `npm run typecheck` script.
**Fix:** make lint pass and add it to CI; consider Vercel's "wait for checks" or deploying from CI.

### R8 · Uncancelled timers that navigate — **Medium → Low**, narrowed 2026-10-14
`useExerciseState` still fires two bare `setTimeout`s that call `completeExercise.mutate()` and `navigate()`, never cleared on unmount; it now backs only `ExerciseClock`, `ExerciseMoney` and `ExerciseSentenceDoctor`. Five screens keep their own uncleared timers: `Exercise`, `ExerciseCompareObjects`, `ExerciseComparison`, `ExerciseDotCount`, `ExerciseWriteNumber`. A child who taps back during the feedback pause gets a stray navigation. The duplicate-payout half of the risk is gone: `mutate` runs once per mounted screen and the server dedupes on `p_client_attempt_id`. The other 14 exercise screens clear their timer.
**Fix:** hold the handle in a ref and clear it in a cleanup effect.
*Pointer/keyboard listeners are balanced everywhere (`ExerciseClock` 2/2, `ExerciseWriteNumber` 7/7, `ExerciseSplitBox` and `ExerciseSubtractBox` 1/1).*

### R9 · Buddy logic duplicated in TS and SQL — **Medium (by design, needs guarding)**, still open
Decay rates, the care window, the death rule and item strengths exist in `lib/buddy/*` and in the migrations. The split is correct (server authority + smooth client countdown), but the two can silently diverge, and divergence shows up as a Buddy that dies on screen and revives on refresh. October 2026 added more pairs: the calendar trimester (`phaseOfMonth` ↔ `buddy_growth_target`), the repeat threshold behind "Deze ken ik al!" (`FULL_PAYOUT_TIMES` ↔ `practice_munten_for`), the school year (`schoolYear` ↔ `buddy_school_year`), the species ids (`BUDDY_SPECIES` ↔ the CHECK on `buddy_states.species`) and the package limits (`lib/subscriptionPlans.ts` ↔ `plan_max_children`). The payout amounts themselves are server-only, which is the better pattern.
**Fix:** a test that asserts the TS constants against values read from the DB, or generate one side from the other. At minimum, a comment block in both places listing every paired constant.

### R10 · `exercises.config` has no schema validation at read time — **Medium → Low**, narrowed 2026-10-13
The admin now edits config through a per-family form (`ExerciseConfigForm` + `data/exerciseConfigFields.ts`) with per-field limits and cross-field checks, which removes the easiest way to save a broken config. Still open: families without a form fall back to a raw-JSON textarea, a migration can write anything, and `useExerciseConfig` still casts the `jsonb` straight to the config type, so a malformed row crashes the child's exercise.
**Fix:** Zod-parse the config per family at the boundary and fall back to `DEFAULT_*` on a parse failure, which is the behaviour the hook already promises for a missing row.

### R11 · Catalogue queries fire before the child resolves — **Low**, still open, now visible
`useExerciseGrade` returns 1 until `useCurrentChild` settles, and `useExerciseId` / `useExerciseConfig` have no `enabled` guard, so each issues one query keyed on grade 1, then a second on the real grade. Since the 2de leerjaar went live (2026-10-13) a grade-2 child can briefly get the grade-1 config (a flash of the wrong difficulty, or a first question generated from it) and, if `complete_exercise` fires before the second lookup, the grade-1 exercise id. Not observed, but no longer theoretical.
**Fix:** `enabled: isFetched` (or `!!child`) on both, unless `?leerjaar=` is present.

### R12 · Stripe columns with no integration — **Low**, by design
`subscriptions.stripe_customer_id` / `stripe_subscription_id` and the full plan/status enums exist; there is no Stripe SDK, no checkout, no webhook. Packages are requested by mail and set by an admin through `admin_set_subscription` (since 2026-10-09). Fine as a placeholder — worth an explicit note so nobody assumes billing works.

### R13 · Public URLs point at a domain that does not resolve — **Resolved 2026-10-16**
`leapio.be` is live on Vercel; OG image, `og:url`, sitemap, robots and canonicals use it, and `vercel.json` 308-redirects `leapio.vercel.app` there.

### R14 · Dead code in `GameContext` — **Low**, still open
`hexToColorClass(hex)` ignores its argument and returns the constant `'bg-slate-400'`; badge colours come from `gradientFrom`/`gradientTo` anyway. `GameContext` still re-exports `badgesData` "for backwards compatibility" (the avatars went on 2026-10-09) and mirrors `dbBadges` into `useState` via an effect when a derived value would do.

### R15 · Stray build artefacts — **Low**, still open
84 `vitest.config.ts.timestamp-*.mjs` files are still **tracked in git** in the repo root (none is ignored by `.gitignore`). Cosmetic, but they make `ls` noisy.
**Fix:** `git rm` them and add `vitest.config.ts.timestamp-*` to `.gitignore`.

### R16 · Hidden XP still drives promotion — **Medium (product/domain)**, still open
The child no longer sees XP, but `trimester_progress` XP thresholds still set `pending_promotion`, while the Buddy grows by the calendar. Two clocks for one school year, one of them invisible. Herhalen attempts from a lower grade are now excluded from the own grade's trimesters, which avoids one distortion. Removing the XP/level columns breaks promotion and the parent portal unless promotion is redesigned first. Open decision D-11 in the FSD.

### R17 · `practice_menu` writes, and reads all attempts — **Low**, still open, slightly heavier
It is called on every Dashboard and exercise-list load, takes a `FOR UPDATE` on `buddy_states` once a day to store the Wishes, and `_child_practice_options` counts **all** of the child's attempts per call to decide open trimesters; since 2026-10-13 it also runs `_child_review_options` and calls `_can_see_exercise` (a `has_role` lookup) per exercise row. Fine at beta scale; `exercise_attempts` has indexes on `child_id` and `(child_id, completed_at)` but not `(child_id, exercise_id)`, and a cached "open until" stage will matter later.

### R18 · Marketing copy describes the removed game — **Resolved 2026-10-02**, one leftover
`BetaLanding`, `Landing`, `index.html` meta, JSON-LD and the signup share text were rewritten around the Buddy. Left: `src/assets/beta-hero.jpg` still shows "XP" coins and is both the `/beta` hero image and the `/beta` page's own `og:image` (the site-wide `og-image.jpg` is separate).

### R19 · Three badges cannot be earned — **Low**, still open
`champion`, `collector` and `rainbow` exist in `badges` but `_complete_exercise_core` has no rule for them.

### R20 · Admin exercise edits do not refresh the menu — **Mostly resolved**
`AdminExerciseFamily` now invalidates `['practice-menu']` on the `is_active` toggle and the Test/Live switch. Left: the toggle also invalidates the dead `['stage-mastery']` key, and saving a config invalidates `['exercise-config']` but not `['exercise-id']` (harmless; ids do not change).

### R21 · Per-device state for tour and growth — **Low (by design)**
The first-visit tour and the "Buddy grew" moment are remembered in `localStorage`, so a second tablet replays them and a private window always shows them. Accepted: a replayed celebration is harmless and not worth a write per visit.

### R22 · Push rules only testable in production — **Medium**
`push_claim_due` is plpgsql that ticks Buddies, applies limits and writes the log. With no local or staging database it was applied to production untested; the admin switch (`admins` mode) is the only rehearsal. A bug there either spams parents or silently sends nothing. Watch `failed_30d` and the sent counts in Admin → Meldingen.

### R23 · "Played within 24 h" is not causal — **Low (measurement)**
`admin_push_stats` counts any exercise by any child of the parent after a notification. It cannot separate the notification's effect from normal play; there is no control group.

### R24 · The beta gate is only as closed as the public waiting-list form — **Medium (product/security)**, new 2026-10-19 — see FSD D-14
The `auth.users` trigger admits any email present in `beta_signups`, and `beta_signups` accepts an INSERT from `anon` (the `/beta` form). So anyone who finds `/toegang` can put their own address on the list via `/beta` and register a minute later; "Toegang geven" in Admin → Beta is then not needed. The hidden login URL is obscurity, not access control. If the intent is "only people the admin let in", the gate needs a flag the public cannot set (e.g. `beta_signups.access_granted_at`, written only by admins, checked by the trigger).

### R25 · Anyone can make Leapio send a mail to any address — **Low/Medium (abuse)**, new 2026-10-23 — see FSD module 15
`beta-signup-confirmation` runs with the public anon key and mails an address that was inserted into `beta_signups` in the last 15 minutes and never mailed. Since that insert is also public, a script can enter third-party addresses and trigger one Leapio mail each through Brevo. Bounded (one mail per address, ever, no attacker-controlled content beyond the optional name, which is HTML-escaped) but it costs Brevo quota and sender reputation, and the insert itself has no rate limit or CAPTCHA.
**Fix:** rate-limit by IP in the function, or require a double opt-in token; at minimum watch the Brevo dashboard.

### R26 · Local test run fails on Node 25 — **Low (tooling)**, new
On Node 25 `npx vitest run` passes all 873 cases but exits 1 because of 18 unhandled GoTrue `storage.getItem is not a function` rejections (Node's own `localStorage` global shadowing jsdom's). CI uses Node 22. A developer on a current Node sees a red run and may learn to ignore it.
**Fix:** pin the Node version (`.nvmrc` / `engines`), or stub `localStorage` in `src/test/setup.ts` / pass a storage to the test Supabase client.

### R27 · Not every write path checks paused / test status — **Low**, new
The paused and test-exercise rules are triggers on `exercise_attempts` and `buddy_states`. `record_incomplete_exercise` checks neither (a paused child or a non-admin cannot reach an exercise screen in the normal UI, so this is defence in depth only); `record_times_table_run` does check paused. Inserting into `exercise_incomplete_attempts` for a test exercise would add an Aandachtspunt for an exercise the parent cannot see.

### 13.1 High-risk files

| File | Lines | Why |
|---|---|---|
| `supabase/migrations/20261013210000_review_previous_grade.sql` | 376 | Current body of `_complete_exercise_core` (the game rules: payouts, Wishes, trimesters, badges, rewards) |
| `supabase/migrations/20261014210000_lock_down_child_functions.sql` | 132 | `complete_exercise` wrapper (one payout per run), `_can_access_child` NULL fix, anon revokes |
| `supabase/migrations/20261014180000_admin_test_exercises.sql` | 273 | Current `practice_menu`, `_child_practice_options`, `_child_review_options`; test-exercise policy and trigger |
| `supabase/migrations/20261009200000_who_is_playing_and_paused_children.sql` | 276 | `sync_paused_children`, the paused triggers, `set_active_children`, `admin_set_subscription` |
| `supabase/migrations/20261001120000_buddy_centred_practice.sql` | 601 | Growth, the economy helpers, the Buddy part of the redesign (its `complete_exercise`/`practice_menu` are superseded) |
| `supabase/migrations/…_add_buddy_care.sql` + `…_buddy_care_window.sql` | 594 + 178 | Server-authoritative Buddy simulation; must stay in step with `lib/buddy/*` |
| `supabase/migrations/20261019120000_signup_only_from_beta_list.sql` | 36 | Trigger on `auth.users`: every new account depends on it (R24) |
| `src/context/AuthContext.tsx` | 123 | Auth gate for the whole app; listener-before-getSession ordering, referential stability |
| `src/hooks/useCompleteExercise.ts` | 157 | `useCurrentChild` (playing child), once-per-mount payout, attempt id, retry rule, 7 invalidations |
| `src/components/exercise/ExerciseShell.tsx` | 152 | Every exercise: header, Buddy explanation, game-over/abandon recording |
| `src/screens/AppStart.tsx` | 53 | Timing-sensitive redirect: who plays, add-child, Buddy choice, load error |
| `src/hooks/useBuddy.tsx` | 251 | Buddy state, shared clock, care/buy/buy-and-care mutations |
| `src/screens/BuddyRoom.tsx` | 285 | Home screen: speech, tour, give-from-shop, growth moment |
| `src/hooks/useExerciseState.ts` | 113 | Shared by Clock, Money, Sentence Doctor; uncancelled timers (R8) |
| `src/screens/ExerciseNumberLine.tsx` | 585 | Pointer-event drag logic + handwriting recognition |
| `src/screens/ExerciseWriteDigit.tsx` | 536 | Canvas tracing, local pixel check |
| `src/screens/ExerciseWriteNumber.tsx` | 438 | Canvas + edge function + 7 listeners; uncleared timers (R8) |
| `src/screens/ExerciseWriteLetter.tsx` | 355 | Canvas tracing + stroke paths |
| `src/screens/parent/ParentChildDetail.tsx` | 531 | Multiple queries, Aandachtspunten, Tafels, revival, grade/trimester changes that reach the child's keys |
| `src/screens/Dashboard.tsx` | 395 | Menu, Wishes, badges, rewards, child switch in one screen |
| `src/hooks/useParentPin.ts` + `ParentPinGate.tsx` | 61 + 185 | Security-critical (R1) |
| `supabase/migrations/20261024120000_parent_push_notifications.sql` | 632 | Every push rule, the cron job, the Vault secret (R22) |
| `supabase/functions/send-push-notifications/index.ts` | 162 | Cron + parent test entry points; `verify_jwt = false`, so its own checks are the only gate |
| `supabase/functions/beta-signup-confirmation/index.ts` | 160 | Public, sends mail via Brevo; its claim query is the only abuse limit (R25) |
| `src/integrations/supabase/types.ts` | 1483 | Generated; regenerate after every migration |

---

## 14. Architectural Decisions

Decisions already made, with the reasoning, so they are not silently reversed.

| # | Decision | Rationale |
|---|---|---|
| D1 | All gameplay mutation goes through one `SECURITY DEFINER` RPC, synchronously | A child must see badges, level and rewards the instant they finish. Decomposing into async jobs makes unlocks eventually consistent. |
| D2 | Difficulty lives in `exercises.config` (jsonb), with TS `DEFAULT_*` as fallback | Lets non-engineers tune difficulty per grade without a deploy; the fallback means an unprovisioned grade degrades rather than breaks. |
| D3 | Buddy simulation is server-authoritative, mirrored client-side for display only | A child must not be able to cheat decay or prices; the UI still needs a live countdown. Accepted cost: duplicated logic (R9). |
| D4 | Needs decay only inside a Care Window (school hours, weekdays) | The 24/7 model killed Buddies over a weekend through no fault of the child. |
| D5 | Aggregate on the server (`child_exercise_stats`, now `child_exercise_insights`), not in the browser | The per-attempt payload grows for the life of the account. |
| D6 | `:id` in exercise routes is the stage number, not a DB id | Routes stay human-readable and shareable; the UUID is resolved by `(route, grade)`. |
| D7 | *(Superseded 2026-10-01.)* The `fluisterbos` stage URLs are gone; every exercise returns through one path helper in `paths.ts` (now `exerciseExitPath()`), and old stage URLs redirect to `/app/oefenen`. | Centralising the return path in `paths.ts` made the next layout change (two tabs, 2026-10-02) a one-line edit. |
| D8 | Per-route `<Suspense>` boundaries | One shared boundary meant a single broken import showed an eternal spinner everywhere. |
| D9 | `<ErrorBoundary>` inside the `/app` guard, not only at the root | A crashing exercise degrades `/app`, not the whole app. |
| D10 | `child_exercise_stats`, `child_exercise_insights` and `child_times_tables` are `SECURITY INVOKER` | RLS on `exercise_attempts` already scopes it; no hand-written ownership check to drift. The opposite choice in `complete_exercise` (DEFINER) is what required the R2-style guard. |
| D11 | PIN verified server-side, only a boolean in `sessionStorage` | The PIN itself never touches client storage. |
| D12 | Speech and recognition degrade instead of blocking | `speakText` falls back to Web Speech; `invokeFunction` deadlines at 12s so a child is never stuck. |
| D13 | Everything worth Munten is decided server-side (`practice_menu`, `complete_exercise`); the client only displays it | What a tile shows and what the child earns can never differ, and a child cannot farm payouts from the browser. |
| D14 | Wishes are picked once per day and stored on `buddy_states` | Stable all day on every device, and `complete_exercise` checks a Wish with one row lookup. |
| D15 | `growth_stage` is persisted, not derived | It must not go backwards within a grade (September before the parent raises the grade). |
| D16 | XP/level/streak columns kept although the child never sees them | The parent portal and badges read them, and the live app had to keep working across the switch. All of `20261001120000` is additive. |
| D17 | Two tabs (Buddy, Dashboard), one dark style on every child screen | Product call on 2026-10-02 after the tab-less version felt cluttered. Shared pieces in `components/dashboard`. |
| D18 | Parent rewards count every exercise fully, repeats included | Product call: accepted that a child working for a reward can stick to one type. |
| D19 | Push via Web Push only, to parents only (2026-10-24) | Product call: no e-mail fallback, no notifications to the child. Accepted cost: iPhone parents outside the home-screen app are unreachable. No third-party push service, so no extra vendor or cost. |
| D20 | Push rules in one SQL function, the edge function only delivers | Same reasoning as D13: one place decides, and the log row is written before sending, so overlapping runs cannot double-send. |
| D21 | The cron secret is generated inside the database (Vault), not set by hand | The CLI cannot run ad-hoc SQL and a secret in a migration file would be in history; this way it is never written down anywhere. |
| D22 | Game-over pays nothing; game-overs and abandons go to their own table (2026-10-09) | Losing all hearts used to pay in 8 of 15 exercises and nothing in the rest. A separate `exercise_incomplete_attempts` table keeps them out of everything `complete_exercise` pays and counts, while the parent still sees the struggle. |
| D23 | Aandachtspunten are based on struggle (1 heart, game-over, abandon) over the last 10 tries, not on average score | A finished run always scores 100%, so the old "< 65%" rule only ever saw game-overs. The SQL returns counts; the threshold lives in the client. |
| D24 | One payout per run: a `complete_exercise` wrapper keyed on a client attempt id; the rules live in `_complete_exercise_core` (2026-10-14) | A double tap or a retried request paid twice. Wrapping instead of editing kept the rules byte-for-byte and keeps old clients working (`p_client_attempt_id` defaults to NULL). |
| D25 | Test exercises are hidden by RLS and a trigger, not by the client (`exercises.admin_only`, 2026-10-14) | A direct link or a crafted RPC call must not find or pay a test exercise. New exercises start their migration with `admin_only = true`; the admin switches a family to Live. |
| D26 | Extra children are paused, never deleted; `paused` is stored and written by one function | A downgrade must be reversible without data loss; one writer (`sync_paused_children`) plus a guard trigger keeps the flag consistent with package, parent pick and child set. Paused Buddies are frozen so a pause cannot kill them. |
| D27 | The child picks the Buddy, once per school year, enforced by `buddy_choose` | Product call: ownership for the child; the parent never chooses. Swapping keeps Munten, inventory and growth so the choice carries no economic cost. Existing children were grandfathered as Nootje until September 2027. |
| D28 | Who plays is remembered per device, not per account (`lib/playingChild.ts`) | A child's own tablet never asks again; a shared tablet asks once. No server write per switch. |
| D29 | Herhalen pays normal Munten but does not count towards the own grade's trimesters | Product call: practising older material is worth the same to the Buddy, but must not push a promotion. |
| D30 | Tafels runs are stored next to, not inside, `complete_exercise` (`times_table_runs`) | Stickers need the table number, which the generic attempt row does not carry; the payout path stays one function. |
| D31 | Closed beta enforced in the database (`auth.users` trigger), login URL unlinked (2026-10-19) | Works for email and Google alike, needs no client change to open up (drop the trigger), and existing accounts are untouched. See R24 for its limit. |
| D32 | Release safety without a service worker: immutable hashed assets, `no-cache` HTML, no SPA rewrite for `/assets/*`, reload once on `vite:preloadError` (2026-10-14) | Tablets keep the app open for days; after a release a lazy chunk of the old build must fail loudly and recover, not render `index.html` as JavaScript. |

---

## 15. Conventions

**React Query**
- Keys are arrays, scoped by resource + `userId`/`childId` (+ `grade` for catalogue reads).
- Every mutation invalidates in `onSuccess`. Never navigate before invalidation is dispatched — `AddChild` awaits the `['my-child']` invalidation before routing, or `AppStart` bounces back to add-child; `ChooseBuddy` does the same for `['buddy-state', childId]`.
- Treat `isLoading === false && data === undefined` as "not loaded", not "empty": use `loadFailed()` and show `LoadError` (an offline start used to look like "no child").
- `enabled: !!child?.id` (or `isFetched`) for anything child-scoped.
- Surface `isError` when an empty array and a failure mean different things to the UI.

**Supabase**
- `if (error) throw error` after every call — never swallow.
- DB types are generated. **Regenerate after every migration**; never hand-edit `types.ts`.
- Any `SECURITY DEFINER` function taking a client-supplied id re-checks ownership itself.
- Treat an unexpected empty result as a possible RLS denial (Admin → Beta's delete checks the returned rows for exactly this).
- **Game rules change in `_complete_exercise_core`**, never by redefining `complete_exercise` with the old 7 arguments.
- A new exercise's migration inserts its rows with `admin_only = true`, idempotently (update an existing `(route, grade)` row instead of duplicating it).
- Rules a client could route around (paused, test exercise, beta list) belong in a trigger or the RPC, not only in the UI.
- There is no staging database: every `supabase db push` and every delete from localhost hits production.

**Edge functions**
- Always call through `invokeFunction()` so the deadline applies (exception: the fire-and-forget beta mail).
- Verify the caller with `_shared/requireUser.ts` (or an anon-key client bound to the request's `Authorization` header) before escalating to service-role. A function that calls a paid API requires a signed-in user, caps its payload and times out the upstream call.

**Error handling**
- User-facing copy is Dutch, via `mapAuthError` / `mapDbError`.
- Subscription limits open `<SubscriptionLimitDialog>`, not a toast.

**Forms**
- React Hook Form + Zod. The auth screens still use manual validation — known debt; new screens should not copy them.
- Admin exercise settings go through `data/exerciseConfigFields.ts`; add a form there when adding a family.

**Buddy & practice**
- Vocabulary comes from CONTEXT.md, not from whatever the code happens to say.
- Any change to decay, the care window, death, item strengths, the calendar trimester, the repeat threshold, the school year, the species list or the package limits is a **paired** change in TS **and** the SQL (R9).
- Payouts, Wishes and pickable exercises come from `practice_menu`; never compute them in the client.
- Child routes come from `APP_PATHS`; call `startExerciseFrom(origin)` before opening an exercise, and leave it via `exerciseExitPath()`.
- A game-over never calls `complete_exercise`; only a finished run (1–3 hearts) does, once per mounted screen.
- New exercise screens render in `ExerciseShell` with `ExerciseParts` and pass an `explain` text from `data/exerciseExplanations.ts` (agreed in `docs/uitleg-oefeningen.md`); no mascot inside exercises.
- The current child comes from `useCurrentChild()` (follows "Wie speelt er?"), never from "the first child of the parent".
- Do not reintroduce child-facing XP, levels, streak counters or a map.

**Timers & listeners**
- Hold every `setTimeout` in a ref and clear it on unmount. Every `addEventListener` gets its `removeEventListener` in the same cleanup.

---

## 16. Suggested Next Steps

A sequence, not a backlog — each step makes the next one safer. Updated 2026-10-24.

1. **Server-side PIN throttling** (R1). The only genuine security hole left; the PIN now also guards which children play and the push settings.
2. **Decide what the beta gate must mean** (R24), and rate-limit the public signup + mail path (R25) before more traffic is driven to `/beta`.
3. **pgTAP (or equivalent) coverage for `_complete_exercise_core`, the `complete_exercise` wrapper, `practice_menu`, `sync_paused_children`, the triggers and `push_claim_due`** (R22). They hold the whole economy, trimester opening, growth, pausing and push, and are only tested through mocks against the single live database.
4. **Make lint pass and add it to CI; pin Node** (R7, R26). The type gate exists now; the lint gate does not.
5. **Error reporting in both boundaries** (R4), then **replace the string-matched error detection with codes** (R5), which now covers four messages.
6. **Guard the catalogue queries on the child** (R11). With grade 2 live, the grade-1 first query is a real flash of the wrong exercise.
7. **Replace the `/beta` hero / OG image**, which still shows "XP" coins (R18).
8. **Decide promotion vs calendar growth** (R16) before touching the hidden XP columns.
9. **`_can_access_child` in the `buddy_*` RPCs and the new RLS** (R2) before school accounts go live.
10. **Fix the uncancelled timers** in `useExerciseState` and the five screens (R8).
11. **Zod-validate `exercises.config` at read time** (R10).
12. **Service worker caching, or drop the install prompt** (R6). `sw.js` already exists for push, so a fetch handler is a small step.
13. Housekeeping: `git rm` the 84 timestamp files (R15), the `GameContext` dead code (R14), the dead `stage-mastery` invalidation (R20), the unused `child_exercise_stats` and `children.avatar_*`.

Done since 2026-10-02: the PR/push workflow with a clean `tsc` (R7, 2026-10-14), Munten as the canonical name (R3, 2026-10-01), `leapio.be` with the `leapio.vercel.app` redirect (R13, 2026-10-16), the admin config form (R10, partly), the `practice-menu` refresh after admin edits (R20, mostly).
