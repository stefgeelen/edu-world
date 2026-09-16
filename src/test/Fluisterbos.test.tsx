import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Fluisterbos defaults `allExercises` to [], so a failed query and a stage with
// no content seeded both used to render the normal screen reading "0 / 0
// voltooid" with an empty body — identical to each other and to having genuinely
// finished nothing. The missing child_exercise_stats function surfaced exactly
// this way. These pin the four states apart.

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock, useParams: () => ({ stage: '1' }) };
});

const refetchMock = vi.fn();
let exercisesState: Record<string, unknown>;
vi.mock('@/hooks/useStageExercises', () => ({
  useStageExercises: () => exercisesState,
  REQUIRED_COMPLETIONS: 5,
}));

vi.mock('@/hooks/useStageMastery', () => ({
  useStageMastery: () => ({
    stages: [{ stage: 1, total: 2, mastered: 0, isCompleted: false, isCurrent: true, isLocked: false }],
    isLoading: false,
    child: { grade: 1 },
  }),
}));

vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));

import { Fluisterbos } from '@/screens/Fluisterbos';

const EXERCISES = [
  { id: 'ex-1', order: 1, title: 'Tellen tot 10', subject: 'math', xpReward: 20, route: '/exercises/dots/1', completions: 0, bestStars: 0 },
  { id: 'ex-2', order: 2, title: 'Klokkijken', subject: 'math', xpReward: 20, route: '/exercises/clock/1', completions: 2, bestStars: 2 },
];

function baseState(over: Record<string, unknown> = {}) {
  return { data: EXERCISES, isLoading: false, isError: false, error: null, refetch: refetchMock, ...over };
}

function renderStage() {
  return render(
    <MemoryRouter>
      <Fluisterbos />
    </MemoryRouter>
  );
}

describe('Fluisterbos loading, error and empty states', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    exercisesState = baseState();
  });

  it('explains a failed query instead of showing an empty stage', () => {
    exercisesState = baseState({ isError: true, error: new Error('PGRST202'), data: undefined });
    renderStage();

    expect(screen.getByText(/konden niet geladen worden/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /opnieuw proberen/i })).toBeTruthy();
    expect(screen.queryByText(/voltooid/i)).toBeNull();
  });

  it('retries the query when asked', () => {
    exercisesState = baseState({ isError: true, error: new Error('PGRST202'), data: undefined });
    renderStage();

    fireEvent.click(screen.getByRole('button', { name: /opnieuw proberen/i }));
    expect(refetchMock).toHaveBeenCalledTimes(1);
  });

  it('distinguishes an unseeded stage from a broken one, and offers no retry', () => {
    exercisesState = baseState({ data: [] });
    renderStage();

    expect(screen.getByText(/nog geen oefeningen/i)).toBeTruthy();
    // Retrying a stage that simply has no content would just fail again.
    expect(screen.queryByRole('button', { name: /opnieuw proberen/i })).toBeNull();
    expect(screen.getByRole('button', { name: /terug naar de kaart/i })).toBeTruthy();
  });

  it('routes back to the map from the error state', () => {
    exercisesState = baseState({ isError: true, error: new Error('boom'), data: undefined });
    renderStage();

    fireEvent.click(screen.getByRole('button', { name: /terug naar de kaart/i }));
    expect(navigateMock).toHaveBeenCalledWith('/app/map');
  });

  it('renders the exercise list and opens one on click when the query succeeds', async () => {
    renderStage();

    expect(screen.getByText('Tellen tot 10')).toBeTruthy();
    expect(screen.queryByText(/konden niet geladen worden/i)).toBeNull();
    expect(screen.queryByText(/nog geen oefeningen/i)).toBeNull();

    fireEvent.click(screen.getByText('Tellen tot 10'));
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/app/exercises/dots/1'));
  });
});
