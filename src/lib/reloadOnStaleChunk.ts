/**
 * After a release, a tab that was already open still knows the old file names
 * of the lazy-loaded screens. Those files are gone, so opening such a screen
 * fails (Vite fires `vite:preloadError`). Reloading fetches the new
 * index.html with the new file names and the screen opens normally.
 *
 * Reload at most once per minute: if the reload did not help (the files are
 * really broken, or the device is offline), the error goes on to the error
 * screen instead of looping. Without sessionStorage there is no way to know,
 * so then we never reload.
 */
const KEY = 'leapio.stale-chunk-reload-at';
const MIN_GAP_MS = 60_000;

export function handlePreloadError(event: Event, now = Date.now()): boolean {
  let last: number;
  try {
    last = Number(sessionStorage.getItem(KEY) ?? 0);
    if (now - last < MIN_GAP_MS) return false;
    sessionStorage.setItem(KEY, String(now));
  } catch {
    return false;
  }
  event.preventDefault();
  window.location.reload();
  return true;
}

export function installStaleChunkReload() {
  window.addEventListener('vite:preloadError', (event) => handlePreloadError(event));
}
