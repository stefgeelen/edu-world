import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';

const useAuthMock = vi.fn();
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

function renderProtected() {
  return render(
    <MemoryRouter initialEntries={['/app/dashboard']}>
      <Routes>
        <Route path="/auth" element={<div>Auth screen</div>} />
        <Route
          path="/app/dashboard"
          element={
            <ProtectedRoute>
              <div>Secret dashboard</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  afterEach(() => vi.clearAllMocks());

  it('shows a loading state and no content while auth is resolving', () => {
    useAuthMock.mockReturnValue({ user: null, loading: true });
    renderProtected();

    expect(screen.getByText('Laden...')).toBeInTheDocument();
    expect(screen.queryByText('Secret dashboard')).not.toBeInTheDocument();
  });

  it('redirects to /auth when there is no user', () => {
    useAuthMock.mockReturnValue({ user: null, loading: false });
    renderProtected();

    expect(screen.getByText('Auth screen')).toBeInTheDocument();
    expect(screen.queryByText('Secret dashboard')).not.toBeInTheDocument();
  });

  it('renders children when a user is present', () => {
    useAuthMock.mockReturnValue({ user: { id: 'user-1' }, loading: false });
    renderProtected();

    expect(screen.getByText('Secret dashboard')).toBeInTheDocument();
  });
});
