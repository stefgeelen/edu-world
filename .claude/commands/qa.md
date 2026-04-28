Run a focused QA audit on $ARGUMENTS (or `src/` if no target given). Work through the phases below in order. Be precise — only report real bugs with clear evidence. Skip stylistic preferences.

---

## Phase 1 — Targeted pattern scan

Search the target for these known bug patterns:

**React Query**
- Mutations (`useMutation`) that do NOT call `queryClient.invalidateQueries` in `onSuccess`
- `useQuery` with a key that is missing a scope variable (e.g. uses `child.id` in the query but not in the key)
- Navigating inside `onSuccess` before `invalidateQueries` resolves

**Supabase**
- `supabase.*` calls (outside `queryFn`) with no `if (error) throw error` or `.catch()`
- `supabase.functions.invoke` with no timeout or error handling
- `supabase.auth.onAuthStateChange` with no cleanup (`return () => subscription.unsubscribe()`)
- RPC calls where the result `data` is used without checking it's non-null

**React / useEffect**
- `useEffect` that sets up `document.addEventListener` or `setInterval`/`setTimeout` without a cleanup `return () =>` that removes/clears them
- `// eslint-disable-next-line react-hooks/exhaustive-deps` — read the surrounding code and verify the omitted dep is intentionally stale, not a bug
- State updates (`setState`) that can fire after the component unmounts (inside async callbacks or timeouts)

**Type safety**
- `as any` or `@ts-ignore` — note location and reason
- Props or function args typed as `any` without explanation

**Forms**
- Controlled `<input>` missing `onChange` handler
- Form state not reset after failed async submission

---

## Phase 2 — Run tests and lint

```bash
npm test -- --run
```
```bash
npm run lint
```

For tests: note which ones fail and whether they look like real regressions or pre-existing failures.
For lint: flag rules violations that point to runtime bugs, skip purely stylistic ones.

---

## Phase 3 — Read high-risk files if in scope

If the target includes any of these, read them and apply the checks above manually:

- `src/context/AuthContext.tsx` — session state, onAuthStateChange cleanup
- `src/hooks/useCompleteExercise.ts` — 13 query invalidations, RPC call
- `src/screens/Dashboard.tsx` — multiple queries, eslint-disabled effect
- `src/screens/ExerciseWriteNumber.tsx` — canvas listeners, edge function call
- `src/screens/ExerciseClock.tsx` — pointer drag, listener cleanup
- `src/hooks/useParentPin.ts` — sessionStorage PIN, security-critical
- `src/screens/AddChild.tsx` — must invalidate `['my-child']` before navigating
- `src/screens/AvatarSelection.tsx` — timing-sensitive redirect on `!child`

---

## Phase 4 — Report

Group findings by severity. For each issue include:
- **File + line number**
- **The specific code** (short snippet)
- **What breaks** (concrete failure scenario, not vague concern)
- **Suggested fix** (one sentence)

Skip anything you're not confident is actually wrong.

### 🔴 Critical
Data loss, auth bypass, app crash, navigation loop, silent data corruption.

### 🟡 High
Wrong UI state, stale data shown to user, missing error handling on user-visible flows, memory leak in frequently-used component.

### 🟢 Medium
Edge case bugs, missing cleanup in rarely-unmounted components, type assertions that could hide future bugs.

### Tests
List any critical paths with zero test coverage that would be high-value to add.

---

If no issues are found in a phase, say so briefly and move on. Do not pad the report.
