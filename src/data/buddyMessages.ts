/**
 * Buddy messages per avatar per situation.
 * Each avatar has 3-5 variants per situation to avoid repetition.
 * Templates may include `{name}` which is replaced with the child's name.
 */

export type BuddySituation =
  | 'exercise_start'
  | 'correct_answer'
  | 'wrong_answer'
  | 'exercise_complete'
  | 'badges_overview';

export type BuddyMood = 'greeting' | 'correct' | 'wrong' | 'complete' | 'idle';

const SITUATION_TO_MOOD: Record<BuddySituation, BuddyMood> = {
  exercise_start: 'greeting',
  correct_answer: 'correct',
  wrong_answer: 'wrong',
  exercise_complete: 'complete',
  badges_overview: 'greeting',
};

export function getMoodForSituation(situation: BuddySituation): BuddyMood {
  return SITUATION_TO_MOOD[situation];
}

type MessageMap = Record<string, Partial<Record<BuddySituation, string[]>>>;

export const BUDDY_MESSAGES: MessageMap = {
  pixel: {
    exercise_start: [
      'Ik reken met je mee, {name}!',
      'Systeem geactiveerd. Laten we beginnen!',
      'Processoren draaien op volle toeren!',
    ],
    correct_answer: [
      'Beep boop — perfect berekend! ✅',
      'Systeemfout... grapje! Dat was foutloos!',
      'Mijn sensoren detecteren: GENIE! 🌟',
      'Error 404: fouten niet gevonden!',
      'Dat klopt als een raket! 🚀',
    ],
    wrong_answer: [
      'Oeps, even opnieuw kalibreren...',
      'Kleine bug gevonden — probeer opnieuw!',
      'Herstart sequence... je kan het, {name}!',
    ],
    exercise_complete: [
      'Missie volbracht, {name}! 🚀',
      'Data opgeslagen — puike prestatie!',
      'Je hebt mijn geheugen geüpdatet met succes!',
    ],
    badges_overview: [
      'Kijk eens wat je verzameld hebt, {name}!',
      'Jouw trofeeënkast is indrukwekkend, {name}!',
      'Nog meer te verdienen — go go go!',
    ],
  },

  zaza: {
    exercise_start: [
      'Laten we het universum verkennen, {name}!',
      'Klaar voor lancering? 3... 2... 1!',
      'Samen ontdekken we nieuwe werelden!',
    ],
    correct_answer: [
      'Wauw, dat was kosmisch goed! 🌟',
      'Je straalt als een supernova!',
      'Sterren voor jou, {name}! ⭐⭐⭐',
      'Dat antwoord is uit een andere dimensie!',
    ],
    wrong_answer: [
      'Oeps, even opnieuw landen...',
      'Geen stress, ook astronauten oefenen!',
      'Probeer het nog eens, ruimteheld {name}!',
    ],
    exercise_complete: [
      'Missie geslaagd, {name}! Terug naar het ruimtestation! 🛸',
      'Je hebt weer een planeet veroverd!',
      'Kosmische high-five, {name}! ✋',
    ],
    badges_overview: [
      '{name}, jouw sterrenkaart wordt steeds voller!',
      'Een hele galaxy aan trofeeën wacht op je!',
      'Kijk dat licht eens schitteren, {name}!',
    ],
  },

  riff: {
    exercise_start: [
      'Drop die rhymes, let\'s go {name}!',
      'Tijd voor een nieuwe track!',
      'De beat is aan — jij bent de MC!',
    ],
    correct_answer: [
      'Dáát is een hit! 🎵',
      'Lekker ritme, alles klopt!',
      'Straight fire, {name}! 🔥🔥🔥',
      'Dat was een perfect vers!',
      'Mic drop! 🎤💥',
    ],
    wrong_answer: [
      'Geen stress, volgende take!',
      'Even de beat pakken, dan opnieuw!',
      'Freestyle — probeer weer, {name}!',
    ],
    exercise_complete: [
      'Encore! Encore! 🎶',
      'Dat was een platinum track, {name}!',
      'Je hebt de hele show gestolen!',
    ],
    badges_overview: [
      'Jouw award-kast vult zich, {name}!',
      'Bling check — {name} is op fire!',
      'Nog meer trofeeën te scoren, MC!',
    ],
  },

  rocco: {
    exercise_start: [
      'Trek je harnas aan, {name}, we gaan!',
      'Het avontuur begint, ridder!',
      'Voor eer en glorie! ⚔️',
    ],
    correct_answer: [
      'Bij mijn schild, dat was perfect! 🛡️',
      'Een ware heldenstreek, {name}!',
      'Het koninkrijk juicht voor je!',
      'Dat verdient een ridderlintje! 🏅',
    ],
    wrong_answer: [
      'Zelfs ridders struikelen soms, {name}...',
      'Hervat de strijd, held!',
      'Een echte ridder geeft niet op!',
    ],
    exercise_complete: [
      'Quest volbracht, {name}! Het kasteel viert feest! 🎉',
      'De koning is trots op je!',
      'Je bent een legendarische ridder, {name}!',
    ],
    badges_overview: [
      'Jouw schatkamer groeit, {name}!',
      'Een ware verzameling van eer, {name}!',
      'Meer trofeeën te winnen, ridder!',
    ],
  },

  sparky: {
    exercise_start: [
      'Scanner aan — laten we gaan, {name}!',
      'Mijn gadgets zijn gekalibreerd!',
      'Klaar om te hacken! Eh, leren! 😄',
    ],
    correct_answer: [
      'Mijn radar bevestigt: CORRECT! ✅',
      'Je bent slimmer dan mijn AI, {name}!',
      'Elektrisch goed! ⚡⚡',
      'Dat was een cyber-voltreffer!',
    ],
    wrong_answer: [
      'Kleine glitch — herstart!',
      'Even debuggen, dan opnieuw!',
      'Mijn sensoren zeggen: probeer nog eens, {name}!',
    ],
    exercise_complete: [
      'Missie gehackt — ik bedoel gehaald, {name}! 🎯',
      'Data-analyse compleet: jij bent top!',
      'Mijn staart staat stijf van trots! ⚡',
    ],
    badges_overview: [
      '{name}, jouw firewall van badges groeit!',
      'Cyber-trofeeën stapelen zich op, {name}!',
      'Nog meer achievements te unlocken!',
    ],
  },
};
