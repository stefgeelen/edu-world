import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { createTestQueryClient, queryWrapper, fakeSupabaseChain } from './testUtils';

// ParentRewards is a React Query + Supabase CRUD screen (list / create / edit /
// delete rewards, plus a delete confirmation AlertDialog). It has no router
// dependency, so only AuthContext, Supabase, and sonner need mocking.
//
// POSSIBLE BUG (ParentRewards.tsx ~L83): the "add a child first" empty-state
// banner is gated by `!isLoading`, but `isLoading` here is the *rewards*
// query's loading flag, not the (separately-fetched, non-loading-tracked)
// `children` query's own state. If the rewards query settles before the
// children query, the banner can render prematurely; if children resolves to
// empty while rewards is still loading, the banner stays hidden longer than
// it should. Both queries happen to settle in the same microtask tick in this
// test's mocks, so the race isn't reliably reproducible here — flagging by
// inspection rather than forcing a flaky timing test.

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'parent-1', email: 'parent@example.test' } }),
}));

const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    success: (...a: unknown[]) => toastSuccessMock(...a),
    error: (...a: unknown[]) => toastErrorMock(...a),
  },
}));

const fromMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...a: unknown[]) => fromMock(...a) },
}));

import { ParentRewards } from '@/screens/parent/ParentRewards';

type Chain = Record<string, (...args: unknown[]) => unknown>;

function makeChain(result: { data: unknown; error: unknown }): Chain {
  return fakeSupabaseChain(result) as unknown as Chain;
}

const CHILD = { id: 'child-1', name: 'Timmy' };
const REWARD = {
  id: 'reward-1',
  title: 'Extra schermtijd',
  subject: 'math' as const,
  required_exercises: 5,
  current_progress: 3,
  is_completed: false,
  child: { name: 'Timmy' },
};

function setupSupabase(overrides: {
  children?: unknown[];
  rewards?: unknown[];
  insertError?: unknown;
  deleteError?: unknown;
} = {}) {
  const insertMock = vi.fn();
  const updateMock = vi.fn();
  const deleteMock = vi.fn();
  const deleteEqMock = vi.fn();

  fromMock.mockImplementation((table: string) => {
    if (table === 'children') {
      return makeChain({ data: overrides.children ?? [CHILD], error: null });
    }
    if (table === 'rewards') {
      const chain = makeChain({ data: overrides.rewards ?? [REWARD], error: null });
      chain.insert = (...args: unknown[]) => {
        insertMock(...args);
        return makeChain({ data: null, error: overrides.insertError ?? null });
      };
      chain.update = (...args: unknown[]) => {
        updateMock(...args);
        return makeChain({ data: null, error: null });
      };
      chain.delete = (...args: unknown[]) => {
        deleteMock(...args);
        const afterDelete = makeChain({ data: null, error: overrides.deleteError ?? null });
        afterDelete.eq = (...eqArgs: unknown[]) => {
          deleteEqMock(...eqArgs);
          return afterDelete;
        };
        return afterDelete;
      };
      return chain;
    }
    throw new Error(`Unexpected table: ${table}`);
  });

  return { insertMock, updateMock, deleteMock, deleteEqMock };
}

function renderRewards() {
  const queryClient = createTestQueryClient();
  const Wrapper = queryWrapper(queryClient);
  return render(<Wrapper><ParentRewards /></Wrapper>);
}

describe('ParentRewards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a loading spinner before the rewards list resolves', () => {
    setupSupabase();
    const { container } = renderRewards();
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('prompts to add a child first when there are no children yet, and disables "Nieuwe beloning"', async () => {
    setupSupabase({ children: [], rewards: [] });
    renderRewards();
    await waitFor(() => expect(screen.getByText(/Voeg eerst een kind toe/)).toBeInTheDocument());
    const addButton = screen.getByText('Nieuwe beloning').closest('button');
    expect(addButton).toBeDisabled();
  });

  it('renders a reward card with the child name, subject label, and progress percentage', async () => {
    setupSupabase();
    renderRewards();
    await waitFor(() => expect(screen.getByText('Extra schermtijd')).toBeInTheDocument());
    expect(screen.getByText(/Timmy · Rekenen · 5 oefeningen/)).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
  });

  it('blocks saving a new reward when the title exceeds 80 characters', async () => {
    const { insertMock } = setupSupabase();
    renderRewards();
    await waitFor(() => expect(screen.getByText('Extra schermtijd')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Nieuwe beloning'));
    const titleInput = screen.getByPlaceholderText('Bijv. Een extra half uurtje schermtijd');
    fireEvent.change(titleInput, { target: { value: 'a'.repeat(81) } });
    fireEvent.click(screen.getByText('Beloning opslaan'));

    expect(await screen.findByText('Maximaal 80 tekens.')).toBeInTheDocument();
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('creates a new reward, calls insert with the expected payload, and shows a success toast', async () => {
    const { insertMock } = setupSupabase();
    renderRewards();
    await waitFor(() => expect(screen.getByText('Extra schermtijd')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Nieuwe beloning'));
    fireEvent.change(screen.getByPlaceholderText('Bijv. Een extra half uurtje schermtijd'), {
      target: { value: 'Zwemles cadeau' },
    });
    fireEvent.click(screen.getByText('Beloning opslaan'));

    await waitFor(() => expect(insertMock).toHaveBeenCalledWith({
      parent_id: 'parent-1',
      child_id: 'child-1',
      title: 'Zwemles cadeau',
      subject: 'math',
      required_exercises: 5,
    }));
    expect(toastSuccessMock).toHaveBeenCalledWith('Beloning aangemaakt!');
  });

  it('shows a mapped Dutch error toast when the insert fails', async () => {
    setupSupabase({ insertError: { code: '23505', message: 'duplicate key' } });
    renderRewards();
    await waitFor(() => expect(screen.getByText('Extra schermtijd')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Nieuwe beloning'));
    fireEvent.change(screen.getByPlaceholderText('Bijv. Een extra half uurtje schermtijd'), {
      target: { value: 'Zwemles cadeau' },
    });
    fireEvent.click(screen.getByText('Beloning opslaan'));

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith('Dit bestaat al. Kies iets anders.'));
  });

  it('deletes a reward after confirming the AlertDialog, and shows a success toast', async () => {
    const { deleteEqMock } = setupSupabase();
    renderRewards();
    await waitFor(() => expect(screen.getByText('Extra schermtijd')).toBeInTheDocument());

    // Only the card's trash icon is named "Verwijderen" until the dialog opens.
    fireEvent.click(screen.getByRole('button', { name: 'Verwijderen' }));

    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByText('Verwijderen'));

    await waitFor(() => expect(deleteEqMock).toHaveBeenCalledWith('id', 'reward-1'));
    expect(toastSuccessMock).toHaveBeenCalledWith('Beloning verwijderd.');
  });
});
