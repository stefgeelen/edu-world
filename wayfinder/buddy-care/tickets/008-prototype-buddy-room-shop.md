---
title: "Prototype: Buddy Room & Shop UI/UX"
type: prototype
status: open
assignee: null
blocked_by: []
---

## Question

What should the Buddy Room and Shop screens actually look like and feel like to use?

Covers:
- Layout of the Buddy Room: how the five Needs are visualized (bars/icons/faces?), how the five Care Action buttons are presented, how the Buddy's visual state changes across the range from content → critical → ill → dead.
- The Shop screen: how the 5 categories x 3 items are browsed and purchased, how the Eikels balance and item ownership/quantity are shown, what happens visually when an item is used.
- The Dashboard/nav critical-Need indicator from ticket 005 — exact placement and visual treatment.
- Should reuse existing patterns where sensible: `ImageWithFallback` for avatar art, the existing CSS-keyframe animation approach used by `BuddyBubble`/`BuddyCompanion` (`buddy-bounce-in`, `buddy-celebrate`, `buddy-sad-shake`, `buddy-idle-float` in `tailwind.config.ts`) rather than inventing a new animation system.

Raise fidelity with a rough, throwaway mockup (static or lightly interactive) for the user to react to — not production code.

## Asset

Live, clickable prototype: `src/screens/prototypes/BuddyRoomShopPrototype.tsx`, mounted at `/prototype/buddy-room?variant=A|B|C` (public route, no login needed — throwaway, to be removed once a direction is picked). Three structurally different variants, a "Preview status" control to jump straight to any life-stage, and working (mocked, in-memory) Feed/Play/Sleep/Medicine/Wash buttons and Shop purchases. Left in place as a reference, not deleted.

## Paused

The user is building their own static UI prototype for this screen externally in Lovable and will link the result here when it's ready. This ticket stays open, unclaimed, and un-blocked in the meantime — pick it back up once that link arrives, using it (rather than the in-repo A/B/C prototype above) as the actual design reference.
