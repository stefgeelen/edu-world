---
title: "Prototype: Parent Portal revival flow"
type: prototype
status: closed
assignee: Stef Geelen
blocked_by: []
---

## Question

Where exactly in the Parent Portal does the Revival action live (`ParentChildren` list vs. `ParentChildDetail`), and what does a parent see/confirm when their child's Buddy has died?

Covers:
- Does the parent see any explanation of *why* the Buddy died (which Needs were neglected, for how long), or just a "Buddy needs reviving" state and a single action?
- Confirmation step before reviving, if any.
- How the "partial, not full" restoration from ticket 003 is communicated to the parent (do they see resulting Need levels, or is it just described in words?).

Raise fidelity with a rough mockup of this flow for the user to react to.

## Asset

Live, clickable prototype: `src/screens/prototypes/ParentRevivalPrototype.tsx`, mounted at `/prototype/parent-revival?variant=A|B|C` (public route, no login needed — throwaway). Mimics `ParentChildDetail`'s header/density for context since the real page needs auth. To be moved to a throwaway branch and stripped from main once implementation actually begins (this map stays planning-only in the meantime).

## Resolution

**Chosen: Variant B — always-visible care card.** A permanent "Buddy Verzorging" card lives on `ParentChildDetail` among the other stat cards (progress, streak, etc.) at all times, showing the Buddy's care state whether alive or dead:
- When dead, the card explicitly names which Needs were neglected (e.g. Honger, Slaap) rather than just saying "needs reviving."
- Revival happens inline on the same card (the button becomes a "weet je het zeker?" confirm step) rather than in a separate modal/dialog.
- The partial-restore consequence ("Behoeftes herstellen deels, niet volledig") is communicated as inline text next to the confirm step.
- Once revived, the same card switches to a calm "buddy is weer gezond" state.
