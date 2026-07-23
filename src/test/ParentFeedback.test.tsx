import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createTestQueryClient, queryWrapper, fakeSupabaseChain } from './testUtils';

// ParentFeedback is a React Query + Supabase form screen (submit feedback,
// list previously submitted items). Only AuthContext, Supabase, and sonner
// need mocking — react-hook-form isn't used here (plain useState + zod.parse
// inside the mutationFn), and there's no router dependency.

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

import { ParentFeedback } from '@/screens/parent/ParentFeedback';

type Chain = Record<string, (...args: unknown[]) => unknown>;

function makeChain(result: { data: unknown; error: unknown }): Chain {
  return fakeSupabaseChain(result) as unknown as Chain;
}

const FEEDBACK_ITEM = {
  id: 'fb-1',
  subject: 'Kan niet inloggen',
  message: 'Ik krijg een foutmelding.',
  category: 'bug',
  status: 'in_review',
  created_at: '2026-07-01T00:00:00.000Z',
  admin_notes: null,
};

const FEEDBACK_WITH_REPLY = {
  id: 'fb-2',
  subject: 'Fijne app!',
  message: 'Mijn zoon leert er veel van.',
  category: 'compliment',
  status: 'resolved',
  created_at: '2026-06-15T00:00:00.000Z',
  admin_notes: 'Fijn om te horen, bedankt!',
};

function setupSupabase(overrides: { items?: unknown[]; insertError?: unknown } = {}) {
  const insertMock = vi.fn();
  fromMock.mockImplementation((table: string) => {
    if (table !== 'feedback') throw new Error(`Unexpected table: ${table}`);
    const chain = makeChain({ data: overrides.items ?? [], error: null });
    chain.insert = (...args: unknown[]) => {
      insertMock(...args);
      return makeChain({ data: null, error: overrides.insertError ?? null });
    };
    return chain;
  });
  return { insertMock };
}

function renderFeedback() {
  const queryClient = createTestQueryClient();
  const Wrapper = queryWrapper(queryClient);
  return render(<Wrapper><ParentFeedback /></Wrapper>);
}

describe('ParentFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a loading spinner before the feedback list resolves', () => {
    setupSupabase();
    const { container } = renderFeedback();
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows an empty state when no feedback has been submitted yet', async () => {
    setupSupabase({ items: [] });
    renderFeedback();
    await waitFor(() => expect(screen.getByText('Nog geen feedback verstuurd.')).toBeInTheDocument());
  });

  it('renders previously submitted feedback with category, status badge, and an admin reply when present', async () => {
    setupSupabase({ items: [FEEDBACK_ITEM, FEEDBACK_WITH_REPLY] });
    renderFeedback();
    await waitFor(() => expect(screen.getByText('Kan niet inloggen')).toBeInTheDocument());
    expect(screen.getByText('In behandeling')).toBeInTheDocument();
    expect(screen.getByText('Afgehandeld')).toBeInTheDocument();
    expect(screen.getByText('Fijn om te horen, bedankt!')).toBeInTheDocument();
    expect(screen.getByText('Reactie Leapio')).toBeInTheDocument();
  });

  it('disables the submit button until both subject and message are filled in', async () => {
    setupSupabase({ items: [] });
    renderFeedback();
    await waitFor(() => expect(screen.getByText('Nog geen feedback verstuurd.')).toBeInTheDocument());

    const submitBtn = screen.getByRole('button', { name: /Verstuur feedback/i });
    expect(submitBtn).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('Korte titel'), { target: { value: 'Bug in oefening' } });
    expect(submitBtn).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('Vertel ons meer...'), { target: { value: 'De knop werkt niet.' } });
    expect(submitBtn).not.toBeDisabled();
  });

  it('submits feedback, shows a success toast, and clears the form', async () => {
    const { insertMock } = setupSupabase({ items: [] });
    renderFeedback();
    await waitFor(() => expect(screen.getByText('Nog geen feedback verstuurd.')).toBeInTheDocument());

    const subjectInput = screen.getByPlaceholderText('Korte titel') as HTMLInputElement;
    const messageInput = screen.getByPlaceholderText('Vertel ons meer...') as HTMLTextAreaElement;
    fireEvent.change(subjectInput, { target: { value: '  Login bug  ' } });
    fireEvent.change(messageInput, { target: { value: '  Ik kan niet inloggen.  ' } });
    fireEvent.click(screen.getByRole('button', { name: /Verstuur feedback/i }));

    await waitFor(() => expect(insertMock).toHaveBeenCalledWith([{
      user_id: 'parent-1',
      category: 'suggestion',
      subject: 'Login bug',
      message: 'Ik kan niet inloggen.',
    }]));
    expect(toastSuccessMock).toHaveBeenCalledWith('Bedankt! Je feedback is verstuurd.');
    await waitFor(() => expect(subjectInput.value).toBe(''));
    expect(messageInput.value).toBe('');
  });

  it('POSSIBLE BUG: surfaces the raw untranslated Supabase error message instead of mapDbError', async () => {
    // ParentFeedback.tsx ~L72-74: onError falls back to `err?.message` directly
    // when the thrown error has no `.errors` array, unlike ParentRewards (and
    // CLAUDE.md's documented convention) which routes Supabase errors through
    // `mapDbError` for a friendly Dutch message. A raw Postgres error string
    // (e.g. a constraint-violation message) would leak to the parent as-is.
    const rawMessage = 'duplicate key value violates unique constraint "feedback_pkey"';
    setupSupabase({ items: [], insertError: { message: rawMessage, code: '23505' } });
    renderFeedback();
    await waitFor(() => expect(screen.getByText('Nog geen feedback verstuurd.')).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText('Korte titel'), { target: { value: 'Bug' } });
    fireEvent.change(screen.getByPlaceholderText('Vertel ons meer...'), { target: { value: 'Details' } });
    fireEvent.click(screen.getByRole('button', { name: /Verstuur feedback/i }));

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith(rawMessage));
  });
});
