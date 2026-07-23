import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createTestQueryClient, queryWrapper, fakeSupabaseChain } from './testUtils';

// Gates the admin dashboard and the admin button on Dashboard.tsx. A false
// positive here would expose admin tooling to a regular parent account.

const useAuthMock = vi.fn();
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

const fromMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...args: unknown[]) => fromMock(...args) },
}));

import { useAdminRole } from '@/hooks/useAdminRole';

function render() {
  const queryClient = createTestQueryClient();
  return renderHook(() => useAdminRole(), { wrapper: queryWrapper(queryClient) });
}

describe('useAdminRole', () => {
  beforeEach(() => vi.clearAllMocks());

  it('resolves isAdmin=true when an admin row exists for the user', async () => {
    useAuthMock.mockReturnValue({ user: { id: 'user-1' } });
    fromMock.mockReturnValue(fakeSupabaseChain({ data: { role: 'admin' }, error: null }));

    const { result } = render();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isAdmin).toBe(true);
  });

  it('resolves isAdmin=false when no admin row exists', async () => {
    useAuthMock.mockReturnValue({ user: { id: 'user-1' } });
    fromMock.mockReturnValue(fakeSupabaseChain({ data: null, error: null }));

    const { result } = render();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isAdmin).toBe(false);
  });

  it('defaults to isAdmin=false and skips the query entirely when there is no user', () => {
    useAuthMock.mockReturnValue({ user: null });

    const { result } = render();

    expect(result.current.isAdmin).toBe(false);
    expect(fromMock).not.toHaveBeenCalled();
  });
});
