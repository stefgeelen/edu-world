import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createTestQueryClient, queryWrapper, fakeSupabaseChain } from './testUtils';

// ParentAddChild is the onboarding/add-child form used both during initial
// setup and from the parent portal. It reads the subscription's max-children
// limit (via React Query) and does its own manual submit handler (not a React
// Query mutation) that inserts into `children`. These tests cover form
// validation, the study-year hint, a successful insert, the locked
// max-children view, and both Supabase error paths (subscription-limit vs
// generic) that branch to different UI (dialog vs toast).

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'parent-1', email: 'parent@example.test' } }),
}));

const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();
vi.mock('sonner', () => ({
  toast: { success: (...a: unknown[]) => toastSuccessMock(...a), error: (...a: unknown[]) => toastErrorMock(...a) },
}));

let subscriptionData: { max_children: number } | null = { max_children: 3 };
let childrenCount = 0;
let insertResult: { data: unknown; error: unknown } = { data: null, error: null };
const insertSpy = vi.fn();
let profilesCallCounter = 0;

const fromMock = vi.fn((table: string) => {
  if (table === 'subscriptions') {
    return fakeSupabaseChain({ data: subscriptionData, error: null });
  }
  if (table === 'children') {
    profilesCallCounter += 1;
    if (profilesCallCounter === 1) {
      // First call on mount is the count query: select('id', { count: 'exact', head: true }).eq(...)
      return fakeSupabaseChain({ data: null, error: null, count: childrenCount });
    }
    // Later calls are the manual insert() in handleSubmit.
    const chain = fakeSupabaseChain(() => insertResult);
    const originalInsert = chain.insert as (payload: unknown) => unknown;
    chain.insert = (payload: unknown) => {
      insertSpy(payload);
      return originalInsert(payload);
    };
    return chain;
  }
  return fakeSupabaseChain({ data: null, error: null });
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...args: unknown[]) => fromMock(...(args as [string])) },
}));

import { ParentAddChild } from '@/screens/parent/ParentAddChild';

function renderScreen() {
  const queryClient = createTestQueryClient();
  const Wrapper = queryWrapper(queryClient);
  return render(
    <MemoryRouter>
      <Wrapper><ParentAddChild /></Wrapper>
    </MemoryRouter>
  );
}

async function waitForFormReady() {
  await waitFor(() => expect(screen.getByText('Kind toevoegen', { selector: 'h2' })).toBeInTheDocument());
}

describe('ParentAddChild', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    subscriptionData = { max_children: 3 };
    childrenCount = 0;
    insertResult = { data: null, error: null };
    profilesCallCounter = 0;
  });

  it('keeps the submit button disabled until a name and a valid age are entered', async () => {
    renderScreen();
    await waitForFormReady();

    const submitButton = screen.getByRole('button', { name: 'Kind toevoegen' });
    expect(submitButton).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('Bijv. Emma of Liam'), { target: { value: 'Test Child' } });
    expect(submitButton).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '8' } });
    expect(submitButton).not.toBeDisabled();
  });

  it('shows the computed study year hint as the age changes', async () => {
    renderScreen();
    await waitForFormReady();

    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '8' } });
    expect(screen.getByText('→ 3de leerjaar')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '11' } });
    expect(screen.getByText('→ 6de leerjaar')).toBeInTheDocument();
  });

  it('inserts the new child, shows a success toast, and navigates back on submit', async () => {
    renderScreen();
    await waitForFormReady();

    fireEvent.change(screen.getByPlaceholderText('Bijv. Emma of Liam'), { target: { value: 'Test Child' } });
    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '8' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kind toevoegen' }));

    await waitFor(() => expect(insertSpy).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Test Child',
      age: 8,
      grade: 3,
      parent_id: 'parent-1',
    })));
    expect(toastSuccessMock).toHaveBeenCalledWith('Test Child is toegevoegd!');
    expect(navigateMock).toHaveBeenCalledWith('/app/parent');
  });

  it('shows the locked max-children view and routes to the subscription screen from it', async () => {
    subscriptionData = { max_children: 1 };
    childrenCount = 1;
    renderScreen();

    await waitFor(() => expect(screen.getByText('Maximaal aantal kinderen bereikt')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Upgrade je abonnement'));
    expect(navigateMock).toHaveBeenCalledWith('/app/parent/subscription');
  });

  it('opens the subscription-limit dialog instead of a toast when the insert hits the DB limit trigger', async () => {
    insertResult = { data: null, error: { message: 'Subscription limit reached (max 1)' } };
    renderScreen();
    await waitForFormReady();

    fireEvent.change(screen.getByPlaceholderText('Bijv. Emma of Liam'), { target: { value: 'Test Child' } });
    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '8' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kind toevoegen' }));

    await waitFor(() => expect(screen.getByText(/maximum van 1 kind bereikt/i)).toBeInTheDocument());
    expect(toastErrorMock).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalledWith('/app/parent');
  });

  it('shows a generic error toast for a non-limit Supabase error and stays on the form', async () => {
    insertResult = { data: null, error: { message: 'boom' } };
    renderScreen();
    await waitForFormReady();

    fireEvent.change(screen.getByPlaceholderText('Bijv. Emma of Liam'), { target: { value: 'Test Child' } });
    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '8' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kind toevoegen' }));

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith('boom'));
    expect(navigateMock).not.toHaveBeenCalledWith('/app/parent');
    expect(screen.queryByText('Maximum aantal kinderen bereikt')).not.toBeInTheDocument();
  });
});
