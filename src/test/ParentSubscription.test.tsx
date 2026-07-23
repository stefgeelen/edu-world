import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { createTestQueryClient, queryWrapper, fakeSupabaseChain } from './testUtils';

// ParentSubscription is a read-only React Query + Supabase screen. Unlike the
// task brief assumed, it does NOT call a Stripe/checkout edge function —
// "upgrade" and "cancel" are plain `mailto:` links (see ParentSubscription.tsx
// L155-160, L174-179), so there's no `supabase.functions.invoke` or
// `window.location` redirect to mock/stub here. Only AuthContext + Supabase
// need mocking.

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'parent-1', email: 'parent@example.test' } }),
}));

const fromMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...a: unknown[]) => fromMock(...a) },
}));

import { ParentSubscription } from '@/screens/parent/ParentSubscription';

function setupSubscription(subscription: unknown) {
  fromMock.mockImplementation((table: string) => {
    if (table !== 'subscriptions') throw new Error(`Unexpected table: ${table}`);
    return fakeSupabaseChain({ data: subscription, error: null });
  });
}

function renderSubscription() {
  const queryClient = createTestQueryClient();
  const Wrapper = queryWrapper(queryClient);
  return render(<Wrapper><ParentSubscription /></Wrapper>);
}

describe('ParentSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a loading spinner before the subscription resolves', () => {
    setupSubscription(null);
    const { container } = renderSubscription();
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('defaults to the Free plan (and hides the cancel link) when there is no subscription row', async () => {
    setupSubscription(null);
    renderSubscription();
    await waitFor(() => expect(screen.getByText('Gratis')).toBeInTheDocument());
    expect(screen.getByText('FREE')).toBeInTheDocument();
    expect(screen.getByText('Actief')).toBeInTheDocument();
    expect(screen.queryByText('Abonnement opzeggen')).not.toBeInTheDocument();
  });

  it('shows plan details, status, and next billing date for an active paid subscription', async () => {
    setupSubscription({
      plan: 'family',
      status: 'active',
      max_children: 5,
      current_period_end: '2026-08-15T00:00:00.000Z',
    });
    renderSubscription();
    await waitFor(() => expect(screen.getByText('Familie')).toBeInTheDocument());
    expect(screen.getByText('FAMILY')).toBeInTheDocument();
    expect(screen.getByText('Actief')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    const billingLine = screen.getByText(/Volgende factuurdatum/);
    expect(billingLine.textContent).toMatch(/15/);
    expect(billingLine.textContent).toMatch(/2026/);
  });

  it('lists only strictly higher-tier upgrade options with a pre-filled mailto link', async () => {
    setupSubscription({ plan: 'basic', status: 'active', max_children: 2 });
    renderSubscription();
    await waitFor(() => expect(screen.getByText('Upgrade opties')).toBeInTheDocument());

    expect(screen.getByText('Upgrade naar Familie')).toBeInTheDocument();
    expect(screen.getByText('Upgrade naar School')).toBeInTheDocument();
    expect(screen.queryByText('Upgrade naar Basis')).not.toBeInTheDocument();

    const link = screen.getByText('Upgrade naar Familie').closest('a');
    expect(link).toHaveAttribute('href', expect.stringContaining('mailto:support@leapio.app'));
    expect(link?.getAttribute('href')).toContain(encodeURIComponent('parent@example.test'));
  });

  it('hides the upgrade section entirely once already on the top School plan', async () => {
    setupSubscription({ plan: 'school', status: 'active', max_children: 999 });
    renderSubscription();
    await waitFor(() => expect(screen.getByText('School')).toBeInTheDocument());
    expect(screen.queryByText('Upgrade opties')).not.toBeInTheDocument();
  });

  it('shows the cancel-subscription link for an active, non-free paid plan', async () => {
    setupSubscription({ plan: 'basic', status: 'active', max_children: 2 });
    renderSubscription();
    await waitFor(() => expect(screen.getByText('Abonnement opzeggen')).toBeInTheDocument());
  });
});
