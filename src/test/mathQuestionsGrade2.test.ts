import { describe, it, expect } from 'vitest';
import {
  crossesTen,
  generateEvenOddQuestion,
  generateMathQuestion,
  generateSumSplitQuestion,
  makeNumberLineSlots,
} from '@/lib/mathQuestions';
import type { MathSumsConfig } from '@/data/difficultyConfig';

// The configs below are the ones in supabase/migrations/20261013120000_grade_2_maths.sql.

const RUNS = 300;

describe('crossesTen', () => {
  it('knows when a sum or difference goes over a ten', () => {
    expect(crossesTen(8, '+', 5)).toBe(true);
    expect(crossesTen(38, '+', 25)).toBe(true);
    expect(crossesTen(52, '-', 7)).toBe(true);
    expect(crossesTen(34, '+', 25)).toBe(false);
    expect(crossesTen(57, '-', 23)).toBe(false);
  });

  it('does not count landing exactly on a ten as going over it', () => {
    expect(crossesTen(34, '+', 6)).toBe(false);
    expect(crossesTen(8, '+', 2)).toBe(false);
  });
});

describe('Rekensom, 2de leerjaar', () => {
  const t1: MathSumsConfig = { operators: ['+', '-'], maxNumber: 20, allowNegative: false, bridge: 'with' };
  const t2: MathSumsConfig = { operators: ['+', '-'], maxNumber: 100, allowNegative: false, bridge: 'without' };
  const t3: MathSumsConfig = { operators: ['+', '-'], maxNumber: 100, allowNegative: false, bridge: 'with' };

  it('trimester 1: every sum to 20 goes over 10', () => {
    for (let i = 0; i < RUNS; i++) {
      const { question: q } = generateMathQuestion(t1);
      expect(crossesTen(q.num1, q.operator, q.num2)).toBe(true);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(Math.max(q.num1, q.num2, q.answer)).toBeLessThanOrEqual(20);
    }
  });

  it('trimester 2: sums to 100 never go over a ten', () => {
    for (let i = 0; i < RUNS; i++) {
      const { question: q } = generateMathQuestion(t2);
      expect(crossesTen(q.num1, q.operator, q.num2)).toBe(false);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(Math.max(q.num1, q.num2, q.answer)).toBeLessThanOrEqual(100);
    }
  });

  it('trimester 3: sums to 100 always go over a ten', () => {
    for (let i = 0; i < RUNS; i++) {
      const { question: q } = generateMathQuestion(t3);
      expect(crossesTen(q.num1, q.operator, q.num2)).toBe(true);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(Math.max(q.num1, q.num2, q.answer)).toBeLessThanOrEqual(100);
    }
  });

  it('mixes units, whole tens and tens-and-units as the second number', () => {
    const shapes = new Set<string>();
    for (let i = 0; i < RUNS; i++) {
      const { num2 } = generateMathQuestion(t2).question;
      shapes.add(num2 < 10 ? 'E' : num2 % 10 === 0 ? 'T' : 'TE');
    }
    expect(shapes).toEqual(new Set(['E', 'T', 'TE']));
  });

  it('gives 4 distinct non-negative options including the answer', () => {
    for (let i = 0; i < RUNS; i++) {
      const { question, options } = generateMathQuestion(t3);
      expect(new Set(options).size).toBe(4);
      expect(options).toContain(question.answer);
      options.forEach((o) => expect(o).toBeGreaterThanOrEqual(0));
    }
  });
});

describe('Splitsen over het tiental', () => {
  it('splits a two-digit number to the next ten (38 + 6 = 38 + 2 + 4)', () => {
    for (let i = 0; i < RUNS; i++) {
      const q = generateSumSplitQuestion(21, 99);
      expect(q.num1).toBeGreaterThanOrEqual(16);
      expect((q.num1 + q.leftPart) % 10).toBe(0);
      expect(q.leftPart + q.rightPart).toBe(q.num2);
      expect(q.leftPart).toBeGreaterThanOrEqual(1);
      expect(q.rightPart).toBeGreaterThanOrEqual(1);
      expect(q.total).toBe(q.num1 + q.num2);
      expect(q.total).toBeGreaterThanOrEqual(21);
      // The numpad takes two digits.
      expect(q.total).toBeLessThanOrEqual(99);
    }
  });

  it('keeps the 1ste-leerjaar range to 20', () => {
    for (let i = 0; i < RUNS; i++) {
      const q = generateSumSplitQuestion(11, 18);
      expect(q.num1).toBeGreaterThanOrEqual(6);
      expect(q.num1).toBeLessThanOrEqual(9);
      expect(q.leftPart).toBe(10 - q.num1);
    }
  });
});

describe('Getallenlijn', () => {
  it('without steps or length: the whole line by ones (1ste leerjaar)', () => {
    const slots = makeNumberLineSlots({ maxNumber: 10 });
    expect(slots.map((s) => s.value)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(slots.filter((s) => s.isBlank)).toHaveLength(3);
  });

  it('trimester 1: 0, 10, 20 … 100', () => {
    const slots = makeNumberLineSlots({ maxNumber: 100, steps: [10] });
    expect(slots.map((s) => s.value)).toEqual([0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
  });

  it('a piece of 11 points by ones or jumps, within 0..100, with three inner blanks', () => {
    for (const steps of [[1], [2, 5, 10]]) {
      for (let i = 0; i < RUNS; i++) {
        const slots = makeNumberLineSlots({ maxNumber: 100, steps, length: 11 });
        const values = slots.map((s) => s.value);
        const step = values[1] - values[0];
        expect(slots).toHaveLength(11);
        expect(steps).toContain(step);
        expect(values[0] % step).toBe(0);
        expect(values[0]).toBeGreaterThanOrEqual(0);
        expect(values[10]).toBeLessThanOrEqual(100);
        values.forEach((v, j) => expect(v).toBe(values[0] + j * step));
        const blanks = slots.filter((s) => s.isBlank);
        expect(blanks).toHaveLength(3);
        expect(slots[0].isBlank).toBe(false);
        expect(slots[10].isBlank).toBe(false);
      }
    }
  });
});

describe('Even of oneven', () => {
  it('trimester 1: only even/odd, numbers 1..20', () => {
    for (let i = 0; i < RUNS; i++) {
      const q = generateEvenOddQuestion({ maxNumber: 20, kinds: ['even-odd'] });
      expect(q.kind).toBe('even-odd');
      expect(q.number).toBeGreaterThanOrEqual(1);
      expect(q.number).toBeLessThanOrEqual(20);
      expect(q.answer).toBe(q.number % 2 === 0 ? 'even' : 'oneven');
    }
  });

  it('trimester 2: doubles and halves stay within 100 and come out whole', () => {
    const kinds = new Set<string>();
    for (let i = 0; i < RUNS; i++) {
      const q = generateEvenOddQuestion({ maxNumber: 100, kinds: ['even-odd', 'double', 'half'] });
      kinds.add(q.kind);
      if (q.kind === 'double') {
        expect(q.answer).toBe(q.number * 2);
        expect(q.answer).toBeLessThanOrEqual(100);
        // Doubles of 1..10 or of whole tens.
        expect(q.number <= 10 || q.number % 10 === 0).toBe(true);
      }
      if (q.kind === 'half') {
        expect(q.answer * 2).toBe(q.number);
        expect(q.number).toBeLessThanOrEqual(100);
        expect(q.number <= 20 || q.number % 20 === 0).toBe(true);
      }
    }
    expect(kinds).toEqual(new Set(['even-odd', 'double', 'half']));
  });
});
