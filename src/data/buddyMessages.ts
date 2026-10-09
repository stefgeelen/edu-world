/**
 * Wat de Buddy zegt tijdens een oefening, per Buddy en per situatie.
 * 3-5 varianten per situatie zodat het niet herhaalt.
 * Templates may include `{name}` which is replaced with the child's name.
 */

export type BuddySituation =
  | 'exercise_start'
  | 'correct_answer'
  | 'wrong_answer'
  | 'exercise_complete';

export type BuddyMood = 'greeting' | 'correct' | 'wrong' | 'complete' | 'idle';

const SITUATION_TO_MOOD: Record<BuddySituation, BuddyMood> = {
  exercise_start: 'greeting',
  correct_answer: 'correct',
  wrong_answer: 'wrong',
  exercise_complete: 'complete',
};

export function getMoodForSituation(situation: BuddySituation): BuddyMood {
  return SITUATION_TO_MOOD[situation];
}

import type { BuddySpeciesId } from '@/lib/buddy/species';

type MessageMap = Record<BuddySpeciesId, Record<BuddySituation, string[]>>;

export const BUDDY_MESSAGES: MessageMap = {
  nootje: {
    exercise_start: [
      'Daar gaan we, {name}!',
      'Ik zit naast je, {name}. Jij kan dit!',
      'Staart omhoog, we beginnen! 🐿️',
    ],
    correct_answer: [
      'Goed zo, {name}! 🌰',
      'Juist! Ik doe een vreugdesprongetje!',
      'Wauw, dat wist je!',
      'Helemaal juist! Mijn staart wiebelt van blijdschap.',
      'Knap gedaan! ⭐',
    ],
    wrong_answer: [
      'Oei, bijna! Probeer nog eens.',
      'Geeft niks, {name}. Kijk nog eens goed.',
      'Ook ik zoek soms lang naar mijn nootjes. Nog een keer!',
    ],
    exercise_complete: [
      'Klaar, {name}! Ik ben zo trots op je! 🎉',
      'Super gedaan! Kom je straks bij me spelen?',
      'Alles af! Daar verdien je munten mee. 🌰',
    ],
  },
};
