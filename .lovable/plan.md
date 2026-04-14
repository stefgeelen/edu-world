

# Plan: Study Buddy Integratie (met Animaties)

## Concept

De gekozen avatar wordt een actieve metgezel die het kind motiveert met gepersonaliseerde berichten, visuele aanwezigheid en expressieve animaties op sleutelmomenten in de app.

## Nieuwe bestanden

| Bestand | Doel |
|---|---|
| `src/data/buddyMessages.ts` | Berichten per avatar per situatie |
| `src/components/BuddyBubble.tsx` | Avatar + tekstballon + animaties |
| `src/hooks/useBuddyMessage.ts` | Kiest bericht op basis van avatar + situatie |

## Aangepaste bestanden

| Bestand | Wijziging |
|---|---|
| `tailwind.config.ts` | Buddy-specifieke keyframes toevoegen |
| `src/components/exercise/ExerciseShell.tsx` | BuddyBubble integreren bij correct/fout/klaar |
| `src/screens/Dashboard.tsx` | Begroeting bij laden |
| `src/screens/QuestMap.tsx` | Motivatie bij laden |

## Animaties

Vijf buddy-animaties worden toegevoegd aan de Tailwind config en gebruikt door BuddyBubble:

| Animatie | Wanneer | Gedrag |
|---|---|---|
| `buddy-bounce-in` | Buddy verschijnt | Schaalt van 0 → 1.1 → 1 met bounce-easing, fade-in |
| `buddy-celebrate` | Goed antwoord | Kleine jump + wiggle (translateY -8px + rotate ±5deg) |
| `buddy-sad-shake` | Fout antwoord | Horizontale shake (translateX ±4px, 3 keer) |
| `buddy-idle-float` | Wachtend/idle | Zacht op-en-neer zweven (translateY ±4px, 3s loop) |
| `buddy-exit` | Bubble verdwijnt | Schaalt naar 0.9, fade-out, schuift 10px omlaag |

De tekstballon krijgt een aparte `bubble-pop` animatie: scale 0.8 → 1.05 → 1 met een lichte vertraging t.o.v. de avatar.

### Tailwind keyframes (toe te voegen)

```text
buddy-bounce-in:   0% scale(0) opacity(0) → 60% scale(1.1) → 100% scale(1) opacity(1)
buddy-celebrate:   0% ty(0) → 30% ty(-8px) rotate(5deg) → 60% ty(0) rotate(-5deg) → 100% ty(0) rotate(0)
buddy-sad-shake:   0%,100% tx(0) → 15%,45%,75% tx(-4px) → 30%,60% tx(4px)
buddy-idle-float:  0%,100% ty(0) → 50% ty(-4px)
buddy-exit:        0% scale(1) opacity(1) → 100% scale(0.9) ty(10px) opacity(0)
bubble-pop:        0% scale(0.8) opacity(0) → 70% scale(1.05) → 100% scale(1) opacity(1)
```

## BuddyBubble Component

- Toont avatar-afbeelding (48px cirkel) + tekstballon
- Ontvangt `mood` prop: `'greeting' | 'correct' | 'wrong' | 'complete' | 'idle'`
- Mood bepaalt welke animatie-class op de avatar wordt gezet
- Tekstballon verschijnt met `bubble-pop` animatie (200ms delay)
- Auto-dismiss na 4 seconden via interne timer, of bij tap
- Positioned als overlay in de linkeronderhoek (of rechtsboven op mobiel)

## Berichtensysteem

Elke avatar (pixel, zaza, riff, rocco, sparky) krijgt 3-5 unieke berichten per situatie. De hook houdt bij welke berichten al getoond zijn in de sessie om herhaling te voorkomen.

Situaties: `dashboard_greeting`, `exercise_start`, `correct_answer`, `wrong_answer`, `exercise_complete`, `map_encourage`, `badge_unlocked`

## ExerciseShell integratie

ExerciseShell krijgt een optionele `buddyMood` prop. Wanneer gezet, toont het een BuddyBubble met de juiste animatie. Oefenschermen hoeven alleen de mood door te geven na een antwoord — de shell handelt de rest af.

## Geen database-wijzigingen

Alle berichten zijn statische data. Avatar-keuze wordt al opgeslagen in de `children` tabel.

