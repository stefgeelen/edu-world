import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock, useParams: () => ({ id: '1' }) };
});
vi.mock('@/hooks/useExerciseId', () => ({ useExerciseId: () => 'kleuter-taal-id' }));
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
const speakLinesMock = vi.fn().mockResolvedValue(undefined);
vi.mock('@/hooks/useSpeech', () => ({ useSpeech: () => ({ speak: vi.fn().mockResolvedValue(undefined), speakLines: speakLinesMock }) }));

import { ExerciseRhyme } from '@/screens/ExerciseRhyme';
import { ExerciseFirstSound } from '@/screens/ExerciseFirstSound';
import { ExerciseBlend } from '@/screens/ExerciseBlend';
import { KLEUTER_WORDS, rhymeEnd, pictureWord, type PictureWord } from '@/data/kleuterTaal';
import { APP_PATHS, resetExerciseOrigin } from '@/routes/paths';

type Line = string | { clip: string; text: string };

async function tick(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
    await Promise.resolve();
    await Promise.resolve();
  });
}

/** The lines the Buddy just said (each question 500ms after it appears). */
async function said(): Promise<Line[]> {
  await tick(500);
  return speakLinesMock.mock.calls[speakLinesMock.mock.calls.length - 1][0] as Line[];
}

/** The three picture buttons, as words. */
const choices = (): PictureWord[] =>
  KLEUTER_WORDS.filter((p) => screen.queryByRole('button', { name: p.word }));

beforeEach(() => {
  vi.clearAllMocks();
  resetExerciseOrigin();
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('ExerciseRhyme', () => {
  it('asks by itself and pays out once after ten right answers', async () => {
    render(<ExerciseRhyme />);
    for (let i = 0; i < 10; i++) {
      const lines = await said();
      const word = (lines[0] as string).match(/^Wat rijmt op (\w+)\?$/)![1];
      const answer = choices().find((c) => rhymeEnd(c) === rhymeEnd(pictureWord(word)))!;
      fireEvent.click(screen.getByRole('button', { name: answer.word }));
      await tick(1500);
    }
    expect(completeExerciseMutateMock).toHaveBeenCalledTimes(1);
    expect(completeExerciseMutateMock).toHaveBeenCalledWith(expect.objectContaining({ score: 10, maxScore: 10, stars: 3 }));
    expect(navigateMock).toHaveBeenCalledWith(APP_PATHS.dashboard);
  });
});

describe('ExerciseFirstSound', () => {
  it('plays the sound and finds the picture that starts with it', async () => {
    render(<ExerciseFirstSound />);
    for (let i = 0; i < 10; i++) {
      const lines = await said();
      const sound = (lines[1] as { clip: string }).clip.match(/\/klanken\/(\w+)\.mp3/)![1];
      const answer = choices().find((c) => c.sounds[0] === sound)!;
      fireEvent.click(screen.getByRole('button', { name: answer.word }));
      await tick(1500);
    }
    expect(completeExerciseMutateMock).toHaveBeenCalledWith(expect.objectContaining({ score: 10, stars: 3 }));
  });

  it('three wrong pictures pay nothing; the question is said again after a mistake', async () => {
    render(<ExerciseFirstSound />);
    for (let i = 0; i < 3; i++) {
      const lines = await (i === 0 ? said() : Promise.resolve(speakLinesMock.mock.calls.at(-1)![0] as Line[]));
      const sound = (lines[1] as { clip: string }).clip.match(/\/klanken\/(\w+)\.mp3/)![1];
      const wrong = choices().find((c) => c.sounds[0] !== sound)!;
      fireEvent.click(screen.getByRole('button', { name: wrong.word }));
      await tick(1500);
    }
    expect(speakLinesMock).toHaveBeenCalledTimes(3);
    expect(completeExerciseMutateMock).not.toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith(APP_PATHS.dashboard);
  });
});

describe('ExerciseBlend', () => {
  it('says the word in recorded sounds; the child taps the picture', async () => {
    render(<ExerciseBlend />);
    for (let i = 0; i < 10; i++) {
      const lines = await said();
      const sounds = lines.filter((l): l is { clip: string; text: string } => typeof l !== 'string')
        .map((l) => l.clip.match(/\/klanken\/(\w+)\.mp3/)![1]);
      const answer = choices().find((c) => c.sounds.join(' ') === sounds.join(' '))!;
      fireEvent.click(screen.getByRole('button', { name: answer.word }));
      await tick(1500);
    }
    expect(completeExerciseMutateMock).toHaveBeenCalledWith(expect.objectContaining({ score: 10, stars: 3 }));
  });
});
