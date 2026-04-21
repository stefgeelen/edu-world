import { toast } from 'sonner';
import React from 'react';

/**
 * Kindvriendelijke "buddy" toast — groot, vrolijk, niet alarmerend.
 * Gebruikt voor oefenfeedback en non-kritieke fouten in kind-flows.
 */

interface BuddyToastOptions {
  emoji?: string;
  duration?: number;
  onRetry?: () => void;
  retryLabel?: string;
}

function renderBubble(
  message: string,
  variant: 'oops' | 'cheer',
  opts: BuddyToastOptions = {}
) {
  const { emoji, onRetry, retryLabel = 'Probeer opnieuw' } = opts;
  const defaultEmoji = variant === 'oops' ? '🤖' : '🎉';
  const ring =
    variant === 'oops'
      ? 'from-amber-400 to-orange-500 shadow-amber-500/40'
      : 'from-emerald-400 to-teal-500 shadow-emerald-500/40';

  return (
    <div className="flex items-start gap-3 w-full">
      <div
        className={`flex-shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br ${ring} shadow-lg flex items-center justify-center text-2xl`}
      >
        {emoji ?? defaultEmoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-base font-bold text-slate-900 leading-snug">{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={() => onRetry()}
            className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black shadow active:scale-95 transition-all"
          >
            {retryLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export const buddyToast = {
  oops(message: string, opts: BuddyToastOptions = {}) {
    return toast.custom(() => renderBubble(message, 'oops', opts), {
      duration: opts.duration ?? 5000,
    });
  },
  cheer(message: string, opts: BuddyToastOptions = {}) {
    return toast.custom(() => renderBubble(message, 'cheer', opts), {
      duration: opts.duration ?? 4000,
    });
  },
};
