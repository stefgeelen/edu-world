import { describe, it, expect } from 'vitest';
import {
  dutchNumberWord,
  generateNumberSenseRun,
  hundredGridCell,
  hundredGridNumber,
  NUMBER_SENSE_KINDS,
  RUN_LENGTH,
  scatterDots,
} from '@/lib/numberSense';
import { DEFAULT_NUMBER_SENSE } from '@/data/difficultyConfig';

describe('honderdveld', () => {
  it('counts like the class sheet: 1–10 on top, 91–100 at the bottom', () => {
    expect(hundredGridCell(1)).toEqual({ row: 0, col: 0 });
    expect(hundredGridCell(21)).toEqual({ row: 2, col: 0 });
    expect(hundredGridCell(40)).toEqual({ row: 3, col: 9 });
    expect(hundredGridCell(88)).toEqual({ row: 8, col: 7 });
    expect(hundredGridCell(100)).toEqual({ row: 9, col: 9 });
    for (let n = 1; n <= 100; n++) {
      const { row, col } = hundredGridCell(n);
      expect(hundredGridNumber(row, col)).toBe(n);
    }
  });
});

describe('dutchNumberWord', () => {
  it.each([
    [7, 'zeven'], [10, 'tien'], [13, 'dertien'], [19, 'negentien'], [20, 'twintig'],
    [21, 'eenentwintig'], [22, 'tweeëntwintig'], [33, 'drieëndertig'], [47, 'zevenenveertig'],
    [80, 'tachtig'], [86, 'zesentachtig'], [99, 'negenennegentig'], [100, 'honderd'],
  ])('%i → %s', (n, word) => {
    expect(dutchNumberWord(n)).toBe(word);
  });
});

describe('scatterDots', () => {
  it('places every dot in its own cell of the field', () => {
    for (const count of [21, 37, 59, 99]) {
      const { cols, rows, dots } = scatterDots(count);
      expect(dots).toHaveLength(count);
      const cells = new Set(dots.map((d) => d.row * cols + d.col));
      expect(cells.size).toBe(count);
      for (const d of dots) {
        expect(d.col).toBeLessThan(cols);
        expect(d.row).toBeLessThan(rows);
        expect(Math.abs(d.dx)).toBeLessThanOrEqual(0.25);
        expect(Math.abs(d.dy)).toBeLessThanOrEqual(0.25);
      }
    }
  });
});

describe('generateNumberSenseRun', () => {
  it('asks only the chosen kind, different numbers, within the ranges', () => {
    for (let n = 0; n < 40; n++) {
      for (const kind of NUMBER_SENSE_KINDS) {
        const run = generateNumberSenseRun(kind, DEFAULT_NUMBER_SENSE);
        expect(run).toHaveLength(RUN_LENGTH[kind]);
        expect(new Set(run.map((q) => q.number)).size).toBe(run.length);
        for (const q of run) {
          expect(q.kind).toBe(kind);
          expect(q.number).toBeGreaterThanOrEqual(1);
          expect(q.number).toBeLessThanOrEqual(100);
          if (kind === 'group-tens') {
            expect(q.number).toBeGreaterThanOrEqual(21);
            expect(q.number).toBeLessThanOrEqual(DEFAULT_NUMBER_SENSE.maxDots);
            if (q.kind === 'group-tens') expect(q.dots).toHaveLength(q.number);
          }
          if (kind === 'place-value') {
            expect(q.number).toBeGreaterThanOrEqual(10);
            expect(q.number).toBeLessThanOrEqual(99);
          }
        }
      }
    }
  });

  it('H T E always has a whole ten in the run (like 40 on the sheet)', () => {
    for (let n = 0; n < 50; n++) {
      const run = generateNumberSenseRun('place-value', DEFAULT_NUMBER_SENSE);
      expect(run.some((q) => q.number % 10 === 0)).toBe(true);
    }
  });

  it('"door elkaar" asks every kind, and grouping only once', () => {
    for (let n = 0; n < 40; n++) {
      const run = generateNumberSenseRun('mix', DEFAULT_NUMBER_SENSE);
      expect(run).toHaveLength(RUN_LENGTH.mix);
      const kinds = run.map((q) => q.kind);
      for (const kind of NUMBER_SENSE_KINDS) expect(kinds).toContain(kind);
      expect(kinds.filter((k) => k === 'group-tens')).toHaveLength(1);
    }
  });

  it('follows a lower maxNumber', () => {
    for (let n = 0; n < 30; n++) {
      for (const q of generateNumberSenseRun('grid-find', { maxNumber: 30, maxDots: 30 })) {
        expect(q.number).toBeLessThanOrEqual(30);
      }
    }
  });
});
