import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';

// Question generation is covered in geometryQuestions.test.ts; this file covers
// the choice screen, the three ways of answering and what a run pays.

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});
let configMock: unknown = null;
vi.mock('@/hooks/useExerciseConfig', () => ({ useExerciseConfig: (fallback: unknown) => configMock ?? fallback }));
vi.mock('@/hooks/useExerciseId', () => ({ useExerciseId: () => 'ex-geo' }));
vi.mock('@/hooks/useRecordIncompleteExercise', () => ({ useRecordIncompleteExercise: () => vi.fn() }));
const completeMock = vi.fn();
vi.mock('@/hooks/useCompleteExercise', () => ({
  useCompleteExercise: () => ({ mutate: completeMock }),
  useCurrentChild: () => ({ data: { id: 'child-1', grade: 2 } }),
}));
vi.mock('@/lib/confetti', () => ({ triggerConfetti: vi.fn() }));
vi.mock('@/hooks/useBuddyMessage', () => ({ useBuddyMessage: () => ({ getMessage: () => null, hasAvatar: false }) }));

const runSpy = vi.fn();
vi.mock('@/lib/geometryQuestions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/geometryQuestions')>();
  return { ...actual, generateGeometryRun: (...args: Parameters<typeof actual.generateGeometryRun>) => runSpy(...args) ?? actual.generateGeometryRun(...args) };
});

import { ExerciseGeometryTerms } from '@/screens/ExerciseGeometryTerms';
import { angleFigure, lineFigure, LINE_WORDS, type GeometryQuestion } from '@/lib/geometryQuestions';

const nameQ: GeometryQuestion = {
  format: 'name', topic: 'lines', prompt: 'Welke lijn is dit?', figure: lineFigure('broken'),
  options: Object.values(LINE_WORDS), answer: LINE_WORDS.broken,
};
const pickQ: GeometryQuestion = {
  format: 'pick', topic: 'lines', prompt: 'Tik de gebogen lijn aan.',
  figures: [lineFigure('straight'), lineFigure('curved'), lineFigure('broken')], answer: 1,
};
const tapQ: GeometryQuestion = { format: 'tap', topic: 'angles', prompt: 'Tik het hoekpunt aan.', figure: angleFigure(), answer: 'vertex' };
const RUN = [nameQ, pickQ, tapQ, nameQ, pickQ, tapQ];

function pick(title: string) {
  fireEvent.click(screen.getByText(title).closest('button')!);
}

function answerRight(q: GeometryQuestion) {
  if (q.format === 'name') fireEvent.click(screen.getByText(q.answer).closest('button')!);
  if (q.format === 'pick') fireEvent.click(screen.getByLabelText(`Tekening ${q.answer + 1}`));
  if (q.format === 'tap') fireEvent.click(screen.getAllByTestId(`angle-${q.answer}`)[0]);
}

describe('ExerciseGeometryTerms', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    configMock = null;
    runSpy.mockReturnValue(undefined);
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('opens with a choice of the four parts and "door elkaar"', () => {
    render(<ExerciseGeometryTerms />);
    expect(screen.getByText('Wat wil je oefenen?')).toBeInTheDocument();
    for (const title of ['Lijnen', 'Punt, rechte, lijnstuk', 'Hoeken', 'Evenwijdig of snijdend', 'Door elkaar']) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
  });

  it('only offers the parts the admin left on', () => {
    configMock = { topics: ['lines', 'angles'] };
    render(<ExerciseGeometryTerms />);
    expect(screen.getByText('Lijnen')).toBeInTheDocument();
    expect(screen.queryByText('Punt, rechte, lijnstuk')).not.toBeInTheDocument();
    pick('Door elkaar');
    expect(runSpy).toHaveBeenCalledWith('mix', { topics: ['lines', 'angles'] });
  });

  it('with one part on, starts right away', () => {
    configMock = { topics: ['angles'] };
    render(<ExerciseGeometryTerms />);
    expect(screen.queryByText('Wat wil je oefenen?')).not.toBeInTheDocument();
    expect(runSpy).toHaveBeenCalledWith('angles', { topics: ['angles'] });
  });

  it('a word, a drawing or a tap in the angle: six right answers pay through complete_exercise', () => {
    runSpy.mockReturnValue(RUN);
    render(<ExerciseGeometryTerms />);
    pick('Door elkaar');
    for (const q of RUN) {
      expect(screen.getByText(q.prompt)).toBeInTheDocument();
      answerRight(q);
      act(() => { vi.advanceTimersByTime(1200); });
    }
    expect(completeMock).toHaveBeenCalledWith(expect.objectContaining({ exerciseId: 'ex-geo', stars: 3, score: 6, maxScore: 6 }));
    expect(navigateMock).toHaveBeenCalled();
  });

  it('a wrong tap costs a heart and the question stays', () => {
    runSpy.mockReturnValue(RUN.slice(2));
    render(<ExerciseGeometryTerms />);
    pick('Hoeken');
    fireEvent.click(screen.getAllByTestId('angle-legs')[0]);
    expect(screen.getByText('Bijna! Probeer nog eens.')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(1500); });
    expect(screen.getByText('Tik het hoekpunt aan.')).toBeInTheDocument();
    expect(screen.queryByText('Bijna! Probeer nog eens.')).not.toBeInTheDocument();
  });

  it('three mistakes end the run without paying', () => {
    runSpy.mockReturnValue(RUN);
    render(<ExerciseGeometryTerms />);
    pick('Lijnen');
    for (let i = 0; i < 3; i++) {
      fireEvent.click(screen.getByText(LINE_WORDS.straight).closest('button')!);
      act(() => { vi.advanceTimersByTime(1500); });
    }
    expect(completeMock).not.toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalled();
  });
});
