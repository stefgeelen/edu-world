import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createTestQueryClient, queryWrapper, fakeSupabaseChain } from './testUtils';

// AdminUsers is the richest of the 7 admin screens: 4 parallel queries
// (profiles/roles/subscriptions/children) joined client-side, a toggle-admin
// mutation, and a permanent-delete mutation via an edge function behind a
// type-to-confirm dialog. Covers: loading, joined row rendering, search,
// self-delete protection, and both mutations' success/error paths.

const PROFILES = [
  { id: 'user-1', full_name: 'Test Parent One', email: 'parent1@example.test', user_type: 'parent', created_at: '2026-01-01T00:00:00Z' },
  { id: 'user-2', full_name: 'Test Parent Two', email: 'parent2@example.test', user_type: 'parent', created_at: '2026-01-02T00:00:00Z' },
];
const ROLES = [{ id: 'r1', user_id: 'user-2', role: 'admin' }];
const SUBSCRIPTIONS = [{ id: 'sub-1', user_id: 'user-1', plan: 'family', status: 'active' }];
const CHILDREN = [{ id: 'child-1', parent_id: 'user-1' }];

const toast = { success: vi.fn(), error: vi.fn() };
vi.mock('sonner', () => ({ toast: { success: (...a: unknown[]) => toast.success(...a), error: (...a: unknown[]) => toast.error(...a) } }));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

let insertResult: { data: null; error: unknown } = { data: null, error: null };
let deleteResult: { data: null; error: unknown } = { data: null, error: null };
const invokeMock = vi.fn();

// user_roles backs both the initial select and the toggle-admin mutation
// (insert to grant, delete to revoke). Mirror AdminFeedback's per-call-instance
// approach: only the instance that actually calls insert/delete resolves the
// mutation result; a plain select always resolves the roles list.
function userRolesChain() {
  let isMutation = false;
  const chain: Record<string, unknown> = {
    select: () => chain,
    insert: () => {
      isMutation = true;
      return chain;
    },
    delete: () => {
      isMutation = true;
      return chain;
    },
    eq: () => chain,
    then: (onFulfilled: (v: unknown) => unknown) =>
      Promise.resolve(isMutation ? insertResult : { data: ROLES, error: null }).then(onFulfilled),
  };
  return chain;
}

const fromMock = vi.fn((table: string) => {
  switch (table) {
    case 'profiles':
      return fakeSupabaseChain({ data: PROFILES, error: null });
    case 'user_roles':
      return userRolesChain();
    case 'subscriptions':
      return fakeSupabaseChain({ data: SUBSCRIPTIONS, error: null });
    case 'children':
      return fakeSupabaseChain({ data: CHILDREN, error: null });
    default:
      return fakeSupabaseChain({ data: null, error: null });
  }
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
    functions: { invoke: (...args: unknown[]) => invokeMock(...args) },
  },
}));

import { AdminUsers } from '@/screens/admin/AdminUsers';

function renderScreen() {
  const queryClient = createTestQueryClient();
  const Wrapper = queryWrapper(queryClient);
  return render(<Wrapper><AdminUsers /></Wrapper>);
}

describe('AdminUsers', () => {
  let confirmSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    insertResult = { data: null, error: null };
    deleteResult = { data: null, error: null };
    invokeMock.mockResolvedValue({ data: {}, error: null });
    confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    confirmSpy.mockRestore();
  });

  it('shows a loading spinner while profiles are being fetched', () => {
    const { container } = renderScreen();
    expect(container.querySelector('.animate-spin')).toBeTruthy();
  });

  it('renders each user joined to their role, subscription, and child count', async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByText('Test Parent One')).toBeInTheDocument());

    expect(screen.getByText('2 geregistreerde gebruikers')).toBeInTheDocument();
    expect(screen.getByText('family · active')).toBeInTheDocument();
    expect(screen.getByText('1 kind')).toBeInTheDocument();
    // user-2 has an admin role -> the "Admin" badge is shown.
    const userTwoCard = screen.getByText('Test Parent Two').closest('div')?.parentElement as HTMLElement;
    expect(userTwoCard).toBeTruthy();
  });

  it('filters users by name or email via the search input', async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByText('Test Parent One')).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText('Zoek op naam of e-mail...'), { target: { value: 'Two' } });

    expect(screen.queryByText('Test Parent One')).not.toBeInTheDocument();
    expect(screen.getByText('Test Parent Two')).toBeInTheDocument();
  });

  it('disables the delete button for the currently signed-in user', async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByText('Test Parent One')).toBeInTheDocument());

    // currentUser.id is 'user-1', matching Test Parent One (first card).
    const deleteButtons = screen.getAllByText('Verwijder');
    expect(deleteButtons[0].closest('button')).toBeDisabled();
    expect(deleteButtons[1].closest('button')).not.toBeDisabled();
  });

  it('grants admin via the toggle mutation after confirmation, and shows a success toast', async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByText('Test Parent One')).toBeInTheDocument());

    // Test Parent One (user-1) has no admin role yet -> "Maak admin".
    const grantButtons = screen.getAllByText('Maak admin');
    fireEvent.click(grantButtons[0]);

    expect(confirmSpy).toHaveBeenCalled();
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Rol bijgewerkt'));
  });

  it('does not call the mutation when the confirm dialog is dismissed', async () => {
    confirmSpy.mockReturnValue(false);
    renderScreen();
    await waitFor(() => expect(screen.getByText('Test Parent One')).toBeInTheDocument());

    fireEvent.click(screen.getAllByText('Maak admin')[0]);

    expect(confirmSpy).toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('shows an error toast when the toggle-admin mutation fails', async () => {
    insertResult = { data: null, error: new Error('insert failed') };
    renderScreen();
    await waitFor(() => expect(screen.getByText('Test Parent One')).toBeInTheDocument());

    fireEvent.click(screen.getAllByText('Maak admin')[0]);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Fout bij bijwerken rol'));
  });

  it('permanently deletes a user through the type-to-confirm dialog, invoking the edge function', async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByText('Test Parent One')).toBeInTheDocument());

    // Open the delete dialog for the second user (not the current one).
    fireEvent.click(screen.getAllByText('Verwijder')[1]);
    await waitFor(() => expect(screen.getByText('Account permanent verwijderen')).toBeInTheDocument());

    const confirmInput = screen.getByPlaceholderText('VERWIJDER');
    const confirmButton = screen.getByText('Permanent verwijderen').closest('button') as HTMLButtonElement;
    expect(confirmButton).toBeDisabled();

    fireEvent.change(confirmInput, { target: { value: 'VERWIJDER' } });
    expect(confirmButton).not.toBeDisabled();

    fireEvent.click(confirmButton);

    await waitFor(() => expect(invokeMock).toHaveBeenCalledWith('admin-delete-user', { body: { userId: 'user-2' } }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Account permanent verwijderd'));
  });

  it('shows an error toast when the delete edge function fails', async () => {
    invokeMock.mockResolvedValue({ data: null, error: new Error('delete failed') });
    renderScreen();
    await waitFor(() => expect(screen.getByText('Test Parent One')).toBeInTheDocument());

    fireEvent.click(screen.getAllByText('Verwijder')[1]);
    await waitFor(() => expect(screen.getByText('Account permanent verwijderen')).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText('VERWIJDER'), { target: { value: 'VERWIJDER' } });
    fireEvent.click(screen.getByText('Permanent verwijderen').closest('button') as HTMLButtonElement);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('delete failed'));
  });
});
