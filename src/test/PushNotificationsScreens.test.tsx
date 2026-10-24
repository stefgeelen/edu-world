import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '@/test/testUtils';
import type { PushStatus } from '@/lib/push';

// The parent-facing pieces of push notifications: the onboarding step after
// the PIN (SetupNotifications) and the Meldingen card in Mijn account.

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

const mutation = () => ({ mutate: vi.fn(), isPending: false });
let pushState: {
  status: PushStatus | undefined;
  isLoading: boolean;
  enable: ReturnType<typeof mutation>;
  disable: ReturnType<typeof mutation>;
  sendTest: ReturnType<typeof mutation>;
};
let prefsState: { preferences: { buddy: boolean; insights: boolean }; isLoading: boolean; update: ReturnType<typeof mutation> };

vi.mock('@/hooks/usePushNotifications', () => ({
  usePushStatus: () => pushState,
  usePushPreferences: () => prefsState,
}));

vi.mock('@/hooks/useInstallPrompt', () => ({
  useInstallPrompt: () => ({ mode: 'ios-safari', isInstalled: false, promptInstall: vi.fn() }),
}));

vi.mock('@/components/AddToHomeScreen', () => ({
  AddToHomeScreen: ({ open }: { open: boolean }) => (open ? <div>install-steps</div> : null),
}));

import { SetupNotifications } from '@/screens/SetupNotifications';
import { PushNotificationsSettings } from '@/components/parent/PushNotificationsSettings';

function renderWithProviders(ui: React.ReactElement, path = '/auth/meldingen?redirect=/app/add-child') {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  pushState = { status: 'off', isLoading: false, enable: mutation(), disable: mutation(), sendTest: mutation() };
  prefsState = { preferences: { buddy: true, insights: true }, isLoading: false, update: mutation() };
});

describe('SetupNotifications (onboarding)', () => {
  it.each(['on', 'denied', 'unsupported'] as const)('moves straight on when the status is %s', async (status) => {
    pushState.status = status;
    renderWithProviders(<SetupNotifications />);
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/app/add-child', { replace: true }));
  });

  it('asks, and moves on after switching on', () => {
    renderWithProviders(<SetupNotifications />);
    fireEvent.click(screen.getByRole('button', { name: 'Meldingen aanzetten' }));

    expect(pushState.enable.mutate).toHaveBeenCalled();
    const { onSettled } = pushState.enable.mutate.mock.calls[0][1];
    onSettled();
    expect(navigateMock).toHaveBeenCalledWith('/app/add-child', { replace: true });
  });

  it('lets the parent skip with Later', () => {
    renderWithProviders(<SetupNotifications />);
    fireEvent.click(screen.getByRole('button', { name: 'Later' }));
    expect(pushState.enable.mutate).not.toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith('/app/add-child', { replace: true });
  });

  it('shows the home-screen steps on an iPhone in the browser', () => {
    pushState.status = 'needs-install';
    renderWithProviders(<SetupNotifications />);
    expect(screen.queryByRole('button', { name: 'Meldingen aanzetten' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Laat zien hoe' }));
    expect(screen.getByText('install-steps')).toBeTruthy();
  });
});

describe('PushNotificationsSettings (Mijn account)', () => {
  const renderCard = () =>
    renderWithProviders(<PushNotificationsSettings installMode="ios-safari" onShowInstall={vi.fn()} />, '/');

  it('offers to switch on when off', () => {
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: 'Meldingen aanzetten op dit toestel' }));
    expect(pushState.enable.mutate).toHaveBeenCalled();
  });

  it('offers a test and switching off when on', () => {
    pushState.status = 'on';
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: 'Stuur een testmelding' }));
    fireEvent.click(screen.getByRole('button', { name: 'Uitzetten' }));
    expect(pushState.sendTest.mutate).toHaveBeenCalled();
    expect(pushState.disable.mutate).toHaveBeenCalled();
  });

  it('saves a kind switched off, keeping the other', () => {
    pushState.status = 'on';
    renderCard();
    fireEvent.click(screen.getByRole('switch', { name: /Aandachtspunten/ }));
    expect(prefsState.update.mutate).toHaveBeenCalledWith({ buddy: true, insights: false });
  });

  it('explains a blocked device instead of offering a button', () => {
    pushState.status = 'denied';
    renderCard();
    expect(screen.getByText(/geblokkeerd/)).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
