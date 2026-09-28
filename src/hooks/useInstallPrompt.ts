import { useState, useEffect, useCallback } from 'react';
import { isIos, isIosSafari, isStandalone } from '@/lib/platform';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * How this device can get Leapio onto the home screen.
 *
 * - `installed`   already running from the home screen; offer nothing
 * - `native`      the browser fires beforeinstallprompt; one tap does it
 * - `ios-safari`  no install API exists; the user must be talked through Share → Zet op beginscherm
 * - `ios-other`   Chrome/Firefox on iOS: their shortcut opens in the browser, so send the user to Safari
 * - `none`        nothing useful to offer
 */
export type InstallMode = 'installed' | 'native' | 'ios-safari' | 'ios-other' | 'none';

const DISMISSED_KEY = 'pwa-install-dismissed-at';

/** A dismissal holds for a fortnight rather than forever: installing later is still a win. */
const DISMISS_DURATION_MS = 14 * 24 * 60 * 60 * 1000;

function readDismissedAt(): number {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (raw === 'true') return Date.now(); // migrate the old permanent flag
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0; // private mode, blocked storage — treat as never dismissed
  }
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() => isStandalone());
  const [dismissedAt, setDismissedAt] = useState(readDismissedAt);

  useEffect(() => {
    if (installed) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const installedHandler = () => setInstalled(true);

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, [installed]);

  const mode: InstallMode = installed
    ? 'installed'
    : deferredPrompt
      ? 'native'
      : isIosSafari()
        ? 'ios-safari'
        : isIos()
          ? 'ios-other'
          : 'none';

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (outcome === 'accepted') {
      setInstalled(true);
      return true;
    }
    return false;
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    const now = Date.now();
    setDismissedAt(now);
    try {
      localStorage.setItem(DISMISSED_KEY, String(now));
    } catch {
      // Storage blocked: the banner reappears next visit. Acceptable.
    }
  }, []);

  const recentlyDismissed = Date.now() - dismissedAt < DISMISS_DURATION_MS;

  return {
    mode,
    isInstalled: installed,
    /** Whether a prompt is worth showing right now. */
    shouldOffer: mode !== 'installed' && mode !== 'none' && !recentlyDismissed,
    promptInstall,
    dismiss,
  };
}
