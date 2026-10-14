import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handlePreloadError, installStaleChunkReload } from '@/lib/reloadOnStaleChunk';

describe('reloading after a release made lazy screens stale', () => {
  const reload = vi.fn();
  const originalLocation = window.location;

  beforeEach(() => {
    sessionStorage.clear();
    reload.mockReset();
    Object.defineProperty(window, 'location', { configurable: true, value: { ...originalLocation, reload } });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('reloads the page the first time a screen fails to load', () => {
    const event = new Event('vite:preloadError', { cancelable: true });

    expect(handlePreloadError(event, Date.now())).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it('does not loop when the screen still fails right after the reload', () => {
    const now = Date.now();
    handlePreloadError(new Event('vite:preloadError', { cancelable: true }), now);
    const second = new Event('vite:preloadError', { cancelable: true });

    expect(handlePreloadError(second, now + 2_000)).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(second.defaultPrevented).toBe(false);
  });

  it('reloads again for a later release in the same tab', () => {
    const now = Date.now();
    handlePreloadError(new Event('vite:preloadError', { cancelable: true }), now);

    expect(handlePreloadError(new Event('vite:preloadError', { cancelable: true }), now + 5 * 60_000)).toBe(true);
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it('never reloads when sessionStorage is blocked', () => {
    vi.stubGlobal('sessionStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
    });

    expect(handlePreloadError(new Event('vite:preloadError', { cancelable: true }))).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });

  it('listens for Vite preload errors on the window', () => {
    const add = vi.spyOn(window, 'addEventListener');
    installStaleChunkReload();
    const listener = add.mock.calls.find(([type]) => type === 'vite:preloadError')?.[1] as EventListener;
    add.mockRestore();
    window.removeEventListener('vite:preloadError', listener);

    expect(listener).toBeTypeOf('function');
    listener(new Event('vite:preloadError', { cancelable: true }));
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
