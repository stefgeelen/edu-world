import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// The hook decides which of three very different install experiences a family
// gets. Picking the wrong one is silent: before this, every iPhone fell into
// the "browser will handle it" branch and saw nothing at all.

const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const IPHONE_CHROME =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0 Mobile/15E148 Safari/604.1';
const ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';

function setAgent(userAgent: string) {
  Object.defineProperty(navigator, 'userAgent', { value: userAgent, configurable: true });
  Object.defineProperty(navigator, 'maxTouchPoints', { value: 5, configurable: true });
}

/**
 * This project's test environment stubs localStorage as a bare object with no
 * methods, so the hook's try/catch swallows every read and write. Dismissal is
 * half the behaviour under test, so give it real storage here.
 */
function installMemoryStorage() {
  const data = new Map<string, string>();
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
      removeItem: (k: string) => void data.delete(k),
      clear: () => data.clear(),
    },
  });
}

import { useInstallPrompt } from '@/hooks/useInstallPrompt';

describe('useInstallPrompt', () => {
  beforeEach(() => {
    installMemoryStorage();
    Object.defineProperty(navigator, 'standalone', { value: undefined, configurable: true });
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList);
  });

  afterEach(() => vi.restoreAllMocks());

  it('offers guided instructions on iPhone Safari, where no install API exists', () => {
    setAgent(IPHONE_SAFARI);
    const { result } = renderHook(() => useInstallPrompt());

    expect(result.current.mode).toBe('ios-safari');
    expect(result.current.shouldOffer).toBe(true);
  });

  it('sends the parent to Safari when they are in another iPhone browser', () => {
    setAgent(IPHONE_CHROME);
    const { result } = renderHook(() => useInstallPrompt());

    expect(result.current.mode).toBe('ios-other');
    expect(result.current.shouldOffer).toBe(true);
  });

  it('offers nothing on a platform that has neither the API nor instructions', () => {
    setAgent(ANDROID);
    const { result } = renderHook(() => useInstallPrompt());

    expect(result.current.mode).toBe('none');
    expect(result.current.shouldOffer).toBe(false);
  });

  it('switches to the one-tap flow once the browser offers to install', () => {
    setAgent(ANDROID);
    const { result } = renderHook(() => useInstallPrompt());

    act(() => {
      const event = new Event('beforeinstallprompt');
      window.dispatchEvent(event);
    });

    expect(result.current.mode).toBe('native');
  });

  it('offers nothing once the app is already running from the home screen', () => {
    setAgent(IPHONE_SAFARI);
    Object.defineProperty(navigator, 'standalone', { value: true, configurable: true });

    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.mode).toBe('installed');
    expect(result.current.shouldOffer).toBe(false);
  });

  it('stops offering for a fortnight after a dismissal, then offers again', () => {
    setAgent(IPHONE_SAFARI);
    const { result, rerender } = renderHook(() => useInstallPrompt());

    act(() => result.current.dismiss());
    expect(result.current.shouldOffer).toBe(false);

    // Fifteen days later the parent may well have changed their mind.
    const fifteenDaysAgo = Date.now() - 15 * 24 * 60 * 60 * 1000;
    localStorage.setItem('pwa-install-dismissed-at', String(fifteenDaysAgo));
    rerender();

    const { result: later } = renderHook(() => useInstallPrompt());
    expect(later.current.shouldOffer).toBe(true);
  });

  it('treats the old permanent dismissal flag as a fresh dismissal, not as garbage', () => {
    setAgent(IPHONE_SAFARI);
    localStorage.setItem('pwa-install-dismissed-at', 'true');

    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.shouldOffer).toBe(false);
  });
});
