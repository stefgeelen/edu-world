---
title: Data model & schema design for Buddy care state
type: grilling
status: closed
assignee: Stef Geelen
blocked_by: []
---

## Question

What's the concrete Supabase schema for the care mechanic, and where does it hook into the existing `complete_exercise` RPC?

Needs to cover:
- Where do the five Need values (Hunger, Fun, Energy, Hygiene, Health), the "last cared for" timestamp(s) driving lazy decay recalculation, and the Death state live — new columns directly on `children` (mirroring how `xp`/`streak`/`last_active_date` already work), or a new sibling table like `child_buddy_state` (mirroring `child_progress`/`child_badges`)? Both patterns already exist in the schema (see CONTEXT.md and the existing `children` table columns) — pick one and justify it.
- Where does the Eikels balance live, and where does the child's Care Item inventory (which of the 15 catalog items they're holding, and how many) live? An inventory of discrete stackable items likely wants its own table (e.g. `child_inventory`), unlike the scalar Need values.
- How does `complete_exercise` (currently in `supabase/migrations/20260831120000_fix_complete_exercise_trimester_count.sql`) get extended to also grant Eikels per completed exercise, in the same transaction as the existing XP/streak/badge/reward updates?
- Should Death and Illness be derived (computed from Health at read-time) or stored as explicit flags/timestamps? Consider how the Parent Portal revival action needs to read/write this state.
- RLS implications: who can read/write this new state (child via the app, parent via Parent Portal for revival)?

Produce a concrete table/column proposal (or extension to `children`) as the spec's data-model section.

## Resolution

Decided by Claude directly — the user has asked that only functional/product questions be put to them, with architecture left to Claude's judgment.

- **`child_buddy_state`** (new table, one row per child): the 5 Need values (Hunger, Fun, Energy, Hygiene, Health), Eikels balance, a `last_cared_at`-style timestamp driving lazy decay recalculation on load, and `health_zero_since` (nullable timestamp, set when Health first hits zero, cleared on revival or recovery). Kept separate from `children` rather than added as more scalar columns there: this is a large (~10+ field), conceptually distinct, genuinely-optional subsystem, unlike the couple of scalars (`xp`/`streak`) already on `children`.
- **`child_inventory`** (new table, many rows per child): `child_id`, `item_key`, `quantity` — mirrors the existing `child_badges` many-rows-per-child pattern.
- **Care Item catalog stays client-side only** (a static array, like `src/data/avatars.ts`), not a DB table. There are only 15 fixed items with no per-child customization or admin-editing need today; `child_inventory.item_key` references the client-side id directly. Revisit only if the shop ever needs to become dynamically configurable.
- **Illness is derived, not stored**: purely `health == 0` at read-time, no separate flag.
- **Death is derived from a stored timestamp**: `health_zero_since` plus the grace period from ticket 007 — no separate boolean needed, avoids the two ever getting out of sync.
- **`complete_exercise` is extended in place** to also grant Eikels into `child_buddy_state`, in the same transaction as its existing XP/streak/badge/reward updates — consistent with how that function has already absorbed new responsibilities over time.
- **All Buddy mutations go through dedicated `SECURITY DEFINER` RPC functions** (`feed_buddy`, `play_with_buddy`, `put_buddy_to_bed`, `give_medicine`, `wash_buddy`, `buy_care_item`, `revive_buddy`), matching `child_progress`'s existing RPC-only precedent (not `child_badges`/`rewards`'s direct-write precedent, since these mutations need coordinated, validated, atomic changes — checking item ownership, decrementing inventory, recomputing Health — not simple single-row CRUD). Direct client `UPDATE`/`INSERT` on `child_buddy_state`/`child_inventory` is blocked by RLS; only SELECT is allowed directly.
- **Each new RPC includes an internal ownership check** (`auth.uid()` against the child's `parent_id`, mirroring the `children` table's own RLS policy) before mutating anything — even though the existing `complete_exercise` function lacks this check today. That gap is real but pre-existing and unrelated to this feature; it's been flagged separately rather than folded into this map (see the "Add ownership check to complete_exercise RPC" suggestion spawned during this session).
- Migration files follow the existing `YYYYMMDDHHMMSS_description.sql` convention.
