import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { createTestQueryClient, queryWrapper, fakeSupabaseChain } from './testUtils';

// AdminSubscriptions joins two independent queries (subscriptions + profiles)
// client-side via getUser(). Covers the loading gate (only isLoading from the
// subscriptions query, per source), the plan/status summaries, the joined
// user names in the list, and the empty state.

let subs: { id: string; user_id: string | null; plan: string; status: string; created_at: string; max_children: number }[] = [];
let profiles: { id: string; full_name: string | null; email: string | null }[] = [];

const fromMock = vi.fn((table: string) => {
  if (table === 'subscriptions') return fakeSupabaseChain({ data: subs, error: null });
  if (table === 'profiles') return fakeSupabaseChain({ data: profiles, error: null });
  return fakeSupabaseChain({ data: null, error: null });
});
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...args: unknown[]) => (fromMock as (t: string) => unknown)(args[0] as string) },
}));

import { AdminSubscriptions } from '@/screens/admin/AdminSubscriptions';

function renderScreen() {
  const queryClient = createTestQueryClient();
  const Wrapper = queryWrapper(queryClient);
  return render(<Wrapper><AdminSubscriptions /></Wrapper>);
}

describe('AdminSubscriptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    subs = [
      { id: 'sub-1', user_id: 'user-1', plan: 'family', status: 'active', created_at: '2026-01-01T00:00:00Z', max_children: 3 },
      { id: 'sub-2', user_id: 'user-2', plan: 'basic', status: 'trialing', created_at: '2026-01-02T00:00:00Z', max_children: 1 },
    ];
    profiles = [
      { id: 'user-1', full_name: 'Test Parent One', email: 'parent1@example.test' },
      { id: 'user-2', full_name: null, email: 'parent2@example.test' },
    ];
  });

  it('shows a loading spinner while subscriptions are being fetched', () => {
    const { container } = renderScreen();
    expect(container.querySelector('.animate-spin')).toBeTruthy();
  });

  it('renders per-plan and per-status summary counts', async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByText('Abonnementen')).toBeInTheDocument());

    // "family" also appears on the plan badge in the list below, so scope to
    // the first match, which is the summary card.
    const [familyCardLabel] = screen.getAllByText('family');
    const familyCard = familyCardLabel.closest('div') as HTMLElement;
    expect(within(familyCard).getByText('1')).toBeInTheDocument();

    expect(screen.getByText('active: 1')).toBeInTheDocument();
    expect(screen.getByText('trialing: 1')).toBeInTheDocument();
  });

  it('joins each subscription to its user\'s profile, falling back to email then user id', async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByText('Test Parent One')).toBeInTheDocument());
    // sub-2's profile has no full_name, so it falls back to the email.
    expect(screen.getByText('parent2@example.test')).toBeInTheDocument();
  });

  it('shows the empty state when there are no subscriptions', async () => {
    subs = [];
    renderScreen();
    await waitFor(() => expect(screen.getByText('Nog geen abonnementen')).toBeInTheDocument());
  });
});
