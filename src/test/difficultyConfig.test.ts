import { describe, it, expect } from 'vitest';
import {
  MATH_SUMS_CONFIG,
  DEFAULT_MATH_SUMS,
  NUMBER_BOND_CONFIG,
  DEFAULT_NUMBER_BOND,
  COMPARISON_CONFIG,
  DOT_COUNT_CONFIG,
} from '@/data/difficultyConfig';

describe('difficultyConfig', () => {
  describe('MATH_SUMS_CONFIG', () => {
    it('grade 1 stage 1 only has + and -', () => {
      const config = MATH_SUMS_CONFIG['1-1'];
      expect(config.operators).toEqual(['+', '-']);
      expect(config.maxNumber).toBe(10);
      expect(config.allowNegative).toBe(false);
    });

    it('grade 1 stage 4 scales to 20', () => {
      const config = MATH_SUMS_CONFIG['1-4'];
      expect(config.operators).toEqual(['+', '-']);
      expect(config.maxNumber).toBe(20);
    });

    it('grade 2 stage 2 adds multiplication', () => {
      const config = MATH_SUMS_CONFIG['2-2'];
      expect(config.operators).toContain('×');
      expect(config.operators).not.toContain('÷');
    });

    it('grade 2 stage 3+ adds division', () => {
      const config = MATH_SUMS_CONFIG['2-3'];
      expect(config.operators).toContain('÷');
      expect(config.maxDivisor).toBe(10);
    });

    it('default is grade 1 level', () => {
      expect(DEFAULT_MATH_SUMS.operators).toEqual(['+', '-']);
      expect(DEFAULT_MATH_SUMS.maxNumber).toBe(10);
    });

    it('all configs have entries for grades 1-2, stages 1-4', () => {
      for (let g = 1; g <= 2; g++) {
        for (let s = 1; s <= 4; s++) {
          expect(MATH_SUMS_CONFIG[`${g}-${s}`]).toBeDefined();
        }
      }
    });
  });

  describe('NUMBER_BOND_CONFIG', () => {
    it('grade 1 stage 1 has small targets', () => {
      const config = NUMBER_BOND_CONFIG['1-1'];
      expect(config.minTarget).toBe(5);
      expect(config.maxTarget).toBe(8);
    });

    it('grade 2 stage 4 has large targets', () => {
      const config = NUMBER_BOND_CONFIG['2-4'];
      expect(config.minTarget).toBe(15);
      expect(config.maxTarget).toBe(20);
    });
  });

  describe('COMPARISON_CONFIG', () => {
    it('scales from 10 to 100', () => {
      expect(COMPARISON_CONFIG['1-1'].maxNumber).toBe(10);
      expect(COMPARISON_CONFIG['2-4'].maxNumber).toBe(100);
    });
  });

  describe('DOT_COUNT_CONFIG', () => {
    it('grade 1 stage 1 has small range', () => {
      expect(DOT_COUNT_CONFIG['1-1'].minDots).toBe(1);
      expect(DOT_COUNT_CONFIG['1-1'].maxDots).toBe(5);
    });
  });
});
