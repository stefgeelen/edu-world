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
    throw error;
  }

  return data as T;
}
