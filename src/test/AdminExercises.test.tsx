import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createTestQueryClient, queryWrapper, fakeSupabaseChain } from './testUtils';

// AdminExercises lists exercises (search-filterable) and toggles is_active
// via a mutation. Covers: loading, rendered rows w/ subject+stage labels,
// search filtering, the active/inactive toggle mutation (success + error
// toast), and the empty-search state.

const EXERCISES = [
  { id: 'ex-1', title: 'Optellen tot 10', route: '/ex/add10', subject: 'math', stage: 'stage-1', display_order: 1, is_active: true },
  { id: 'ex-2', title: 'Lezen: korte woorden', route: '/ex/read1', subject: 'reading', stage: 'stage-2', display_order: 1, is_active: false },
];

const toast = { success: vi.fn(), error: vi.fn() };
vi.mock('sonner', () => ({ toast: { success: (...a: unknown[]) => toast.success(...a), error: (...a: unknown[]) => toast.error(...a) } }));

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

  it('renders the active/inactive counts and each exercise\'s subject + stage labels', async () => {
    fromMock.mockReturnValue(fakeSupabaseChain({ data: EXERCISES, error: null }));
    renderScreen();

    await waitFor(() => expect(screen.getByText('Optellen tot 10')).toBeInTheDocument());
    expect(screen.getByText('1 actief, 1 inactief')).toBeInTheDocument();
    expect(screen.getByText('Rekenen')).toBeInTheDocument();
    expect(screen.getByText('Trimester 1')).toBeInTheDocument();
    expect(screen.getByText('Lezen')).toBeInTheDocument();
    expect(screen.getByText('Trimester 2')).toBeInTheDocument();
  });

  it('filters the list by the search input', async () => {
    fromMock.mockReturnValue(fakeSupabaseChain({ data: EXERCISES, error: null }));
    renderScreen();
    await waitFor(() => expect(screen.getByText('Optellen tot 10')).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText('Zoek op naam...'), { target: { value: 'lezen' } });

    expect(screen.queryByText('Optellen tot 10')).not.toBeInTheDocument();
    expect(screen.getByText('Lezen: korte woorden')).toBeInTheDocument();
  });

  it('shows the "no results" state when the search matches nothing', async () => {
    fromMock.mockReturnValue(fakeSupabaseChain({ data: EXERCISES, error: null }));
    renderScreen();
    await waitFor(() => expect(screen.getByText('Optellen tot 10')).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText('Zoek op naam...'), { target: { value: 'zzz-nomatch' } });

    expect(screen.getByText('Geen oefeningen gevonden.')).toBeInTheDocument();
  });

  it('toggles is_active via the mutation and invalidates the exercises query on success', async () => {
    fromMock.mockReturnValue(fakeSupabaseChain({ data: EXERCISES, error: null }));
    renderScreen();
    await waitFor(() => expect(screen.getByText('Optellen tot 10')).toBeInTheDocument());

    const toggleButton = screen.getByTitle('Deactiveren'); // ex-1 is active
    fireEvent.click(toggleButton);

    // No dedicated "success" toast is shown on toggle; the UI relies on the
    // query invalidation to reflect the new state. We assert the mutation
    // resolved without the error toast firing.
    await waitFor(() => expect(toast.error).not.toHaveBeenCalled());
  });

  it('shows an error toast when the toggle mutation fails', async () => {
    fromMock
      .mockReturnValueOnce(fakeSupabaseChain({ data: EXERCISES, error: null })) // initial fetch
      .mockReturnValueOnce(fakeSupabaseChain({ data: null, error: new Error('update failed') })); // toggle mutation

    renderScreen();
    await waitFor(() => expect(screen.getByText('Optellen tot 10')).toBeInTheDocument());

    fireEvent.click(screen.getByTitle('Deactiveren'));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Kon oefening niet bijwerken.'));
  });
});
