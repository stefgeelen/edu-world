## Doel

Een nieuwe rekenoefening **"Aftrekdoos"** toevoegen die aftrekken tot 6 oefent op dezelfde visuele en interactieve manier als de bestaande Splitsdoos. Het kind ziet een doos met tokens (bolletjes), een aantal tokens is doorgestreept (= het getal dat afgetrokken wordt), en het kind vult het antwoord in via het bestaande numpad.

## Hoe de oefening werkt

Per vraag:

- **Totaal** (2–6) tokens worden in de doos geplaatst.
- Een willekeurig deel daarvan (1 tot totaal-1) krijgt een schuine streep eroverheen, identiek aan de stijl in de bijgevoegde foto.
- Onder de doos staat de som als grote labels: `totaal − afgestreept = ?`
- Het kind tikt op het `?`-label, opent het bestaande `ExerciseNumpad` en vult het antwoord in.
- Bij correct: confetti, doorstreepte tokens "verdwijnen" weg en de overgebleven tokens lichten groen op (vergelijkbaar met de spring-animatie in Splitsdoos).
- Bij fout: shake + leven kwijt (3 levens, zelfde flow als andere oefeningen).
- 5 ronden per sessie, score wordt opgeslagen via `useCompleteExercise` met `exerciseId`.

Variatie (zoals Splitsdoos meerdere modes heeft):

- **Mode A — antwoord = uitkomst** (meest voorkomend): `5 − 3 = ?`
- **Mode B — antwoord = aftrekker**: `6 − ? = 2` (kind ziet hoeveel tokens er over zijn en moet uitrekenen hoeveel er weg zijn)

Beide modes laten dezelfde doos zien; alleen het invul-label verschuift.

## Visueel ontwerp

Hergebruik **exact dezelfde "tray"** als Splitsdoos (paars-violet gradient, neon-glow, neumorphic) maar **zonder de verticale scheidingslijn in het midden** — de tokens vullen de hele doos.

Tokens:

- Cyaan bolletjes (zelfde stijl als Splitsdoos).
- Doorgestreepte tokens krijgen een witte/lichtroze diagonale streep (`rotate-12`) eroverheen, met lichte opacity-verlaging om "weggehaald" te suggereren — net als in de werkblad-foto.
- Op correct antwoord: doorgestreepte tokens faden weg met `AnimatePresence`, overblijvende tokens pulsen groen.

Equation-balk onder de doos:

- `[totaal] − [aftrekker] = [?]` met dezelfde `NumberLabel` stijl als Splitsdoos (cyaan/emerald tegels, paars dashed input-label).

## Bestanden

**Nieuw:**

- `src/screens/ExerciseSubtractBox.tsx` — gebaseerd op `ExerciseSplitBox.tsx`. Hergebruikt `ExerciseShell`, `ExerciseNumpad`, `useCompleteExercise`, `useExerciseId`, `useDifficultyLevel`, `triggerConfetti`. Eigen `Token` helper met `crossedOut` prop. Geen `SplitHalf` (geen scheidingslijn).

**Bewerken:**

- `src/routes/appRoutes.tsx` — lazy import + route `exercises/subtract-box/:id`.
- `src/data/difficultyConfig.ts` — nieuwe `SUBTRACT_BOX_CONFIG` per grade/trimester (Grade 1-1: max 6, Grade 1-2: max 8, Grade 1-3: max 10, Grade 1-4 en hoger oplopend tot 20).
- `mem://content/curriculum-mapping` — toevoegen "Aftrekdoos" als 9e rekenoefening.

**Database (migratie):**

- Insert in `exercises` tabel: 1 record voor stage-1 met `route='/exercises/subtract-box/1'`, `subject='math'`, `title='Aftrekdoos'`, `xp_reward=30`, `display_order=9`.

## Difficulty config (voorstel)

```text
1-1: max 6   (zoals gevraagd: aftrekken tot 6)
1-2: max 8
1-3: max 10
1-4: max 12
2-1: max 15
2-2: max 18
2-3: max 20
2-4: max 20
```

## Audio / TTS

Geen TTS toevoegen — dit is een rekenoefening, conform de bestaande regel dat TTS alleen voor lees-oefeningen en study buddy bubbles is.

## Open punt

De Splitsdoos zit nu alleen in stage-1 in de quest map. Wil je de Aftrekdoos ook alleen in stage-1, of meteen ook in latere stages? **Voorstel: alleen stage-1 starten** (consistent met Splitsdoos), uit te breiden later. D  
  
--> Dit mag in eens voor alle stages.