
# QuestMap & Fluisterbos: stage-bewust maken

## Probleem
- `QuestMap` markeert "current" via `trimester_progress.is_completed` (XP-drempel), niet via mastery.
- Alle 4 checkpoints navigeren naar dezelfde `/app/stage/fluisterbos`, die altijd `stage-1` oefeningen toont.
- `Fluisterbos` toont een hardcoded "Stage 1" label en filtert in de query op `eq('stage', 'stage-1')`.

## Oplossing

### 1. Mastery-gebaseerde stage-status (nieuwe hook)
Nieuwe hook `useStageMastery()` die per stage (`stage-1` t/m `stage-4`) bepaalt:
- totaal aantal oefeningen in die stage (voor het huidige `grade` van het kind)
- aantal gemastered oefeningen (≥ 5 attempts) door het kind
- `isCompleted` = alle oefeningen gemastered én er is minstens 1 oefening
- `isCurrent` = eerste niet-completed stage (met fallback naar stage 1)

Gebruikt bestaande tabellen: `exercises` (stage, grade), `exercise_attempts` (count per exercise_id voor het kind). **Geen DB-wijzigingen nodig.**

### 2. QuestMap navigeert per stage
- `TRIMESTER_CONFIG` krijgt `stagePath: '/app/stage/fluisterbos/1'` ... `/4`.
- Status per checkpoint komt uit `useStageMastery()` i.p.v. `useTrimesterProgress`.
- "Locked" stages blijven niet-klikbaar; current/completed openen hun eigen pagina.
- Voortgangsbalk bovenaan: percentage gemasterde oefeningen over alle 4 stages samen.

### 3. Fluisterbos wordt stage-bewust
- Route wordt `/app/stage/fluisterbos/:stage` (1–4). Blijft backwards-compatible: zonder param → stage 1 met redirect.
- `useStageExercises(stage)` accepteert stage-nummer en filtert `eq('stage', 'stage-' + n)`.
- Header toont dynamisch "Stage {n}" + naam per stage:
  - 1 = Fluisterbomen, 2 = Borrelende Beek, 3 = Woordenwoud, 4 = Uilenkasteel
- Guard: als de stage "locked" is (vorige nog niet voltooid via mastery) → redirect naar QuestMap met toast.

### 4. Routing
- `src/routes/appRoutes.tsx`: route `stage/fluisterbos/:stage` toevoegen, oude `stage/fluisterbos` route blijft als redirect naar `/1`.

## Bestand-impact

**Nieuw (1)**: `src/hooks/useStageMastery.ts` — bepaalt per stage de mastery-status voor het huidige kind.

**Aangepast (4)**:
- `src/hooks/useStageExercises.ts` — accepteert `stage: number` parameter (default 1).
- `src/screens/QuestMap.tsx` — gebruikt `useStageMastery`, navigeert naar `/app/stage/fluisterbos/{n}`, voortgangsbalk op basis van mastery.
- `src/screens/Fluisterbos.tsx` — leest `:stage` uit URL, dynamische header & naam, guard tegen locked stages.
- `src/routes/appRoutes.tsx` — nieuwe route met `:stage` param + redirect.

**Geen DB-wijzigingen.** Alle data al beschikbaar via `exercises` + `exercise_attempts`.

## Acceptatiecriteria
- Nieuw kind: stage 1 = current, stages 2–4 = locked.
- Als alle stage-1 oefeningen 5x voltooid zijn → stage 1 wordt completed (✓), stage 2 wordt current (★).
- Klikken op stage 2 op de map opent Fluisterbos met stage-2 oefeningen en label "Stage 2 · Borrelende Beek".
- Locked stage aanklikken doet niets (zoals nu).
- Voortgangsbalk in QuestMap toont % gemasterde oefeningen over alle 4 stages.
