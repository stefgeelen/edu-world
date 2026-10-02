import { useEffect } from 'react';
import { triggerConfetti } from '@/lib/confetti';
import { useSpeech } from '@/hooks/useSpeech';
import type { GrowthForm } from '@/lib/buddy/growth';
import { cn } from '@/lib/utils';
import { Ornaments } from '@/components/dashboard/Vitrine';
import { VITRINE } from '@/components/dashboard/vitrineStyles';

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
      <div className={cn(VITRINE, "w-full max-w-sm border-amber-400/50 p-6 text-center shadow-[0_20px_60px_rgba(251,191,36,0.3)]")}>
        <Ornaments tone="border-amber-400/50" />
        <p className="text-5xl" aria-hidden>
          🌱✨
        </p>
        <h2 id="growth-title" className="mt-2 bg-gradient-to-r from-amber-200 to-yellow-400 bg-clip-text text-2xl font-black text-transparent">
          {name} is gegroeid!
        </h2>
        <p className="mt-1 text-base font-bold text-[#a78bfa]">Nu is het {form.title}.</p>
        {form.accessories.length > 0 && (
          <p className="mt-3 text-4xl" aria-hidden>
            {form.accessories.join(' ')}
          </p>
        )}
        <button
          type="button"
          onClick={onDone}
          className="relative z-10 mt-5 min-h-14 w-full rounded-2xl border-b-4 border-orange-700 bg-gradient-to-r from-amber-400 to-orange-500 px-6 py-3 text-lg font-black text-white shadow-lg transition-all active:translate-y-1 active:border-b-0"
        >
          Joepie! 🎉
        </button>
      </div>
    </div>
  );
}
