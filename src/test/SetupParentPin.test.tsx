import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { SetupParentPin } from '@/screens/SetupParentPin';
import { createTestQueryClient } from '@/test/testUtils';

// SetupParentPin is public (publicRoutes.tsx) and the signup flow links straight
// into it, so it can be reached with no session. set_parent_pin raises
// 'Niet ingelogd' when auth.uid() is null, and the screen's onError clears both
// fields — so without a guard it is an unescapable loop, and the parent never
// reaches add-child. These cover the guard in both directions.

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

let authState: { user: unknown; loading: boolean } = { user: null, loading: false };
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => authState,
}));

const getSession = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getSession: () => getSession() },
    rpc: vi.fn(async () => ({ data: false, error: null })),
  },
}));

function renderScreen() {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter>
        <SetupParentPin />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('SetupParentPin session guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState = { user: null, loading: false };
  });

  it('redirects to /auth when there is genuinely no session', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    renderScreen();

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/auth', { replace: true }));
  });

  it('never shows the PIN form while unauthenticated', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    renderScreen();

    await waitFor(() => expect(navigateMock).toHaveBeenCalled());
    expect(screen.queryByText(/toegangscode/i)).toBeNull();
  });

  // With autoconfirm on, signUp resolves with a session and navigates here in
  // the same tick SIGNED_IN is still propagating, so `user` can read null for a
  // render. The guard asks Supabase rather than trusting context, so a real
  // session is never thrown away.
  it('stays put when context has no user yet but a session exists', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'token' } } });
    renderScreen();

    await waitFor(() => expect(getSession).toHaveBeenCalled());
    expect(navigateMock).not.toHaveBeenCalledWith('/auth', { replace: true });
  });

  it('does not bounce an authenticated parent', async () => {
    authState = { user: { id: 'user-1' }, loading: false };
    renderScreen();

    await waitFor(() => expect(navigateMock).not.toHaveBeenCalledWith('/auth', { replace: true }));
    expect(getSession).not.toHaveBeenCalled();
  });

  it('waits for auth to finish loading before deciding anything', async () => {
    authState = { user: null, loading: true };
    renderScreen();

    await waitFor(() => expect(getSession).not.toHaveBeenCalled());
    expect(navigateMock).not.toHaveBeenCalledWith('/auth', { replace: true });
  });
});
