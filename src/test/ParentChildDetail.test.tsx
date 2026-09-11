import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createTestQueryClient, queryWrapper, fakeSupabaseChain } from './testUtils';

// ParentChildDetail is the richest parent-portal screen: 3 queries (child,
// per-subject progress, trimester progress), a mocked insights hook, and two
// mutations (trimester unlock + grade promotion/demotion) that each
// invalidate several query keys. These tests cover the loading/not-found
// states, the rendered progress data, the insights list, and both mutations.

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock, useParams: () => ({ childId: 'child-1' }) };
});

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'parent-1', email: 'parent@example.test' } }),
}));

const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();
vi.mock('sonner', () => ({
  toast: { success: (...a: unknown[]) => toastSuccessMock(...a), error: (...a: unknown[]) => toastErrorMock(...a) },
}));

const useChildInsightsMock = vi.fn();
vi.mock('@/hooks/useChildInsights', () => ({
  useChildInsights: (childId: string | undefined) => useChildInsightsMock(childId),
}));

// Pin MAX_SUPPORTED_GRADE to a fixed test value (2) rather than importing the
// real one, so these tests exercise the promotion-cap logic itself and don't
// silently change behavior whenever the real ceiling is raised for a launch.
vi.mock('@/data/difficultyConfig', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/difficultyConfig')>();
  return { ...actual, MAX_SUPPORTED_GRADE: 2 };
});

let childData: Record<string, unknown> | null = null;
let progressData: unknown[] = [];
let trimesterData: unknown[] = [];
let updateResult: { data: unknown; error: unknown } = { data: null, error: null };
const updateSpy = vi.fn();
let childrenCallCount = 0;

const fromMock = vi.fn((table: string) => {
  if (table === 'children') {
    childrenCallCount += 1;
    if (childrenCallCount === 1) {
      return fakeSupabaseChain(() => ({ data: childData, error: null }));
    }
    const chain = fakeSupabaseChain(() => updateResult);
    const originalUpdate = chain.update as (payload: unknown) => unknown;
    chain.update = (payload: unknown) => {
      updateSpy(payload);
      return originalUpdate(payload);
    };
    return chain;
  }
  if (table === 'child_progress') {
    return fakeSupabaseChain(() => ({ data: progressData, error: null }));
  }
  if (table === 'trimester_progress') {
    return fakeSupabaseChain(() => ({ data: trimesterData, error: null }));
  }
  return fakeSupabaseChain({ data: null, error: null });
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...args: unknown[]) => fromMock(...(args as [string])) },
}));

import { ParentChildDetail } from '@/screens/parent/ParentChildDetail';

const CHILD = {
  id: 'child-1', name: 'Test Child', grade: 2, xp: 300, streak: 5,
  max_unlocked_stage: 1, pending_promotion: false,
};

function renderScreen() {
  const queryClient = createTestQueryClient();
  const Wrapper = queryWrapper(queryClient);
  return { ...render(
    <MemoryRouter>
      <Wrapper><ParentChildDetail /></Wrapper>
    </MemoryRouter>
  ), queryClient };
}

describe('ParentChildDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    childData = { ...CHILD };
    progressData = [];
    trimesterData = [];
    updateResult = { data: null, error: null };
    childrenCallCount = 0;
    useChildInsightsMock.mockReturnValue({ data: [], isLoading: false });
  });

  it('shows a loading indicator before the child query resolves', () => {
    const { container } = renderScreen();
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    expect(screen.queryByText('Test Child')).not.toBeInTheDocument();
  });

  it('shows a not-found message when the child query resolves with no row', async () => {
    childData = null;
    renderScreen();
    await waitFor(() => expect(screen.getByText('Kind niet gevonden.')).toBeInTheDocument());
  });

  it('renders per-subject progress and summary totals once loaded', async () => {
    progressData = [
      { subject: 'math', exercises_completed: 10, total_xp: 80, average_score: 0.8, total_time_seconds: 605 },
    ];
    renderScreen();

    await waitFor(() => expect(screen.getByText('Test Child')).toBeInTheDocument());
    expect(screen.getByText('300')).toBeInTheDocument(); // total XP card
    expect(screen.getByText('10')).toBeInTheDocument(); // exercises card
    expect(screen.getByText('Rekenen')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
  });

  it('shows the empty-progress message when no subject progress exists yet', async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByText('Test Child')).toBeInTheDocument());
    expect(screen.getByText('Nog geen oefeningen ingevuld.')).toBeInTheDocument();
  });

  it('shows insights from useChildInsights, or the all-good state when none are returned', async () => {
    useChildInsightsMock.mockReturnValue({
      data: [{ exerciseId: 'ex-1', title: 'Optellen tot 10', subject: 'math', stage: 'stage-1', attemptCount: 3, avgScorePct: 0.3, bestStars: 1 }],
      isLoading: false,
    });
    renderScreen();

    await waitFor(() => expect(screen.getByText('Optellen tot 10')).toBeInTheDocument());
    expect(screen.getByText('30%')).toBeInTheDocument();
    expect(screen.queryByText('Alles gaat goed!')).not.toBeInTheDocument();
  });

  it('unlocks a trimester and invalidates the child + my-child queries on success', async () => {
    const { queryClient } = renderScreen();
    await waitFor(() => expect(screen.getByText('Test Child')).toBeInTheDocument());
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    // "Trimester 2" appears both as a progress-card label and as the access
    // toggle button — scope to the button by accessible role/name.
    fireEvent.click(screen.getByRole('button', { name: 'Trimester 2' }));

    await waitFor(() => expect(updateSpy).toHaveBeenCalledWith({ max_unlocked_stage: 2 }));
    expect(toastSuccessMock).toHaveBeenCalledWith('Test Child heeft nu toegang tot trimester 1 t/m 2.');
    expect(invalidateSpy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['parent-child', 'child-1'] }));
    expect(invalidateSpy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['my-child'] }));
  });

  it('promotes the child to the next grade and resets trimester access, after confirming the dialog', async () => {
    // grade 1 is below the mocked MAX_SUPPORTED_GRADE (2), so promotion is
    // actually reachable here; max_unlocked_stage starts at 3 (all trimesters
    // unlocked in the old grade) to verify it gets reset, not carried over.
    childData = { ...CHILD, grade: 1, max_unlocked_stage: 3 };
    const { queryClient } = renderScreen();
    await waitFor(() => expect(screen.getByText('Test Child')).toBeInTheDocument());
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    fireEvent.click(screen.getByText('Volgend leerjaar'));
    await waitFor(() => expect(screen.getByText('Leerjaar wijzigen?')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Bevestigen'));

    await waitFor(() =>
      expect(updateSpy).toHaveBeenCalledWith({ grade: 2, pending_promotion: false, max_unlocked_stage: 1 })
    );
    expect(toastSuccessMock).toHaveBeenCalledWith('Test Child is nu in 2de leerjaar!');
    expect(invalidateSpy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['parent-children'] }));
  });

  it('disables "Volgend leerjaar" once the child is at the highest supported grade, without triggering a mutation', async () => {
    // CHILD.grade is 2, equal to the mocked MAX_SUPPORTED_GRADE — there's no
    // real next grade to promote into yet.
    renderScreen();
    await waitFor(() => expect(screen.getByText('Test Child')).toBeInTheDocument());

    const button = screen.getByText('Volgend leerjaar').closest('button')!;
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(screen.queryByText('Leerjaar wijzigen?')).not.toBeInTheDocument();
    expect(updateSpy).not.toHaveBeenCalled();
    expect(screen.getByText('Volgend leerjaar is nog in ontwikkeling en daarom nog niet beschikbaar.')).toBeInTheDocument();
  });

  it('shows the pending-promotion banner when the child has completed all trimesters', async () => {
    childData = { ...CHILD, pending_promotion: true };
    renderScreen();
    await waitFor(() => expect(screen.getByText('Test Child')).toBeInTheDocument());
    expect(screen.getByText('Alle trimesters voltooid!')).toBeInTheDocument();
  });

  it('shows a "not ready yet" pending-promotion message when the child is already at the highest supported grade', async () => {
    // grade 2 === mocked MAX_SUPPORTED_GRADE, so there's genuinely nowhere to
    // promote to — the copy should say so instead of implying a real next grade.
    childData = { ...CHILD, grade: 2, pending_promotion: true };
    renderScreen();
    await waitFor(() => expect(screen.getByText('Test Child')).toBeInTheDocument());
    expect(screen.getByText(/heeft alle trimesters afgerond! Het volgende leerjaar is nog in ontwikkeling/)).toBeInTheDocument();
  });

  it('surfaces a mapped Supabase error via toast when the trimester unlock mutation fails', async () => {
    updateResult = { data: null, error: { message: 'boom' } };
    renderScreen();
    await waitFor(() => expect(screen.getByText('Test Child')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Trimester 2' }));

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith('boom'));
    expect(toastSuccessMock).not.toHaveBeenCalled();
  });
});
