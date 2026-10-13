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
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
  const view = render(
    <MemoryRouter>
      <Wrapper><ParentAddChild /></Wrapper>
    </MemoryRouter>
  );
  return { ...view, invalidateSpy };
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

  const gradeRadio = (label: string) => screen.getByRole('radio', { name: label });

  it('suggests the grade for the age, with an honest note when that grade is not in the app yet', async () => {
    renderScreen();
    await waitForFormReady();

    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '7' } });
    expect(gradeRadio('2de leerjaar')).toHaveAttribute('aria-checked', 'true');
    expect(gradeRadio('1ste leerjaar')).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByText(/Voorgesteld op basis van de leeftijd/)).toBeInTheDocument();

    // Age 8 suggests the 3de leerjaar, which is not in the app yet.
    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '8' } });
    expect(gradeRadio('2de leerjaar')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText(/3de leerjaar zijn/)).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: '3de leerjaar' })).not.toBeInTheDocument();
  });

  it('suggests the 1ste leerjaar for a 6-year-old', async () => {
    renderScreen();
    await waitForFormReady();

    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '6' } });
    expect(gradeRadio('1ste leerjaar')).toHaveAttribute('aria-checked', 'true');
    expect(screen.queryByText(/nog niet beschikbaar/)).not.toBeInTheDocument();
  });

  it('inserts the child with the grade the parent picked, shows a success toast, and navigates back', async () => {
    const { invalidateSpy } = renderScreen();
    await waitForFormReady();

    fireEvent.change(screen.getByPlaceholderText('Bijv. Emma of Liam'), { target: { value: 'Test Child' } });
    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '7' } });
    // A 7-year-old can still be in the 1ste leerjaar; the parent knows.
    fireEvent.click(gradeRadio('1ste leerjaar'));
    expect(gradeRadio('1ste leerjaar')).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Kind toevoegen' }));

    await waitFor(() => expect(insertSpy).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Test Child',
      age: 7,
      grade: 1,
      parent_id: 'parent-1',
    })));
    await waitFor(() => expect(toastSuccessMock).toHaveBeenCalledWith('Test Child is toegevoegd!'));
    expect(navigateMock).toHaveBeenCalledWith('/app/parent');
    // The children list must show the new child straight away.
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['parent-children'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['parent-children-count'] });
  });

  it('without a pick, inserts the grade the age suggests', async () => {
    renderScreen();
    await waitForFormReady();

    fireEvent.change(screen.getByPlaceholderText('Bijv. Emma of Liam'), { target: { value: 'Test Child' } });
    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '7' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kind toevoegen' }));

    await waitFor(() => expect(insertSpy).toHaveBeenCalledWith(expect.objectContaining({ age: 7, grade: 2 })));
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
