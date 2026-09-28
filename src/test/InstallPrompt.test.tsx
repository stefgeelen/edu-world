import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { InstallMode } from '@/hooks/useInstallPrompt';

// The banner is where the install flow is either offered or silently withheld.
// These cover the two things that went wrong before: it appeared on the
// marketing pages, and on iOS it offered a button that could not work.

let mode: InstallMode = 'ios-safari';
let shouldOffer = true;
const promptInstall = vi.fn();
const dismiss = vi.fn();

vi.mock('@/hooks/useInstallPrompt', () => ({
  useInstallPrompt: () => ({ mode, shouldOffer, promptInstall, dismiss, isInstalled: false }),
}));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'parent-1' } }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { InstallPrompt } from '@/components/InstallPrompt';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <InstallPrompt />
    </MemoryRouter>
  );
}

/** The banner deliberately waits before appearing; skip that wait. */
function runAppearDelay() {
  act(() => { vi.advanceTimersByTime(5000); });
}

describe('InstallPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mode = 'ios-safari';
    shouldOffer = true;
  });

  afterEach(() => vi.useRealTimers());

  it('stays off the marketing pages, where it would cover the signup form', () => {
    renderAt('/beta');
    runAppearDelay();
    expect(screen.queryByText(/Zet Leapio op je beginscherm/)).not.toBeInTheDocument();
  });

  it('appears on the app itself, but only after a delay', () => {
    renderAt('/app/dashboard');
    expect(screen.queryByText(/Zet Leapio op je beginscherm/)).not.toBeInTheDocument();

    runAppearDelay();
    expect(screen.getByText(/Zet Leapio op je beginscherm/)).toBeInTheDocument();
  });

  it('offers to show the steps on iPhone rather than a button iOS cannot honour', () => {
    renderAt('/app/dashboard');
    runAppearDelay();

    expect(screen.getByText('Laat zien hoe')).toBeInTheDocument();
    expect(screen.queryByText('Installeren')).not.toBeInTheDocument();
  });

  it('walks the parent through the three Safari taps', () => {
    renderAt('/app/dashboard');
    runAppearDelay();
    fireEvent.click(screen.getByText('Laat zien hoe'));

    expect(screen.getByText(/Tik onderaan in Safari/)).toBeInTheDocument();
    expect(screen.getByText('Zet op beginscherm')).toBeInTheDocument();
    expect(screen.getByText('Voeg toe')).toBeInTheDocument();
    // The separate storage of an installed web app is called out, not hidden.
    expect(screen.getByText(/één keer opnieuw in/)).toBeInTheDocument();
  });

  it('sends the parent to Safari when another iPhone browser cannot deliver an app', () => {
    mode = 'ios-other';
    renderAt('/app/dashboard');
    runAppearDelay();
    fireEvent.click(screen.getByText('Laat zien hoe'));

    expect(screen.getByText(/Dit lukt alleen in/)).toBeInTheDocument();
    expect(screen.getByText('Kopieer de link')).toBeInTheDocument();
  });

  it('uses the browser’s own install prompt where one exists', () => {
    mode = 'native';
    renderAt('/app/dashboard');
    runAppearDelay();
    fireEvent.click(screen.getByText('Installeren'));

    expect(promptInstall).toHaveBeenCalled();
  });

  // Whether the banner is gone from the DOM a tick later is framer-motion's
  // exit animation, not this component's contract. What matters is that the
  // dismissal is recorded; the fortnight window itself is covered in the hook.
  it('records a dismissal so the next screen does not ask again', () => {
    renderAt('/app/dashboard');
    runAppearDelay();
    fireEvent.click(screen.getByLabelText('Sluiten'));

    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  it('shows nothing when the hook says there is nothing to offer', () => {
    shouldOffer = false;
    renderAt('/app/dashboard');
    runAppearDelay();
    expect(screen.queryByText(/Zet Leapio op je beginscherm/)).not.toBeInTheDocument();
  });
});
