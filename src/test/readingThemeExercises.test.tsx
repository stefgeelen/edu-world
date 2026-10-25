import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';

// The reading exercises of the 1ste leerjaar with a reading theme: only words
// and sentences the child can read. Each screen's own test pins the grade
// pools; this one checks the theme reaches the screen.

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => vi.fn() };
});
let themeMock: number | null | undefined = 1;
vi.mock('@/hooks/useReadingTheme', () => ({ useReadingTheme: () => themeMock }));
vi.mock('@/hooks/useDifficultyLevel', () => ({ useDifficultyLevel: () => ({ key: '1-1', stage: 1, grade: 1 }) }));
vi.mock('@/hooks/useExerciseConfig', () => ({ useExerciseConfig: (fallback: unknown) => fallback }));
vi.mock('@/hooks/useExerciseId', () => ({ useExerciseId: () => 'exercise-id' }));
vi.mock('@/hooks/useRecordIncompleteExercise', () => ({ useRecordIncompleteExercise: () => vi.fn() }));
vi.mock('@/hooks/useCompleteExercise', () => ({
  useCompleteExercise: () => ({ mutate: vi.fn() }),
  useCurrentChild: () => ({ data: undefined }),
}));
vi.mock('@/lib/confetti', () => ({ triggerConfetti: vi.fn() }));
vi.mock('@/context/GameContext', async () => {
  const { BUDDY_SPECIES } = await import('@/lib/buddy/species');
  return { useGame: () => ({ buddy: BUDDY_SPECIES.nootje }) };
});
vi.mock('@/hooks/useBuddyMessage', () => ({ useBuddyMessage: () => ({ getMessage: () => null, hasAvatar: false }) }));
const speakMock = vi.fn().mockResolvedValue(undefined);
vi.mock('@/hooks/useSpeech', () => ({
  useSpeech: () => ({ speak: speakMock, speakLines: vi.fn(() => Promise.resolve()) }),
}));

import { ExerciseLanguage } from '@/screens/ExerciseLanguage';
import { ExerciseSentenceDoctor } from '@/screens/ExerciseSentenceDoctor';
import { ExerciseSoundHouse } from '@/screens/ExerciseSoundHouse';
import { buildSentencesUpTo, knownGraphemes, wordsUpToTheme } from '@/data/readingThemes';

async function tick(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
    await Promise.resolve();
  });
}

describe('reading exercises follow the reading theme', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    themeMock = 1;
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('Luisterwoord waits for the theme', () => {
    themeMock = undefined;
    const { container } = render(<ExerciseLanguage />);
    expect(container).toBeEmptyDOMElement();
  });

  it('Luisterwoord shows only words of thema 1', async () => {
    render(<ExerciseLanguage />);
    await tick(500);
    const shown = Array.from(document.querySelectorAll('span.tracking-widest')).map((s) => s.textContent!);
    expect(shown).toHaveLength(4);
    for (const w of shown) expect(wordsUpToTheme(1)).toContain(w);
    expect(wordsUpToTheme(1)).toContain(speakMock.mock.calls[0][0]);
  });

  it('Klankhuis asks only sounds of the theme', async () => {
    themeMock = 2;
    render(<ExerciseSoundHouse />);
    const sound = document.querySelector('button[aria-label="Speel de klank"]')!.textContent!;
    expect(knownGraphemes(2).has(sound)).toBe(true);
    // Before thema 5: no middle.
    expect(['k', 'l', 'p', 's', 'm', 'r']).toContain(sound);
  });

  it('Zinnendokter in thema 5 only builds sentences of thema 5', async () => {
    themeMock = 5;
    render(<ExerciseSentenceDoctor />);
    await tick(600);
    const spoken = speakMock.mock.calls[0][0] as string;
    expect(buildSentencesUpTo(5).map((s) => s.join(' '))).toContain(spoken);
  });
});
