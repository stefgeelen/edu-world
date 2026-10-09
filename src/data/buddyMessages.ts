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
  vosje: {
    exercise_start: [
      'Oren gespitst, {name}! We gaan!',
      'Slim vosje zoekt slim maatje. Dat ben jij!',
      'Ik sluip mee. Jij kan dit! 🦊',
    ],
    correct_answer: [
      'Slim gedaan, {name}! 🦊',
      'Juist! Mijn staart zwaait heen en weer.',
      'Dat had je snel door!',
      'Helemaal goed! Ik ben onder de indruk.',
      'Toppie! ⭐',
    ],
    wrong_answer: [
      'Oei, bijna! Kijk nog eens slim.',
      'Geeft niks, {name}. Nog een keer!',
      'Ook een vos vergist zich soms. Probeer opnieuw!',
    ],
    exercise_complete: [
      'Klaar, {name}! Wat ben jij slim! 🎉',
      'Super gedaan! Kom je straks bij me spelen?',
      'Alles af! Daar verdien je munten mee. 🪙',
    ],
  },

  prikkel: {
    exercise_start: [
      'Stekels recht, {name}! We beginnen!',
      'Rustig aan, stap voor stap. Jij kan dit!',
      'Ik rol mee! 🦔',
    ],
    correct_answer: [
      'Goed zo, {name}! 🦔',
      'Juist! Mijn stekels staan recht van trots.',
      'Knap gedaan!',
      'Helemaal goed! Ik maak een koprol.',
      'Wauw! ⭐',
    ],
    wrong_answer: [
      'Oei, bijna! Probeer nog eens.',
      'Geeft niks, {name}. Rustig nog een keer.',
      'Stapje terug, en opnieuw. Jij kan het!',
    ],
    exercise_complete: [
      'Klaar, {name}! Ik ben zo trots op je! 🎉',
      'Super gedaan! Kom je straks bij me spelen?',
      'Alles af! Daar verdien je munten mee. 🪙',
    ],
  },

  loeka: {
    exercise_start: [
      'Oehoe, {name}! Klaar om te leren?',
      'Ik kijk met mijn grote ogen mee. Jij kan dit!',
      'Brilletje op, we beginnen! 🦉',
    ],
    correct_answer: [
      'Oehoe, juist, {name}! 🦉',
      'Wat ben jij wijs!',
      'Goed gedaan! Ik klap met mijn vleugels.',
      'Helemaal juist!',
      'Knap! ⭐',
    ],
    wrong_answer: [
      'Hmm, bijna! Kijk nog eens goed.',
      'Geeft niks, {name}. Zelfs uilen denken soms twee keer na.',
      'Nog een keer, ik weet dat je het kan!',
    ],
    exercise_complete: [
      'Klaar, {name}! Oehoe, wat knap! 🎉',
      'Super gedaan! Kom je straks bij me spelen?',
      'Alles af! Daar verdien je munten mee. 🪙',
    ],
  },
};
