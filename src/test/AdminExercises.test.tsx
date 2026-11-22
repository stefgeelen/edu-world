import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createTestQueryClient, queryWrapper, fakeSupabaseChain } from './testUtils';

// AdminExercises has three views: Leerplan (per grade, what the child gets in
// each trimester; logic in curriculum.test.ts), Wat ziet een kind? (the
// admin_preview_practice RPC) and Alle oefentypes (one row per route family,
// named from exerciseCatalog). Each links a family to its detail screen.

const EXERCISES = [
  { id: 'ex-1', title: 'Optellen', route: '/exercises/math/1', subject: 'math', grade: 1, stage: 'stage-1', display_order: 1, is_active: true, config: { operators: ['+'], maxNumber: 10 } },
  { id: 'ex-2', title: 'Optellen', route: '/exercises/math/2', subject: 'math', grade: 1, stage: 'stage-2', display_order: 1, is_active: false },
  { id: 'ex-3', title: 'Lezen: korte woorden', route: '/exercises/language/1', subject: 'reading', grade: 1, stage: 'stage-1', display_order: 1, is_active: true },
];

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

const fromMock = vi.fn();
const rpcMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}));

const kindergarten = { live: false };
vi.mock('@/hooks/useKindergarten', () => ({
  useKindergartenMode: () => ({ mode: kindergarten.live ? 'all' : 'admins', live: kindergarten.live, isLoading: false }),
}));

import { AdminExercises } from '@/screens/admin/AdminExercises';

function renderScreen() {
  const queryClient = createTestQueryClient();
  const Wrapper = queryWrapper(queryClient);
  return render(<Wrapper><AdminExercises /></Wrapper>);
}

describe('AdminExercises — Alle oefentypes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    kindergarten.live = false;
  });

  function openList() {
    fireEvent.click(screen.getByRole('tab', { name: /Alle oefentypes/ }));
  }

  it('shows a loading spinner while exercises are being fetched', () => {
    fromMock.mockReturnValue(fakeSupabaseChain({ data: EXERCISES, error: null }));
    const { container } = renderScreen();
    expect(container.querySelector('.animate-spin')).toBeTruthy();
  });

  it('groups rows by family under the catalog name, with subject, grades and active count', async () => {
    fromMock.mockReturnValue(fakeSupabaseChain({ data: EXERCISES, error: null }));
    renderScreen();
    await waitFor(() => expect(screen.getByRole('tab', { name: /Alle oefentypes/ })).toBeInTheDocument());
    openList();

    // Two math rows (stage 1 + 2) collapse into one family, named "Sommen" whatever the row titles are.
    expect(screen.getAllByText('Sommen')).toHaveLength(1);
    expect(screen.queryByText('Optellen')).not.toBeInTheDocument();
    expect(screen.getByText('/exercises/math')).toBeInTheDocument();
    expect(screen.getByText('Rekenen')).toBeInTheDocument();
    expect(screen.getByText('1/2')).toBeInTheDocument();
    expect(screen.getByText('Woord kiezen')).toBeInTheDocument();
  });

  it('falls back to the row title for a family not in the catalog, and marks it in test', async () => {
    fromMock.mockReturnValue(fakeSupabaseChain({
      data: [...EXERCISES, { id: 'ex-4', title: 'Nieuw', route: '/exercises/new/1', subject: 'math', grade: 1, stage: 'stage-1', display_order: 2, is_active: true, admin_only: true }],
      error: null,
    }));
    renderScreen();
    await waitFor(() => expect(screen.getByRole('tab', { name: /Alle oefentypes/ })).toBeInTheDocument());
    openList();
    expect(screen.getByText('Nieuw')).toHaveTextContent('Test');
  });

  it('filters by name and shows the empty state', async () => {
    fromMock.mockReturnValue(fakeSupabaseChain({ data: EXERCISES, error: null }));
    renderScreen();
    await waitFor(() => expect(screen.getByRole('tab', { name: /Alle oefentypes/ })).toBeInTheDocument());
    openList();

    fireEvent.change(screen.getByPlaceholderText('Zoek op naam...'), { target: { value: 'woord' } });
    expect(screen.queryByText('Sommen')).not.toBeInTheDocument();
    expect(screen.getByText('Woord kiezen')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Zoek op naam...'), { target: { value: 'zzz-nomatch' } });
    expect(screen.getByText('Geen oefeningen gevonden.')).toBeInTheDocument();
  });

  it('navigates to the family detail screen when a row is clicked', async () => {
    fromMock.mockReturnValue(fakeSupabaseChain({ data: EXERCISES, error: null }));
    renderScreen();
    await waitFor(() => expect(screen.getByRole('tab', { name: /Alle oefentypes/ })).toBeInTheDocument());
    openList();
    fireEvent.click(screen.getByText('Sommen'));
    expect(navigateMock).toHaveBeenCalledWith(`/admin/exercises/${encodeURIComponent('/exercises/math')}`);
  });
});

describe('AdminExercises — Leerplan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    kindergarten.live = false;
  });

  it('opens on the leerplan: per grade, each type with what each trimester gives', async () => {
    fromMock.mockReturnValue(fakeSupabaseChain({
      data: [
        ...EXERCISES,
        { id: 'g2-1', title: 'Betalen tot €20', route: '/exercises/money/1', subject: 'math', grade: 2, stage: 'stage-1', display_order: 60, is_active: true, config: { maxPriceCents: 2000 } },
        { id: 'g2-3', title: 'Betalen tot €100', route: '/exercises/money/3', subject: 'math', grade: 2, stage: 'stage-3', display_order: 60, is_active: true, config: { maxPriceCents: 10000 } },
      ],
      error: null,
    }));
    renderScreen();

    await waitFor(() => expect(screen.getByRole('button', { name: '2de leerjaar' })).toHaveAttribute('aria-pressed', 'true'));
    expect(screen.getByRole('tab', { name: /Leerplan/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Geld')).toBeInTheDocument();
    expect(screen.getByText('Betalen tot €20')).toBeInTheDocument();
    expect(screen.getByText('tot €20')).toBeInTheDocument();
    expect(screen.getByText('zoals T1')).toBeInTheDocument();
    expect(screen.getByText('tot €100')).toBeInTheDocument();
    expect(screen.queryByText('Sommen')).not.toBeInTheDocument(); // 1ste leerjaar only

    fireEvent.click(screen.getByRole('button', { name: '1ste leerjaar' }));
    expect(screen.getByText('Sommen')).toBeInTheDocument();
    expect(screen.getByText('+, tot 10')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Sommen'));
    expect(navigateMock).toHaveBeenCalledWith(`/admin/exercises/${encodeURIComponent('/exercises/math')}`);
  });
});

describe('AdminExercises — Wat ziet een kind?', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    kindergarten.live = false;
  });

  it('asks the server for the chosen grade, trimester and day, and shows tiles, hidden types and Herhalen', async () => {
    fromMock.mockReturnValue(fakeSupabaseChain({
      data: [
        ...EXERCISES,
        { id: 'g2-1', title: 'Tafels', route: '/exercises/times-tables/1', subject: 'math', grade: 2, stage: 'stage-1', display_order: 45, is_active: true },
      ],
      error: null,
    }));
    rpcMock.mockResolvedValue({
      data: {
        day: '2026-09-15', grade: 2, open_stage: 1, reading_theme: null,
        times_tables: { multiply: [], divide: [] },
        practice: [{ type_key: '/exercises/money', title: 'Betalen tot €20', subject: 'math', route: '/exercises/money/1', stage_num: 1, admin_only: false, config: { maxPriceCents: 2000 } }],
        hidden: [{ type_key: '/exercises/times-tables', title: 'Tafels', subject: 'math', reason: 'times_tables', from_reading_theme: null, first_stage: 1 }],
        review: [{ type_key: '/exercises/clock', title: 'Klokkijken', subject: 'other', route: '/exercises/clock/1', grade: 1, admin_only: false, config: {} }],
      },
      error: null,
    });
    renderScreen();
    await waitFor(() => expect(screen.getByRole('tab', { name: /Wat ziet een kind/ })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('tab', { name: /Wat ziet een kind/ }));

    await waitFor(() => expect(screen.getByTestId('practice-preview')).toBeInTheDocument());
    expect(rpcMock).toHaveBeenCalledWith('admin_preview_practice', expect.objectContaining({ p_grade: 2, p_open_stage: 1 }));
    expect(screen.getByText('Betalen tot €20')).toBeInTheDocument();
    expect(screen.getByText(/nog geen tafel open op deze dag/)).toBeInTheDocument();
    expect(screen.getByText(/maaltafels geen/)).toBeInTheDocument();
    expect(screen.getByText(/Herhalen: 1 oefeningen/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Trimester 3' }));
    await waitFor(() => expect(rpcMock).toHaveBeenCalledWith('admin_preview_practice', expect.objectContaining({ p_grade: 2, p_open_stage: 3 })));
  });
});

describe('AdminExercises — 3de kleuterklas switch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    kindergarten.live = false;
    fromMock.mockReturnValue(fakeSupabaseChain({ data: EXERCISES, error: null }));
    rpcMock.mockResolvedValue({ data: null, error: null });
  });

  it('starts in Test and puts it live after confirming', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderScreen();

    expect(screen.getByRole('button', { name: /Test \(enkel admins\)/ })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: /Live \(iedereen\)/ }));

    expect(confirm).toHaveBeenCalled();
    await waitFor(() => expect(rpcMock).toHaveBeenCalledWith('admin_set_kindergarten_mode', { p_mode: 'all' }));
    confirm.mockRestore();
  });

  it('does nothing when the admin cancels', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: /Live \(iedereen\)/ }));
    expect(rpcMock).not.toHaveBeenCalled();
    confirm.mockRestore();
  });

  it('can go back to Test when it is live', async () => {
    kindergarten.live = true;
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderScreen();
    expect(screen.getByRole('button', { name: /Live \(iedereen\)/ })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: /Test \(enkel admins\)/ }));
    await waitFor(() => expect(rpcMock).toHaveBeenCalledWith('admin_set_kindergarten_mode', { p_mode: 'admins' }));
    confirm.mockRestore();
  });
});
