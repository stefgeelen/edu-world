import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createTestQueryClient, queryWrapper } from './testUtils';
import type { PushStats } from '@/screens/admin/AdminPush';

// Admin → Meldingen: the off / admins / all switch and the push numbers from
// admin_push_stats.

let stats: PushStats;
const rpcMock = vi.fn(async (name: string) => (name === 'admin_push_stats' ? { data: stats, error: null } : { data: null, error: null }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => (rpcMock as unknown as (...a: unknown[]) => unknown)(...args) },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { AdminPush } from '@/screens/admin/AdminPush';

function renderScreen() {
  const Wrapper = queryWrapper(createTestQueryClient());
  return render(<Wrapper><AdminPush /></Wrapper>);
}

beforeEach(() => {
  vi.clearAllMocks();
  stats = {
    mode: 'admins',
    parents_total: 10,
    parents_with_push: 4,
    devices: 5,
    sent_7d: 6,
    sent_30d: 12,
    failed_30d: 1,
    measured_30d: 10,
    played_24h_30d: 7,
    by_kind: {
      buddy_needs: { sent: 8, measured: 6, played_24h: 3 },
      insight: { sent: 4, measured: 4, played_24h: 4 },
    },
  };
});

describe('AdminPush', () => {
  it('shows the current mode and the headline numbers', async () => {
    renderScreen();
    await screen.findByText('Meldingen');

    expect(screen.getByRole('button', { name: /Alleen admins/ }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('van 10 ouders · 5 toestellen')).toBeTruthy();
    expect(screen.getByText('70%')).toBeTruthy();
    expect(screen.getByText('Buddy mist je kind')).toBeTruthy();
    expect(screen.getByText('50%')).toBeTruthy();
    expect(screen.getByText('100%')).toBeTruthy();
  });

  it('switches the mode', async () => {
    renderScreen();
    fireEvent.click(await screen.findByRole('button', { name: /Iedereen/ }));
    await waitFor(() => expect(rpcMock).toHaveBeenCalledWith('admin_set_push_mode', { p_mode: 'all' }));
  });

  it('says so when nothing was sent yet', async () => {
    stats.by_kind = {};
    stats.measured_30d = 0;
    renderScreen();
    expect(await screen.findByText('Nog geen meldingen verstuurd.')).toBeTruthy();
    expect(screen.getByText('—')).toBeTruthy();
  });
});
