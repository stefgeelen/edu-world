import { describe, it, expect } from 'vitest';
import {
  EXPLAIN,
  explainComparison,
  explainGeometry,
  explainHalfDouble,
  explainSplitBox,
  sayCalculation,
  sayEuro,
} from '@/data/exerciseExplanations';

describe('what the Buddy says in an exercise', () => {
  it('reads sums in words', () => {
    expect(sayCalculation(7, '+', 5)).toBe('Hoeveel is 7 plus 5?');
    expect(sayCalculation(9, '-', 3)).toBe('Hoeveel is 9 min 3?');
    expect(sayCalculation(3, '×', 7)).toBe('Hoeveel is 3 keer 7?');
    expect(sayCalculation(12, ':', 4)).toBe('Hoeveel is 12 gedeeld door 4?');
  });

  it('says prices the way a child hears them', () => {
    expect(sayEuro(120)).toBe('1 euro 20');
    expect(sayEuro(50)).toBe('50 cent');
    expect(sayEuro(300)).toBe('3 euro');
  });

  it('never says the number of dots the child has to count', () => {
    const lines = explainComparison({ variation: 4, leftValue: 13, rightValue: 0, symbol: '>' });
    expect(lines.join(' ')).not.toContain('13');
    expect(lines[1]).toBe('Het aantal stippen is groter dan … welk getal?');

    const withDots = explainComparison({ variation: 2, leftValue: 6, rightValue: 17, symbol: '<' });
    expect(withDots.join(' ')).not.toContain('17');
  });

  it('asks the split box question for the side that is missing', () => {
    expect(explainSplitBox({ mode: 'target', target: 10, leftCount: 4, rightCount: 6, knownSide: 'left' })[1]).toBe(
      '4 en hoeveel maakt 10?',
    );
    expect(explainSplitBox({ mode: 'right', target: 10, leftCount: 4, rightCount: 6, knownSide: 'left' })[1]).toBe(
      'Samen zijn het er 10. Hoeveel liggen er rechts?',
    );
  });

  it('explains the picker before a mode is chosen', () => {
    expect(explainHalfDouble(null, undefined, 'appels')).toEqual([EXPLAIN.halfDoublePick]);
    expect(explainHalfDouble('half', { kind: 'half', number: 8, picture: true }, 'appels')).toEqual([
      EXPLAIN.half,
      'Wat is de helft van 8 appels?',
    ]);
    expect(explainGeometry(null, undefined)).toEqual([EXPLAIN.geometryPick]);
  });

  it('reads the geometry answers, since geometry is not a reading exercise', () => {
    expect(
      explainGeometry('lines', { prompt: 'Welke lijn is dit?', format: 'name', options: ['rechte lijn', 'gebogen lijn', 'gebroken lijn'] })[1],
    ).toBe('Welke lijn is dit? rechte lijn, gebogen lijn of gebroken lijn?');
  });

  it('explains each kind of geometry question in its own way', () => {
    expect(explainGeometry('angles', { prompt: 'Tik het hoekpunt aan.', format: 'tap' })).toEqual([
      EXPLAIN.geometryTap,
      'Tik het hoekpunt aan.',
    ]);
    expect(explainGeometry('lines', { prompt: 'Tik de gebogen lijn aan.', format: 'pick' })).toEqual([
      EXPLAIN.geometryPick,
      'Tik de gebogen lijn aan.',
    ]);
  });
});
