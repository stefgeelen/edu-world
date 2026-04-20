

# Functional Audit & Consistency Report — EduWorld

## Scope
End-to-end flow analysis across: Landing → Auth → Add Child → Avatar Selection → Dashboard → QuestMap → Stage (Fluisterbos) → Exercise → Reward/Progress feedback → Parent Portal. All findings derived from static code analysis; no code changed.

---

## 1. End-to-End Flow Audit — Friction Points

### 1A. Avatar selection is never persisted
- `AvatarSelection.tsx` calls `setSelectedAvatar(avatar)` (local React state only) and navigates to `/dashboard`.
- `children.avatar_id` in DB stays `NULL`. `GameContext` reads avatar from `child.avatar_id` on every reload — meaning **on refresh/login the user lands back on `/app` (avatar picker) repeatedly**.
- This breaks the entire onboarding flow and makes "Studiemaatje" feel arbitrary.

### 1B. Onboarding loop after signup
- Signup → `/app/add-child` → on success navigates to `/app` (= AvatarSelection) → picks avatar → `/app/dashboard`.
- A returning user with a child but no avatar_id (always, due to 1A) is bounced to AvatarSelection again. There is no "skip if already chosen" guard; the route `/app` always shows the picker.

### 1C. Quest Map navigates to broken/unrelated routes
- `TRIMESTER_CONFIG` hardcodes per-trimester targets (`/app/exercises/bonds/2`, `/app/exercises/language/3`, `/app/exercises/math/4`). These are arbitrary single exercises, not stage hubs. Trimester 2/3/4 don't lead to a stage screen analogous to Fluisterbos.
- Unlock logic (`getCheckpointStatus`) gates by `is_completed`, but stage 1 itself has no DB exercise rows for trimesters > 1, so progress never advances visibly.

### 1D. TabBar disappears on stage screens
- `TabBar` hides on `/app/stage/*` and `/app/exercise*`. On Fluisterbos there is a back button to `/app/map`, fine — but on the deeper exercise detail screens the only exit is `ExerciseShell`'s close button. Closing returns to `/app/map`, not to the originating stage. After completing an exercise the user lands on `/app/dashboard` (Exercise.tsx hard-codes this), losing their place in the stage.

### 1E. Hardcoded daily quests
- `Dashboard.tsx` shows three static `DAILY_QUESTS` with `done: true/false` literals. These never reflect actual activity. "Behoud een reeks van 5 dagen" claims `done: true` for every user.

### 1F. Streak permanently 0
- `GameContext` sets `streak = 0` with comment "not yet tracked". `useCurrentChild` actually selects `streak`, but GameContext ignores it. Even so, `complete_exercise` RPC never updates `streak` or `last_active_date`. Streak feature is non-functional end-to-end.

### 1G. Promotion ack never shown to child
- `complete_exercise` returns `all_trimesters_completed`. Neither Exercise.tsx nor `useCompleteExercise.onSuccess` surfaces this. Child sees nothing; only parent sees "Promotie beschikbaar" badge in ParentChildren.

### 1H. RewardCompletedPopup is dead code
- Component exists, RPC returns `completed_rewards`, but no screen renders the popup. A child who completes the last required exercise of a reward gets zero feedback.

### 1I. Rewards: parent UX gaps
- `confirm()` browser dialog used for delete (jarring). No edit. Subject choices fixed to math/reading/writing — no "anything" option.
- `ParentRewards` allows creating rewards with 0 children (form opens with empty `childId`, save fails silently with toast "Er ging iets mis").

### 1J. Parent → Child detail: no exercise history
- Detail page shows aggregated `child_progress` and trimesters, but no recent attempts list, no per-exercise mastery view. Parent can't see what child actually did.

### 1K. Auth flow gaps
- `/auth` has no "forgot password" link, though `ResetPassword` screen exists.
- Email is set to auto-confirm (test mode) per memory — needs flagging before production.
- No Google OAuth despite project guideline preferring it.

### 1L. Sign-out destinations inconsistent
- Dashboard sign-out → `/auth`. ParentLayout sign-out → `/auth`. Fine, but no toast confirmation, and `useGame` retains avatar state across users until refresh (potential cross-account leak in shared device).

---

## 2. Database Data Integrity & State Consistency

### 2A. Single source of truth — mostly OK
- XP/level/grade derived from `children` table via `useCurrentChild`. `complete_exercise` RPC updates atomically. ✔
- Query invalidation list in `useCompleteExercise.onSuccess` is comprehensive (invalidates 8 query keys). ✔

### 2B. Stale data risks
- `ParentChildren` and `ParentRewards` both query `['parent-children', user.id]` but `useCompleteExercise` invalidates `['parent-children']` (no user id) — partial mismatch may leave parent screens stale until refetch on focus.
- `selectedAvatar` is local state. After parent changes child's avatar elsewhere (no UI for this exists), the dashboard shows stale avatar until manual reload.

### 2C. Streak & last_active_date unused
- Columns exist in DB, never written, never read meaningfully. Either remove or implement.

### 2D. Level field unused as gameplay driver
- `children.level` exists and is shown in Dashboard ("Groep {level}"), but **no code path increments it**. `xpRequired = level * 1000` displays a progress bar that fills toward a level-up that never triggers.

### 2E. avatar_url vs avatar_id duplication
- DB has both `avatar_id` (string key into `avatars.ts`) and `avatar_url`. Dashboard uses `avatars.ts` lookup; ParentChildren reads `avatar_url`. Inconsistent — children list shows initial letter instead of avatar image because `avatar_url` is never set.

### 2F. Subscription max_children not enforced server-side
- `ParentChildren` checks `children.length < maxChildren` client-side. RLS allows insert as long as `parent_id = auth.uid()`. Bypassable.

### 2G. Pending promotion: child UX missing
- `pending_promotion=true` shown in parent panel only. Child's QuestMap header still says "Leerjaar X" with no indication that promotion is awaiting parent action.

---

## 3. Functional Gap Analysis (production-readiness)

| Area | Missing |
|---|---|
| Empty states | Dashboard: no zero-XP coaching. Map: trimesters 2-4 if stage data missing show as "locked" with no explanation. |
| Error states | No error UI for failed `complete_exercise` mutation, failed children fetch, network drop. Only `toast.error` in form submits. |
| Confirmation modals | `confirm()` browser dialog for: reward delete, grade up/down. Should use `AlertDialog`. |
| Loading skeletons | Most screens use centered `Loader2` spinner — no skeleton placeholders matching final layout. |
| 404 / unauthorized | NotFound exists but `/admin` has no specific "not authorized" screen for non-admins. AdminRoute behavior unverified. |
| Forgot-password link | Not exposed on Auth screen. |
| Avatar persistence | Required for entire onboarding to work. |
| Streak engine | `complete_exercise` should update `last_active_date` + `streak`. |
| Level-up engine | RPC must increment `children.level` when xp crosses `level * 1000`. |
| Reward popup wiring | RewardCompletedPopup must consume `completed_rewards` from RPC return. |
| Promotion popup for child | Show celebratory modal when `all_trimesters_completed`. |
| Daily quests | Currently fake static data — either implement backed by exercise_attempts or remove. |
| Parent recent activity | Parent detail needs recent attempts feed. |
| Subscription enforcement | DB trigger to prevent inserting child when count ≥ max_children. |
| Server-side input limits | `rewards.required_exercises` accepts 1-100 client-only. |
| Cross-account leak | Sign-out should reset `GameContext` (clear queryClient + selectedAvatar). |
| Settings | No language toggle, no notification prefs, no profile edit beyond admin update. |
| Privacy/legal | No "delete child", no data export, no terms screen. |
| PWA install prompt | Exists but no analytics on install — not blocking. |

---

## 4. Top 5 High-Impact Improvements (recommended order)

1. **Persist avatar choice & repair onboarding loop**
   - On AvatarSelection: `update children set avatar_id = ... where id = currentChild.id`, invalidate `my-child`.
   - Make `/app` route auto-redirect to `/app/dashboard` when child already has avatar_id; otherwise show picker.
   - Outcome: removes the single biggest friction point and makes the buddy actually persistent.

2. **Wire reward & promotion celebrations end-to-end**
   - In `useCompleteExercise.onSuccess`, surface `completed_rewards` and `all_trimesters_completed` via a global event/store consumed by `Layout`.
   - Render `RewardCompletedPopup` on completion. Add a `PromotionPopup` for trimester completion.
   - Outcome: closes a finished feature loop; gives child immediate gratification.

3. **Implement streak + level-up in `complete_exercise` RPC + UI**
   - SQL: increment streak when `last_active_date = today-1`, reset when older, set today; level up when `xp >= level*1000`.
   - GameContext: derive `streak` from `child.streak` (already fetched).
   - Outcome: makes Dashboard's streak/XP-bar real, unlocks the "Vurige Streak" badge logic.

4. **Replace native `confirm()` with `AlertDialog` + add edit for rewards**
   - Use existing `components/ui/alert-dialog.tsx` for delete-reward and grade promotion/demotion.
   - Add edit-reward modal (reuse RewardForm).
   - Outcome: production-grade feel; no jarring native dialogs.

5. **Make Quest Map & TabBar navigation cohesive**
   - Trimesters 2-4 should each route to a stage screen analogous to Fluisterbos (or to a "binnenkort" placeholder if content missing) — never to a single exercise.
   - After exercise completion, navigate back to the originating stage (not Dashboard); keep TabBar consistent.
   - Outcome: removes "loose" feeling; users always know where they are.

---

## Technical Implementation Notes (for next phase)

- DB migrations needed: extend `complete_exercise` (streak + level-up); add trigger on `children` insert to enforce subscription.children_max.
- New hook: `useCelebrationQueue` (or extend `useCompleteExercise`) emitting events into a `CelebrationProvider` rendered in `Layout`.
- New component: `PromotionPopup` (mirror RewardCompletedPopup styling).
- AvatarSelection: convert to mutation that updates `children.avatar_id` then invalidates `my-child`.
- `GameContext.streak` should read from child query (single line change).
- `/app` index route: replace `<AvatarSelection />` with a guard component that picks the right destination.
- Replace `window.confirm` calls in `ParentRewards.tsx` and `ParentChildDetail.tsx` with `AlertDialog`.
- Daily quests: either compute from `exercise_attempts` filtered to today, or remove the section.

