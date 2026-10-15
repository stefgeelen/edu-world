import { describe, it, expect } from 'vitest';
import { inTens, GETALBEELD_GRID } from '@/lib/getalbeeld';

describe('getalbeeld', () => {
  it('fills two rows column by column', () => {
    expect(GETALBEELD_GRID).toBe('grid grid-rows-2 grid-flow-col');
  });

  it('splits a count into pictures of at most ten', () => {
    expect(inTens(0)).toEqual([]);
    expect(inTens(3)).toEqual([3]);
    expect(inTens(10)).toEqual([10]);
    expect(inTens(13)).toEqual([10, 3]);
    expect(inTens(20)).toEqual([10, 10]);
  });
});
