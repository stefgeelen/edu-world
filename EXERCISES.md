# Leapio — Oefeningen Overzicht

> Gegenereerd op 2026-05-04  
> Alle 16 oefentypes met routes, moeilijkheidsgraden en spelregels.

---

## Algemene regels (alle oefeningen)

| Eigenschap | Waarde |
|---|---|
| Rondes per sessie | 5 |
| Levens | 3 (verlies 1 per fout antwoord; bij 0 → terug naar kaart) |
| Sterren | ⭐⭐⭐ = 3 levens over · ⭐⭐ = 2 · ⭐ = 1 |
| XP-beloning | 20 XP via `complete_exercise` RPC |
| Invoer | Gedeeld numpad-component (`ExerciseNumpad`) voor cijferoefeningen |

---

## 1. Rekensom (`Exercise`)

**Route:** `/exercises/math/:id`  
**Bestand:** `src/screens/Exercise.tsx`

Het kind kiest het goede antwoord uit 4 opties (multiple choice).

| Niveau | Operators | Max getal |
|---|---|---|
| 1-1 | + − | 10 |
| 1-2 | + − | 10 |
| 1-3 | + − | 15 |
| 1-4 | + − | 20 |
| 2-1 | + − | 20 |
| 2-2 | + − × | 20 |
| 2-3 | + − × ÷ | 50 (maxDivisor 10) |
| 2-4 | + − × ÷ | 100 (maxDivisor 10) |

---

## 2. Getalbinding (`ExerciseNumberBond`)

**Route:** `/exercises/bonds/:id`  
**Bestand:** `src/screens/ExerciseNumberBond.tsx`

Kind vult het ontbrekende deel in om samen het doelgetal te vormen. Invoer via numpad (max 2 cijfers).

| Niveau | Min doelgetal | Max doelgetal |
|---|---|---|
| 1-1 | 5 | 8 |
| 1-2 | 5 | 10 |
| 1-3 | 8 | 12 |
| 1-4 | 8 | 15 |
| 2-1 | 10 | 15 |
| 2-2 | 10 | 18 |
| 2-3 | 12 | 20 |
| 2-4 | 15 | 20 |

---

## 3. Taal (`ExerciseLanguage`)

**Route:** `/exercises/language/:id`  
**Bestand:** `src/screens/ExerciseLanguage.tsx`

Kind luistert naar uitgesproken woord (TTS) en klikt het goede woord uit 4 opties.  
Geen moeilijkheidsscaling — vaste woordenlijst van 15 woorden (boom, roos, vis, maan, …).

---

## 4. Stippen tellen (`ExerciseDotCount`)

**Route:** `/exercises/dots/:id`  
**Bestand:** `src/screens/ExerciseDotCount.tsx`

Kind plaatst precies het gevraagde aantal stippen door op het veld te tikken. Undo (laatste stip) en wis-alles beschikbaar.

| Niveau | Min stippen | Max stippen |
|---|---|---|
| 1-1 | 1 | 5 |
| 1-2 | 1 | 8 |
| 1-3 | 1 | 10 |
| 1-4 | 3 | 15 |
| 2-1 | 5 | 15 |
| 2-2 | 5 | 20 |
| 2-3 | 5 | 20 |
| 2-4 | 5 | 20 |

---

## 5. Cijfer schrijven (`ExerciseWriteNumber`)

**Route:** `/exercises/write-number/:id`  
**Bestand:** `src/screens/ExerciseWriteNumber.tsx`

Kind tekent vrij een cijfer (0–10) op HTML5 Canvas. Validatie via Supabase edge function `check_drawing`. Toont 10-frame referentie.

Geen moeilijkheidsscaling — doelgetal altijd 1–10.

---

## 6. Getallenlijn (`ExerciseNumberLine`)

**Route:** `/exercises/number-line/:id`  
**Bestand:** `src/screens/ExerciseNumberLine.tsx`

Kind vult 3 willekeurige lege plekken in op een 0–10 getallenlijn. Validatie via Supabase RPC `check_number_line`.

Geen moeilijkheidsscaling — vaste lijn 0–10.

---

## 7. Vergelijken (`ExerciseComparison`)

**Route:** `/exercises/comparison/:id`  
**Bestand:** `src/screens/ExerciseComparison.tsx`

4 vraagvarianten:
- Varianten 1–2: beide getallen zichtbaar → kind kiest ontbrekend symbool (`<` `>` `=`)
- Varianten 3–4: één getal + symbool zichtbaar → kind vult ontbrekend getal in via numpad

| Niveau | Max getal |
|---|---|
| 1-1 | 10 |
| 1-2 | 10 |
| 1-3 | 15 |
| 1-4 | 20 |
| 2-1 | 20 |
| 2-2 | 50 |
| 2-3 | 50 |
| 2-4 | 100 |

---

## 8. Objecten vergelijken (`ExerciseCompareObjects`)

**Route:** `/exercises/compare-objects/:id`  
**Bestand:** `src/screens/ExerciseCompareObjects.tsx`

Kind vergelijkt twee groepen emoji-objecten en klikt ◀ (links meer), = (gelijk), of ▶ (rechts meer).  
12 emoji-types (🍎 ⚽ 🐱 🌟 🚗 🍌 🐶 ✏️ 🌸 🦋 🍓 🐸).

| Niveau | Min objecten | Max objecten |
|---|---|---|
| 1-1 | 1 | 4 |
| 1-2 | 1 | 6 |
| 1-3 | 2 | 6 |
| 1-4 | 2 | 8 |
| 2-1 | 3 | 10 |
| 2-2 | 5 | 15 |
| 2-3 | 5 | 20 |
| 2-4 | 5 | 25 |

---

## 9. Cijfer natekenen (`ExerciseWriteDigit`)

**Route:** `/exercises/write-digit/:id`  
**Bestand:** `src/screens/ExerciseWriteDigit.tsx`

Kind tekent cijfer (0–9) na op canvas. Gidslijn vervaagt over 5 niveaus:

| Iteratie | Gids |
|---|---|
| 1 | Volledig stippelpad (90%) |
| 2 | Minder stippels (80%) |
| 3 | Spaarzame stippels (70%) |
| 4 | Zeer spaarzaam (60%) |
| 5 | Alleen contour — "Schrijf het zelf!" |

Validatie via Supabase RPC `check_digit` (SVG-pad matching, drempel 40% dekking).

---

## 10. Geld (`ExerciseMoney`)

**Route:** `/exercises/money/:id`  
**Bestand:** `src/screens/ExerciseMoney.tsx`

Kind sleept munten (€2, €1, 50c, 20c, 10c, 5c) naar de kassa om de exacte prijs te betalen.  
8 producten (🍎 🍌 ✏️ 🧸 📕 🍪 🧃 ⚽), prijsrange €0,05–€10,00 (stappen van 5c).  
Drag-and-drop via `@dnd-kit`.

Geen moeilijkheidsscaling.

---

## 11. Klok (`ExerciseClock`)

**Route:** `/exercises/clock/:id`  
**Bestand:** `src/screens/ExerciseClock.tsx`

Kind sleept uur- en minuutwijzer naar de gevraagde tijd (hele uren en halve uren).  
Digitale weergave + Nederlandse tekst (bv. "half drie").  
Interactieve SVG-klok met pointer-events.

Geen moeilijkheidsscaling — alle 12 hele uren × 2 (heel/half).

---

## 12. Zinsdokter (`ExerciseSentenceDoctor`)

**Route:** `/exercises/sentence-doctor/:id`  
**Bestand:** `src/screens/ExerciseSentenceDoctor.tsx`

**10 rondes**, 2 wisselende modi (50/50 kans per ronde):

| Modus | Beschrijving |
|---|---|
| **Opbouwen** | Woorden in juiste volgorde slepen (10 zinnen, 3–6 woorden) |
| **Herstellen** | Fout woord vervangen door keuze uit 3 opties (8 zinnen) |

TTS-ondersteuning voor zinnen.

---

## 13. Splitsdoos (`ExerciseSplitBox`)

**Route:** `/exercises/split-box/:id`  
**Bestand:** `src/screens/ExerciseSplitBox.tsx`

Visuele doos met bolletjes verdeeld door een neon scheidingslijn. 4 vraagvarianten:

| Modus | Zichtbaar | Invullen |
|---|---|---|
| `target` (klassiek) | Één kant als bollen | De andere kant |
| `left` | Beide kanten als bollen + totaal | Linker getal |
| `right` | Beide kanten als bollen + totaal | Rechter getal |
| `sum` | Beide kanten als bollen + beide getallen | Totaal (uitkomst) |

Gebruikt dezelfde moeilijkheidsgraden als Getalbinding:

| Niveau | Min doelgetal | Max doelgetal |
|---|---|---|
| 1-1 | 5 | 8 |
| 1-2 | 5 | 10 |
| 1-3 | 8 | 12 |
| 1-4 | 8 | 15 |
| 2-1 | 10 | 15 |
| 2-2 | 10 | 18 |
| 2-3 | 12 | 20 |
| 2-4 | 15 | 20 |

---

## 14. Aftrekdoos (`ExerciseSubtractBox`)

**Route:** `/exercises/subtract-box/:id`  
**Bestand:** `src/screens/ExerciseSubtractBox.tsx`

Doos met bolletjes waarvan een deel is doorgestreept met een schuine lijn (45°). 2 vraagvarianten:

| Modus | Kans | Zichtbaar | Invullen |
|---|---|---|---|
| `result` | 70% | Totaal + aftrekker | Uitkomst (`5 − 3 = ?`) |
| `subtrahend` | 30% | Totaal + uitkomst | Aftrekker (`6 − ? = 2`) |

| Niveau | Max totaal |
|---|---|
| 1-1 | 6 |
| 1-2 | 8 |
| 1-3 | 10 |
| 1-4 | 12 |
| 2-1 | 15 |
| 2-2 | 18 |
| 2-3 | 20 |
| 2-4 | 20 |

---

## 15. Plaatje–woord (`ExercisePictureWord`)

**Route:** `/exercises/picture-word/:id`  
**Bestand:** `src/screens/ExercisePictureWord.tsx`

Kind sleept woordlabel op het bijbehorende plaatje. TTS voor woorduitspraak.

| Stadia | Opties | Categorieën |
|---|---|---|
| 1–2 | 3 kaarten | Enkelvoudig |
| 3 | 4 kaarten | Enkelvoudig |
| 4+ | 4 kaarten | Gemengd |

---

## 16. Letter schrijven (`ExerciseWriteLetter`)

**Route:** `/exercises/write-letter/:id`  
**Bestand:** `src/screens/ExerciseWriteLetter.tsx`

Kind tekent cursieve letters (a–z) na op canvas. Zelfde geleidelijke gidslijn als Cijfer natekenen (5 niveaus). Validatie via Supabase RPC `check_letter`.

---

## Sleutelbestanden

| Bestand | Inhoud |
|---|---|
| `src/routes/appRoutes.tsx` | Alle oefenroutes |
| `src/data/difficultyConfig.ts` | Moeilijkheidsgraden per oefening en niveau |
| `src/screens/Exercise*.tsx` | Oefencomponenten (16 bestanden) |
| `src/components/exercise/ExerciseShell.tsx` | Gedeelde shell (voortgangsbalk, levens) |
| `src/components/exercise/ExerciseNumpad.tsx` | Gedeeld numpad |
| `src/hooks/useCompleteExercise.ts` | RPC-aanroep bij voltooiing + 13 query invalidations |
| `src/hooks/useDifficultyLevel.ts` | Haalt actief niveau op (`grade-stage` sleutel) |
