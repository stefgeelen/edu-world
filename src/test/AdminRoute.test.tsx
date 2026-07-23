import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AdminRoute } from '@/components/AdminRoute';

const useAuthMock = vi.fn();
const useAdminRoleMock = vi.fn();

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));
vi.mock('@/hooks/useAdminRole', () => ({
  useAdminRole: () => useAdminRoleMock(),
}));

function renderAdminRoute() {
  return render(
    <MemoryRouter initialEntries={['/app/admin']}>
      <Routes>
        <Route path="/auth" element={<div>Auth screen</div>} />
        <Route path="/app/dashboard" element={<div>Regular dashboard</div>} />
        <Route
          path="/app/admin"
          element={
            <AdminRoute>
              <div>Admin panel</div>
            </AdminRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('AdminRoute', () => {
  afterEach(() => vi.clearAllMocks());

  it('shows a loading state while auth is resolving', () => {
    useAuthMock.mockReturnValue({ user: null, loading: true });
    useAdminRoleMock.mockReturnValue({ isAdmin: false, isLoading: false });
    renderAdminRoute();

    expect(screen.queryByText('Admin panel')).not.toBeInTheDocument();
    expect(screen.queryByText('Auth screen')).not.toBeInTheDocument();
  });

  it('shows a loading state while the role check is resolving, even if auth is done', () => {
    useAuthMock.mockReturnValue({ user: { id: 'user-1' }, loading: false });
    useAdminRoleMock.mockReturnValue({ isAdmin: false, isLoading: true });
    renderAdminRoute();

    expect(screen.queryByText('Admin panel')).not.toBeInTheDocument();
  });

  it('redirects to /auth when there is no user', () => {
    useAuthMock.mockReturnValue({ user: null, loading: false });
    useAdminRoleMock.mockReturnValue({ isAdmin: false, isLoading: false });
    renderAdminRoute();

    expect(screen.getByText('Auth screen')).toBeInTheDocument();
  });

  it('redirects a signed-in non-admin to the regular dashboard, not /auth', () => {
    useAuthMock.mockReturnValue({ user: { id: 'user-1' }, loading: false });
    useAdminRoleMock.mockReturnValue({ isAdmin: false, isLoading: false });
    renderAdminRoute();

    expect(screen.getByText('Regular dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Admin panel')).not.toBeInTheDocument();
  });

  it('renders the admin panel for a signed-in admin', () => {
    useAuthMock.mockReturnValue({ user: { id: 'user-1' }, loading: false });
    useAdminRoleMock.mockReturnValue({ isAdmin: true, isLoading: false });
    renderAdminRoute();

    expect(screen.getByText('Admin panel')).toBeInTheDocument();
  });
});
