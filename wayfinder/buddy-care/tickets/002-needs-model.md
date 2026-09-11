---
title: Needs model
type: grilling
status: closed
assignee: null
blocked_by: []
---

## Question

What are the Buddy's internal Needs, how do they relate to each other, and does every Care Action strictly require spending a Care Item?

## Resolution

- Five **Needs**: Hunger (restored by Feed), Fun (restored by Play), Energy (restored by Sleep), Hygiene (restored by Wash — added later, see [ticket 011](011-add-hygiene-need.md)), Health.
- **Health** is derived, not independent: it has no timer of its own and drops only as a consequence of Hunger, Fun, Energy, or Hygiene staying critical for too long (i.e., it's the compounded signal of overall neglect across the other four).
- Needs decay genuinely over time — real neglect is possible, matching a classic Tamagotchi, not a softened always-happy version.
- Feed, Play, Medicine, and Wash each strictly require spending a Care Item — no free fallback.
- **Sleep is the exception**: putting the Buddy to bed always works for free, restoring Energy at a normal rate even with zero Sleep-comfort items in stock. Consuming a Sleep-comfort item (see ticket 004) only makes that same rest complete faster — it never gates the action.
- Timing model: Needs are recalculated lazily from a stored "last cared for" style timestamp purely when the app loads — no server-side cron/background ticking, consistent with how `xp`/`streak` are only ever mutated inside `complete_exercise` today.
