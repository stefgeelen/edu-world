/**
 * The settings an admin can change per exercise type, for the form in
 * Admin → Oefeningen. Keys and meaning match the *Config interfaces in
 * difficultyConfig.ts; the limits are what the screens can actually show
 * (e.g. a two-digit numpad stops at 99).
 *
 * Keys a form doesn't list are kept as they are when saving.
 */

export interface Choice<V extends string | number = string | number> {
  value: V;
  label: string;
}

export type ConfigField =
  | { kind: 'number'; key: string; label: string; min: number; max: number; optional?: boolean; hint?: string }
  /** Stored in cents, edited in euro. */
  | { kind: 'euro'; key: string; label: string; min: number; max: number }
  | { kind: 'boolean'; key: string; label: string }
  | { kind: 'select'; key: string; label: string; choices: Choice[]; optional?: boolean }
  | { kind: 'multi'; key: string; label: string; choices: Choice[]; optional?: boolean };

export interface ConfigForm {
  fields: ConfigField[];
  /** Rules across fields; returns a Dutch message when broken. */
  check?: (config: Record<string, unknown>) => string | null;
}

const minAtMostMax = (minKey: string, maxKey: string, label: string) =>
  (c: Record<string, unknown>) =>
    Number(c[minKey]) > Number(c[maxKey]) ? `${label}: het kleinste getal mag niet groter zijn dan het grootste.` : null;

const STEPS: Choice[] = [1, 2, 5, 10].map((n) => ({ value: n, label: `per ${n}` }));

const TABLES: Choice[] = Array.from({ length: 10 }, (_, i) => ({ value: i + 1, label: `${i + 1}` }));

const DENOMINATIONS: Choice[] = [
  { value: 5000, label: '€50' }, { value: 2000, label: '€20' }, { value: 1000, label: '€10' }, { value: 500, label: '€5' },
  { value: 200, label: '€2' }, { value: 100, label: '€1' }, { value: 50, label: '50c' }, { value: 20, label: '20c' },
  { value: 10, label: '10c' }, { value: 5, label: '5c' },
];

/** Keyed by route family, e.g. "/exercises/math". */
export const CONFIG_FORMS: Record<string, ConfigForm> = {
  '/exercises/math': {
    fields: [
      { kind: 'multi', key: 'operators', label: 'Bewerkingen', choices: [
        { value: '+', label: '+' }, { value: '-', label: '−' }, { value: '×', label: '×' }, { value: '÷', label: '÷' },
      ] },
      { kind: 'number', key: 'maxNumber', label: 'Hoogste getal', min: 2, max: 100 },
      { kind: 'select', key: 'bridge', label: 'Over het tiental (brug)', optional: true, choices: [
        { value: 'with', label: 'Altijd met brug' }, { value: 'without', label: 'Nooit met brug' },
      ] },
      { kind: 'boolean', key: 'allowNegative', label: 'Negatieve uitkomsten toelaten' },
      { kind: 'number', key: 'maxDivisor', label: 'Grootste deler (bij ÷)', min: 1, max: 10, optional: true },
    ],
  },
  '/exercises/sum-split': {
    fields: [
      { kind: 'number', key: 'minSum', label: 'Kleinste uitkomst', min: 11, max: 98 },
      { kind: 'number', key: 'maxSum', label: 'Grootste uitkomst', min: 12, max: 99 },
    ],
    check: minAtMostMax('minSum', 'maxSum', 'Uitkomst'),
  },
  '/exercises/number-line': {
    fields: [
      { kind: 'number', key: 'maxNumber', label: 'Hoogste getal', min: 5, max: 100 },
      { kind: 'multi', key: 'steps', label: 'Sprongen', choices: STEPS, optional: true },
      { kind: 'number', key: 'length', label: 'Aantal punten op de lijn', min: 5, max: 21, optional: true, hint: 'Leeg = de hele lijn van 0 tot het hoogste getal.' },
    ],
    check: (c) => {
      const steps = (c.steps as number[] | undefined) ?? [1];
      const points = Math.floor(Number(c.maxNumber) / Math.min(...steps)) + 1;
      if (c.length === undefined && points > 21) return `De hele lijn heeft ${points} punten; kies een aantal punten (max. 21) of grotere sprongen.`;
      return null;
    },
  },
  '/exercises/comparison': {
    fields: [{ kind: 'number', key: 'maxNumber', label: 'Hoogste getal', min: 2, max: 99 }],
  },
  '/exercises/even-odd': {
    fields: [
      { kind: 'number', key: 'maxNumber', label: 'Hoogste getal', min: 4, max: 100 },
      { kind: 'multi', key: 'kinds', label: 'Soort vragen', choices: [
        { value: 'even-odd', label: 'Even of oneven' }, { value: 'double', label: 'Dubbel' }, { value: 'half', label: 'Helft' },
      ] },
    ],
  },
  '/exercises/half-double': {
    fields: [{ kind: 'number', key: 'maxNumber', label: 'Hoogste getal', min: 4, max: 100, hint: 'Dubbel van getallen tot de helft hiervan, helft van even getallen tot dit getal.' }],
  },
  '/exercises/geometry-terms': {
    fields: [
      { kind: 'multi', key: 'topics', label: 'Onderdelen', choices: [
        { value: 'lines', label: 'Lijnen' }, { value: 'point-line-segment', label: 'Punt, rechte, lijnstuk' },
        { value: 'angles', label: 'Hoeken' }, { value: 'parallel', label: 'Evenwijdig en snijdend' },
      ] },
    ],
  },
  '/exercises/times-tables': {
    fields: [
      { kind: 'multi', key: 'tables', label: 'Tafels om te kiezen', choices: TABLES },
      { kind: 'multi', key: 'divisionTables', label: 'Ook deeltafels bij', choices: TABLES, optional: true },
    ],
    check: (c) => {
      const tables = c.tables as number[];
      const extra = ((c.divisionTables as number[] | undefined) ?? []).filter((t) => !tables.includes(t));
      return extra.length ? `Deeltafels kunnen alleen bij tafels die het kind kan kiezen (niet bij ${extra.join(', ')}).` : null;
    },
  },
  '/exercises/money': {
    fields: [
      { kind: 'multi', key: 'denominations', label: 'Briefjes en munten', choices: DENOMINATIONS },
      { kind: 'euro', key: 'maxPriceCents', label: 'Hoogste prijs (€)', min: 1, max: 100 },
    ],
    check: (c) => {
      const smallest = Math.min(...(c.denominations as number[]));
      return Number(c.maxPriceCents) < smallest ? 'De hoogste prijs is kleiner dan het kleinste briefje of muntstuk.' : null;
    },
  },
  '/exercises/bonds': {
    fields: [
      { kind: 'number', key: 'minTarget', label: 'Kleinste getal', min: 2, max: 99 },
      { kind: 'number', key: 'maxTarget', label: 'Grootste getal', min: 2, max: 99 },
    ],
    check: minAtMostMax('minTarget', 'maxTarget', 'Getal'),
  },
  '/exercises/split-box': {
    fields: [
      { kind: 'number', key: 'minTarget', label: 'Kleinste getal', min: 2, max: 20 },
      { kind: 'number', key: 'maxTarget', label: 'Grootste getal', min: 2, max: 20 },
    ],
    check: minAtMostMax('minTarget', 'maxTarget', 'Getal'),
  },
  '/exercises/subtract-box': {
    fields: [{ kind: 'number', key: 'maxTotal', label: 'Hoogste getal', min: 2, max: 20 }],
  },
  '/exercises/dots': {
    fields: [
      { kind: 'number', key: 'minDots', label: 'Minste stippen', min: 1, max: 20 },
      { kind: 'number', key: 'maxDots', label: 'Meeste stippen', min: 1, max: 20 },
    ],
    check: minAtMostMax('minDots', 'maxDots', 'Stippen'),
  },
  '/exercises/compare-objects': {
    fields: [
      { kind: 'number', key: 'minObjects', label: 'Minste voorwerpen', min: 1, max: 20 },
      { kind: 'number', key: 'maxObjects', label: 'Meeste voorwerpen', min: 1, max: 20 },
    ],
    check: minAtMostMax('minObjects', 'maxObjects', 'Voorwerpen'),
  },
  '/exercises/clock': {
    fields: [
      { kind: 'boolean', key: 'wholeHours', label: 'Hele uren' },
      { kind: 'boolean', key: 'halfHours', label: 'Halve uren' },
    ],
    check: (c) => (c.wholeHours || c.halfHours ? null : 'Kies minstens hele of halve uren.'),
  },
  '/exercises/picture-word': {
    fields: [{ kind: 'select', key: 'optionCount', label: 'Aantal keuzes', choices: [{ value: 3, label: '3' }, { value: 4, label: '4' }] }],
  },
  '/exercises/sound-house': {
    fields: [
      { kind: 'multi', key: 'allowedPositions', label: 'Waar zit de klank', choices: [
        { value: 'begin', label: 'Begin' }, { value: 'middle', label: 'Midden' }, { value: 'end', label: 'Einde' },
      ] },
      { kind: 'select', key: 'poolStage', label: 'Woordenlijst', choices: [
        { value: 1, label: 'Lijst 1' }, { value: 2, label: 'Lijst 2' }, { value: 3, label: 'Lijst 3' },
      ] },
    ],
  },
};

/**
 * Checks a config against its form. Returns the first problem in Dutch, or
 * null when it can be saved.
 */
export function validateConfig(form: ConfigForm, config: Record<string, unknown>): string | null {
  for (const field of form.fields) {
    const value = config[field.key];
    if (value === undefined || value === '') {
      if (field.kind === 'boolean' || ('optional' in field && field.optional)) continue;
      return `${field.label}: vul dit in.`;
    }
    if (field.kind === 'number' || field.kind === 'euro') {
      const n = Number(value) / (field.kind === 'euro' ? 100 : 1);
      if (!Number.isInteger(field.kind === 'euro' ? Number(value) : n)) return `${field.label}: gebruik een geheel getal.`;
      if (n < field.min || n > field.max) return `${field.label}: kies tussen ${field.min} en ${field.max}.`;
    }
    if (field.kind === 'multi') {
      if (!Array.isArray(value) || (value.length === 0 && !field.optional)) return `${field.label}: kies er minstens één.`;
      if (value.some((v) => !field.choices.some((c) => c.value === v))) return `${field.label}: onbekende keuze.`;
    }
    if (field.kind === 'select' && !field.choices.some((c) => c.value === value)) {
      return `${field.label}: onbekende keuze.`;
    }
  }
  return form.check?.(config) ?? null;
}
