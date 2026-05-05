# Klankhuis (Sound House) — Auditieve oefening

A new reading exercise where the child hears a Dutch word (Belgian pronunciation) and must tap one of three windows of a house — **begin / midden / einde** — to indicate where they hear a target sound. Built in the same style as Splitsdoos / Aftrekdoos / Prent & Woord, using the existing TTS (`useSpeech` → Azure `nl-NL-FennaNeural`).

## Pedagogical model (Vlaamse Kern-aanpak)

- Klanken (not letters): we werken met losse klanken zoals "m", "s", "p", "aa", "oo".
- Stage 1 (Kern 1): focus op **medeklinkers in begin/einde** met korte mkm-woorden (maan, mat, som, …). Geen "midden" om verwarring te vermijden.
- Stage 2: voeg **klinkers in het midden** toe (aa in maan, oo in boom).
- Stage 3: alle posities, meer klanken (m, s, p, k, r, l, aa, oo, ie).
- Stage 4: trickier woorden (4 letters), inclusief klanken die op meerdere plekken voorkomen — kind moet de **eerst gehoorde** positie kiezen, of we filteren woorden zo dat de doelklank uniek voorkomt (we kiezen unieke voorkomens om eerlijk te scoren).

## UX flow

1. Bovenaan een grote oranje **luidspreker-knop** (zelfde stijl als ExerciseLanguage) — speelt het woord uit via `speak(word)`.
2. Daaronder een tekst: **"Waar hoor je de [m]?"** — de doelklank wordt ook apart uitspreekbaar gemaakt (tap op de letterbubbel = `speak("mmm")`).
3. Een **huis** in SVG met drie ramen op één rij: links = Begin, midden = Midden, rechts = Einde. Elk raam toont een icoontje + label.
4. Kind tikt een raam:
   - Correct → raam licht groen op met gloed, confetti, buddy "Goed gehoord!", auto-naar volgende vraag na 1.5s.
   - Fout → raam schudt rood, leven -1, woord wordt automatisch opnieuw uitgesproken na 600ms zodat het kind opnieuw kan luisteren (zelfde vraag blijft staan tot lives op).
5. 5 vragen per ronde, gebruikt `useExerciseId` + `useCompleteExercise` voor XP / mastery via de bestaande RPC.

```text
 ┌─────────────────────────────┐
 │      🔊  (tap to hear)      │
 │    "Waar hoor je de [m]?"   │
 │                             │
 │        ╱▔▔▔▔▔▔▔▔╲           │
 │       ╱  KLANK   ╲          │
 │      ╱   HUIS     ╲         │
 │     ┌──┬──────┬──┐          │
 │     │BG│ MID  │EI│          │
 │     │🟦│  🟦  │🟦│          │
 │     └──┴──────┴──┘          │
 └─────────────────────────────┘
```

## Word/sound bank (`src/data/soundHousePool.ts` — new file)

Curated lijst woorden met de **positie** van elke target-klank (alleen unieke voorkomens om dubbelzinnigheid te vermijden). Voorbeeld:

```ts
export type SoundPosition = 'begin' | 'middle' | 'end';
export interface SoundWord {
  word: string;            // wat TTS uitspreekt: "maan"
  display?: string;        // optioneel hoofdletters voor lezen
  sound: string;           // doelklank: "m"
  spoken: string;          // hoe TTS de klank zegt: "mmm"
  position: SoundPosition; // begin | middle | end
  stage: 1 | 2 | 3 | 4;    // beschikbaar vanaf stage
}
```

Initiële set (~30 woorden) over klanken **m, s, p, k, r, aa, oo, ie**, met dekking voor begin/midden/einde per stage. Voorbeelden: maan(m,begin), boom(m,end), som(m,end), sok(s,begin), bus(s,end), pop(p,begin), kop(k,begin), riem(r,begin), maan(aa,middle), boom(oo,middle), vier(ie,middle).

Selectielogica per ronde:
- Filter op `stage <= currentStage` en op toegestane posities voor die stage.
- Trek willekeurig 5 verschillende woorden, varieer de doelklank en posities zodat het niet voorspelbaar is.

## Files

**New**
- `src/screens/ExerciseSoundHouse.tsx` — scherm, gebruikt `ExerciseShell`, `useSpeech`, `useExerciseId`, `useCompleteExercise`, `useDifficultyLevel`.
- `src/data/soundHousePool.ts` — woordenbank + `generateSoundHouseRound(stage)`.

**Edited**
- `src/routes/appRoutes.tsx` — nieuwe lazy route `exercises/sound-house/:id`.
- `src/data/difficultyConfig.ts` — `SOUND_HOUSE_CONFIG` met per stage de toegestane posities en max woordlengte.

**Database (migration)**
4 nieuwe `exercises` rijen (één per stage 1–4), subject `reading`, `display_order = 4`, `xp_reward = 25`, titel `"Klankhuis"`, route key zodat curriculum-mapping de juiste URL bouwt (volgt het bestaande patroon van Aftrekdoos/Splitsdoos).

**Memory**
- Update `mem://content/curriculum-mapping` met Klankhuis (4 records, route, stage-scaling).

## Audio details

- `useSpeech().speak(word)` voor het hele woord (Azure `nl-NL-FennaNeural` via edge function — al actief).
- `speak(spoken)` voor de losse klank (bv. "mmm", "sss", "aaa") zodat het kind de target klank duidelijk hoort, ook bij mis-antwoord.
- Eerste afspelen automatisch 400ms na render (zelfde patroon als ExerciseLanguage / PictureWord), met `silenceBuddy` op de Shell.

## Feedback styling

Volgens project memory (`mem://design/exercise-feedback-styling`): groene / rode glow op het geselecteerde raam, geen vinkjes/kruisjes. Buddy-toast met korte Vlaamse zin ("Goed gehoord!", "Luister nog eens.").

## Out of scope (kan later)

- Spectrogram-visualisatie van de klank.
- Microfoonopname om kind zelf de klank te laten herhalen.
- Letter-vs-klank tutorial pop-up bij eerste keer spelen.
