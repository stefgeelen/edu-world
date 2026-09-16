/**
 * Sentence pools for the Sentence Doctor exercise, per grade.
 *
 * Static content, so it lives here rather than in the screen: keeping it out of
 * the component file lets tests import the pools without turning the screen into
 * a mixed component/constant module (which costs Fast Refresh granularity).
 *
 * Tests pin Math.random and derive which entry that selects from a pool's real
 * length. Adding or reordering sentences is therefore safe — but hard-coding an
 * index against these arrays is not, and has silently broken tests before.
 */

export interface FixQuestion {
  mode: 'fix';
  sentence: string[];
  wrongIndex: number;
  wrongWord: string;
  correctWord: string;
  distractors: string[];
}

type Question = BuildQuestion | FixQuestion;

export const BUILD_SENTENCES_GRADE_1: string[][] = [
  ['de', 'poes', 'slaapt', 'op', 'de', 'mat'],
  ['ik', 'ga', 'naar', 'school'],
  ['de', 'zon', 'schijnt', 'vandaag'],
  ['mama', 'leest', 'een', 'boek'],
  ['de', 'hond', 'blaft', 'hard'],
  ['wij', 'spelen', 'in', 'de', 'tuin'],
  ['papa', 'kookt', 'het', 'eten'],
  ['het', 'kind', 'lacht', 'hard'],
  ['de', 'vogel', 'zingt', 'mooi'],
  ['ik', 'drink', 'een', 'glas', 'melk'],
  ['de', 'bal', 'rolt', 'weg'],
  ['het', 'meisje', 'lacht', 'vrolijk'],
  ['ik', 'zie', 'een', 'ster'],
  ['de', 'regen', 'valt', 'zacht'],
  ['mama', 'zingt', 'een', 'liedje'],
  ['de', 'boom', 'staat', 'groot'],
  ['papa', 'rijdt', 'op', 'de', 'fiets'],
  ['wij', 'bouwen', 'een', 'hut'],
  ['ik', 'speel', 'met', 'de', 'bal'],
  ['het', 'kind', 'rent', 'snel'],
  ['de', 'hond', 'rent', 'naar', 'huis'],
  ['ik', 'schrijf', 'een', 'brief'],
  ['de', 'appel', 'is', 'rood'],
  ['mama', 'bakt', 'een', 'taart'],
  ['de', 'maan', 'schijnt', 'helder'],
  ['wij', 'spelen', 'een', 'spel'],
  ['het', 'kind', 'tekent', 'een', 'huis'],
  ['de', 'vis', 'zwemt', 'in', 'het', 'meer'],
  ['ik', 'eet', 'een', 'appel'],
  ['de', 'wind', 'waait', 'hard'],
];

export const FIX_SENTENCES_GRADE_1: FixQuestion[] = [
  { mode: 'fix', sentence: ['de', 'vis', 'vliegt', 'in', 'de', 'kom'], wrongIndex: 2, wrongWord: 'vliegt', correctWord: 'zwemt', distractors: ['zingt', 'danst'] },
  { mode: 'fix', sentence: ['de', 'koe', 'blaft', 'in', 'de', 'wei'], wrongIndex: 2, wrongWord: 'blaft', correctWord: 'loeit', distractors: ['vliegt', 'zingt'] },
  { mode: 'fix', sentence: ['ik', 'slaap', 'in', 'mijn', 'auto'], wrongIndex: 4, wrongWord: 'auto', correctWord: 'bed', distractors: ['boom', 'tafel'] },
  { mode: 'fix', sentence: ['de', 'vogel', 'zwemt', 'in', 'de', 'lucht'], wrongIndex: 2, wrongWord: 'zwemt', correctWord: 'vliegt', distractors: ['rent', 'slaapt'] },
  { mode: 'fix', sentence: ['we', 'eten', 'soep', 'met', 'een', 'kam'], wrongIndex: 5, wrongWord: 'kam', correctWord: 'lepel', distractors: ['pen', 'sleutel'] },
  { mode: 'fix', sentence: ['de', 'kat', 'leest', 'op', 'de', 'bank'], wrongIndex: 2, wrongWord: 'leest', correctWord: 'slaapt', distractors: ['kookt', 'rijdt'] },
  { mode: 'fix', sentence: ['papa', 'rijdt', 'op', 'een', 'banaan'], wrongIndex: 4, wrongWord: 'banaan', correctWord: 'fiets', distractors: ['appel', 'wortel'] },
  { mode: 'fix', sentence: ['de', 'baby', 'kookt', 'in', 'de', 'wieg'], wrongIndex: 2, wrongWord: 'kookt', correctWord: 'slaapt', distractors: ['rijdt', 'leest'] },
  { mode: 'fix', sentence: ['de', 'zon', 'regent', 'vandaag'], wrongIndex: 2, wrongWord: 'regent', correctWord: 'schijnt', distractors: ['slaapt', 'zingt'] },
  { mode: 'fix', sentence: ['de', 'hond', 'vliegt', 'in', 'de', 'tuin'], wrongIndex: 2, wrongWord: 'vliegt', correctWord: 'rent', distractors: ['zwemt', 'slaapt'] },
  { mode: 'fix', sentence: ['het', 'meisje', 'zwemt', 'op', 'het', 'plein'], wrongIndex: 2, wrongWord: 'zwemt', correctWord: 'speelt', distractors: ['slaapt', 'kookt'] },
  { mode: 'fix', sentence: ['papa', 'slaapt', 'op', 'het', 'dak'], wrongIndex: 4, wrongWord: 'dak', correctWord: 'bed', distractors: ['tafel', 'stoel'] },
  { mode: 'fix', sentence: ['mama', 'schrijft', 'met', 'een', 'banaan'], wrongIndex: 4, wrongWord: 'banaan', correctWord: 'pen', distractors: ['boek', 'bal'] },
  { mode: 'fix', sentence: ['wij', 'zwemmen', 'in', 'het', 'zand'], wrongIndex: 4, wrongWord: 'zand', correctWord: 'water', distractors: ['park', 'bos'] },
  { mode: 'fix', sentence: ['de', 'bloem', 'loopt', 'in', 'de', 'tuin'], wrongIndex: 2, wrongWord: 'loopt', correctWord: 'groeit', distractors: ['slaapt', 'vliegt'] },
  { mode: 'fix', sentence: ['de', 'beer', 'woont', 'in', 'de', 'zee'], wrongIndex: 5, wrongWord: 'zee', correctWord: 'bos', distractors: ['stad', 'school'] },
  { mode: 'fix', sentence: ['het', 'kind', 'rijdt', 'op', 'een', 'olifant'], wrongIndex: 5, wrongWord: 'olifant', correctWord: 'fiets', distractors: ['stoel', 'boom'] },
  { mode: 'fix', sentence: ['ik', 'eet', 'pudding', 'met', 'een', 'vork'], wrongIndex: 5, wrongWord: 'vork', correctWord: 'lepel', distractors: ['mes', 'bord'] },
  { mode: 'fix', sentence: ['de', 'kat', 'blaft', 'naar', 'de', 'maan'], wrongIndex: 2, wrongWord: 'blaft', correctWord: 'kijkt', distractors: ['zingt', 'zwemt'] },
  { mode: 'fix', sentence: ['het', 'paard', 'zwemt', 'in', 'de', 'wei'], wrongIndex: 2, wrongWord: 'zwemt', correctWord: 'loopt', distractors: ['vliegt', 'slaapt'] },
  { mode: 'fix', sentence: ['wij', 'slapen', 'op', 'het', 'schoolplein'], wrongIndex: 4, wrongWord: 'schoolplein', correctWord: 'bed', distractors: ['tafel', 'stoel'] },
  { mode: 'fix', sentence: ['de', 'appel', 'groeit', 'in', 'het', 'water'], wrongIndex: 5, wrongWord: 'water', correctWord: 'boom', distractors: ['gras', 'zand'] },
  { mode: 'fix', sentence: ['de', 'vis', 'klimt', 'in', 'de', 'boom'], wrongIndex: 2, wrongWord: 'klimt', correctWord: 'zwemt', distractors: ['vliegt', 'rent'] },
];

// GRADE-2 PILOT — placeholder pools (slightly longer sentences, more
// subordinate structure). Not curriculum-reviewed: needs a native-speaker/
// curriculum pass before MAX_SUPPORTED_GRADE is raised (see difficultyConfig.ts).
const BUILD_SENTENCES_GRADE_2: string[][] = [
  ['de', 'kinderen', 'spelen', 'buiten', 'in', 'de', 'regen'],
  ['mijn', 'zus', 'leert', 'elke', 'dag', 'piano'],
  ['de', 'boer', 'brengt', 'de', 'koeien', 'naar', 'de', 'wei'],
  ['wij', 'gaan', 'morgen', 'naar', 'het', 'zwembad'],
  ['de', 'juf', 'legt', 'de', 'som', 'nog', 'eens', 'uit'],
  ['papa', 'repareert', 'de', 'kapotte', 'fiets'],
  ['de', 'bibliotheek', 'is', 'vandaag', 'gesloten'],
  ['ik', 'help', 'mijn', 'opa', 'in', 'de', 'tuin'],
  ['de', 'trein', 'vertrekt', 'over', 'tien', 'minuten'],
  ['het', 'weer', 'wordt', 'morgen', 'zonnig', 'en', 'warm'],
];

const FIX_SENTENCES_GRADE_2: FixQuestion[] = [
  { mode: 'fix', sentence: ['de', 'bibliotheek', 'verkoopt', 'boeken', 'aan', 'iedereen'], wrongIndex: 2, wrongWord: 'verkoopt', correctWord: 'verhuurt', distractors: ['bakt', 'wast'] },
  { mode: 'fix', sentence: ['de', 'trein', 'zwemt', 'naar', 'het', 'station'], wrongIndex: 2, wrongWord: 'zwemt', correctWord: 'rijdt', distractors: ['vliegt', 'kookt'] },
  { mode: 'fix', sentence: ['mijn', 'opa', 'plant', 'appels', 'in', 'de', 'oven'], wrongIndex: 6, wrongWord: 'oven', correctWord: 'tuin', distractors: ['kast', 'auto'] },
  { mode: 'fix', sentence: ['de', 'juf', 'drinkt', 'de', 'som', 'op', 'het', 'bord'], wrongIndex: 2, wrongWord: 'drinkt', correctWord: 'schrijft', distractors: ['eet', 'gooit'] },
  { mode: 'fix', sentence: ['de', 'boer', 'melkt', 'de', 'vogels', 'elke', 'ochtend'], wrongIndex: 4, wrongWord: 'vogels', correctWord: 'koeien', distractors: ['stenen', 'wolken'] },
];

export const BUILD_SENTENCES_BY_GRADE: Record<number, string[][]> = {
  1: BUILD_SENTENCES_GRADE_1,
  2: BUILD_SENTENCES_GRADE_2,
};

export const FIX_SENTENCES_BY_GRADE: Record<number, FixQuestion[]> = {
  1: FIX_SENTENCES_GRADE_1,
  2: FIX_SENTENCES_GRADE_2,
};
