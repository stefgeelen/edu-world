/**
 * Remembers which lines the Buddy already read aloud in this browser session
 * (sessionStorage: gone when the tab or app is closed), so returning to a
 * screen after an exercise does not repeat the same sentence. A different
 * sentence is still read. Kept per child, so a brother or sister on the same
 * tablet hears it too.
 *
 * Storage can be missing or blocked (private mode); then it only lasts until
 * the page reloads.
 */
const key = (scope: string) => `leapio.spoken.${scope}`;
const memory = new Map<string, string[]>();

function spoken(scope: string): string[] {
  if (memory.has(scope)) return memory.get(scope)!;
  try {
    const raw = sessionStorage.getItem(key(scope));
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/** True the first time `text` comes by for this scope in this session; it then counts as said. */
export function firstTimeSpoken(scope: string, text: string): boolean {
  const list = spoken(scope);
  if (list.includes(text)) return false;
  const next = [...list, text];
  memory.set(scope, next);
  try {
    sessionStorage.setItem(key(scope), JSON.stringify(next));
  } catch {
    // Only in memory then.
  }
  return true;
}

/** For tests: forget everything that was said. */
export function resetSpoken() {
  memory.clear();
  try {
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith('leapio.spoken.'))
      .forEach((k) => sessionStorage.removeItem(k));
  } catch {
    // Nothing to clear.
  }
}
