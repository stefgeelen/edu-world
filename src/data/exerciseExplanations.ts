import type { SpeechLine } from '@/hooks/useSpeech';

/**
 * Wat de Buddy zegt als het kind in een oefening op hem tikt: eerst de vaste
 * uitleg, dan (bij rekenen) de vraag van dat moment. Bron en afspraken:
 * docs/uitleg-oefeningen.md.
 *
 * In de leesoefeningen zegt de Buddy niets wat het kind zelf moet lezen. Waar
 * het tellen of zoeken de oefening is, leest hij geen vraag voor.
 */

export const EXPLAIN = {
  math: 'Reken de som uit. Tik dan op het juiste antwoord.',
  bonds:
    'Bovenaan staat het grote getal. Eén stukje weet je al. Hoeveel moet erbij om samen het grote getal te maken? Tik op het lege vakje en typ het getal. Tik dan op Controleer.',
  dots: 'Tik in het veld om een stip te zetten. Zet er precies zoveel als ik vraag. Te veel? Tik op Wis. Klaar? Tik op Controleer.',
  writeNumber: 'Tel de stippen. Schrijf met je vinger hoeveel het er zijn. Klaar? Tik op Controleer.',
  writeDigit:
    'Volg de stippellijn met je vinger en schrijf het cijfer na. Elke keer helpt de lijn een beetje minder. Op het einde schrijf je het helemaal zelf.',
  numberLine:
    'Op de lijn staan de getallen op een rij. Waar een vraagteken staat, ontbreekt er een. Tik op een vraagteken en schrijf het juiste getal. Tik dan op Controleer.',
  comparisonSymbol: 'Kijk naar de twee getallen. Is het eerste getal groter, kleiner of even groot? Kies het juiste teken.',
  comparisonNumber: 'Er ontbreekt een getal. Tik op het vraagteken en vul een getal in dat klopt.',
  compareObjects:
    'Tel de voorwerpen links en rechts. Waar zijn er het meest? Tik op de pijl naar die kant. Zijn er evenveel? Tik op het is-gelijk-teken.',
  splitBoxTarget: (total: number) =>
    `In de doos liggen bolletjes aan één kant. Hoeveel moeten er aan de andere kant bij om samen ${total} te maken? Tik op het lege vakje en typ het getal.`,
  splitBoxSide:
    'Je weet hoeveel er samen zijn en hoeveel er aan één kant liggen. Hoeveel liggen er aan de andere kant? Tik op het lege vakje en typ het getal.',
  splitBoxSum: 'Tel de twee kanten samen. Hoeveel zijn het er in totaal? Tik op het lege vakje en typ het getal.',
  subtractBox:
    'Sommige bolletjes zijn weggestreept. Die zijn weg. Tel hoeveel er nog over zijn. Tik op het lege vakje en typ het getal.',
  sumSplit: (jumpTo: number) =>
    `Eerst spring je naar een mooi rond getal. Splits het tweede getal in twee stukjes: met het eerste stukje kom je precies op ${jumpTo}. Vul de twee stukjes in. Tel dan het tweede stukje erbij en vul de uitkomst in.`,
  money:
    'Kijk hoeveel het kost. Sleep munten naar de kassa tot je precies genoeg hebt. Niet te veel, niet te weinig. Tik dan op Controleer.',
  clock:
    'Sleep de wijzers tot de klok het juiste uur toont. De korte wijzer wijst het uur aan. De lange wijzer staat op de 12 bij een heel uur, en op de 6 bij half.',
  evenOdd:
    'Kun je het getal eerlijk in twee gelijke groepjes verdelen? Dan is het even. Blijft er eentje over? Dan is het oneven. Tik op je antwoord.',
  halfOrDouble: 'Het dubbel is twee keer zoveel. De helft is eerlijk in twee delen. Tik op het juiste antwoord.',
  halfDoublePick: 'Wat wil je oefenen? De helft, het dubbel, of allebei door elkaar? Tik erop.',
  half: 'De helft is eerlijk in twee gelijke delen. Typ hoeveel er in één deel zitten.',
  double: 'Het dubbel is twee keer zoveel. Typ hoeveel het er dan zijn.',
  tablesPick: 'Welke tafel wil je oefenen? Tik op een tafel.',
  tables: 'Reken de keersom uit en typ het antwoord. Maak je geen fout? Dan verdien je een sticker voor die tafel.',
  geometryPick: 'Wat wil je oefenen? Tik erop.',
  geometryName: 'Kijk goed naar de tekening. Hoe heet wat je ziet? Tik op het juiste woord.',
  geometryChoose: 'Kijk goed naar de tekeningen. Welke past bij de vraag? Tik erop.',
  geometryTap: 'Kijk goed naar de hoek. Tik in de tekening op het stuk dat ik vraag.',
  language: 'Tik op de luidspreker en luister naar het woord. Zoek dat woord en tik erop.',
  pictureWord: 'Tik op de luidspreker en luister. Sleep het juiste woord naar de prent.',
  // The sound itself is its own line (a recording when there is one), so the
  // sentence is split around it.
  soundHouse: (sound: SpeechLine): SpeechLine[] => [
    'Luister naar het woord. Waar hoor je deze klank?',
    sound,
    'Vooraan, in het midden of achteraan? Tik op het juiste raam van het huis.',
  ],
  sentenceBuild:
    'Sleep de woorden in de juiste volgorde, zodat het een goede zin wordt. Tik op de luidspreker als je hulp nodig hebt.',
  sentenceFix: 'In de zin zit één fout woord. Tik erop en kies het juiste woord.',
  writeLetter: 'Volg de stippellijn met je vinger en schrijf de letter na. Elke keer helpt de lijn een beetje minder.',
} as const;

const OPERATOR_WORDS: Record<string, string> = {
  '+': 'plus',
  '-': 'min',
  '−': 'min',
  '×': 'keer',
  x: 'keer',
  '*': 'keer',
  ':': 'gedeeld door',
  '÷': 'gedeeld door',
  '/': 'gedeeld door',
};

/** "7 + 5" → "Hoeveel is 7 plus 5?" */
export function sayCalculation(num1: number, operator: string, num2: number): string {
  return `Hoeveel is ${num1} ${OPERATOR_WORDS[operator] ?? operator} ${num2}?`;
}

const COMPARE_WORDS: Record<string, string> = {
  '>': 'groter dan',
  '<': 'kleiner dan',
  '=': 'evenveel als',
};

/** Een getal invullen: "12 is groter dan … welk getal?" */
export function sayCompareGap(left: number | 'stippen', symbol: string): string {
  const start = left === 'stippen' ? 'Het aantal stippen is' : `${left} is`;
  return `${start} ${COMPARE_WORDS[symbol] ?? symbol} … welk getal?`;
}

/** 120 → "1 euro 20", 50 → "50 cent", 300 → "3 euro". */
export function sayEuro(cents: number): string {
  const euros = Math.floor(cents / 100);
  const rest = cents % 100;
  if (euros === 0) return `${rest} cent`;
  if (rest === 0) return `${euros} euro`;
  return `${euros} euro ${rest}`;
}

/** Vergelijken: teken kiezen (1, 2) of een getal invullen (3, 4). In 2 en 4 staan stippen die het kind zelf telt. */
export function explainComparison(q: { variation: 1 | 2 | 3 | 4; leftValue: number; rightValue: number; symbol: string }): string[] {
  if (q.variation === 1) return [EXPLAIN.comparisonSymbol, `${q.leftValue} en ${q.rightValue}. Welk teken past ertussen?`];
  if (q.variation === 2) return [EXPLAIN.comparisonSymbol, `${q.leftValue} en de stippen. Welk teken past ertussen?`];
  return [EXPLAIN.comparisonNumber, sayCompareGap(q.variation === 3 ? q.leftValue : 'stippen', q.symbol)];
}

export function explainSplitBox(q: { mode: 'target' | 'left' | 'right' | 'sum'; target: number; leftCount: number; rightCount: number; knownSide: 'left' | 'right' }): string[] {
  if (q.mode === 'target') {
    const known = q.knownSide === 'left' ? q.leftCount : q.rightCount;
    return [EXPLAIN.splitBoxTarget(q.target), `${known} en hoeveel maakt ${q.target}?`];
  }
  if (q.mode === 'sum') return [EXPLAIN.splitBoxSum, `${q.leftCount} en ${q.rightCount}, hoeveel samen?`];
  return [EXPLAIN.splitBoxSide, `Samen zijn het er ${q.target}. Hoeveel liggen er ${q.mode === 'left' ? 'links' : 'rechts'}?`];
}

export function explainEvenOdd(q: { kind: string; number: number }): string[] {
  if (q.kind === 'double') return [EXPLAIN.halfOrDouble, `Wat is het dubbel van ${q.number}?`];
  if (q.kind === 'half') return [EXPLAIN.halfOrDouble, `Wat is de helft van ${q.number}?`];
  return [EXPLAIN.evenOdd, `Is ${q.number} even of oneven?`];
}

export function explainHalfDouble(
  mode: string | null,
  q: { kind: 'half' | 'double'; number: number; picture?: boolean } | undefined,
  plural: string,
): string[] {
  if (mode === null || !q) return [EXPLAIN.halfDoublePick];
  const what = q.picture ? `${q.number} ${plural}` : `${q.number}`;
  return q.kind === 'half'
    ? [EXPLAIN.half, `Wat is de helft van ${what}?`]
    : [EXPLAIN.double, `Wat is het dubbel van ${what}?`];
}

/** "a, b of c" */
function sayChoices(options: string[]): string {
  return options.length < 2 ? options.join('') : `${options.slice(0, -1).join(', ')} of ${options[options.length - 1]}`;
}

/** Meetkunde is geen leesoefening: de vraag en, waar het woorden zijn, de antwoorden mogen voorgelezen worden. */
export function explainGeometry(mode: string | null, q: { prompt: string; format: string; options?: string[] } | undefined): string[] {
  if (mode === null || !q) return [EXPLAIN.geometryPick];
  if (q.format === 'name' && q.options) return [EXPLAIN.geometryName, `${q.prompt} ${sayChoices(q.options)}?`];
  return [q.format === 'tap' ? EXPLAIN.geometryTap : EXPLAIN.geometryChoose, q.prompt];
}
