# Klanken

Opnames van losse klanken, zoals ze in de klas aangeleerd worden. Eén mp3 per
klank, met de klank als naam: `p.mp3`, `b.mp3`, `m.mp3`, `aa.mp3`, `ie.mp3` …

Gemaakt met de ElevenLabs Voice Changer, in de stem van de app. Een nieuwe
opname telt pas mee als de klank ook in `RECORDED_SOUNDS` staat
(`src/data/letterSounds.ts`). Zonder opname zegt de stem de klank zelf.

Werkwijze: zet de opname als `<klank>.m4a` in deze map en draai
`node scripts/klanken.mjs <klank>`. Dat knipt de klank eruit (adem en klikjes
weg), maakt hem mono en even luid als de andere, en schrijft `<klank>.mp3`.
De `.m4a`-bestanden blijven enkel lokaal (niet in git).
`ou` gebruikt de opname van `au`, `ei` die van `ij`.
