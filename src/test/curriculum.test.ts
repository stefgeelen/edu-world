import { describe, it, expect } from 'vitest';
import { buildCurriculum, gradesIn, type CurriculumRow } from '@/lib/curriculum';
import { compactNumbers, EXERCISE_CATALOG, summarizeConfig } from '@/data/exerciseCatalog';

let id = 0;
function row(route: string, grade: number, stage: number, extra: Partial<CurriculumRow> = {}): CurriculumRow {
  return {
    id: `r${++id}`, route: `${route}/${stage}`, grade, stage: `stage-${stage}`, title: extra.title ?? 'Titel',
    subject: 'math', display_order: 10, is_active: true, admin_only: false, from_reading_theme: null, config: {}, ...extra,
  };
}

describe('buildCurriculum', () => {
  it('fills each trimester with its own row, the one before it, or nothing yet', () => {
    const rows = [
      row('/exercises/sum-split', 2, 1, { config: { minSum: 11, maxSum: 20 } }),
      row('/exercises/sum-split', 2, 3, { config: { minSum: 21, maxSum: 99 } }),
      row('/exercises/sum-split', 1, 3, { config: { minSum: 11, maxSum: 18 } }),
    ];
    const [g2] = buildCurriculum(rows, 2);
    expect(g2.name).toBe('Splitsen over 10');
    expect(g2.cells.map((c) => c.kind)).toEqual(['row', 'same', 'row']);
    expect(g2.cells[0].kind === 'row' && g2.cells[0].summary).toBe('sommen 11–20');
    expect(g2.cells[1]).toEqual({ kind: 'same', from: 1, off: false });

    const [g1] = buildCurriculum(rows, 1);
    expect(g1.cells.map((c) => c.kind)).toEqual(['none', 'none', 'row']);
  });

  it('a switched-off row does not count: the trimester keeps the one before, or shows uit', () => {
    const rows = [
      row('/exercises/money', 2, 1),
      row('/exercises/money', 2, 2, { is_active: false }),
      row('/exercises/bonds', 2, 1, { is_active: false }),
    ];
    const families = buildCurriculum(rows, 2);
    const money = families.find((f) => f.familyKey === '/exercises/money')!;
    expect(money.cells[1]).toEqual({ kind: 'same', from: 1, off: true });
    expect(money.off).toBe(false);
    const bonds = families.find((f) => f.familyKey === '/exercises/bonds')!;
    expect(bonds.off).toBe(true);
    expect(bonds.cells[0]).toEqual({ kind: 'none', off: true });
  });

  it('marks test rows and reading-theme rows, and sorts by subject then display order', () => {
    const rows = [
      row('/exercises/picture-word', 1, 1, { subject: 'reading', from_reading_theme: 3 }),
      row('/exercises/write-letter', 1, 1, { subject: 'writing', admin_only: true }),
      row('/exercises/clock', 1, 1, { subject: 'other' }),
      row('/exercises/dots', 1, 1, { display_order: 20 }),
      row('/exercises/split-box', 1, 1, { display_order: 5 }),
    ];
    const families = buildCurriculum(rows, 1);
    expect(families.map((f) => f.name)).toEqual(['Splitsdoos', 'Stippen tellen', 'Prent & Woord', 'Letters schrijven', 'Klokkijken']);
    expect(families.find((f) => f.name === 'Prent & Woord')!.fromReadingTheme).toBe(3);
    const write = families.find((f) => f.name === 'Letters schrijven')!;
    expect(write.inTest).toBe(true);
    expect(write.cells[0].kind === 'row' && write.cells[0].test).toBe(true);
  });

  it('lists the grades present, kleuterklas first', () => {
    expect(gradesIn([row('/exercises/a', 2, 1), row('/exercises/b', 0, 1), row('/exercises/c', 2, 2)])).toEqual([0, 2]);
  });
});

describe('summarizeConfig', () => {
  it.each([
    ['/exercises/math', { operators: ['+', '-'], maxNumber: 20, bridge: 'with' }, '+ −, tot 20, met brug'],
    ['/exercises/number-line', { maxNumber: 100, steps: [10] }, 'tot 100, sprongen van 10'],
    ['/exercises/number-line', { maxNumber: 100, steps: [2, 5, 10] }, 'tot 100, sprongen 2, 5, 10'],
    ['/exercises/even-odd', { maxNumber: 100, kinds: ['even-odd', 'double', 'half'] }, 'tot 100, ook dubbel en helft'],
    ['/exercises/money', { maxPriceCents: 5000 }, 'tot €50'],
    ['/exercises/times-tables', { tables: [1, 2, 3, 4, 5], divisionTables: [2, 5, 10] }, 'volgens de kalender'],
    ['/exercises/clock', { wholeHours: true, halfHours: true }, 'hele uren, halve uren'],
    ['/exercises/sound-house', { allowedPositions: ['begin', 'end'] }, 'vooraan, achteraan'],
    ['/exercises/number-sense', { maxNumber: 100, maxDots: 59 }, 'tot 100, max. 59 stippen'],
  ])('%s %j → %s', (family, config, text) => {
    expect(summarizeConfig(family, config)).toBe(text);
  });

  it('says nothing for an empty or missing config, or a type without settings', () => {
    expect(summarizeConfig('/exercises/math', null)).toBe('');
    expect(summarizeConfig('/exercises/math', {})).toBe('');
    expect(summarizeConfig('/exercises/rhyme', { anything: 1 })).toBe('');
  });

  it('compacts table numbers', () => {
    expect(compactNumbers([10, 2, 5])).toBe('2, 5, 10');
    expect(compactNumbers([1, 2, 3, 4, 5, 7, 8])).toBe('1–5, 7, 8');
    expect(compactNumbers([])).toBe('');
  });
});

describe('EXERCISE_CATALOG', () => {
  it('names every exercise route of the app', async () => {
    const { readFileSync } = await import('node:fs');
    const routes = readFileSync('src/routes/appRoutes.tsx', 'utf8');
    const families = [...routes.matchAll(/path="exercises\/([a-z-]+)\/:id"/g)].map((m) => `/exercises/${m[1]}`);
    expect(families.length).toBeGreaterThan(20);
    for (const family of families) expect(EXERCISE_CATALOG[family]?.name, family).toBeTruthy();
  });
});
