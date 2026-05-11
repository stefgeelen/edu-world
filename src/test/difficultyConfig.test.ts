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
    it('trimester 1 only has + and -, max 6', () => {
      const config = MATH_SUMS_CONFIG['1-1'];
      expect(config.operators).toEqual(['+', '-']);
      expect(config.maxNumber).toBe(6);
      expect(config.allowNegative).toBe(false);
    });

    it('trimester 2 scales to 10', () => {
      const config = MATH_SUMS_CONFIG['1-2'];
      expect(config.operators).toEqual(['+', '-']);
      expect(config.maxNumber).toBe(10);
    });

    it('trimester 3 scales to 20', () => {
      const config = MATH_SUMS_CONFIG['1-3'];
      expect(config.operators).toEqual(['+', '-']);
      expect(config.maxNumber).toBe(20);
    });

    it('default is trimester 1 level', () => {
      expect(DEFAULT_MATH_SUMS.operators).toEqual(['+', '-']);
      expect(DEFAULT_MATH_SUMS.maxNumber).toBe(6);
    });

    it('all configs have entries for grade 1, trimesters 1-3', () => {
      for (let s = 1; s <= 3; s++) {
        expect(MATH_SUMS_CONFIG[`1-${s}`]).toBeDefined();
      }
    });
  });

  describe('NUMBER_BOND_CONFIG', () => {
    it('trimester 1 has small targets', () => {
      const config = NUMBER_BOND_CONFIG['1-1'];
      expect(config.minTarget).toBe(3);
      expect(config.maxTarget).toBe(6);
    });

    it('trimester 3 has large targets', () => {
      const config = NUMBER_BOND_CONFIG['1-3'];
      expect(config.minTarget).toBe(8);
      expect(config.maxTarget).toBe(20);
    });
  });

  describe('COMPARISON_CONFIG', () => {
    it('scales from 6 to 20', () => {
      expect(COMPARISON_CONFIG['1-1'].maxNumber).toBe(6);
      expect(COMPARISON_CONFIG['1-3'].maxNumber).toBe(20);
    });
  });

  describe('DOT_COUNT_CONFIG', () => {
    it('trimester 1 has small range', () => {
      expect(DOT_COUNT_CONFIG['1-1'].minDots).toBe(1);
      expect(DOT_COUNT_CONFIG['1-1'].maxDots).toBe(6);
    });
  });
});
