---
title: Screen structure
type: grilling
status: closed
assignee: null
blocked_by: []
---

## Question

Where does this mechanic live in the app's navigation, and how does a child know to check on their Buddy?

## Resolution

- A new, dedicated **Buddy Room** screen, separate from Dashboard — not woven into existing Dashboard widgets. Hosts all five Care Actions (Feed, Play, Sleep, Medicine, Wash — Wash added later, see [ticket 011](011-add-hygiene-need.md)).
- The **Shop** is its own screen, reachable by navigating from inside the Buddy Room (not a section/tab within the same screen).
- A simple visual indicator appears on the Dashboard and in the nav (e.g. a badge or sad-icon cue) when a Need is critical, since Needs only recalculate on load and the child has no other way to notice decay without opening the Buddy Room. Exact visual treatment is part of the UI prototype (ticket 008).
