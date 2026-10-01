import { useEffect } from 'react';
import { triggerConfetti } from '@/lib/confetti';
import { useSpeech } from '@/hooks/useSpeech';
import type { GrowthForm } from '@/lib/buddy/growth';

/** Full-screen party when the Buddy has grown into a new form. */
export function GrowthMoment({ name, form, onDone }: { name: string; form: GrowthForm; onDone: () => void }) {
  const { speak } = useSpeech();
  const text = `Joepie, ik ben gegroeid! Nu ben ik ${form.title}!`;

  useEffect(() => {
    triggerConfetti('large');
    speak(text);
    // Once, when the moment opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="growth-title">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
        <p className="text-5xl" aria-hidden>
          🌱✨
        </p>
        <h2 id="growth-title" className="mt-2 text-2xl font-black text-foreground">
          {name} is gegroeid!
        </h2>
        <p className="mt-1 text-base font-bold text-muted-foreground">Nu is het {form.title}.</p>
        {form.accessories.length > 0 && (
          <p className="mt-3 text-4xl" aria-hidden>
            {form.accessories.join(' ')}
          </p>
        )}
        <button
          type="button"
          onClick={onDone}
          className="mt-5 min-h-14 w-full rounded-3xl bg-edu-green px-6 py-3 text-lg font-black text-white shadow-lg active:scale-[0.98]"
        >
          Joepie! 🎉
        </button>
      </div>
    </div>
  );
}
