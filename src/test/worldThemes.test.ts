import { describe, it, expect } from 'vitest';
import { getWorldTheme } from '@/data/worldThemes';
import { MAX_SUPPORTED_GRADE } from '@/data/difficultyConfig';

// Theme and content/difficulty are meant to ship together — a child above
// MAX_SUPPORTED_GRADE should see the grade-1 world here for the same reason
// useDifficultyLevel clamps: showing a grade-2 theme with grade-1 content
// (or vice versa) would be a confusing half-migrated experience.

describe('getWorldTheme', () => {
  it('returns the grade-1 theme for a grade-1 child', () => {
    const theme = getWorldTheme(1);
    expect(theme.title).toBe('Het Magische Letterbos');
    expect(theme.stageNames).toEqual({ 1: 'Fluisterbomen', 2: 'Borrelende Beek', 3: 'Woordenwoud' });
  });

  it('defaults to the grade-1 theme when grade is missing', () => {
    expect(getWorldTheme(undefined).title).toBe('Het Magische Letterbos');
    expect(getWorldTheme(null).title).toBe('Het Magische Letterbos');
  });

  it('clamps a grade above MAX_SUPPORTED_GRADE down to the grade-1 theme', () => {
    // Documents current behavior: MAX_SUPPORTED_GRADE is 1 today, so even a
    // grade-2 child (from age-based onboarding) still gets grade-1 theming
    // until that ceiling is deliberately raised.
    expect(MAX_SUPPORTED_GRADE).toBe(1);
    expect(getWorldTheme(4).title).toBe('Het Magische Letterbos');
  });

  it('every stage (1-3) has a name and icon defined for the grade-1 theme', () => {
    const theme = getWorldTheme(1);
    for (const stage of [1, 2, 3]) {
      expect(theme.stageNames[stage]).toBeTruthy();
      expect(theme.stageIcons[stage]).toBeTruthy();
    }
  });
});
