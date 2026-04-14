/**
 * Buddy messages per avatar per situation.
 * Each avatar has 3-5 variants per situation to avoid repetition.
 */

export type BuddySituation =
  | 'dashboard_greeting'
  | 'exercise_start'
  | 'correct_answer'
  | 'wrong_answer'
  | 'exercise_complete'
  | 'map_encourage'
  | 'badge_unlocked';

export type BuddyMood = 'greeting' | 'correct' | 'wrong' | 'complete' | 'idle';

const SITUATION_TO_MOOD: Record<BuddySituation, BuddyMood> = {
  dashboard_greeting: 'greeting',
  exercise_start: 'greeting',
  correct_answer: 'correct',
  wrong_answer: 'wrong',
  exercise_complete: 'complete',
  map_encourage: 'greeting',
  badge_unlocked: 'complete',
};

export function getMoodForSituation(situation: BuddySituation): BuddyMood {
  return SITUATION_TO_MOOD[situation];
}

type MessageMap = Record<string, Record<BuddySituation, string[]>>;

export const BUDDY_MESSAGES: MessageMap = {
  pixel: {
    dashboard_greeting: [
      'Klaar om sommen te kraken? 🤖',
      'Systeem opgestart! Laten we leren!',
      'Beep boop — welkom terug!',
      'Mijn circuits zijn opgeladen! Jij ook?',
    ],
    exercise_start: [
      'Ik reken met je mee!',
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
      'Herstart sequence... je kan het!',
    ],
    exercise_complete: [
      'Missie volbracht, astronaut! 🚀',
      'Data opgeslagen — puike prestatie!',
      'Je hebt mijn geheugen geüpdatet met succes!',
    ],
    map_encourage: [
      'Welk avontuur kiezen we vandaag?',
      'Nieuwe levels wachten op ontdekking!',
      'Mijn scanner detecteert een leuk pad! 🗺️',
    ],
    badge_unlocked: [
      'Nieuwe badge ontgrendeld! Mijn LED-lampjes knipperen!',
      'Achievement unlocked! Je bent een ster! ⭐',
      'Ik sla dit op in mijn trofeeëngeheugen!',
    ],
  },

  zaza: {
    dashboard_greeting: [
      'Hoi! Klaar voor een kosmisch avontuur? 🌌',
      'De sterren staan goed vandaag!',
      'Welkom terug, ruimte-ontdekker!',
    ],
    exercise_start: [
      'Laten we het universum verkennen!',
      'Klaar voor lancering? 3... 2... 1!',
      'Samen ontdekken we nieuwe werelden!',
    ],
    correct_answer: [
      'Wauw, dat was kosmisch goed! 🌟',
      'Je straalt als een supernova!',
      'Sterren voor jou! ⭐⭐⭐',
      'Dat antwoord is uit een andere dimensie!',
    ],
    wrong_answer: [
      'Oeps, even opnieuw landen...',
      'Geen stress, ook astronauten oefenen!',
      'Probeer het nog eens, ruimteheld!',
    ],
    exercise_complete: [
      'Missie geslaagd! Terug naar het ruimtestation! 🛸',
      'Je hebt weer een planeet veroverd!',
      'Kosmische high-five! ✋',
    ],
    map_encourage: [
      'Welk sterrenstelsel verkennen we vandaag?',
      'Ik zie een glimmend pad voor je!',
      'Het universum wacht! 🌠',
    ],
    badge_unlocked: [
      'Een nieuwe ster aan je hemel! 🌟',
      'Je verzameling groeit — net als het universum!',
      'Kosmische trofee verdiend!',
    ],
  },

  riff: {
    dashboard_greeting: [
      'Yo, laten we een beat droppen! 🎤',
      'De raptor is terug in the house!',
      'Hey! Klaar voor een verse sessie?',
      'Sup! Tijd voor fire bars! 🔥',
    ],
    exercise_start: [
      'Drop die rhymes, let\'s go!',
      'Tijd voor een nieuwe track!',
      'De beat is aan — jij bent de MC!',
    ],
    correct_answer: [
      'Dáát is een hit! 🎵',
      'Lekker ritme, alles klopt!',
      'Straight fire! 🔥🔥🔥',
      'Dat was een perfect vers!',
      'Mic drop! 🎤💥',
    ],
    wrong_answer: [
      'Geen stress, volgende take!',
      'Even de beat pakken, dan opnieuw!',
      'Freestyle — probeer weer!',
    ],
    exercise_complete: [
      'Encore! Encore! 🎶',
      'Dat was een platinum track!',
      'Je hebt de hele show gestolen!',
    ],
    map_encourage: [
      'Welk podium pakken we vandaag?',
      'Check die verse levels! 🎧',
      'Elke stap is een nieuwe beat!',
    ],
    badge_unlocked: [
      'Nieuwe bling verdiend! 💎',
      'Je award collectie groeit, rapper!',
      'Grammy-waardig! 🏆',
    ],
  },

  rocco: {
    dashboard_greeting: [
      'Goedendag, dappere ridder! ⚔️',
      'Het kasteel verwelkomt je terug!',
      'Hoera! De held is er weer!',
    ],
    exercise_start: [
      'Trek je harnas aan, we gaan!',
      'Het avontuur begint, ridder!',
      'Voor eer en glorie! ⚔️',
    ],
    correct_answer: [
      'Bij mijn schild, dat was perfect! 🛡️',
      'Een ware heldenstreek!',
      'Het koninkrijk juicht voor je!',
      'Dat verdient een ridderlintje! 🏅',
    ],
    wrong_answer: [
      'Zelfs ridders struikelen soms...',
      'Hervat de strijd, held!',
      'Een echte ridder geeft niet op!',
    ],
    exercise_complete: [
      'Quest volbracht! Het kasteel viert feest! 🎉',
      'De koning is trots op je!',
      'Je bent een legendarische ridder!',
    ],
    map_encourage: [
      'Welk koninkrijk veroveren we vandaag?',
      'Het pad ligt voor je, ridder!',
      'Nieuwe avonturen wachten! ⚔️',
    ],
    badge_unlocked: [
      'Een nieuw wapen in je arsenaal! ⚔️',
      'De smid heeft iets speciaals voor je!',
      'Trofee uit de schatkamer! 👑',
    ],
  },

  sparky: {
    dashboard_greeting: [
      'Hey! Mijn gadgets staan klaar! ⚡',
      'Welkom terug, ontdekker!',
      'Mijn cyber-staart kwispelt van plezier!',
    ],
    exercise_start: [
      'Scanner aan — laten we gaan!',
      'Mijn gadgets zijn gekalibreerd!',
      'Klaar om te hacken! Eh, leren! 😄',
    ],
    correct_answer: [
      'Mijn radar bevestigt: CORRECT! ✅',
      'Je bent slimmer dan mijn AI!',
      'Elektrisch goed! ⚡⚡',
      'Dat was een cyber-voltreffer!',
    ],
    wrong_answer: [
      'Kleine glitch — herstart!',
      'Even debuggen, dan opnieuw!',
      'Mijn sensoren zeggen: probeer nog eens!',
    ],
    exercise_complete: [
      'Missie gehackt — ik bedoel gehaald! 🎯',
      'Data-analyse compleet: jij bent top!',
      'Mijn staart staat stijf van trots! ⚡',
    ],
    map_encourage: [
      'Welke regio scannen we vandaag?',
      'Mijn GPS detecteert avontuur!',
      'Nieuwe gebieden ontgrendeld! 🗺️',
    ],
    badge_unlocked: [
      'Nieuw cyber-embleem ontgrendeld! 🔓',
      'Je firewall van badges groeit!',
      'Achievement gehackt... verdiend! 😄',
    ],
  },
};
