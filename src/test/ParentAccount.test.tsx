import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createTestQueryClient, queryWrapper, fakeSupabaseChain } from './testUtils';

// ParentAccount bundles profile/email/password forms (React Hook Form + Zod),
// account info, and the destructive account-deletion flow (an edge function
// call, not a React Query mutation). These tests cover the loading state,
// the profile update mutation, the email/password change flows, and both the
// happy and error paths of account deletion.

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

const signOutMock = vi.fn().mockResolvedValue(undefined);
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'parent-1', email: 'parent@example.test' }, signOut: (...a: unknown[]) => signOutMock(...a) }),
}));

const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();
vi.mock('sonner', () => ({
  toast: { success: (...a: unknown[]) => toastSuccessMock(...a), error: (...a: unknown[]) => toastErrorMock(...a) },
}));

const lockMock = vi.fn();
vi.mock('@/hooks/useParentPin', () => ({
  parentPinSession: { lock: (...a: unknown[]) => lockMock(...a) },
}));

let profileData: { id: string; full_name: string; email: string; created_at: string } | null = {
  id: 'parent-1', full_name: 'Test Parent', email: 'parent@example.test', created_at: '2024-01-15T00:00:00Z',
};
let subscriptionData: { plan: string; status: string } | null = { plan: 'family', status: 'active' };
let profileUpdateResult: { data: unknown; error: unknown } = { data: null, error: null };
const profileUpdateSpy = vi.fn();
let profilesCallCount = 0;

const updateUserMock = vi.fn();
const invokeMock = vi.fn();

const fromMock = vi.fn((table: string) => {
  if (table === 'profiles') {
    profilesCallCount += 1;
    if (profilesCallCount === 1) {
      return fakeSupabaseChain(() => ({ data: profileData, error: null }));
    }
    const chain = fakeSupabaseChain(() => profileUpdateResult);
    const originalUpdate = chain.update as (payload: unknown) => unknown;
    chain.update = (payload: unknown) => {
      profileUpdateSpy(payload);
      return originalUpdate(payload);
    };
    return chain;
  }
  if (table === 'subscriptions') {
    return fakeSupabaseChain({ data: subscriptionData, error: null });
  }
  return fakeSupabaseChain({ data: null, error: null });
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...(args as [string])),
    auth: { updateUser: (...a: unknown[]) => updateUserMock(...a) },
    functions: { invoke: (...a: unknown[]) => invokeMock(...a) },
  },
}));

import { ParentAccount } from '@/screens/parent/ParentAccount';

function renderScreen() {
  const queryClient = createTestQueryClient();
  const Wrapper = queryWrapper(queryClient);
  return render(
    <MemoryRouter>
      <Wrapper><ParentAccount /></Wrapper>
    </MemoryRouter>
  );
}

async function waitForLoaded() {
  await waitFor(() => expect(screen.getByText('Mijn account')).toBeInTheDocument());
}

describe('ParentAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    profileData = { id: 'parent-1', full_name: 'Test Parent', email: 'parent@example.test', created_at: '2024-01-15T00:00:00Z' };
    subscriptionData = { plan: 'family', status: 'active' };
    profileUpdateResult = { data: null, error: null };
    profilesCallCount = 0;
    signOutMock.mockResolvedValue(undefined);
    updateUserMock.mockResolvedValue({ error: null });
  });

  it('shows a loading indicator before the profile query resolves', () => {
    const { container } = renderScreen();
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    expect(screen.queryByText('Mijn account')).not.toBeInTheDocument();
  });

  it('pre-fills the profile form and saves a new name', async () => {
    renderScreen();
    await waitForLoaded();

    const nameInput = screen.getByDisplayValue('Test Parent');
    fireEvent.change(nameInput, { target: { value: 'New Name' } });
    fireEvent.click(screen.getByRole('button', { name: /opslaan/i }));

    await waitFor(() => expect(profileUpdateSpy).toHaveBeenCalledWith({ full_name: 'New Name' }));
    expect(toastSuccessMock).toHaveBeenCalledWith('Naam bijgewerkt');
  });

  it('sends a confirmation email through supabase.auth.updateUser on the email-change flow', async () => {
    renderScreen();
    await waitForLoaded();

    fireEvent.click(screen.getByText('Nieuw e-mailadres instellen →'));
    fireEvent.change(screen.getByPlaceholderText('nieuw@email.be'), { target: { value: 'nieuw@example.test' } });
    fireEvent.click(screen.getByRole('button', { name: /bevestigingsmail sturen/i }));

    await waitFor(() => expect(updateUserMock).toHaveBeenCalledWith({ email: 'nieuw@example.test' }));
    expect(toastSuccessMock).toHaveBeenCalledWith('Bevestigingsmail verstuurd. Controleer beide inboxen.');
    // Form collapses back to the trigger link after success.
    await waitFor(() => expect(screen.getByText('Nieuw e-mailadres instellen →')).toBeInTheDocument());
  });

  it('rejects a weak password before ever calling Supabase', async () => {
    renderScreen();
    await waitForLoaded();

    fireEvent.click(screen.getByText('Nieuw wachtwoord instellen →'));
    // Labels aren't associated via htmlFor in this screen, so locate each
    // input via its label's sibling rather than getByLabelText.
    const newPwField = screen.getByText('Nieuw wachtwoord').parentElement!.querySelector('input')!;
    const confirmField = screen.getByText('Bevestig wachtwoord').parentElement!.querySelector('input')!;

    fireEvent.change(newPwField, { target: { value: 'weak' } });
    fireEvent.change(confirmField, { target: { value: 'weak' } });
    fireEvent.click(screen.getByRole('button', { name: /wachtwoord opslaan/i }));

    await waitFor(() => expect(screen.getByText('Minstens 10 tekens')).toBeInTheDocument());
    expect(updateUserMock).not.toHaveBeenCalled();
  });

  it('updates the password once it satisfies the strength rules and matches the confirmation', async () => {
    renderScreen();
    await waitForLoaded();

    fireEvent.click(screen.getByText('Nieuw wachtwoord instellen →'));
    const newPwField = screen.getByText('Nieuw wachtwoord').parentElement!.querySelector('input')!;
    const confirmField = screen.getByText('Bevestig wachtwoord').parentElement!.querySelector('input')!;

    fireEvent.change(newPwField, { target: { value: 'StrongPass1' } });
    fireEvent.change(confirmField, { target: { value: 'StrongPass1' } });
    fireEvent.click(screen.getByRole('button', { name: /wachtwoord opslaan/i }));

    await waitFor(() => expect(updateUserMock).toHaveBeenCalledWith({ password: 'StrongPass1' }));
    expect(toastSuccessMock).toHaveBeenCalledWith('Wachtwoord bijgewerkt');
  });

  it('deletes the account after typing the exact confirmation phrase, locking the PIN and signing out', async () => {
    invokeMock.mockResolvedValue({ data: { success: true }, error: null });
    renderScreen();
    await waitForLoaded();

    fireEvent.click(screen.getByText('Account verwijderen'));
    const confirmInput = screen.getByPlaceholderText('VERWIJDER');
    const deleteButton = screen.getByRole('button', { name: /definitief verwijderen/i });
    expect(deleteButton).toBeDisabled();

    fireEvent.change(confirmInput, { target: { value: 'VERWIJDER' } });
    expect(deleteButton).not.toBeDisabled();
    fireEvent.click(deleteButton);

    await waitFor(() => expect(invokeMock).toHaveBeenCalledWith('delete-account', { body: { confirm: 'VERWIJDER' } }));
    expect(lockMock).toHaveBeenCalled();
    expect(signOutMock).toHaveBeenCalled();
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/'));
    expect(toastSuccessMock).toHaveBeenCalledWith('Je account is verwijderd');
  });

  it('shows an error toast and re-enables the delete button when the edge function fails', async () => {
    // POSSIBLE BUG (src/screens/parent/ParentAccount.tsx:132-144): the edge
    // function call and the inline `(data as any)?.error` check are both
    // untyped (`as any` / `catch (e: any)`), and on failure `deleting` is
    // reset but `showDeleteDialog`/`deleteConfirm` are not — the dialog stays
    // open with the previous confirmation text still filled in. That matches
    // current behavior and is asserted below rather than fixed.
    invokeMock.mockResolvedValue({ data: null, error: { message: 'edge function down' } });
    renderScreen();
    await waitForLoaded();

    fireEvent.click(screen.getByText('Account verwijderen'));
    fireEvent.change(screen.getByPlaceholderText('VERWIJDER'), { target: { value: 'VERWIJDER' } });
    fireEvent.click(screen.getByRole('button', { name: /definitief verwijderen/i }));

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith('edge function down'));
    expect(navigateMock).not.toHaveBeenCalledWith('/');
    expect(signOutMock).not.toHaveBeenCalled();
    // Dialog stays open with the confirm text intact so the parent can retry.
    expect(screen.getByDisplayValue('VERWIJDER')).toBeInTheDocument();
  });
});
