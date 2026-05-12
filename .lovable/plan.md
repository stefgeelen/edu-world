# Sommensplitser — splitsen via 10

Een nieuwe rekenoefening die getallenlijn-splitsen (`/exercises/bonds/`) combineert met optellingen tot 20 (`/exercises/math/`). De leerling ziet een som zoals `8 + 6 =` met daaronder een splitsboog naar twee vakjes. Het tweede getal wordt gesplitst zodat het eerste deel het eerste getal aanvult tot 10.

Voorbeeld: `8 + 6 =` → vakjes invullen met `2` en `4` (want 8+2=10, 10+4=14). Alleen beschikbaar in **groep 1, trimester 3**.

## Visuele opzet (ExerciseShell, Dark Space stijl)

```text
        8  +  6  =  14
              |
            split
           /     \
        [ ? ]   [ ? ]
```

- Bovenin de som met dezelfde grote, gekleurde cijfers als `Exercise.tsx` (cyan/amber/emerald op donker paars paneel).
- Daaronder een SVG-splitsboog (hergebruik styling uit `ExerciseNumberBond`) van het tweede getal naar twee ronde knop-vakjes.
- Linkervakje = aanvulling tot 10, rechtervakje = restant. Beide tikken activeren `ExerciseNumpad` (één vakje tegelijk actief).
- Per vakje: standaard knop (paars dashed), gevuld (paars), correct (emerald glow), incorrect (orange glow) — consistent met `NumberBond`.
- Som-resultaat (`= 14`) blijft onthuld; alleen de splitsing is de opdracht. (Dit traint het strategisch splitsen, niet het hoofdrekenen.)

## Vraaggeneratie

In nieuwe utility binnen het scherm:
- `num1` = random 6–9
- `num2` = random zo dat `num1 + num2 > 10` en `num2 < 10` (dus splitsing zinvol is)
- `leftPart` = `10 - num1`  (correct antwoord linkervakje)
- `rightPart` = `num2 - leftPart`  (correct antwoord rechtervakje)
- 5 vragen per sessie, 3 levens, XP via `complete_exercise` RPC.

## Bestanden

**Nieuw**
- `src/screens/ExerciseSumSplit.tsx` — scherm, gemodelleerd naar `ExerciseNumberBond.tsx` (twee invoervakjes i.p.v. één, validatie controleert beide). Bovenin de som zoals in `Exercise.tsx`.

**Aanpassen**
- `src/data/difficultyConfig.ts` — voeg toe:
  ```ts
  export interface SumSplitConfig { minSum: number; maxSum: number }
  export const SUM_SPLIT_CONFIG: Record<string, SumSplitConfig> = {
    "1-3": { minSum: 11, maxSum: 18 },
  };
  export const DEFAULT_SUM_SPLIT: SumSplitConfig = { minSum: 11, maxSum: 18 };
  ```
- `src/routes/appRoutes.tsx` — lazy import + route `exercises/sum-split/:id` (alleen `:id = 3` is functioneel).
- `src/test/difficultyConfig.test.ts` — test voor `SUM_SPLIT_CONFIG['1-3']`.

**Database (migration)**
- Eén nieuwe rij in `exercises`:
  - `route = '/exercises/sum-split/3'`
  - `title = 'Sommensplitser'`
  - `subject = 'math'`, `grade = 1`, `stage = 'stage-3'`
  - `display_order = 10`, `xp_reward = 20`, `is_active = true`
- Geen schemawijzigingen, geen nieuwe RLS — `exercises` heeft al lees-policy.

## Navigatie / mapping

Sluit aan bij bestaande Quest Map flow: omdat `Fluisterbos.tsx` exercises ophaalt via `useStageExercises` (db-driven), verschijnt de nieuwe tegel automatisch in stage 3 zodra de migration is uitgevoerd. Geen mapping-wijziging nodig in `curriculum-mapping`-memory voor de gebruiker; alleen latere notatie als wens.

## QA / kwaliteitscheck

- 100 vraaggeneraties: `leftPart >= 1`, `rightPart >= 1`, `num1 + num2 == 10 + rightPart`.
- Numpad cyclus: tik vakje 1 → numpad → cijfer → check → fout-feedback → opnieuw → goed → vakje 2 wordt actief → check → confetti → volgende vraag.
- Verifieer dat oefening enkel zichtbaar is bij groep 1 trimester 3 (db-filter doet dit automatisch).
