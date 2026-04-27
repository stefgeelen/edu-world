# Plan: Lees-oefening "Prent & Woord"

Een nieuwe lees-oefening voor leerjaar 1 waarbij het kind een woord naar de juiste prent sleept. De oefening krijgt categorieën per ronde (dieren, voertuigen, eten, natuur) en wordt toegevoegd aan alle 4 stages met oplopende moeilijkheid.

## Werking (kindperspectief)

1. Een grote prent verschijnt centraal op het scherm (Unsplash foto, ronde kaart, glow-effect — Dark Space stijl).
2. Onderaan staan 3 of 4 woordkaarten (afhankelijk van stage).
3. Het kind sleept het juiste woord naar de prent.
4. Bij een correct antwoord: groene glow + confetti + buddy "Super!" → volgende ronde.
5. Bij een fout: rode glow + shake op het foute woord, levensaftrek, woord keert terug naar startpositie.
6. 5 rondes = oefening voltooid → `complete_exercise` RPC + navigatie terug naar Fluisterbos van de juiste stage.

## Moeilijkheidsschaling per stage

| Stage | Aantal woordkaarten | Categorieën gemixt | Voorbeeld woorden |
|-------|--------------------|--------------------|----------------------|
| 1 | 3 | Eén categorie per ronde | kat, hond, vis |
| 2 | 3 | Eén categorie per ronde | auto, bus, fiets |
| 3 | 4 | Eén categorie per ronde | appel, brood, kaas, ei |
| 4 | 4 | Categorieën gemixt per ronde | boom + auto + appel + kat |

Categorieën: **dieren**, **voertuigen**, **eten**, **natuur**. Per ronde wordt één categorie gekozen (stage 1-3) of vier woorden uit verschillende categorieën (stage 4).

## Woordenschat & afbeeldingen

Alle woorden + bijhorende Unsplash-URLs worden in `src/data/picturePool.ts` gedefinieerd (~6-8 woorden per categorie, ~28 in totaal). Bestaand `ImageWithFallback` component wordt hergebruikt. nl-NL audio via `useSpeech` zodat de prent ook hardop wordt benoemd voor extra leerwaarde (knop bovenaan).

## Technische aanpak

### Bestanden — nieuw

- `src/screens/ExercisePictureWord.tsx` — hoofdscherm, gebouwd op `ExerciseShell`, hergebruikt patronen uit `ExerciseLanguage` (status state, lives, progress, completeExercise) en drag-drop logica uit `ExerciseMoney`/`ExerciseSentenceDoctor` (pointer events, hit-test op drop-zone).
- `src/data/picturePool.ts` — woordpool per categorie met `{ word, imageUrl }` objecten.

### Bestanden — gewijzigd

- `src/routes/appRoutes.tsx` — nieuwe lazy import + route `exercises/picture-word/:id`.
- `src/hooks/useStageExercises.ts` — geen wijziging nodig, werkt automatisch zodra rij in DB staat.
- `mem://content/curriculum-mapping` — bijwerken naar 13 oefeningen.

### Database — migratie

INSERT 4 nieuwe rijen in `exercises`:

```sql
INSERT INTO exercises (title, subject, grade, stage, route, display_order, xp_reward) VALUES
  ('Prent & Woord', 'reading', 1, 'stage-1', '/exercises/picture-word/1', 3, 25),
  ('Prent & Woord', 'reading', 1, 'stage-2', '/exercises/picture-word/2', 3, 25),
  ('Prent & Woord', 'reading', 1, 'stage-3', '/exercises/picture-word/3', 3, 30),
  ('Prent & Woord', 'reading', 1, 'stage-4', '/exercises/picture-word/4', 3, 30);
```

`useExerciseId` haalt de juiste UUID op basis van het URL-pad, dus dezelfde React-component werkt voor alle 4 stages — `useDifficultyLevel` (al aanwezig) bepaalt het aantal kaarten en of de categorieën gemixt worden.

### Drag-drop interactie

- `onPointerDown` op een woordkaart start het slepen, kaart volgt cursor met `transform: translate(...)`.
- `onPointerUp` controleert of het middelpunt binnen de hitbox van de prent valt (refs + `getBoundingClientRect`).
- Touch + muis ondersteund via Pointer Events (zelfde patroon als ExerciseMoney).
- Visuele feedback: prent krijgt amber glow ring tijdens hover, groene/rode glow bij drop.

### Persistence

Standaard flow via `useCompleteExercise.mutate({ exerciseId, score, maxScore: 5, stars, timeSpent })`. XP, mastery (5 voltooiingen), badges en trimester progress worden door de bestaande `complete_exercise` RPC afgehandeld — geen aparte logica nodig.

## QuestMap & Fluisterbos

Geen wijzigingen nodig. `useStageExercises` filtert op `stage-{n}` en de Fluisterbos-tegels renderen automatisch elke nieuwe oefening die aan die stage gekoppeld is.

## Niet inbegrepen (om scope te beperken)

- Geen audio-opname per woord; gebruik bestaande TTS via `useSpeech`.
- Geen aparte afbeeldingen per stage — dezelfde Unsplash pool wordt hergebruikt, alleen aantal kaarten/mix verandert.
- Geen nieuwe badge-definitie.

Klaar om te bouwen — laat het me weten als je iets wil aanpassen.