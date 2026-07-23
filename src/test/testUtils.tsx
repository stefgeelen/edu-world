import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Shared helpers for hook/component tests. Keeps the React Query wrapper and
 * the Supabase chain-mock boilerplate in one place instead of copy-pasted
 * across every test file.
 */

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

export function queryWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

/**
 * Builds a fake `supabase.from(table)` chain that resolves to `result` for
 * whichever terminal method is called (maybeSingle/single/then via await).
 * Every chain method (select/eq/order/limit/gte/...) returns `this`, so
 * queries with any number/order of filters work without bespoke mocks.
 *
 * Usage:
 *   const supabase = { from: vi.fn((table) => fakeSupabaseChain(resultsByTable[table])) };
 */
export function fakeSupabaseChain<T>(result: { data: T; error: unknown } | (() => { data: T; error: unknown })) {
  const resolve = () => (typeof result === 'function' ? (result as () => { data: T; error: unknown })() : result);

  const chain: Record<string, unknown> = {};
  const methods = ['select', 'eq', 'order', 'limit', 'gte', 'lte', 'in', 'is', 'neq', 'insert', 'update', 'delete', 'upsert'];
  for (const m of methods) {
    chain[m] = () => chain;
  }
  chain.maybeSingle = async () => resolve();
  chain.single = async () => resolve();
  // Supabase query builders are thenables — `await supabase.from(...).select(...)`
  // resolves without calling maybeSingle/single.
  chain.then = (onFulfilled: (v: { data: T; error: unknown }) => unknown) => Promise.resolve(resolve()).then(onFulfilled);

  return chain;
}
