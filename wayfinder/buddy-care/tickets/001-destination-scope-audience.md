---
title: Destination, scope & audience
type: grilling
status: closed
assignee: null
blocked_by: []
---

## Question

What does "done" look like for this map, and what's explicitly in vs. out of scope for the v1 Buddy Care Mechanic?

## Resolution

- **Destination**: A written feature spec (data model + UX flows), ready to hand to implementation with no further design decisions needed. This map produces no implementation code.
- **In scope (Care Actions)**: Feed, Play, Sleep, Medicine, Wash (Wash and its Hygiene Need added later — see [ticket 011](011-add-hygiene-need.md)).
- **Out of scope for v1**: discipline and evolution/growth-stage mechanics. (Cleaning/hygiene was originally ruled out here too, then reconsidered and brought into scope — see [ticket 011](011-add-hygiene-need.md).)
- **Explicitly out of scope for this map**: fixing the pre-existing bug where `BUDDY_MESSAGES` is keyed to retired avatar ids (`pixel`/`zaza`/`riff`/`rocco`/`sparky`) instead of the live ones (`fia`/`delta`/`milo`/`cog`/`ollie`), which currently makes every buddy speech-bubble lookup return nothing. Real bug, tracked separately from this feature.
- **Audience**: Applies uniformly to all children, grades 1-6 (~ages 6-12). One universal difficulty/decay ruleset for v1 — no age-based tuning (see "Not yet specified" on the map for a possible future revisit).
