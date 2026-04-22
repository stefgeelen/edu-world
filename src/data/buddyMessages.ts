/**
 * Buddy messages per avatar per situation.
 * Each avatar has 3-5 variants per situation to avoid repetition.
 * Templates may include `{name}` which is replaced with the child's name.
 */

export type BuddySituation =
  | 'dashboard_greeting'
  | 'dashboard_welcome'
  | 'exercise_start'
  | 'correct_answer'
  | 'wrong_answer'
  | 'exercise_complete'
  | 'map_encourage'
  | 'quest_map_idle'
  | 'badges_overview'
  | 'badge_unlocked'
  | 'streak_milestone'
  | 'level_up'
  | 'first_exercise_of_day';

export type BuddyMood = 'greeting' | 'correct' | 'wrong' | 'complete' | 'idle';

const SITUATION_TO_MOOD: Record<BuddySituation, BuddyMood> = {
  dashboard_greeting: 'greeting',
  dashboard_welcome: 'greeting',
  exercise_start: 'greeting',
  correct_answer: 'correct',
  wrong_answer: 'wrong',
  exercise_complete: 'complete',
  map_encourage: 'greeting',
  quest_map_idle: 'idle',
  badges_overview: 'greeting',
  badge_unlocked: 'complete',
  streak_milestone: 'complete',
  level_up: 'complete',
  first_exercise_of_day: 'greeting',
};

export function getMoodForSituation(situation: BuddySituation): BuddyMood {
  return SITUATION_TO_MOOD[situation];
}

type MessageMap = Record<string, Partial<Record<BuddySituation, string[]>>>;

export const BUDDY_MESSAGES: MessageMap = {
  pixel: {
    dashboard_greeting: [
      'Klaar om sommen te kraken, {name}? 🤖',
      'Systeem opgestart! Laten we leren, {name}!',
      'Beep boop — welkom terug, {name}!',
      'Mijn circuits zijn opgeladen! Jij ook, {name}?',
    ],
    dashboard_welcome: [
      'Hé {name}, mijn sensoren detecteren een topdag! ⚡',
      '{name}, ik heb je gemist! Wat doen we vandaag?',
      'Systeem klaar voor avontuur met {name}!',
    ],
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
    map_encourage: [
      'Welk avontuur kiezen we vandaag, {name}?',
      'Nieuwe levels wachten op ontdekking!',
      'Mijn scanner detecteert een leuk pad! 🗺️',
    ],
    quest_map_idle: [
      'Welke quest pakken we, {name}?',
      'Mijn radar piept van opwinding!',
      'Tik een planeet aan om te starten!',
    ],
    badges_overview: [
      'Kijk eens wat je verzameld hebt, {name}!',
      'Jouw trofeeënkast is indrukwekkend, {name}!',
      'Nog meer te verdienen — go go go!',
    ],
    badge_unlocked: [
      'Nieuwe badge ontgrendeld, {name}! Mijn LED-lampjes knipperen!',
      'Achievement unlocked! Je bent een ster! ⭐',
      'Ik sla dit op in mijn trofeeëngeheugen!',
    ],
    streak_milestone: [
      '{name}, je streak is bijna legendarisch! 🔥',
      'Mijn teller staat op {name}-mode: AAN!',
      'Onverslaanbaar systeem gedetecteerd!',
    ],
    level_up: [
      'Level up! Mijn circuits dansen voor je, {name}!',
      'Upgrade compleet — jij bent nu sterker!',
      'Promotie! Pixel salueert! 🤖',
    ],
    first_exercise_of_day: [
      'Eerste sessie van vandaag, {name}! Boot up!',
      'Goedemorgen-modus actief. Wij gaan los!',
      'Beep! Klaar voor oefening 1, {name}?',
    ],
  },

  zaza: {
    dashboard_greeting: [
      'Hoi {name}! Klaar voor een kosmisch avontuur? 🌌',
      'De sterren staan goed vandaag, {name}!',
      'Welkom terug, ruimte-ontdekker {name}!',
    ],
    dashboard_welcome: [
      '{name}, het universum heeft op je gewacht! ✨',
      'Een nieuwe dag, een nieuwe sterrenreis met {name}!',
      'Hé {name}, ik zie potentieel in jouw galaxy!',
    ],
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
    map_encourage: [
      'Welk sterrenstelsel verkennen we vandaag, {name}?',
      'Ik zie een glimmend pad voor je!',
      'Het universum wacht! 🌠',
    ],
    quest_map_idle: [
      'Kies je bestemming, {name}!',
      'Welke planeet straalt het meest?',
      'Tijd om te zweven, {name}!',
    ],
    badges_overview: [
      '{name}, jouw sterrenkaart wordt steeds voller!',
      'Een hele galaxy aan trofeeën wacht op je!',
      'Kijk dat licht eens schitteren, {name}!',
    ],
    badge_unlocked: [
      'Een nieuwe ster aan je hemel! 🌟',
      'Je verzameling groeit — net als het universum!',
      'Kosmische trofee verdiend, {name}!',
    ],
    streak_milestone: [
      '{name}, je vliegt door de melkweg! 🚀',
      'Streak-status: kosmisch indrukwekkend!',
      'Niets kan je nog stoppen, ster!',
    ],
    level_up: [
      'Niveau-baan bereikt! Welkom level {name}!',
      'Je sterrenkracht is gestegen ⭐',
      'Promotie tot ruimtekapitein, {name}!',
    ],
    first_exercise_of_day: [
      'Goedemorgen, {name}! De sterren zijn fris!',
      'Eerste lancering van vandaag, klaar?',
      'Het ochtenduniversum roept jou, {name}!',
    ],
  },

  riff: {
    dashboard_greeting: [
      'Yo {name}, laten we een beat droppen! 🎤',
      'De raptor is terug in the house, {name}!',
      'Hey {name}! Klaar voor een verse sessie?',
      'Sup {name}! Tijd voor fire bars! 🔥',
    ],
    dashboard_welcome: [
      '{name}, het podium is van jou vandaag!',
      'Yo {name}, ik voel een hit aankomen!',
      'Mic check, {name} check — let\'s gooo!',
    ],
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
    map_encourage: [
      'Welk podium pakken we vandaag, {name}?',
      'Check die verse levels! 🎧',
      'Elke stap is een nieuwe beat!',
    ],
    quest_map_idle: [
      'Kies je track, {name}!',
      'Welke vibe vandaag?',
      'De stage roept, {name}!',
    ],
    badges_overview: [
      'Jouw award-kast vult zich, {name}!',
      'Bling check — {name} is op fire!',
      'Nog meer trofeeën te scoren, MC!',
    ],
    badge_unlocked: [
      'Nieuwe bling verdiend, {name}! 💎',
      'Je award collectie groeit, rapper!',
      'Grammy-waardig! 🏆',
    ],
    streak_milestone: [
      '{name}, jouw streak is platinum! 🔥',
      'Onstuitbare flow, MC {name}!',
      'Dat is een rij om bij te headbangen!',
    ],
    level_up: [
      'Level up, {name}! Volume harder! 🔊',
      'Je bent gepromoveerd tot hoofdact!',
      'Nieuwe level, nieuwe drip 💧',
    ],
    first_exercise_of_day: [
      'Wakker met de beat, {name}!',
      'Eerste track van de dag — go!',
      'Soundcheck {name}, daar gaan we!',
    ],
  },

  rocco: {
    dashboard_greeting: [
      'Goedendag, dappere {name}! ⚔️',
      'Het kasteel verwelkomt je terug, {name}!',
      'Hoera! De held {name} is er weer!',
    ],
    dashboard_welcome: [
      '{name}, het koninkrijk is trots op je!',
      'Een nieuwe dag, nieuwe quests voor {name}!',
      'Sta op, ridder {name} — eer wacht!',
    ],
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
    map_encourage: [
      'Welk koninkrijk veroveren we vandaag, {name}?',
      'Het pad ligt voor je, ridder!',
      'Nieuwe avonturen wachten! ⚔️',
    ],
    quest_map_idle: [
      'Kies je queeste, {name}!',
      'Welke burcht trekt je vandaag?',
      'Het zwaard wijst de weg, ridder!',
    ],
    badges_overview: [
      'Jouw schatkamer groeit, {name}!',
      'Een ware verzameling van eer, {name}!',
      'Meer trofeeën te winnen, ridder!',
    ],
    badge_unlocked: [
      'Een nieuw wapen in je arsenaal! ⚔️',
      'De smid heeft iets speciaals voor je, {name}!',
      'Trofee uit de schatkamer! 👑',
    ],
    streak_milestone: [
      '{name}, je streak is van koninklijke aard! 🔥',
      'Onverslaanbaar, ridder {name}!',
      'Het koninkrijk bezingt jouw reeks!',
    ],
    level_up: [
      'Tot ridder van een nieuwe rang gepromoveerd, {name}!',
      'Je harnas glimt feller dan ooit ⚔️',
      'Een nieuwe titel voor held {name}!',
    ],
    first_exercise_of_day: [
      'Ochtendgloren, ridder {name}! Te paard!',
      'Eerste queeste van de dag wacht!',
      'Wakker en moedig, {name}!',
    ],
  },

  sparky: {
    dashboard_greeting: [
      'Hey {name}! Mijn gadgets staan klaar! ⚡',
      'Welkom terug, ontdekker {name}!',
      'Mijn cyber-staart kwispelt van plezier voor {name}!',
    ],
    dashboard_welcome: [
      '{name}, mijn radar piept van blijdschap!',
      'Yo {name}, de cyber-wereld wacht op ons!',
      'Systeem ready voor {name}-modus!',
    ],
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
    map_encourage: [
      'Welke regio scannen we vandaag, {name}?',
      'Mijn GPS detecteert avontuur!',
      'Nieuwe gebieden ontgrendeld! 🗺️',
    ],
    quest_map_idle: [
      'Kies een coördinaat, {name}!',
      'Mijn antenne tikt — kies een quest!',
      'Welke zone, {name}?',
    ],
    badges_overview: [
      '{name}, jouw firewall van badges groeit!',
      'Cyber-trofeeën stapelen zich op, {name}!',
      'Nog meer achievements te unlocken!',
    ],
    badge_unlocked: [
      'Nieuw cyber-embleem ontgrendeld, {name}! 🔓',
      'Je firewall van badges groeit!',
      'Achievement gehackt... verdiend! 😄',
    ],
    streak_milestone: [
      '{name}, je streak is supergeleidend! ⚡',
      'Cyber-reeks: maximaal vermogen!',
      'Mijn meter zegt: {name} = onstuitbaar!',
    ],
    level_up: [
      'Firmware-upgrade voor {name}! ⚡',
      'Level boost geactiveerd!',
      'Promotie naar cyber-elite, {name}!',
    ],
    first_exercise_of_day: [
      'Booting up de dag, {name}!',
      'Eerste signaal van vandaag: oefening 1!',
      'Goedemorgen-pulse voor {name}!',
    ],
  },
};
