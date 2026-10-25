import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';

const navigateMock = vi.fn();
let stageParam = '1';
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock, useParams: () => ({ id: stageParam }) };
});
vi.mock('@/hooks/useExerciseId', () => ({ useExerciseId: () => 'kleuter-exercise-id' }));
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
vi.mock('@/hooks/useSpeech', () => ({ stopSpeaking: vi.fn(), useSpeech: () => ({ speak: speakMock }) }));

import { ExerciseHowMany } from '@/screens/ExerciseHowMany';
import { ExerciseMoreLess } from '@/screens/ExerciseMoreLess';
import { ExerciseNumberMatch } from '@/screens/ExerciseNumberMatch';
import { APP_PATHS, resetExerciseOrigin } from '@/routes/paths';

async function tick(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
    await Promise.resolve();
    await Promise.resolve();
  });
}

/** What the Buddy just said (it says each question 500ms after it appears). */
async function spoken(): Promise<string> {
  await tick(500);
  return speakMock.mock.calls[speakMock.mock.calls.length - 1][0] as string;
}

const countIn = (el: Element) => Number(el.querySelector('[data-count]')!.getAttribute('data-count'));

beforeEach(() => {
  vi.clearAllMocks();
  resetExerciseOrigin();
  stageParam = '1';
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('ExerciseHowMany', () => {
  const shown = () => Number(document.querySelector('[data-count]')!.getAttribute('data-count'));

  it('says every question by itself and pays out once after ten right answers', async () => {
    render(<ExerciseHowMany />);
    for (let i = 0; i < 10; i++) {
      expect(await spoken()).toMatch(/^Hoeveel /);
      expect(shown()).toBeLessThanOrEqual(5);
      fireEvent.click(screen.getByRole('button', { name: String(shown()) }));
      await tick(1500);
    }
    expect(speakMock).toHaveBeenCalledTimes(10);
    expect(completeExerciseMutateMock).toHaveBeenCalledTimes(1);
    expect(completeExerciseMutateMock).toHaveBeenCalledWith(
      expect.objectContaining({ exerciseId: 'kleuter-exercise-id', score: 10, maxScore: 10, stars: 3 }),
    );
    expect(navigateMock).toHaveBeenCalledWith(APP_PATHS.dashboard);
  });

  it('repeats the question after a mistake; three mistakes pay nothing', async () => {
    render(<ExerciseHowMany />);
    await spoken();
    for (let i = 0; i < 3; i++) {
      const right = String(shown());
      const wrong = screen.getAllByRole('button').find((b) => /^\d+$/.test(b.getAttribute('aria-label') ?? '') && b.getAttribute('aria-label') !== right)!;
      fireEvent.click(wrong);
      await tick(1500);
    }
    expect(speakMock).toHaveBeenCalledTimes(3); // the question, then again after the first two mistakes
    expect(completeExerciseMutateMock).not.toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith(APP_PATHS.dashboard);
  });
});

describe('ExerciseMoreLess', () => {
  it('finds the side with more, fewer, or evenveel', async () => {
    stageParam = '3';
    render(<ExerciseMoreLess />);
    for (let i = 0; i < 10; i++) {
      const asked = await spoken();
      const left = countIn(screen.getByRole('button', { name: 'Links' }));
      const right = countIn(screen.getByRole('button', { name: 'Rechts' }));
      const more = asked === 'Waar zijn er meer?';
      expect(more || asked === 'Waar zijn er minder?').toBe(true);
      const name = left === right ? 'Evenveel' : (left > right) === more ? 'Links' : 'Rechts';
      fireEvent.click(screen.getByRole('button', { name }));
      await tick(1500);
    }
    expect(completeExerciseMutateMock).toHaveBeenCalledWith(expect.objectContaining({ score: 10, stars: 3 }));
  });
});

describe('ExerciseNumberMatch', () => {
  it('shows and says a number; the child taps the group with that many', async () => {
    stageParam = '2';
    render(<ExerciseNumberMatch />);
    for (let i = 0; i < 10; i++) {
      const asked = await spoken();
      const n = Number(asked.match(/^Waar zijn er (\d+)\?$/)![1]);
      expect(n).toBeLessThanOrEqual(7);
      const groups = screen.getAllByRole('button', { name: /^Groepje / });
      expect(groups).toHaveLength(3);
      fireEvent.click(groups.find((g) => countIn(g) === n)!);
      await tick(1500);
    }
    expect(completeExerciseMutateMock).toHaveBeenCalledWith(expect.objectContaining({ score: 10, maxScore: 10, stars: 3 }));
  });

  it('a wrong group costs a heart', async () => {
    render(<ExerciseNumberMatch />);
    const n = Number((await spoken()).match(/(\d+)/)![1]);
    const groups = screen.getAllByRole('button', { name: /^Groepje / });
    fireEvent.click(groups.find((g) => countIn(g) !== n)!);
    await tick(1500);
    expect(screen.getAllByRole('button', { name: /^Groepje / })).toHaveLength(3);
    expect(completeExerciseMutateMock).not.toHaveBeenCalled();
  });
});
