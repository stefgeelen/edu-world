import { describe, it, expect, afterEach, vi } from 'vitest';
import { isIos, isIosSafari, isStandalone } from '@/lib/platform';

// Every branch of the install flow hangs off these three predicates, and they
// are all user-agent sniffing, which rots quietly. The fixtures below are real
// strings; if one stops matching, the iPhone install flow silently disappears
// again — which is exactly the bug this replaced.

const UA = {
  iphoneSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
  iphoneChrome:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.108 Mobile/15E148 Safari/604.1',
  iphoneFirefox:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/127.0 Mobile/15E148 Safari/605.1.15',
  ipadOs:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  macSafari:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  androidChrome:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
};

function setAgent(userAgent: string, maxTouchPoints = 5) {
  Object.defineProperty(navigator, 'userAgent', { value: userAgent, configurable: true });
  Object.defineProperty(navigator, 'maxTouchPoints', { value: maxTouchPoints, configurable: true });
}

afterEach(() => {
  Object.defineProperty(navigator, 'standalone', { value: undefined, configurable: true });
  vi.restoreAllMocks();
});

describe('isIos', () => {
  it('recognises an iPhone', () => {
    setAgent(UA.iphoneSafari);
    expect(isIos()).toBe(true);
  });

  it('recognises iPadOS, which claims to be a Mac but has a touchscreen', () => {
    setAgent(UA.ipadOs, 5);
    expect(isIos()).toBe(true);
  });

  it('does not mistake a desktop Mac for an iPad', () => {
    setAgent(UA.macSafari, 0);
    expect(isIos()).toBe(false);
  });

  it('is false on Android', () => {
    setAgent(UA.androidChrome);
    expect(isIos()).toBe(false);
  });
});

describe('isIosSafari', () => {
  it('is true in Safari on iPhone', () => {
    setAgent(UA.iphoneSafari);
    expect(isIosSafari()).toBe(true);
  });

  // Both of these carry "Safari/605" in their agent string, so a naive check
  // would treat them as Safari and hand the parent instructions that cannot work.
  it('is false in Chrome on iPhone despite the Safari token', () => {
    setAgent(UA.iphoneChrome);
    expect(isIosSafari()).toBe(false);
  });

  it('is false in Firefox on iPhone despite the Safari token', () => {
    setAgent(UA.iphoneFirefox);
    expect(isIosSafari()).toBe(false);
  });
});

describe('isStandalone', () => {
  it('uses the iOS-only navigator.standalone flag', () => {
    setAgent(UA.iphoneSafari);
    Object.defineProperty(navigator, 'standalone', { value: true, configurable: true });
    expect(isStandalone()).toBe(true);
  });

  it('falls back to the display-mode media query elsewhere', () => {
    setAgent(UA.androidChrome);
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
    expect(isStandalone()).toBe(true);
  });

  it('is false in an ordinary browser tab', () => {
    setAgent(UA.iphoneSafari);
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList);
    expect(isStandalone()).toBe(false);
  });
});
