import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// AuthContext is the gate for the whole app (CLAUDE.md flags it as high-risk):
// it decides when the parent PIN gets locked, and every protected route reads
// `user`/`loading` from it. These tests cover the auth-state-change wiring and
// the sign-out cleanup path, which have zero coverage today.

// vi.mock factories are hoisted above every import (and above any plain
// `const` in this file) so any value they close over must be created via
// vi.hoisted(), otherwise it's a TDZ error at import time.
const {
  onAuthStateChangeMock,
  getSessionMock,
  signUpMock,
  signInWithPasswordMock,
  signInWithOAuthMock,
  signOutMock,
  unsubscribeMock,
  pinLock,
} = vi.hoisted(() => ({
  onAuthStateChangeMock: vi.fn(),
  getSessionMock: vi.fn(),
  signUpMock: vi.fn(),
  signInWithPasswordMock: vi.fn(),
  signInWithOAuthMock: vi.fn(),
  signOutMock: vi.fn(),
  unsubscribeMock: vi.fn(),
  pinLock: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      onAuthStateChange: (...args: unknown[]) => onAuthStateChangeMock(...args),
      getSession: (...args: unknown[]) => getSessionMock(...args),
      signUp: (...args: unknown[]) => signUpMock(...args),
      signInWithPassword: (...args: unknown[]) => signInWithPasswordMock(...args),
      signInWithOAuth: (...args: unknown[]) => signInWithOAuthMock(...args),
      signOut: (...args: unknown[]) => signOutMock(...args),
    },
  },
}));

vi.mock('@/hooks/useParentPin', () => ({
  parentPinSession: { lock: pinLock, unlock: vi.fn(), isUnlocked: vi.fn(() => false) },
}));

import { AuthProvider, useAuth } from '@/context/AuthContext';

type FakeSession = { user: { id: string } } | null;
type AuthCallback = (event: string, session: FakeSession) => void;

function setup(initialSession: FakeSession = null) {
  let capturedCallback: AuthCallback | undefined;
  onAuthStateChangeMock.mockImplementation((cb: AuthCallback) => {
    capturedCallback = cb;
    return { data: { subscription: { unsubscribe: unsubscribeMock } } };
  });
  getSessionMock.mockResolvedValue({ data: { session: initialSession } });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(AuthProvider, null, children);

  const view = renderHook(() => useAuth(), { wrapper });
  return {
    ...view,
    fireAuthEvent: (event: string, session: FakeSession = null) => capturedCallback?.(event, session),
  };
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts in a loading state with no user', () => {
    getSessionMock.mockReturnValue(new Promise(() => {})); // never resolves
    onAuthStateChangeMock.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
    const { result } = setup();
    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();
  });

  it('resolves loading and sets the user once getSession returns', async () => {
    const session = { user: { id: 'user-1' } };
    const { result } = setup(session);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toEqual({ id: 'user-1' });
  });

  it('locks the parent PIN session on SIGNED_OUT', async () => {
    const { result, fireAuthEvent } = setup();
    await waitFor(() => expect(result.current.loading).toBe(false));

    fireAuthEvent('SIGNED_OUT', null);

    expect(pinLock).toHaveBeenCalledTimes(1);
  });

  it('locks the parent PIN session on USER_UPDATED', async () => {
    const { result, fireAuthEvent } = setup();
    await waitFor(() => expect(result.current.loading).toBe(false));

    fireAuthEvent('USER_UPDATED', { user: { id: 'user-1' } });

    expect(pinLock).toHaveBeenCalledTimes(1);
  });

  it('does not lock the parent PIN session on unrelated auth events', async () => {
    const { result, fireAuthEvent } = setup();
    await waitFor(() => expect(result.current.loading).toBe(false));

    fireAuthEvent('SIGNED_IN', { user: { id: 'user-1' } });
    fireAuthEvent('TOKEN_REFRESHED', { user: { id: 'user-1' } });

    expect(pinLock).not.toHaveBeenCalled();
  });

  it('unsubscribes from the auth listener on unmount', async () => {
    const { result, unmount } = setup();
    await waitFor(() => expect(result.current.loading).toBe(false));

    unmount();

    expect(unsubscribeMock).toHaveBeenCalledTimes(1);
  });

  it('signOut() locks the PIN session and calls supabase.auth.signOut()', async () => {
    signOutMock.mockResolvedValue({ error: null });
    const { result } = setup({ user: { id: 'user-1' } });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await result.current.signOut();

    expect(pinLock).toHaveBeenCalled();
    expect(signOutMock).toHaveBeenCalled();
  });

  it('signOut() swallows a rejected supabase.auth.signOut() instead of throwing', async () => {
    signOutMock.mockRejectedValue(new Error('network down'));
    const { result } = setup({ user: { id: 'user-1' } });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(result.current.signOut()).resolves.toBeUndefined();
  });

  it('signUp() forwards email/password/full name and surfaces an error object', async () => {
    signUpMock.mockResolvedValue({ error: { message: 'boom' } });
    const { result } = setup();
    await waitFor(() => expect(result.current.loading).toBe(false));

    const { error } = await result.current.signUp('test@example.com', 'Password1', 'Test User');

    expect(signUpMock).toHaveBeenCalledWith(expect.objectContaining({
      email: 'test@example.com',
      password: 'Password1',
      options: expect.objectContaining({ data: { full_name: 'Test User' } }),
    }));
    expect(error).toEqual({ message: 'boom' });
  });

  it('useAuth() throws when called outside an AuthProvider', () => {
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used within AuthProvider');
  });
});
