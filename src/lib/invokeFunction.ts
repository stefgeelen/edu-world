import { supabase } from '@/integrations/supabase/client';

/** Edge functions get this long before we give up on them. */
export const EDGE_FUNCTION_TIMEOUT_MS = 12_000;

export class EdgeFunctionTimeoutError extends Error {
  constructor(name: string, ms: number) {
    super(`Edge function "${name}" timed out after ${ms}ms`);
    this.name = 'EdgeFunctionTimeoutError';
  }
}

/** An aborted fetch surfaces as a FunctionsFetchError wrapping an AbortError. */
function isAbort(error: unknown): boolean {
  const context = (error as { context?: unknown })?.context;
  return (context as { name?: string })?.name === 'AbortError';
}

/**
 * Pull the server's own explanation out of a failed call.
 *
 * On any non-2xx status supabase-js throws a FunctionsHttpError whose message
 * is the same generic sentence every time ("Edge Function returned a non-2xx
 * status code"), with the actual reason left unread in the response body. That
 * turned every edge-function failure into an unactionable toast: an admin
 * seeing "verwijderen mislukt" could not tell a missing role from a database
 * error. The Response is attached as `context`, so read it.
 */
async function serverMessage(error: unknown): Promise<string | null> {
  const context = (error as { context?: unknown })?.context;
  if (typeof Response === 'undefined' || !(context instanceof Response)) return null;

  try {
    // Clone: the caller may still want to read the body itself.
    const body = await context.clone().json();
    const message = body?.error ?? body?.message;
    if (typeof message !== 'string') return null;
    return typeof body?.details === 'string' ? `${message} (${body.details})` : message;
  } catch {
    return null;
  }
}

/**
 * `supabase.functions.invoke` with a deadline, throwing on failure.
 *
 * Without a timeout a hung edge function leaves the caller waiting forever — on
 * the exercise screens that means a child staring at a frozen question with no
 * way to continue. Callers can catch EdgeFunctionTimeoutError to show a retry
 * instead of a generic failure.
 */
export async function invokeFunction<T>(
  name: string,
  body: unknown,
  timeoutMs: number = EDGE_FUNCTION_TIMEOUT_MS
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, {
    body,
    timeout: timeoutMs,
  });

  if (error) {
    if (isAbort(error)) throw new EdgeFunctionTimeoutError(name, timeoutMs);
    const detail = await serverMessage(error);
    if (detail) throw new Error(detail);
    throw error;
  }

  return data as T;
}
