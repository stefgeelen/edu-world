import { describe, it, expect } from 'vitest';
import { type MathSumsConfig } from '@/data/difficultyConfig';
import { generateMathQuestion } from '@/lib/mathQuestions';

const TRIMESTER_1: MathSumsConfig = { operators: ['+', '-'], maxNumber: 6, allowNegative: false };
const TRIMESTER_2: MathSumsConfig = { operators: ['+', '-'], maxNumber: 10, allowNegative: false };
const TRIMESTER_3: MathSumsConfig = { operators: ['+', '-'], maxNumber: 20, allowNegative: false };

describe('generateMathQuestion', () => {
  it('trimester 1 only generates + and - with no negatives', () => {
    const config = TRIMESTER_1;
    for (let i = 0; i < 100; i++) {
      const { question } = generateMathQuestion(config);
      expect(['+', '-']).toContain(question.operator);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.num1).toBeLessThanOrEqual(config.maxNumber);
      expect(question.num2).toBeLessThanOrEqual(config.maxNumber);
    }
  });

  it('trimester 3 generates + and - up to 20', () => {
    const config = TRIMESTER_3;
    for (let i = 0; i < 100; i++) {
      const { question } = generateMathQuestion(config);
      expect(['+', '-']).toContain(question.operator);
      expect(question.answer).toBeGreaterThanOrEqual(0);
    }
  });

  it('always generates exactly 4 options including the answer', () => {
    const config = TRIMESTER_2;
    for (let i = 0; i < 50; i++) {
      const { question, options } = generateMathQuestion(config);
      expect(options).toHaveLength(4);
      expect(options).toContain(question.answer);
    }
  });

  it('subtraction in trimester 3 never goes below 0', () => {
    const config = TRIMESTER_3;
    for (let i = 0; i < 200; i++) {
      const { question } = generateMathQuestion(config);
      if (question.operator === '-') {
        expect(question.answer).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
