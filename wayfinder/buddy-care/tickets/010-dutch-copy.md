---
title: Dutch copy pass for Buddy Care Mechanic
type: grilling
status: closed
assignee: Stef Geelen
blocked_by: []
---

## Question

What's the final Dutch child-facing copy for this feature, matching Leapio's existing playful/energetic tone (exclamation marks, emoji, per-avatar voice)?

Covers:
- Dutch names for the 15 catalog items (working English names from ticket 004: cookie, apple, sandwich, ball, puzzle, playing blocks, pillow, blanket, bear, vitamin, magic potion, magic cookie, water, soap, sponge).
- Labels for the five Needs and five Care Actions as shown in the Buddy Room UI.
- Copy for the Dashboard/nav critical-Need indicator, the Illness state, the Death state, and the Parent Portal revival flow.
- Buddy voice-line variants per mood for the new Care Action outcomes (e.g. a happy reaction to being fed), following the existing per-avatar personality pattern in `src/data/buddyMessages.ts` (though wiring those lines back into a working lookup is out of scope per ticket 001 — this ticket is only about drafting the Dutch copy itself for the spec).

## Resolution

**Death language, child-facing:** the word "dood"/"dead" is used plainly for the child, not softened — confirmed directly by the user, matching the real-stakes intent behind the whole mechanic (see ticket 003).

### Item names (15)

| Category | Tier 1 | Tier 2 | Tier 3 |
|---|---|---|---|
| Eten (Food) | Koekje | Appel | Boterham |
| Speelgoed (Toy) | Bal | Puzzel | Blokken |
| Slaapcomfort (Sleep) | Kussen | Deken | Knuffelbeer |
| Medicijnen (Medicine) | Vitamine | Toverdrankje | Toverkoekje |
| Hygiëne | Water | Zeep | Sponsje |

### Need labels

Honger, Plezier, Energie, Hygiëne, Gezondheid.

### Care Action labels

Voeren, Spelen, Slapen, Medicijn geven, Wassen.

### System copy (Buddy Room, Dashboard/nav, states)

- **Dashboard/nav critical indicator** (badge/tooltip): "Je buddy heeft je nodig!"
- **Buddy Room banner, a Need critical**: "{avatarName} heeft dringend zorg nodig!"
- **Illness banner** (Health at 0): "{avatarName} is ziek geworden 🤒 Geef snel een medicijn!"
- **Death state, child-facing** (literal, per the confirmed decision above): "{avatarName} is dood. 💔 Vraag een ouder om hem weer tot leven te wekken."
- **Death state, Parent Portal card** (already drafted for ticket 009's chosen Variant B): "Buddy Verzorging" / "De buddy van {childName} is overleden na te lang verwaarloosd te zijn. Dit werd vooral veroorzaakt door: {neglected needs}" / "Nieuw leven geven" / "Behoeftes herstellen deels, niet volledig — Weet je het zeker?" / "De buddy is weer gezond en klaar om verzorgd te worden."

### Buddy voice-lines per Care Action outcome, by avatar personality

One example line per avatar per outcome, following each avatar's existing personality (Fia: math/detective, Delta: cosmic/space, Milo: rap/hip-hop, Cog: medieval/knight, Ollie: cyber/tech) — a pattern to extend, not an exhaustive set:

| Outcome | Fia | Delta | Milo | Cog | Ollie |
|---|---|---|---|---|---|
| Fed (Voeren) | "Lekker! Nu kan ik weer supersnel rekenen! 🍎" | "Mmm, kosmische brandstof getankt! 🚀" | "Yo, dat was fresh! Nu kan ik weer rijmen! 🍽️" | "Een ridder vecht niet op een lege maag! Dank je! 🍞" | "Systemen opgeladen! Tijd om verder te hacken! ⚡" |
| Played (Spelen) | "Speeltijd! Even mijn rekenmachine laten rusten! 🎈" | "Zwaartekracht-vrij spelen in de ruimte, joepie! 🌌" | "Laten we een beat droppen tijdens het spelen! 🎶" | "Een dappere ridder verdient ook wat spelplezier! ⚔️" | "Gadgets aan, game mode ON! 🎮" |
| Slept (Slapen) | "Tijd om mijn rekenbrein te laten uitrusten... 😴" | "Terug naar mijn ruimteschip voor een dutje... 🌙" | "Chill even, ik droom van nieuwe rijmen... 💤" | "Zelfs ridders moeten slapen in hun kasteel... 🏰" | "Systemen in slaapstand... zzz... 💻" |
| Medicine given | "Puh, dat voelt beter! Nu kan ik weer helder denken! 💊" | "Kosmische geneeskracht, ik voel me weer top! ✨" | "Yo, dat medicijn was echt fire, ik ben weer beter! 🎤" | "Dankzij deze toverdrank ben ik weer sterk als een ridder! 🛡️" | "Systemen gerepareerd, ik ben weer online! 🔧" |
| Washed (Wassen) | "Lekker fris! Nu kan ik weer helder nadenken! 🧼" | "Zo schoon als een pas gepoetste satelliet! 🛰️" | "Fris en fruitig, klaar voor de volgende rijm! 💦" | "Een nette ridder is een sterke ridder! ✨" | "Systeem schoongemaakt en klaar voor actie! 🧽" |
| Critical / pleading | "Ik kan niet meer rekenen zo... help me! 😟" | "Mayday... ik heb je hulp nodig... 🚨" | "Yo... ik voel me niet fresh... kom je helpen? 😔" | "Deze ridder heeft dringend hulp nodig... ⚠️" | "Batterij bijna leeg... hulp nodig... 🔋" |
| Revived | "Dankjewel! Ik voel me weer klaar voor nieuwe puzzels! 💙" | "Terug van een verre reis, dankzij jullie hulp! 🌟" | "Yo, bedankt fam, ik ben weer terug! 🙌" | "Dankzij jullie moed leef ik weer, dappere held! 🏰" | "Reboot compleet, bedankt voor de herstart! 🔌" |
