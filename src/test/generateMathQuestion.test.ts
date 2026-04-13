import { describe, it, expect } from 'vitest';
import { MATH_SUMS_CONFIG, DEFAULT_MATH_SUMS, type MathSumsConfig } from '@/data/difficultyConfig';

// Copy the generation function from Exercise.tsx for testing
function generateMathQuestion(config: MathSumsConfig) {
  const { operators, maxNumber, allowNegative, maxDivisor } = config;
  const op = operators[Math.floor(Math.random() * operators.length)];
  let num1: number, num2: number, ans: number;

  if (op === '÷') {
    const divisor = Math.floor(Math.random() * (maxDivisor || 10)) + 1;
    const quotient = Math.floor(Math.random() * 10) + 1;
    num1 = divisor * quotient;
    num2 = divisor;
    ans = quotient;
  } else if (op === '×') {
    num1 = Math.floor(Math.random() * Math.min(maxNumber, 12)) + 1;
    num2 = Math.floor(Math.random() * 10) + 1;
    ans = num1 * num2;
  } else if (op === '-') {
    if (!allowNegative) {
      num1 = Math.floor(Math.random() * maxNumber) + 1;
      num2 = Math.floor(Math.random() * num1) + 1;
    } else {
      num1 = Math.floor(Math.random() * maxNumber) + 1;
      num2 = Math.floor(Math.random() * maxNumber) + 1;
    }
    ans = num1 - num2;
  } else {
    num1 = Math.floor(Math.random() * maxNumber) + 1;
    num2 = Math.floor(Math.random() * (maxNumber - num1)) + 1;
    ans = num1 + num2;
  }

  const options = new Set([ans]);
  while (options.size < 4) {
    const offset = Math.floor(Math.random() * 10) - 5;
    const candidate = ans + offset;
    if (candidate !== ans && (!allowNegative ? candidate >= 0 : true)) {
      options.add(candidate);
    }
  }

  return {
    question: { num1, num2, operator: op, answer: ans },
    options: Array.from(options),
  };
}

describe('generateMathQuestion', () => {
  it('grade 1 only generates + and - with no negatives', () => {
    const config = MATH_SUMS_CONFIG['1-1'];
    for (let i = 0; i < 100; i++) {
      const { question } = generateMathQuestion(config);
      expect(['+', '-']).toContain(question.operator);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.num1).toBeLessThanOrEqual(config.maxNumber);
      expect(question.num2).toBeLessThanOrEqual(config.maxNumber);
    }
  });

  it('grade 2 stage 3 can generate ÷ with clean division', () => {
    const config = MATH_SUMS_CONFIG['2-3'];
    let sawDivision = false;
    for (let i = 0; i < 200; i++) {
      const { question } = generateMathQuestion(config);
      if (question.operator === '÷') {
        sawDivision = true;
        expect(question.num1 % question.num2).toBe(0);
        expect(question.answer).toBe(question.num1 / question.num2);
      }
    }
    expect(sawDivision).toBe(true);
  });

  it('always generates exactly 4 options including the answer', () => {
    const config = MATH_SUMS_CONFIG['1-2'];
    for (let i = 0; i < 50; i++) {
      const { question, options } = generateMathQuestion(config);
      expect(options).toHaveLength(4);
      expect(options).toContain(question.answer);
    }
  });

  it('subtraction in grade 1 never goes below 0', () => {
    const config = MATH_SUMS_CONFIG['1-4'];
    for (let i = 0; i < 200; i++) {
      const { question } = generateMathQuestion(config);
      if (question.operator === '-') {
        expect(question.answer).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
