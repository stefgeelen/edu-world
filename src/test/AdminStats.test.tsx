import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { createTestQueryClient, queryWrapper, fakeSupabaseChain } from './testUtils';

// AdminStats fires 4 parallel Supabase queries (3 head-counts + 1 full
// select) and derives an "active subscriptions" count client-side. These
// tests cover the loading state, the aggregated numbers, and the
// active-vs-other status filtering logic.

let counts = { profiles: 0, children: 0, attempts: 0 };
let subs: { id: string; status: string; plan: string }[] = [];

const fromMock = vi.fn((table: string) => {
  switch (table) {
    case 'profiles':
      return fakeSupabaseChain({ data: null, error: null, count: counts.profiles });
    case 'children':
      return fakeSupabaseChain({ data: null, error: null, count: counts.children });
    case 'exercise_attempts':
      return fakeSupabaseChain({ data: null, error: null, count: counts.attempts });
    case 'subscriptions':
      return fakeSupabaseChain({ data: subs, error: null });
    default:
      return fakeSupabaseChain({ data: null, error: null });
  }
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...args: unknown[]) => (fromMock as (table: string) => unknown)(args[0] as string) },
}));

import { AdminStats } from '@/screens/admin/AdminStats';

function renderStats() {
  const queryClient = createTestQueryClient();
  const Wrapper = queryWrapper(queryClient);
  return render(<Wrapper><AdminStats /></Wrapper>);
}

function statCard(label: string) {
  const labelEl = screen.getByText(label);
  return labelEl.closest('div') as HTMLElement;
}

describe('AdminStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    counts = { profiles: 12, children: 8, attempts: 340 };
    subs = [
      { id: 's1', status: 'active', plan: 'family' },
      { id: 's2', status: 'active', plan: 'basic' },
      { id: 's3', status: 'canceled', plan: 'basic' },
    ];
  });

  it('shows a loading spinner before the stats resolve', () => {
    const { container } = renderStats();
    expect(container.querySelector('.animate-spin')).toBeTruthy();
    expect(screen.queryByText('Statistieken')).not.toBeInTheDocument();
  });

  it('renders the aggregated counts once all queries resolve', async () => {
    renderStats();
    await waitFor(() => expect(screen.getByText('Statistieken')).toBeInTheDocument());

    expect(within(statCard('Totaal gebruikers')).getByText('12')).toBeInTheDocument();
    expect(within(statCard('Kinderen')).getByText('8')).toBeInTheDocument();
    expect(within(statCard('Oefeningen gemaakt')).getByText('340')).toBeInTheDocument();
  });

  it('only counts subscriptions with status "active" toward the active-subscriptions card', async () => {
    renderStats();
    await waitFor(() => expect(screen.getByText('Statistieken')).toBeInTheDocument());

    // 2 active out of 3 total subscriptions in the fixture.
    expect(within(statCard('Actieve abonnementen')).getByText('2')).toBeInTheDocument();
  });

  it('falls back to 0 for every card when all queries return empty results', async () => {
    counts = { profiles: 0, children: 0, attempts: 0 };
    subs = [];
    renderStats();
    await waitFor(() => expect(screen.getByText('Statistieken')).toBeInTheDocument());

    expect(within(statCard('Totaal gebruikers')).getByText('0')).toBeInTheDocument();
    expect(within(statCard('Actieve abonnementen')).getByText('0')).toBeInTheDocument();
  });
});
