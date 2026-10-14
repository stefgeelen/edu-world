import type { UseQueryResult } from '@tanstack/react-query';

/**
 * Nothing loaded yet and it will not without help: the request failed, or it
 * is waiting for a network that is not there (React Query pauses it offline).
 * Data from an earlier load counts as loaded.
 */
export function loadFailed(query: Pick<UseQueryResult, 'data' | 'isError' | 'fetchStatus'>): boolean {
  return query.data === undefined && (query.isError || query.fetchStatus === 'paused');
}
