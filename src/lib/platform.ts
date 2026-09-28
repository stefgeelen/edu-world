/**
 * Platform detection for the install flow.
 *
 * Kept in one place because the install experience branches on it three ways:
 * iOS Safari can only be talked through the manual Share → Add to Home Screen
 * path, other iOS browsers cannot produce a standalone app at all, and every
 * other platform fires `beforeinstallprompt` and needs no instructions.
 */

/** Browsers on iOS that are not Safari. Their home-screen shortcuts open inside the browser. */
const IOS_NON_SAFARI = /CriOS|FxiOS|EdgiOS|OPiOS|YaBrowser|DuckDuckGo|Brave/;

/** Already running from the home screen rather than in a browser tab. */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;

  // iOS never implemented display-mode for home-screen apps and uses this
  // non-standard flag instead; everything else reports the display mode.
  if ((window.navigator as Navigator & { standalone?: boolean }).standalone === true) return true;

  return window.matchMedia?.('(display-mode: standalone)').matches ?? false;
}

export function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;

  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return true;

  // iPadOS 13+ reports itself as a Mac. Touch points give it away.
  return /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
}

export function isIosSafari(): boolean {
  return isIos() && !IOS_NON_SAFARI.test(navigator.userAgent);
}
