
## Plan: Database & Progressie Herstructurering

### Stap 1: Database Migratie
Nieuwe tabel + aanpassingen:
- **`trimester_progress`** tabel: `child_id`, `grade_level`, `trimester_number` (1-4), `is_completed`, `xp_earned`, `xp_threshold`
- **`children`** tabel: voeg `pending_promotion` (boolean, default false) kolom toe
- **Database functie `complete_exercise`**: Atomische functie die bij het afronden van een oefening:
  1. Een `exercise_attempt` record aanmaakt
  2. `child_progress` upsert (per subject: total_xp, exercises_completed)
  3. `trimester_progress` xp_earned bijwerkt
  4. Checkt of trimester klaar is (xp_earned >= xp_threshold → is_completed = true)
  5. Als alle 4 trimesters klaar zijn → `pending_promotion = true` op children
- Indexes op `child_id` + `subject` voor performance
- RLS policies voor trimester_progress

### Stap 2: Frontend Hook - `useCompleteExercise`
- Nieuwe hook die de `complete_exercise` database functie aanroept
- Vervangt de huidige losse `addXp()` calls in `useExerciseState`
- Invalidate relevante queries na completion

### Stap 3: QuestMap (`/app/map`) bijwerken
- Trimester data ophalen en checkpoints mappen op trimesters
- Progress bar reflecteert echte trimester voortgang
- Locked/completed status op basis van `trimester_progress`

### Stap 4: Fluisterbos stage detail bijwerken
- Progress bars per subject reflecteren echte `child_progress` data
- Real-time updates na exercise completion via query invalidation

### Stap 5: GameContext opschonen
- `addXp` verwijderen uit GameContext (nu via database)
- XP en level uit database lezen i.p.v. lokale state
