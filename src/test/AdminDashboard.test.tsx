import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// AdminDashboard is the shell around every admin screen: top bar (back +
// sign-out), sidebar/mobile nav, and the Outlet for the active admin route.
// It has no data fetching of its own, so these tests focus on navigation
// wiring and sign-out cleanup, following ParentLayout.test.tsx's shape for
// the analogous parent-portal shell.

const navigateMock = vi.fn();
let pathname = '/admin/users';
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useLocation: () => ({ pathname }),
    Outlet: () => <div data-testid="outlet">child route</div>,
  };
});

const signOutMock = vi.fn().mockResolvedValue({ error: null });
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { auth: { signOut: (...a: unknown[]) => signOutMock(...a) } },
}));

import { AdminDashboard } from '@/screens/admin/AdminDashboard';

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signOutMock.mockResolvedValue({ error: null });
    pathname = '/admin/users';
  });

  it('renders the nav items (desktop + mobile), the title, and the child route Outlet', () => {
    render(<AdminDashboard />);
    // Every nav item is rendered twice: once in the desktop sidebar, once in
    // the mobile bar.
    expect(screen.getAllByText('Gebruikers').length).toBe(2);
    expect(screen.getAllByText('Statistieken').length).toBe(2);
    expect(screen.getByText('Leapio Admin')).toBeInTheDocument();
    expect(screen.getByTestId('outlet')).toBeInTheDocument();
  });

  it('navigates back to the parent dashboard when the back button is clicked', () => {
    const { container } = render(<AdminDashboard />);
    const header = container.querySelector('header');
    const backButton = header?.querySelectorAll('button')[0];
    expect(backButton).toBeTruthy();
    fireEvent.click(backButton as HTMLButtonElement);
    expect(navigateMock).toHaveBeenCalledWith('/app/dashboard');
  });

  it('navigates to the clicked nav item\'s path', () => {
    render(<AdminDashboard />);
    const subsItems = screen.getAllByText('Abonnementen');
    fireEvent.click(subsItems[0]);
    expect(navigateMock).toHaveBeenCalledWith('/admin/subscriptions');
  });

  it('highlights the nav item matching the current location', () => {
    pathname = '/admin/subscriptions';
    render(<AdminDashboard />);
    const [desktopSubs] = screen.getAllByText('Abonnementen');
    const [desktopUsers] = screen.getAllByText('Gebruikers');
    expect(desktopSubs.closest('button')?.className).toMatch(/bg-indigo-50/);
    expect(desktopUsers.closest('button')?.className).not.toMatch(/bg-indigo-50/);
  });

  it('signs out and navigates to /auth when "Uitloggen" is clicked', async () => {
    render(<AdminDashboard />);
    fireEvent.click(screen.getByText('Uitloggen'));
    await waitFor(() => expect(signOutMock).toHaveBeenCalled());
    expect(navigateMock).toHaveBeenCalledWith('/auth');
  });
});
