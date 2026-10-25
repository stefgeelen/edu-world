import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});
let themeMock: number | null | undefined = 1;
vi.mock('@/hooks/useReadingTheme', () => ({ useReadingTheme: () => themeMock }));
vi.mock('@/hooks/useExerciseId', () => ({ useExerciseId: () => 'word-maker-exercise-id' }));
vi.mock('@/hooks/useRecordIncompleteExercise', () => ({ useRecordIncompleteExercise: () => vi.fn() }));
const completeExerciseMutateMock = vi.fn();
vi.mock('@/hooks/useCompleteExercise', () => ({
  useCompleteExercise: () => ({ mutate: completeExerciseMutateMock }),
  useCurrentChild: () => ({ data: undefined }),
}));
vi.mock('@/lib/confetti', () => ({ triggerConfetti: vi.fn() }));
vi.mock('@/context/GameContext', async () => {
  const { BUDDY_SPECIES } = await import('@/lib/buddy/species');
  return { useGame: () => ({ buddy: BUDDY_SPECIES.nootje }) };
});
vi.mock('@/hooks/useBuddyMessage', () => ({ useBuddyMessage: () => ({ getMessage: () => null, hasAvatar: false }) }));
const speakMock = vi.fn().mockResolvedValue(undefined);
vi.mock('@/hooks/useSpeech', () => ({ useSpeech: () => ({ speak: speakMock }) }));

import { ExerciseWordMaker } from '@/screens/ExerciseWordMaker';
import { splitOnset, wordsUpToTheme } from '@/data/readingThemes';
import { APP_PATHS, resetExerciseOrigin } from '@/routes/paths';

async function tick(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
    await Promise.resolve();
    await Promise.resolve();
  });
}

/** The word the screen just said (it says it 500ms after a question appears). */
async function spokenWord(): Promise<string> {
  await tick(500);
  return speakMock.mock.calls[speakMock.mock.calls.length - 1][0] as string;
}

function choiceButtons(): HTMLButtonElement[] {
  return screen.getAllByRole('button', { name: /^Letter / }) as HTMLButtonElement[];
}

describe('ExerciseWordMaker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetExerciseOrigin();
    themeMock = 1;
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('shows nothing until the reading theme is known', () => {
    themeMock = undefined;
    const { container } = render(<ExerciseWordMaker />);
    expect(container).toBeEmptyDOMElement();
  });

  it('asks only words of the theme, with the rest of the word shown and three beginnings', async () => {
    render(<ExerciseWordMaker />);
    const word = await spokenWord();
    expect(wordsUpToTheme(1)).toContain(word);

    const { rest, onset } = splitOnset(word)!;
    expect(screen.getByText(rest)).toBeInTheDocument();
    const choices = choiceButtons().map((b) => b.textContent);
    expect(choices).toHaveLength(3);
    expect(choices).toContain(onset);
    // Thema 1 only knows these consonants.
    for (const c of choices) expect(['k', 'n', 'l', 't', 'p', 's']).toContain(c);
  });

  it('pays out once after five right answers', async () => {
    render(<ExerciseWordMaker />);
    for (let i = 0; i < 5; i++) {
      const { onset } = splitOnset(await spokenWord())!;
      fireEvent.click(screen.getByRole('button', { name: `Letter ${onset}` }));
      await tick(1800);
    }
    expect(completeExerciseMutateMock).toHaveBeenCalledTimes(1);
    expect(completeExerciseMutateMock).toHaveBeenCalledWith(
      expect.objectContaining({ exerciseId: 'word-maker-exercise-id', score: 5, maxScore: 5, stars: 3 }),
    );
    expect(navigateMock).toHaveBeenCalledWith(APP_PATHS.dashboard);
  });

  it('a wrong beginning costs a heart; three wrong pays nothing', async () => {
    render(<ExerciseWordMaker />);
    for (let i = 0; i < 3; i++) {
      const { onset } = splitOnset(await spokenWord())!;
      const wrong = choiceButtons().find((b) => b.textContent !== onset)!;
      fireEvent.click(wrong);
      await tick(1500);
    }
    expect(completeExerciseMutateMock).not.toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith(APP_PATHS.dashboard);
  });
});
