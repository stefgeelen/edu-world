import { describe, it, expect, vi, beforeEach } from 'vitest';

// invokeFunction is the single choke point for every edge-function call, so the
// error paths matter more than the happy one: a failure here is what an admin
// or a child actually sees.

const invoke = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invoke(...args) } },
}));

import { invokeFunction, EdgeFunctionTimeoutError } from '@/lib/invokeFunction';

/** What supabase-js throws for any non-2xx: a generic message + the Response. */
function httpError(status: number, body: unknown) {
  const error = new Error('Edge Function returned a non-2xx status code') as Error & {
    context?: unknown;
  };
  error.context = new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
  return error;
}

describe('invokeFunction', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the payload on success', async () => {
    invoke.mockResolvedValue({ data: { success: true }, error: null });
    await expect(invokeFunction('admin-delete-user', { userId: 'x' })).resolves.toEqual({ success: true });
  });

  it('replaces the generic non-2xx message with the server’s own reason', async () => {
    invoke.mockResolvedValue({
      data: null,
      error: httpError(403, { error: 'Forbidden: admin role required' }),
    });

    await expect(invokeFunction('admin-delete-user', { userId: 'x' }))
      .rejects.toThrow('Forbidden: admin role required');
  });

  it('includes the details field when the function supplies one', async () => {
    invoke.mockResolvedValue({
      data: null,
      error: httpError(500, { error: 'Failed to delete auth user', details: 'user not found' }),
    });

    await expect(invokeFunction('admin-delete-user', { userId: 'x' }))
      .rejects.toThrow('Failed to delete auth user (user not found)');
  });

  it('keeps the original error when the body carries no usable message', async () => {
    invoke.mockResolvedValue({ data: null, error: httpError(500, { unexpected: true }) });

    await expect(invokeFunction('admin-delete-user', { userId: 'x' }))
      .rejects.toThrow('Edge Function returned a non-2xx status code');
  });

  it('keeps the original error when the body is not JSON at all', async () => {
    const error = new Error('Edge Function returned a non-2xx status code') as Error & { context?: unknown };
    error.context = new Response('<html>502</html>', { status: 502 });
    invoke.mockResolvedValue({ data: null, error });

    await expect(invokeFunction('admin-delete-user', { userId: 'x' }))
      .rejects.toThrow('Edge Function returned a non-2xx status code');
  });

  it('still reports a timeout as a timeout, not as a server message', async () => {
    const error = new Error('failed to fetch') as Error & { context?: unknown };
    error.context = { name: 'AbortError' };
    invoke.mockResolvedValue({ data: null, error });

    await expect(invokeFunction('recognize-digit', {}, 5_000))
      .rejects.toBeInstanceOf(EdgeFunctionTimeoutError);
  });
});
