import { toast } from 'sonner';
import React from 'react';
import { speakText } from '@/hooks/useSpeech';
import { spokenMunten } from '@/lib/buddy/payout';

/** Strip emoji & symbol characters so TTS doesn't read them aloud as "smiling face". */
function stripEmoji(text: string): string {
  return text.replace(/[\p{Extended_Pictographic}\p{Emoji_Component}]/gu, '').replace(/\s+/g, ' ').trim();
}

/**
 * Kindvriendelijke "buddy" toast — groot, vrolijk, niet alarmerend.
 * Gebruikt voor oefenfeedback en non-kritieke fouten in kind-flows.
 * Zelfde donkere nachthemel-kaart als het dashboard (zie vitrineStyles).
 */

interface BuddyToastOptions {
  emoji?: string;
  /** The Buddy's picture, shown instead of the emoji. */
  art?: string;
  /** Munten earned: shown as "+8 🪙" and said as "8 Munten" before the message. */
  munten?: number;
  duration?: number;
  onRetry?: () => void;
  retryLabel?: string;
}

function renderBubble(
  message: string,
  variant: 'oops' | 'cheer',
  opts: BuddyToastOptions = {}
) {
  const { emoji, art, munten, onRetry, retryLabel = 'Probeer opnieuw' } = opts;
  const defaultEmoji = variant === 'oops' ? '🤖' : '🎉';
  const border = variant === 'oops' ? 'border-orange-400/60' : 'border-amber-400/60';

  return (
    <div
      className={`flex w-full items-center gap-4 rounded-3xl border-[3px] ${border} bg-gradient-to-br from-[#2d1b54] via-[#241650] to-[#1a103c] p-4 text-white shadow-[0_12px_40px_rgba(0,0,0,0.45),0_0_24px_rgba(251,191,36,0.25)]`}
      style={{ fontFamily: "'Nunito', sans-serif" }}
    >
      <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center text-4xl">
        {art ? <img src={art} alt="" className="h-16 w-16 object-contain drop-shadow-lg" /> : (emoji ?? defaultEmoji)}
      </div>
      <div className="min-w-0 flex-1">
        {munten !== undefined && (
          <p className="flex items-center gap-1.5 text-3xl font-black leading-none text-amber-300">
            +{munten} <span aria-hidden className="text-2xl">🪙</span>
            <span className="sr-only">Munten</span>
          </p>
        )}
        <p className={`${munten !== undefined ? 'mt-1.5 ' : ''}text-base font-extrabold leading-snug text-white`}>{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={() => onRetry()}
            className="mt-2 inline-flex items-center gap-1 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-black text-white shadow transition-all hover:bg-amber-600 active:scale-95"
          >
            {retryLabel}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * The app's Toaster gives every toast a white card (components/ui/sonner).
 * The Buddy draws its own card, so that one is switched off here, and it
 * shows at the top in the middle, where a child looks.
 */
const BUDDY_TOAST = {
  unstyled: true,
  position: 'top-center',
  className: '!w-[min(356px,calc(100vw-32px))] !bg-transparent !border-0 !shadow-none !p-0',
} as const;

function spoken(message: string, munten?: number): string {
  const line = stripEmoji(message);
  return munten === undefined ? line : `${spokenMunten(munten)}! ${line}`;
}

export const buddyToast = {
  oops(message: string, opts: BuddyToastOptions = {}) {
    void speakText(spoken(message, opts.munten));
    return toast.custom(() => renderBubble(message, 'oops', opts), {
      ...BUDDY_TOAST,
      duration: opts.duration ?? 5000,
    });
  },
  cheer(message: string, opts: BuddyToastOptions = {}) {
    void speakText(spoken(message, opts.munten));
    return toast.custom(() => renderBubble(message, 'cheer', opts), {
      ...BUDDY_TOAST,
      duration: opts.duration ?? 4000,
    });
  },
};
