import { describe, it, expect } from 'vitest';
import { generateHalfDoubleRun, HALF_DOUBLE_RUN_LENGTH } from '@/lib/mathQuestions';

describe('generateHalfDoubleRun', () => {
  it('asks only halves of even numbers, within the limit', () => {
    for (let n = 0; n < 50; n++) {
      const run = generateHalfDoubleRun('half', { maxNumber: 20 });
      expect(run).toHaveLength(HALF_DOUBLE_RUN_LENGTH);
      for (const q of run) {
        expect(q.kind).toBe('half');
        expect(q.number % 2).toBe(0);
        expect(q.number).toBeGreaterThanOrEqual(2);
        expect(q.number).toBeLessThanOrEqual(20);
        expect(q.answer).toBe(q.number / 2);
      }
    }
  });

  it('asks only doubles whose answer stays within the limit', () => {
    for (let n = 0; n < 50; n++) {
      for (const q of generateHalfDoubleRun('double', { maxNumber: 50 })) {
        expect(q.kind).toBe('double');
        expect(q.answer).toBe(q.number * 2);
        expect(q.answer).toBeLessThanOrEqual(50);
        expect(q.number).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('"door elkaar" is half halves, half doubles', () => {
    const run = generateHalfDoubleRun('mix', { maxNumber: 100 });
    expect(run.filter((q) => q.kind === 'half')).toHaveLength(HALF_DOUBLE_RUN_LENGTH / 2);
    expect(run.filter((q) => q.kind === 'double')).toHaveLength(HALF_DOUBLE_RUN_LENGTH / 2);
  });

  it('shows a picture with half of the questions', () => {
    for (let n = 0; n < 20; n++) {
      const run = generateHalfDoubleRun('mix', { maxNumber: 20 });
      expect(run.filter((q) => q.picture)).toHaveLength(HALF_DOUBLE_RUN_LENGTH / 2);
    }
  });

  it('does not ask the same number twice in a run', () => {
    for (let n = 0; n < 50; n++) {
      const run = generateHalfDoubleRun('half', { maxNumber: 20 });
      expect(new Set(run.map((q) => q.number)).size).toBe(run.length);
    }
  });
});
