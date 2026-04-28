# Nieuwe oefening: Splitsdoos (The Split-Box)

Een nieuwe rekenoefening voor groep 1 die traditionele "stippen splitsen"-werkbladen digitaliseert tot een tactiele, game-achtige ervaring. Een doos met tokens wordt verdeeld door een gekleurde scheidingslijn; het kind ziet hoeveel tokens links staan en moet invullen hoeveel er rechts staan (of omgekeerd) — een visuele intro op getallen splitsen.

## Wat de gebruiker krijgt te zien

- Nieuwe oefening **"Splitsdoos"** als 8e oefening onder Rekenen → Groep 1 → Stage 1, met dezelfde Dark Space look & feel als de andere oefeningen (ExerciseShell met sterren, header, buddy).
- **Tray:** een grote ceramic/neumorphic doos met afgeronde hoeken (radius > 12px), zachte schaduwen en een glanzende top-highlight.
- **Tokens:** 3D-lite bolletjes (gradient + binnenshadow + highlight) die in een verzonken tray "liggen". Aantallen schalen mee met de moeilijkheidsgraad uit `NUMBER_BOND_CONFIG` (5–8 in stage 1, oplopend tot 8–15).
- **Divider:** een verticale neon-paars/mint accentbalk dwars door de tray, met een lichte glow — alsof er een fysieke barrière in de doos is gezet.
- **Twee labels onder de tray:** links toont het bekende getal, rechts een leeg "?"-veld dat het kind invult. Per ronde wordt willekeurig de linker- of rechterhelft het invulveld.

## Interactie

- **Desktop (≥ md):** 4-koloms grid met meerdere mini-vragen niet nodig — we tonen 1 grote tray gecentreerd (consistent met andere oefeningen). Hover op tokens geeft een subtiele lift + glow. Fysiek toetsenbord: cijfers + Enter werken direct (tab gaat naar volgend invulveld als er meerdere zijn — hier is er één per ronde).
- **Mobile:** zelfde single-tray layout, invulveld minimaal 44×44px. Tap op het "?"-veld opent de bestaande **`ExerciseNumpad`** bottom sheet (numeric only, geen QWERTY).
- **Squish-effect:** tap/click op het invulveld en op tokens → `active:scale-[0.95]` (consistent met bestaande knoppen).
- **Pop-animatie bij correct:** de tokens aan de "antwoord"-kant poppen één voor één (`scale [1, 1.2, 1]`, 50ms stagger) via Framer Motion.
- **Feedback:** zelfde glow-shadows als andere oefeningen — groen bij correct, oranje bij fout, met shake op het invulveld. Confetti bij ronde-correct, `complete_exercise` RPC bij 5 correct (5 rondes × 20% progress).

## Voorbeeld layout

```text
        Maak samen 8 !

  ┌─────────────────────┐
  │   ●  ●  ●  │  ?  ?  │   ← tray + divider
  │   ●  ●     │        │
  └─────────────────────┘
        [ 5 ]    [ ? ]      ← tap "?" → numpad
```

## Technische details

**Bestanden:**
- **Nieuw:** `src/screens/ExerciseSplitBox.tsx` — volgt het standaardpatroon (`useExerciseId`, `useCompleteExercise`, `useDifficultyLevel`, `ExerciseShell`, `ExerciseNumpad`). Hergebruikt `NUMBER_BOND_CONFIG` voor `target` range (zelfde difficulty curve als getallen splitsen). Genereert per ronde: `target`, `knownSide` ('left'|'right'), `knownCount`, `answer = target - knownCount`. Rendert tray als `<div>` grid van token-cellen (max 20 cellen in 2 rijen × 10), met de divider als absolute element op `left: ${(knownCount / target) * 100}%` wanneer linker bekend is, of op de spiegel-positie. Lege antwoordzijde toont "?"-placeholder tokens met dashed border tot het kind antwoordt; bij correct vullen de tokens in en poppen.
- **Edit:** `src/routes/appRoutes.tsx` — voeg lazy route `exercises/split-box/:id` → `ExerciseSplitBox` toe.
- **DB migration:** voeg 1 record toe aan `exercises`:
  - `title='Splitsdoos'`, `subject='math'`, `grade=1`, `stage='stage-1'`, `route='/exercises/split-box/1'`, `display_order=8`, `xp_reward=30`.
- **Memory update:** `mem://content/curriculum-mapping` ophogen naar 14 oefeningen (8 Rekenen).

**Niet in scope (kan later in een vervolg):**
- Stage 2/3/4 varianten van Splitsdoos (beginnen met alleen stage-1 zoals expliciet gevraagd "level 1"; uit te breiden zodra werking bevestigd is).
- Haptic feedback / geluidseffect — bestaande oefeningen gebruiken die nog niet, dus we houden het consistent (alleen confetti + visuele feedback).

Akkoord om dit te bouwen?