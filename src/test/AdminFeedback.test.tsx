import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createTestQueryClient, queryWrapper, fakeSupabaseChain } from './testUtils';

// AdminFeedback joins feedback rows to profiles client-side, opens a detail
// dialog on row click, and saves status/notes via a mutation. The status
// filter uses a Radix Select, which isn't exercised here (opening it needs
// jsdom pointer-capture/scrollIntoView shims this codebase doesn't
// provide) — coverage instead focuses on the data join, the detail dialog,
// and the save mutation's success/error paths.

const FEEDBACK = [
  { id: 'fb-1', user_id: 'user-1', category: 'bug', subject: 'Knop werkt niet', message: 'De knop reageert niet op klikken.', status: 'new', admin_notes: null, created_at: '2026-01-10T09:00:00Z' },
  { id: 'fb-2', user_id: 'user-2', category: 'suggestion', subject: 'Meer kleuren', message: 'Graag meer avatar-kleuren.', status: 'resolved', admin_notes: 'Toegevoegd in v2', created_at: '2026-01-11T09:00:00Z' },
];
const PROFILES = [
  { id: 'user-1', full_name: 'Test Parent One', email: 'parent1@example.test' },
  { id: 'user-2', full_name: 'Test Parent Two', email: 'parent2@example.test' },
];

const toast = { success: vi.fn(), error: vi.fn() };
vi.mock('sonner', () => ({ toast: { success: (...a: unknown[]) => toast.success(...a), error: (...a: unknown[]) => toast.error(...a) } }));

let feedbackResult: { data: typeof FEEDBACK | null; error: unknown } = { data: FEEDBACK, error: null };
let updateResult: { data: null; error: unknown } = { data: null, error: null };

// The "feedback" table backs both the select query and the update mutation.
// Each `.from('feedback')` call gets its own chain instance; the chain only
// switches to `updateResult` once `.update(...)` is actually called on it, so
// a plain select (initial load or post-mutation refetch) always resolves the
// list, never the mutation's result.
function feedbackChain() {
  let isUpdate = false;
  const chain: Record<string, unknown> = {
    select: () => chain,
    order: () => chain,
    eq: () => chain,
    update: () => {
      isUpdate = true;
      return chain;
    },
    then: (onFulfilled: (v: unknown) => unknown) =>
      Promise.resolve(isUpdate ? updateResult : feedbackResult).then(onFulfilled),
  };
  return chain;
}

const fromMock = vi.fn((table: string) => {
  if (table === 'feedback') return feedbackChain();
  if (table === 'profiles') return fakeSupabaseChain({ data: PROFILES, error: null });
  return fakeSupabaseChain({ data: null, error: null });
});
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...args: unknown[]) => fromMock(...args) },
}));

import { AdminFeedback } from '@/screens/admin/AdminFeedback';

function renderScreen() {
  const queryClient = createTestQueryClient();
  const Wrapper = queryWrapper(queryClient);
  return render(<Wrapper><AdminFeedback /></Wrapper>);
}

describe('AdminFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    feedbackResult = { data: FEEDBACK, error: null };
    updateResult = { data: null, error: null };
  });

  it('shows a loading spinner while feedback is being fetched', () => {
    const { container } = renderScreen();
    expect(container.querySelector('.animate-spin')).toBeTruthy();
  });

  it('renders each feedback row joined to its sender profile', async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByText('Knop werkt niet')).toBeInTheDocument());

    expect(screen.getByText('2 berichten van ouders')).toBeInTheDocument();
    expect(screen.getByText('Test Parent One')).toBeInTheDocument();
    expect(screen.getByText('parent1@example.test')).toBeInTheDocument();
    expect(screen.getByText('Bug')).toBeInTheDocument();
  });

  it('shows the empty state when there is no feedback', async () => {
    feedbackResult = { data: [], error: null };
    renderScreen();
    await waitFor(() => expect(screen.getByText('Geen feedback gevonden.')).toBeInTheDocument());
  });

  it('opens the detail dialog on row click and saves the updated status via the mutation', async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByText('Knop werkt niet')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Knop werkt niet'));

    await waitFor(() => expect(screen.getByText('De knop reageert niet op klikken.')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Opslaan'));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Feedback bijgewerkt'));
    // Dialog closes after a successful save.
    await waitFor(() => expect(screen.queryByText('De knop reageert niet op klikken.')).not.toBeInTheDocument());
  });

  it('shows an error toast when the save mutation fails, and keeps the dialog open', async () => {
    updateResult = { data: null, error: new Error('kon niet opslaan') };
    renderScreen();
    await waitFor(() => expect(screen.getByText('Knop werkt niet')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Knop werkt niet'));
    await waitFor(() => expect(screen.getByText('De knop reageert niet op klikken.')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Opslaan'));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('kon niet opslaan'));
    expect(screen.getByText('De knop reageert niet op klikken.')).toBeInTheDocument();
  });
});
