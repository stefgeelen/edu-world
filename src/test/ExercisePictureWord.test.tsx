import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';

// ExercisePictureWord wires its drag-and-drop through React's own
// onPointerDown/onPointerMove/onPointerUp props (not dnd-kit), so it hits
// the same jsdom gap as ExerciseClock.test.tsx: no PointerEvent constructor,
// so fireEvent.pointerDown() silently produces undefined clientX/clientY.
// Dispatching a real MouseEvent typed "pointerdown"/etc. sidesteps that.
// jsdom also doesn't implement the Pointer Capture API at all (unlike real
// browsers), so HTMLButtonElement.prototype.setPointerCapture is stubbed in
// beforeEach, same as ExerciseNumberLine.test.tsx does for canvases.
function firePointer(el: Element, type: 'pointerdown' | 'pointermove' | 'pointerup', clientX = 0, clientY = 0) {
  act(() => {
    el.dispatchEvent(new MouseEvent(type, { clientX, clientY, bubbles: true, cancelable: true }));
  });
}

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});
vi.mock('@/hooks/useDifficultyLevel', () => ({ useDifficultyLevel: () => ({ key: '1-1', stage: 1, grade: 1 }) }));
vi.mock('@/hooks/useExerciseConfig', () => ({ useExerciseConfig: (fallback: unknown) => fallback }));
vi.mock('@/hooks/useExerciseId', () => ({ useExerciseId: () => 'picture-word-exercise-id' }));
const completeExerciseMutateMock = vi.fn();
vi.mock('@/hooks/useCompleteExercise', () => ({
  useCompleteExercise: () => ({ mutate: completeExerciseMutateMock }),
  useCurrentChild: () => ({ data: undefined }),
}));
const triggerConfettiMock = vi.fn();
vi.mock('@/lib/confetti', () => ({ triggerConfetti: (...args: unknown[]) => triggerConfettiMock(...args) }));
vi.mock('@/hooks/useBuddyMessage', () => ({ useBuddyMessage: () => ({ getMessage: () => null, hasAvatar: false }) }));
const speakMock = vi.fn();
vi.mock('@/hooks/useSpeech', () => ({ useSpeech: () => ({ speak: speakMock }) }));
// Fix the round so every question is the same: correct word "kat", with
// "hond" and "vis" as the wrong options — avoids depending on the real
// Unsplash-backed picture pool for deterministic drag targets.
vi.mock('@/data/picturePool', () => ({
  generatePictureRound: () => ({
    correct: { word: 'kat', imageUrl: 'kat.jpg', category: 'dieren' },
    options: [
      { word: 'kat', imageUrl: 'kat.jpg', category: 'dieren' },
      { word: 'hond', imageUrl: 'hond.jpg', category: 'dieren' },
      { word: 'vis', imageUrl: 'vis.jpg', category: 'dieren' },
    ],
  }),
}));

import { ExercisePictureWord } from '@/screens/ExercisePictureWord';

// The word text also appears in a second place once a drag starts: the
// floating drag-preview span (AnimatePresence-rendered, position: fixed).
// framer-motion's exit animation never actually completes under jsdom, so
// that preview node lingers in the DOM after the drop instead of unmounting
// — meaning a plain getByText(word) becomes ambiguous for any word that has
// ever been dragged. Scope to elements with a real <button> ancestor (the
// preview span has none) instead, same convention as ExerciseComparison's
// getSymbolButton / ExerciseNumberLine's getOpenBlankButtons.
function getWordButton(word: string): HTMLButtonElement {
  const btn = screen.getAllByText(word)
    .map((el) => el.closest('button'))
    .find((b): b is HTMLButtonElement => b !== null);
  if (!btn) throw new Error(`No word button found for "${word}"`);
  return btn;
}

// Drags the word card for `word` onto the picture drop zone. The drop zone's
// getBoundingClientRect() is jsdom's default {0,0,0,0}, so ending the drag at
// clientX/clientY = 0,0 always lands "inside" it, regardless of layout.
function dragWordToImage(word: string) {
  const wordButton = getWordButton(word);
  const img = screen.getByAltText('kat');
  firePointer(wordButton, 'pointerdown', 20, 20);
  firePointer(img, 'pointermove', 0, 0);
  firePointer(img, 'pointerup', 0, 0);
}

function filledHeartCount(): number {
  return document.querySelectorAll('svg.fill-red-500').length;
}

describe('ExercisePictureWord component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    (HTMLButtonElement.prototype as unknown as { setPointerCapture: (id: number) => void }).setPointerCapture = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('speaks the target word shortly after a question appears', () => {
    render(<ExercisePictureWord />);
    act(() => vi.advanceTimersByTime(400));
    expect(speakMock).toHaveBeenCalledWith('kat');
  });

  it('dragging the correct word onto the picture celebrates with confetti', () => {
    render(<ExercisePictureWord />);
    dragWordToImage('kat');

    expect(triggerConfettiMock).toHaveBeenCalled();
  });

  it('dragging the wrong word marks it red, costs a life, and does not confetti', () => {
    render(<ExercisePictureWord />);
    expect(filledHeartCount()).toBe(3);

    dragWordToImage('hond');

    expect(triggerConfettiMock).not.toHaveBeenCalled();
    const hondButton = getWordButton('hond');
    expect(hondButton.className).toMatch(/bg-red-400/);

    act(() => vi.advanceTimersByTime(1200));
    expect(filledHeartCount()).toBe(2);
  });

  it('completes the exercise after 5 correct rounds and persists score/stars', () => {
    render(<ExercisePictureWord />);

    for (let round = 0; round < 5; round++) {
      dragWordToImage('kat');
      act(() => vi.advanceTimersByTime(1400));
    }

    expect(completeExerciseMutateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        exerciseId: 'picture-word-exercise-id',
        score: 5,
        maxScore: 5,
        stars: 3,
      }),
    );
    act(() => vi.advanceTimersByTime(800));
    expect(navigateMock).toHaveBeenCalledWith('/app/stage/fluisterbos/1');
  });

  it('ends the exercise after losing all 3 lives, persisting a 0-star result', () => {
    render(<ExercisePictureWord />);

    for (let round = 0; round < 3; round++) {
      dragWordToImage('hond'); // always wrong
      act(() => vi.advanceTimersByTime(1200));
    }

    expect(completeExerciseMutateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        exerciseId: 'picture-word-exercise-id',
        score: 0,
        maxScore: 5,
        stars: 1,
      }),
    );
  });
});
