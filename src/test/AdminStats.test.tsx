import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { createTestQueryClient, queryWrapper, fakeSupabaseChain } from './testUtils';
import type { EngagementStats } from '@/hooks/useAdminEngagement';

// AdminStats now reads one server-side aggregate (admin_engagement_stats) plus
// a plain subscriptions select. These tests cover the headline tiles, the
// activation funnel, the week-on-week delta, and — the part most likely to
// mislead — a retention bucket that is not mature enough to report yet.

let engagement: EngagementStats;
let rpcError: unknown = null;
let subs: { id: string; status: string; plan: string }[] = [];

const rpcMock = vi.fn(async () => ({ data: rpcError ? null : engagement, error: rpcError }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => (rpcMock as unknown as (...a: unknown[]) => unknown)(...args),
    from: () => fakeSupabaseChain({ data: subs, error: null }),
  },
}));

import { AdminStats } from '@/screens/admin/AdminStats';

function baseStats(): EngagementStats {
  return {
    generated_at: '2026-09-28T10:00:00.000Z',
    totals: { accounts: 12, children: 8, attempts: 340, active_subscriptions: 2 },
    new_signups: { accounts_7d: 3, accounts_30d: 9, children_7d: 2 },
    active_children: { d1: 4, d7: 6, d30: 7 },
    active_accounts: { d1: 3, d7: 5, d30: 9 },
    activation: {
      children_total: 8,
      children_opened: 7,
      children_started: 5,
      children_never_started: 3,
    },
    attempts: { last_7d: 120, prev_7d: 100 },
    daily: Array.from({ length: 30 }, (_, i) => ({
      day: `2026-09-${String(i + 1).padStart(2, '0')}`,
      attempts: i,
      children: 1,
    })),
    by_hour: Array.from({ length: 24 }, (_, h) => ({ hour: h, attempts: h })),
    retention: [
      { cohort: '2026-W36', cohort_start: '2026-08-31', size: 4, w1: 4, w2: 2, w4: 1, w6: null },
    ],
    top_exercises: [{ title: 'Tel tot 10', subject: 'rekenen', attempts: 40, avg_stars: 2.5 }],
    by_subject: [{ subject: 'rekenen', attempts: 200, avg_stars: 2.4 }],
  };
}

function renderStats() {
  const queryClient = createTestQueryClient();
  const Wrapper = queryWrapper(queryClient);
  return render(<Wrapper><AdminStats /></Wrapper>);
}

function tile(label: string) {
  return screen.getByText(label).closest('div') as HTMLElement;
}

/** 100% shows up in both the funnel and the retention grid — scope every assertion. */
function section(title: string) {
  return screen.getByText(title).closest('section') as HTMLElement;
}

describe('AdminStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    engagement = baseStats();
    rpcError = null;
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

  it('leads with usage, not with totals', async () => {
    renderStats();
    await waitFor(() => expect(screen.getByText('Statistieken')).toBeInTheDocument());

    expect(within(tile('Actieve kinderen (7 dagen)')).getByText('6')).toBeInTheDocument();
    expect(within(tile('Actieve gezinnen (7 dagen)')).getByText('5')).toBeInTheDocument();
    expect(within(tile('Oefeningen deze week')).getByText('120')).toBeInTheDocument();
    expect(within(tile('Nieuwe accounts (7 dagen)')).getByText('3')).toBeInTheDocument();
  });

  it('reports week-on-week movement as a percentage change', async () => {
    renderStats();
    await waitFor(() => expect(screen.getByText('Statistieken')).toBeInTheDocument());

    // 120 this week against 100 last week.
    expect(screen.getByText(/\+20% t.o.v. vorige week/)).toBeInTheDocument();
  });

  it('says "geen vergelijking" rather than dividing by a zero baseline', async () => {
    engagement.attempts = { last_7d: 42, prev_7d: 0 };
    renderStats();
    await waitFor(() => expect(screen.getByText('Statistieken')).toBeInTheDocument());

    expect(screen.getByText('geen vergelijking')).toBeInTheDocument();
  });

  it('renders the activation funnel and flags children who never started', async () => {
    renderStats();
    await waitFor(() => expect(screen.getByText('Statistieken')).toBeInTheDocument());

    // 7 of 8 opened the app, 5 of 8 finished an exercise.
    const funnel = section('Activatie');
    expect(within(funnel).getByText('88%')).toBeInTheDocument();
    expect(within(funnel).getByText('63%')).toBeInTheDocument();
    expect(within(funnel).getByText(/nog nooit een oefening/)).toBeInTheDocument();
  });

  it('shows retention as a share of the cohort, and blanks buckets that are not mature yet', async () => {
    renderStats();
    await waitFor(() => expect(screen.getByText('Statistieken')).toBeInTheDocument());

    const grid = section('Retentie per lichting');
    expect(within(grid).getByText('100%')).toBeInTheDocument(); // w1: 4/4
    expect(within(grid).getByText('50%')).toBeInTheDocument();  // w2: 2/4
    expect(within(grid).getByText('25%')).toBeInTheDocument();  // w4: 1/4
    // w6 is null — reported as an em dash, never as 0%.
    expect(within(grid).getByText('—')).toBeInTheDocument();
  });

  it('counts only active subscriptions in the totals block', async () => {
    renderStats();
    await waitFor(() => expect(screen.getByText('Statistieken')).toBeInTheDocument());

    expect(within(tile('Actieve abonnementen')).getByText('2')).toBeInTheDocument();
  });

  it('renders an error state instead of empty cards when the aggregate fails', async () => {
    rpcError = { message: 'permission denied' };
    renderStats();

    await waitFor(() =>
      expect(screen.getByText('Statistieken konden niet geladen worden.')).toBeInTheDocument()
    );
  });

  it('survives an account with no children at all', async () => {
    engagement.activation = {
      children_total: 0,
      children_opened: 0,
      children_started: 0,
      children_never_started: 0,
    };
    engagement.retention = [];
    engagement.by_subject = [];
    engagement.top_exercises = [];

    renderStats();
    await waitFor(() => expect(screen.getByText('Statistieken')).toBeInTheDocument());

    expect(screen.getByText('Nog geen kinderen om te volgen.')).toBeInTheDocument();
    expect(screen.queryByText(/nog nooit een oefening/)).not.toBeInTheDocument();
  });
});
