import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

// ParentLayout is the shell around the whole parent portal. Its own logic is
// small but security-adjacent: the header exposes the "lock" and "sign out"
// controls that drop the parent PIN session (parentPinSession.lock), plus an
// admin shortcut that must only appear for admins. The PIN verification itself
// lives in useParentPin/parentPinSession (covered by parentPinSession.test.ts);
// here we pin the layout's wiring of those actions.

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useLocation: () => ({ pathname: '/app/parent' }),
    Outlet: () => <div data-testid="outlet">child route</div>,
  };
});

const { isAdminRef } = vi.hoisted(() => ({ isAdminRef: { current: false } }));
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'parent-1' } }),
}));
vi.mock('@/hooks/useAdminRole', () => ({
  useAdminRole: () => ({ isAdmin: isAdminRef.current }),
}));

const lockMock = vi.fn();
vi.mock('@/hooks/useParentPin', () => ({
  parentPinSession: { lock: (...a: unknown[]) => lockMock(...a) },
}));

const signOutMock = vi.fn().mockResolvedValue({ error: null });
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { auth: { signOut: (...a: unknown[]) => signOutMock(...a) } },
}));

const toastSuccessMock = vi.fn();
vi.mock('sonner', () => ({ toast: { success: (...a: unknown[]) => toastSuccessMock(...a) } }));

import { ParentLayout } from '@/screens/parent/ParentLayout';

describe('ParentLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isAdminRef.current = false;
  });
  afterEach(() => cleanup());

  it('renders every top-level nav tab and the child route Outlet', () => {
    render(<ParentLayout />);
    for (const label of ['Kinderen', 'Beloningen', 'Abonnement', 'Account', 'Feedback']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByTestId('outlet')).toBeInTheDocument();
  });

  it('navigates when a nav tab is clicked', () => {
    render(<ParentLayout />);
    fireEvent.click(screen.getByText('Beloningen'));
    expect(navigateMock).toHaveBeenCalledWith('/app/parent/rewards');
  });

  it('hides the admin shortcut for non-admin parents', () => {
    render(<ParentLayout />);
    expect(screen.queryByTitle('Admin panel')).not.toBeInTheDocument();
  });

  it('shows the admin shortcut for admins and routes to /admin', () => {
    isAdminRef.current = true;
    render(<ParentLayout />);
    const adminBtn = screen.getByTitle('Admin panel');
    fireEvent.click(adminBtn);
    expect(navigateMock).toHaveBeenCalledWith('/admin');
  });

  it('locks the parent session and returns to the dashboard on "Vergrendelen"', () => {
    render(<ParentLayout />);
    fireEvent.click(screen.getByTitle('Vergrendelen'));
    expect(lockMock).toHaveBeenCalledTimes(1);
    expect(toastSuccessMock).toHaveBeenCalledWith('Ouderportaal vergrendeld');
    expect(navigateMock).toHaveBeenCalledWith('/app/dashboard');
  });

  it('locks the session, signs out, and returns to /auth on "Uitloggen"', async () => {
    render(<ParentLayout />);
    fireEvent.click(screen.getByTitle('Uitloggen'));
    expect(lockMock).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(signOutMock).toHaveBeenCalled());
    expect(navigateMock).toHaveBeenCalledWith('/auth');
  });
});
