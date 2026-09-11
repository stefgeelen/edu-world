---
title: "Numeric tuning: decay rates, thresholds, death grace period, Eikels earn rate"
type: grilling
status: closed
assignee: Stef Geelen
blocked_by: []
---

## Question

What are the actual default numbers the spec should propose for:
- How fast each of Hunger, Fun, Energy, Hygiene decays per real hour/day of inactivity, and what counts as "critical" for each.
- How long a Need must stay critical before it starts dragging Health down, and how fast Health then drops.
- How long Health must stay at zero before Death triggers (the "sustained period" from ticket 003).
- How many Eikels a completed exercise grants (flat rate, or scaled by difficulty/subject/grade — note the existing `complete_exercise` RPC already varies XP by difficulty, so consider whether Eikels should mirror that).
- Roughly what each Care Item should cost in Eikels, consistent with the 3-tier catalog from ticket 004 (cheap/mild → expensive/strong).

These are meant as sensible, documented defaults for the spec, not final game-balance — implementation can tune them further, but the spec needs concrete starting numbers so screens and interactions can be built against something real.

## Resolution

**Functional decisions (user's call):**
- Target daily engagement: a child checking in once a day should need to perform roughly **1 to 3** Care Actions to keep the Buddy fully content — not all five every day.
- A neglected Need needs a buffer before it starts hurting Health — a single off day shouldn't be punishing.
- Death requires a full **week** (7 consecutive days) of the Buddy being unwell — a deliberately long, forgiving grace period given the real stakes involved.
- Eikels are a **flat reward per exercise**, same amount regardless of difficulty, for now (unlike XP, which already scales) — kept simple to start.
- Item pricing has a **noticeable gap** between tiers, so the top-tier item in each category is a real savings goal, not an afterthought.

**Concrete defaults (Claude's call, to satisfy the above):**
- Needs are tracked on a 0–100 scale. 60–100 = content, 30–59 = getting worried (visible cue), 0–29 = critical.
- Hunger and Energy decay to critical in **~17 hours** (full 0 at ~24h) — meant to be addressed via Feed and Sleep roughly once a day, since these two are the everyday staples (Sleep is always free, so it's frictionless to include daily).
- Fun and Hygiene decay to critical in **~28 hours** (full 0 at ~40h) — deliberately slower, so Play and Wash are only needed roughly every other day, not daily. Combined with Hunger/Energy, this lands the daily total at 1–3 actions on average rather than a flat 4 every day.
- Health only changes once per day (evaluated on load): it drops by 15 points for any Need that has been critical for more than 24 continuous hours (the buffer), and regenerates by 5 points when no Need is currently critical, capped at 100. A single bad day causes no Health loss; a sustained pattern does.
- Illness = Health at 0 (derived, per ticket 006). Death = Health has stayed at 0 for 7 consecutive days (`health_zero_since` older than a week).
- Eikels: flat **5 per completed exercise**, regardless of difficulty/subject.
- Item prices per tier, consistent across all 5 categories: **Tier 1 (basic): 10 Eikels** (~2 exercises), **Tier 2 (mid): 25 Eikels** (~5 exercises), **Tier 3 (premium): 60 Eikels** (~12 exercises) — cookie/ball/pillow/vitamin/water at Tier 1 through sandwich/playing blocks/bear/magic cookie/sponge at Tier 3.
