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
  const border = variant === 'oops' ? 'border-orange-400/50' : 'border-amber-400/40';

  return (
    <div
      className={`flex w-full items-center gap-3 rounded-3xl border-[3px] ${border} bg-gradient-to-br from-[#241650] to-[#1a103c] p-3 text-white shadow-[0_8px_32px_rgba(251,191,36,0.15)]`}
      style={{ fontFamily: "'Nunito', sans-serif" }}
    >
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border-2 border-[#3b2d71] bg-[#0f0828]/80 text-2xl">
        {art ? <img src={art} alt="" className="h-11 w-11 object-contain" /> : (emoji ?? defaultEmoji)}
      </div>
      <div className="min-w-0 flex-1">
        {munten !== undefined && (
          <span className="mb-1 inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-sm font-black text-amber-200">
            +{munten} <span aria-hidden>🪙</span>
          </span>
        )}
        <p className="text-base font-bold leading-snug text-white/90">{message}</p>
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

function spoken(message: string, munten?: number): string {
  const line = stripEmoji(message);
  return munten === undefined ? line : `${spokenMunten(munten)}! ${line}`;
}

export const buddyToast = {
  oops(message: string, opts: BuddyToastOptions = {}) {
    void speakText(spoken(message, opts.munten));
    return toast.custom(() => renderBubble(message, 'oops', opts), {
      duration: opts.duration ?? 5000,
      unstyled: true,
    });
  },
  cheer(message: string, opts: BuddyToastOptions = {}) {
    void speakText(spoken(message, opts.munten));
    return toast.custom(() => renderBubble(message, 'cheer', opts), {
      duration: opts.duration ?? 4000,
      unstyled: true,
    });
  },
};
