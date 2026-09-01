import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createTestQueryClient, queryWrapper, fakeSupabaseChain } from './testUtils';

// AdminExercises groups exercise rows by family (route with the trailing
// stage number stripped) and links each family to its detail screen.
// Covers: loading, grouped rendering (title/subject/grades/active count),
// search filtering, empty-search state, and navigation on row click.

const EXERCISES = [
  { id: 'ex-1', title: 'Optellen', route: '/exercises/math/1', subject: 'math', grade: 1, stage: 'stage-1', display_order: 1, is_active: true },
  { id: 'ex-2', title: 'Optellen', route: '/exercises/math/2', subject: 'math', grade: 1, stage: 'stage-2', display_order: 1, is_active: false },
  { id: 'ex-3', title: 'Lezen: korte woorden', route: '/exercises/language/1', subject: 'reading', grade: 1, stage: 'stage-1', display_order: 1, is_active: true },
];

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

const fromMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...args: unknown[]) => fromMock(...args) },
}));

import { AdminExercises } from '@/screens/admin/AdminExercises';

function renderScreen() {
  const queryClient = createTestQueryClient();
  const Wrapper = queryWrapper(queryClient);
  return render(<Wrapper><AdminExercises /></Wrapper>);
}

describe('AdminExercises', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a loading spinner while exercises are being fetched', () => {
    fromMock.mockReturnValue(fakeSupabaseChain({ data: EXERCISES, error: null }));
    const { container } = renderScreen();
    expect(container.querySelector('.animate-spin')).toBeTruthy();
  });

  it('groups rows by family (route with the trailing stage number stripped) and shows subject + grades + active count', async () => {
    fromMock.mockReturnValue(fakeSupabaseChain({ data: EXERCISES, error: null }));
    renderScreen();

    await waitFor(() => expect(screen.getByText('Optellen')).toBeInTheDocument());
    // Two math rows (stage 1 + 2) collapse into one family row
    expect(screen.getAllByText('Optellen')).toHaveLength(1);
    expect(screen.getByText('/exercises/math')).toBeInTheDocument();
    expect(screen.getByText('Rekenen')).toBeInTheDocument();
    expect(screen.getAllByText('Graad 1').length).toBeGreaterThan(0);
    expect(screen.getByText('1/2')).toBeInTheDocument(); // 1 active of 2 math rows

    expect(screen.getByText('Lezen: korte woorden')).toBeInTheDocument();
  });

  it('filters the list by the search input', async () => {
    fromMock.mockReturnValue(fakeSupabaseChain({ data: EXERCISES, error: null }));
    renderScreen();
    await waitFor(() => expect(screen.getByText('Optellen')).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText('Zoek op naam...'), { target: { value: 'lezen' } });

    expect(screen.queryByText('Optellen')).not.toBeInTheDocument();
    expect(screen.getByText('Lezen: korte woorden')).toBeInTheDocument();
  });

  it('shows the "no results" state when the search matches nothing', async () => {
    fromMock.mockReturnValue(fakeSupabaseChain({ data: EXERCISES, error: null }));
    renderScreen();
    await waitFor(() => expect(screen.getByText('Optellen')).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText('Zoek op naam...'), { target: { value: 'zzz-nomatch' } });

    expect(screen.getByText('Geen oefeningen gevonden.')).toBeInTheDocument();
  });

  it('navigates to the family detail screen when a row is clicked', async () => {
    fromMock.mockReturnValue(fakeSupabaseChain({ data: EXERCISES, error: null }));
    renderScreen();
    await waitFor(() => expect(screen.getByText('Optellen')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Optellen'));

    expect(navigateMock).toHaveBeenCalledWith(`/admin/exercises/${encodeURIComponent('/exercises/math')}`);
  });
});
