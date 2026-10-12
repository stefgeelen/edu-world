import { useSyncExternalStore } from 'react';

/**
 * Which child plays on this device, chosen on "Wie speelt er?". Kept per
 * device (localStorage) and per parent account, so a child's own tablet never
 * asks again while a shared tablet asks once and then remembers.
 *
 * Storage can be missing or blocked (private mode); then the choice only
 * lasts until the page reloads.
 */
const key = (userId: string) => `leapio.playing-child.${userId}`;
const memory = new Map<string, string | null>();
const listeners = new Set<() => void>();

export function getPlayingChildId(userId: string | undefined): string | null {
  if (!userId) return null;
  if (memory.has(userId)) return memory.get(userId) ?? null;
  try {
    return localStorage.getItem(key(userId));
  } catch {
    return null;
  }
}

export function setPlayingChildId(userId: string, childId: string | null) {
  memory.set(userId, childId);
  try {
    if (childId) localStorage.setItem(key(userId), childId);
    else localStorage.removeItem(key(userId));
  } catch {
    // Kept in memory only.
  }
  listeners.forEach(l => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePlayingChildId(userId: string | undefined) {
  return useSyncExternalStore(subscribe, () => getPlayingChildId(userId), () => null);
}
