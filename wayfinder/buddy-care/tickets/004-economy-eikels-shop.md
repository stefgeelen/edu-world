---
title: "Economy: Eikels currency & Care Item shop"
type: grilling
status: closed
assignee: null
blocked_by: []
---

## Question

What's the earn/spend loop — is it a direct-drop system or a currency+shop, what's the new currency called, and what does the Care Item catalog look like?

## Resolution

- **Currency + Shop model** (not direct-drop): completing an exercise grants both XP (existing) and a new currency, in the same spirit as the existing pattern of one transactional update per exercise completion.
- **Currency name: Eikels** (Dutch for "acorns") — ties into the existing "Magische Fluisterbos" forest setting; deliberately distinct from XP, niveau, streak, sterren (already used literally for an exercise/badge), and beloningen (already means the parent-configured reward-goal system).
- Eikels are spent in a **Shop**, a screen of its own reachable from inside the Buddy Room (see ticket 005), on **Care Items**.
- Every Care Item is **single-use/consumable** — none are permanently owned/equipped. This is deliberate: it keeps exercises the only path to restocking, sustaining motivation to keep doing exercises.
- Fixed catalog of **exactly 3 items per category**, low-to-high tier (working English names — Dutch translation is ticket 010):
  - **Food**: cookie, apple, sandwich
  - **Toy**: ball, puzzle, playing blocks
  - **Sleep-comfort**: pillow, blanket, bear
  - **Medicine**: vitamin, magic potion, magic cookie
  - **Hygiene**: water, soap, sponge (added later, see [ticket 011](011-add-hygiene-need.md))
- **Medicine cures Illness instantly** (one tap fully clears it) rather than accelerating a gradual recovery, since it's the one Care Action tied to a "problem state" rather than routine upkeep.
- Exact prices/point-values per item are implementation-level tuning (ticket 007), not decided here.
