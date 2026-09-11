# Map: Buddy Care Mechanic (Tamagotchi-style)

## Destination

A written feature spec (data model + UX flows) that layers a Tamagotchi-style care mechanic onto the existing study-buddy Avatar — feed, play, sleep, and give medicine — earned via Eikels and Care Items from completing exercises, with real decay, illness, and parent-revivable death. The spec should be complete enough to hand to an implementation session with no further design decisions needed.

## Notes

- Domain glossary: see [CONTEXT.md](../../CONTEXT.md) — Avatar, Buddy, Need, Care Action, Health, Eikel, Care Item, Illness, Death, Buddy Room.
- App is Dutch-native ("Leapio", set in "Magische Fluisterbos"). All child-facing copy in the eventual spec must be in Dutch, matching the existing playful/energetic tone (exclamation marks, emoji, per-avatar voice).
- This map is planning-only: no ticket should produce implementation code, only spec content (data model tables, flow descriptions, UI direction) for a future implementation effort.
- Existing architecture to respect: the `complete_exercise` Postgres RPC (in `supabase/migrations/`) is the single transactional mutation point for XP/streak/badges/rewards today — Eikels-earning should integrate there, not as a separate mutation path.
- No issue tracker was configured for this repo (no `gh` CLI, no tracker doc), so this map uses wayfinder's local-markdown fallback: this file plus one Markdown file per ticket under `tickets/`, with blocking expressed via a `blocked_by` frontmatter field instead of native tracker links.

## Decisions so far

- [Destination, scope & audience](tickets/001-destination-scope-audience.md): Spec-first destination; care actions limited to feed/play/sleep/medicine/wash (no discipline/evolution); fixing the pre-existing buddy-message bug is out of scope; applies uniformly across grades 1-6, one universal ruleset for v1.
- [Needs model](tickets/002-needs-model.md): Five Needs — Hunger, Fun, Energy, Hygiene, Health. Health has no independent timer; it drops only as a consequence of the other four staying critical. Sleep always works for free; a Sleep-comfort Care Item only speeds up recovery, never gates it.
- [Death & parent revival](tickets/003-death-and-revival.md): Sustained zero Health triggers Death. Only a parent can revive (Parent Portal, any time, no cooldown), restoring Needs partially, not fully. Death never blocks the child's exercises, XP, or Eikels earning.
- [Economy: Eikels & Care Item shop](tickets/004-economy-eikels-shop.md): Exercises earn Eikels (alongside XP), spent in a Shop on Care Items. Every Care Item is single-use/consumable. Fixed catalog of exactly 3 items per category: Food (cookie, apple, sandwich), Toy (ball, puzzle, playing blocks), Sleep-comfort (pillow, blanket, bear), Medicine (vitamin, magic potion, magic cookie), Hygiene (water, soap, sponge) — working English names, pending Dutch translation (see ticket 010).
- [Screen structure](tickets/005-screen-structure.md): A dedicated Buddy Room screen (separate from Dashboard) hosts Need status and the five Care Actions; the Shop is its own screen reachable from inside the Buddy Room; a simple indicator on Dashboard/nav shows when a Need is critical.
- [Add Hygiene as a fifth Need & Care Action](tickets/011-add-hygiene-need.md): Hygiene added, restored by a new Wash action, following the exact same rules as Hunger/Fun/Energy (contributes to Health, strictly requires a Care Item) — amends tickets 001, 002, 004, and 005 in place.
- [Data model & schema design](tickets/006-data-model-schema.md): New `child_buddy_state` table (Needs + Eikels + timestamps) and `child_inventory` table (owned items); Care Item catalog stays client-side only; Illness/Death both derived (no stored flags beyond a single `health_zero_since` timestamp); `complete_exercise` extended in place for Eikels; all Buddy mutations go through ownership-checked RPC functions, direct table writes blocked by RLS.
- [Numeric tuning](tickets/007-numeric-tuning.md): Daily engagement target of 1-3 Care Actions (Hunger/Energy decay ~daily, Fun/Hygiene ~every other day); a 24h buffer before neglect hurts Health; a full week of illness before Death; flat 5 Eikels per exercise; item tiers priced 10/25/60 Eikels for a noticeable savings-goal gap.
- [Prototype: Parent Portal revival flow](tickets/009-prototype-parent-revival.md): An always-visible "Buddy Verzorging" card on `ParentChildDetail`, naming which Needs were neglected when dead, with an inline (non-modal) confirm step before reviving.
- [Dutch copy pass](tickets/010-dutch-copy.md): Full Dutch copy for all 15 items, 5 Need/5 Care Action labels, system states, and per-avatar voice-lines. Death is described plainly ("dood") to the child, not softened — confirmed intentional given the real-stakes design.

## Paused

- [Prototype: Buddy Room & Shop UI/UX](tickets/008-prototype-buddy-room-shop.md): the user is designing this screen externally in Lovable and will link the result here — left open and unassigned until then, not picked up again in the meantime.

## Not yet specified

- Age-scaled difficulty/decay tuning per grade — deferred for v1 (flat universal ruleset chosen); revisit if younger-grade parents report the real-decay/death mechanic feels too harsh.
- Push/external notifications reminding a child to check on their Buddy, beyond the in-app Dashboard/nav indicator — not yet explored.
- Parent-facing visibility into a child's Buddy care history/patterns beyond the Revival action itself — not yet explored.

## Out of scope

- Fixing the pre-existing `BUDDY_MESSAGES` avatar-id mismatch bug (buddy messages currently never fire for any live avatar, since the data file is still keyed to retired ids) — a real bug, but explicitly ruled out of this map's scope; see [001](tickets/001-destination-scope-audience.md).
- Additional Tamagotchi-style actions: discipline and evolution/growth stages — ruled out for v1; see [001](tickets/001-destination-scope-audience.md). (Cleaning/hygiene was originally ruled out alongside these, then reconsidered and brought into scope — see [011](tickets/011-add-hygiene-need.md).)
