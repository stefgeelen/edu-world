import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';

// ExerciseLanguage picks its round from a fixed WORD_POOL via
// `[...WORD_POOL].sort(() => 0.5 - Math.random())` — a well-known
// non-deterministic (and not-actually-uniform) "shuffle" whose exact output
// for a pinned Math.random() value depends on V8's current sort algorithm,
// not just the math. Rather than reverse-engineer that, the tests read the
// *actual* correct word back out of the mocked `speak` call (ExerciseLanguage
// always auto-plays the correct word 500ms after a question appears), then
// interact with whichever button carries that text. This is robust to
// however the shuffle happens to land.

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});
vi.mock('@/hooks/useDifficultyLevel', () => ({ useDifficultyLevel: () => ({ key: '1-1', stage: 1, grade: 1 }) }));
vi.mock('@/hooks/useExerciseId', () => ({ useExerciseId: () => 'language-exercise-id' }));
const completeExerciseMutateMock = vi.fn();
vi.mock('@/hooks/useCompleteExercise', () => ({
  useCompleteExercise: () => ({ mutate: completeExerciseMutateMock }),
  useCurrentChild: () => ({ data: undefined }),
}));
const triggerConfettiMock = vi.fn();
vi.mock('@/lib/confetti', () => ({ triggerConfetti: (...args: unknown[]) => triggerConfettiMock(...args) }));
vi.mock('@/hooks/useBuddyMessage', () => ({ useBuddyMessage: () => ({ getMessage: () => null, hasAvatar: false }) }));
// speak() is chained with .finally() in ExerciseLanguage's playAudio, so the
// mock must return a real (resolved) promise, not undefined.
const speakMock = vi.fn().mockResolvedValue(undefined);
vi.mock('@/hooks/useSpeech', () => ({ useSpeech: () => ({ speak: speakMock }) }));

import { ExerciseLanguage } from '@/screens/ExerciseLanguage';

function getWordButtons(): HTMLButtonElement[] {
  return Array.from(document.querySelectorAll('span.tracking-widest'))
    .map((span) => span.closest('button'))
    .filter((b): b is HTMLButtonElement => b !== null);
}

function filledHeartCount(): number {
  return document.querySelectorAll('svg.fill-red-500').length;
}

// Advances fake timers by `ms` and also drains the real microtask queue a
// couple of turns. Needed because playAudio() does
// `speak(correctWord).finally(() => setIsPlaying(false))` — speak() resolves
// via a *real* Promise (unaffected by fake timers), and if that `.finally`
// never gets a chance to run, `isPlaying` stays stuck `true` forever, which
// silently blocks every subsequent playAudio() call (its guard is
// `if (isPlaying || !correctWord) return;`). A plain synchronous
// `act(() => vi.advanceTimersByTime(...))` never yields to the microtask
// queue, so multi-round loops need this instead.
async function tick(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
    await Promise.resolve();
    await Promise.resolve();
  });
}

/** Advances the 500ms auto-play timer and returns the word `speak` was just called with. */
async function currentCorrectWord(): Promise<string> {
  await tick(500);
  const lastCall = speakMock.mock.calls[speakMock.mock.calls.length - 1];
  return lastCall[0] as string;
}

describe('ExerciseLanguage component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('clicking the correct word celebrates with confetti and the "Super goed!" buddy line', async () => {
    render(<ExerciseLanguage />);
    const correctWord = await currentCorrectWord();
    const correctButton = getWordButtons().find((b) => b.textContent === correctWord)!;

    fireEvent.click(correctButton);

    expect(triggerConfettiMock).toHaveBeenCalled();
    expect(screen.getByText('Super goed!')).toBeInTheDocument();
  });

  it('clicking a wrong word shows the correction, costs a life, and does not confetti', async () => {
    render(<ExerciseLanguage />);
    expect(filledHeartCount()).toBe(3);
    const correctWord = await currentCorrectWord();
    const wrongButton = getWordButtons().find((b) => b.textContent !== correctWord)!;

    fireEvent.click(wrongButton);

    expect(triggerConfettiMock).not.toHaveBeenCalled();
    expect(screen.getByText('Probeer nog eens!')).toBeInTheDocument();

    await tick(1500);
    expect(filledHeartCount()).toBe(2);
  });

  it('completes the exercise after 5 correct rounds and persists score/stars', async () => {
    render(<ExerciseLanguage />);

    for (let round = 0; round < 5; round++) {
      const correctWord = await currentCorrectWord();
      const correctButton = getWordButtons().find((b) => b.textContent === correctWord)!;
      fireEvent.click(correctButton);
      await tick(2000);
    }

    expect(completeExerciseMutateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        exerciseId: 'language-exercise-id',
        score: 5,
        maxScore: 5,
        stars: 3,
      }),
    );
    expect(navigateMock).toHaveBeenCalledWith('/app/stage/fluisterbos/1');
  });

  it('persists a 0-star partial result when all 3 lives are lost, then navigates away', async () => {
    // The game-over branch now records the attempt (score 0, stars 0) before
    // navigating, matching the correct-finish branch and every sibling screen.
    render(<ExerciseLanguage />);

    for (let round = 0; round < 3; round++) {
      const correctWord = await currentCorrectWord();
      const wrongButton = getWordButtons().find((b) => b.textContent !== correctWord)!;
      fireEvent.click(wrongButton);
      await tick(1500);
    }

    expect(completeExerciseMutateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        exerciseId: 'language-exercise-id',
        score: 0,
        maxScore: 5,
        stars: 0,
      }),
    );
    expect(navigateMock).toHaveBeenCalledWith('/app/stage/fluisterbos/1');
  });
});
