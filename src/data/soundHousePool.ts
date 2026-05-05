/**
 * Klankhuis — woordenbank voor auditieve oefening (begin/midden/einde).
 * Per item: één doelklank op een unieke positie in het woord.
 * "spoken" is de fonetische uitspraak die TTS van de losse klank moet maken.
 */

export type SoundPosition = 'begin' | 'middle' | 'end';

export interface SoundWord {
  word: string;        // wat TTS uitspreekt
  display: string;     // weergave (klein, mkm)
  sound: string;       // doelklank (label op de letterbubbel)
  spoken: string;      // hoe de losse klank uitgesproken wordt
  position: SoundPosition;
  /** Beschikbaar vanaf deze stage (1..4). */
  fromStage: 1 | 2 | 3 | 4;
}

// Curated Vlaamse Kern-1/2 woordenschat. Alle items: doelklank komt UNIEK voor.
export const SOUND_WORD_POOL: SoundWord[] = [
  // — m —
  { word: 'maan', display: 'maan', sound: 'm', spoken: 'mmm', position: 'begin', fromStage: 1 },
  { word: 'mat',  display: 'mat',  sound: 'm', spoken: 'mmm', position: 'begin', fromStage: 1 },
  { word: 'muis', display: 'muis', sound: 'm', spoken: 'mmm', position: 'begin', fromStage: 1 },
  { word: 'boom', display: 'boom', sound: 'm', spoken: 'mmm', position: 'end',   fromStage: 1 },
  { word: 'som',  display: 'som',  sound: 'm', spoken: 'mmm', position: 'end',   fromStage: 1 },
  { word: 'roem', display: 'roem', sound: 'm', spoken: 'mmm', position: 'end',   fromStage: 2 },

  // — s —
  { word: 'sok',  display: 'sok',  sound: 's', spoken: 'sss', position: 'begin', fromStage: 1 },
  { word: 'sap',  display: 'sap',  sound: 's', spoken: 'sss', position: 'begin', fromStage: 1 },
  { word: 'soep', display: 'soep', sound: 's', spoken: 'sss', position: 'begin', fromStage: 2 },
  { word: 'bus',  display: 'bus',  sound: 's', spoken: 'sss', position: 'end',   fromStage: 1 },
  { word: 'kous', display: 'kous', sound: 's', spoken: 'sss', position: 'end',   fromStage: 2 },
  { word: 'neus', display: 'neus', sound: 's', spoken: 'sss', position: 'end',   fromStage: 2 },

  // — p —
  { word: 'pop',  display: 'pop',  sound: 'p', spoken: 'p',   position: 'begin', fromStage: 1 },
  { word: 'pen',  display: 'pen',  sound: 'p', spoken: 'p',   position: 'begin', fromStage: 1 },
  { word: 'kop',  display: 'kop',  sound: 'p', spoken: 'p',   position: 'end',   fromStage: 1 },
  { word: 'sap',  display: 'sap',  sound: 'p', spoken: 'p',   position: 'end',   fromStage: 1 },

  // — k —
  { word: 'kat',  display: 'kat',  sound: 'k', spoken: 'k',   position: 'begin', fromStage: 1 },
  { word: 'koe',  display: 'koe',  sound: 'k', spoken: 'k',   position: 'begin', fromStage: 1 },
  { word: 'sok',  display: 'sok',  sound: 'k', spoken: 'k',   position: 'end',   fromStage: 2 },
  { word: 'tak',  display: 'tak',  sound: 'k', spoken: 'k',   position: 'end',   fromStage: 2 },

  // — r —
  { word: 'roos', display: 'roos', sound: 'r', spoken: 'rrr', position: 'begin', fromStage: 2 },
  { word: 'rok',  display: 'rok',  sound: 'r', spoken: 'rrr', position: 'begin', fromStage: 2 },
  { word: 'deur', display: 'deur', sound: 'r', spoken: 'rrr', position: 'end',   fromStage: 3 },
  { word: 'vier', display: 'vier', sound: 'r', spoken: 'rrr', position: 'end',   fromStage: 3 },

  // — l —
  { word: 'lam',  display: 'lam',  sound: 'l', spoken: 'lll', position: 'begin', fromStage: 2 },
  { word: 'lip',  display: 'lip',  sound: 'l', spoken: 'lll', position: 'begin', fromStage: 2 },
  { word: 'bal',  display: 'bal',  sound: 'l', spoken: 'lll', position: 'end',   fromStage: 3 },
  { word: 'wiel', display: 'wiel', sound: 'l', spoken: 'lll', position: 'end',   fromStage: 3 },

  // — aa (klinker, midden) —
  { word: 'maan', display: 'maan', sound: 'aa', spoken: 'aaa', position: 'middle', fromStage: 2 },
  { word: 'haar', display: 'haar', sound: 'aa', spoken: 'aaa', position: 'middle', fromStage: 2 },
  { word: 'taart',display: 'taart',sound: 'aa', spoken: 'aaa', position: 'middle', fromStage: 3 },

  // — oo —
  { word: 'boom', display: 'boom', sound: 'oo', spoken: 'ooo', position: 'middle', fromStage: 2 },
  { word: 'roos', display: 'roos', sound: 'oo', spoken: 'ooo', position: 'middle', fromStage: 2 },
  { word: 'noot', display: 'noot', sound: 'oo', spoken: 'ooo', position: 'middle', fromStage: 3 },

  // — ie —
  { word: 'vier', display: 'vier', sound: 'ie', spoken: 'iii', position: 'middle', fromStage: 3 },
  { word: 'kiel', display: 'kiel', sound: 'ie', spoken: 'iii', position: 'middle', fromStage: 3 },
  { word: 'fiets',display: 'fiets',sound: 'ie', spoken: 'iii', position: 'middle', fromStage: 4 },
];

export interface SoundHouseRound {
  questions: SoundWord[];
}

/**
 * Trekt 5 willekeurige woorden voor een ronde, rekening houdend met:
 *  - stage-filter (woord beschikbaar vanaf <= huidige stage)
 *  - toegestane posities (stage 1: enkel begin/end, vanaf 2: ook middle)
 *  - variatie in posities (probeert geen 5x dezelfde positie te trekken)
 */
export function generateSoundHouseRound(stage: number, total = 5): SoundWord[] {
  const allowedPositions: SoundPosition[] =
    stage <= 1 ? ['begin', 'end'] : ['begin', 'middle', 'end'];

  const pool = SOUND_WORD_POOL.filter(
    (w) => w.fromStage <= stage && allowedPositions.includes(w.position),
  );

  const shuffled = [...pool].sort(() => Math.random() - 0.5);

  // Probeer een gevarieerde set: max 3 keer dezelfde positie.
  const picked: SoundWord[] = [];
  const positionCount: Record<SoundPosition, number> = { begin: 0, middle: 0, end: 0 };
  for (const item of shuffled) {
    if (picked.length >= total) break;
    if (positionCount[item.position] >= Math.ceil(total / allowedPositions.length) + 1) continue;
    picked.push(item);
    positionCount[item.position] += 1;
  }
  // Vul aan als filter te streng was
  for (const item of shuffled) {
    if (picked.length >= total) break;
    if (!picked.includes(item)) picked.push(item);
  }
  return picked.slice(0, total);
}
