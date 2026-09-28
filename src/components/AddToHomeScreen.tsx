import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Share, Plus, Check, Copy, Compass, Info } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import type { InstallMode } from '@/hooks/useInstallPrompt';

/**
 * The instructions iOS refuses to give itself.
 *
 * Safari exposes no install API, so the only way onto the home screen is the
 * Share menu — which a parent will not find unprompted. These are the three
 * taps, drawn rather than described, because "tik op het deel-icoon" means
 * nothing until you have seen the glyph.
 */

/** Safari's share glyph: a box with an arrow leaving the top. */
function ShareGlyph() {
  return (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[#007AFF] text-white align-middle">
      <Share className="w-4 h-4" strokeWidth={2.5} />
    </span>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 items-start">
      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-violet-600 text-white text-sm font-black flex items-center justify-center">
        {n}
      </span>
      <span className="text-sm font-semibold text-slate-700 leading-7">{children}</span>
    </li>
  );
}

export function AddToHomeScreen({
  open,
  onOpenChange,
  mode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: InstallMode;
}) {
  const { user } = useAuth();

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      toast.success('Link gekopieerd — plak hem in Safari');
    } catch {
      toast.error('Kopiëren lukte niet. Typ leapio.app in Safari.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black text-slate-900">
            Zet Leapio op het beginscherm
          </DialogTitle>
          <DialogDescription className="text-sm font-medium text-slate-500">
            Dan opent Leapio als een echte app: eigen icoon, geen adresbalk, één tik vanaf het
            beginscherm.
          </DialogDescription>
        </DialogHeader>

        {mode === 'ios-other' ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <Compass className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs font-semibold text-amber-800">
                Dit lukt alleen in <strong>Safari</strong>. Vanuit Chrome of Firefox krijg je wel een
                icoontje, maar dat opent gewoon weer de browser.
              </p>
            </div>
            <ol className="space-y-3">
              <Step n={1}>Kopieer de link hieronder.</Step>
              <Step n={2}>Open <strong>Safari</strong> en plak hem in de adresbalk.</Step>
              <Step n={3}>Volg daar dezelfde stappen om Leapio toe te voegen.</Step>
            </ol>
            <button
              onClick={copyLink}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-bold text-white active:scale-[0.98] transition-transform"
            >
              <Copy className="w-4 h-4" /> Kopieer de link
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <ol className="space-y-3">
              <Step n={1}>
                Tik onderaan in Safari op <ShareGlyph /> <span className="text-slate-500">(delen)</span>.
              </Step>
              <Step n={2}>
                Scroll naar beneden en kies{' '}
                <strong className="whitespace-nowrap">Zet op beginscherm</strong>
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-slate-200 text-slate-700 ml-1.5 align-middle">
                  <Plus className="w-3.5 h-3.5" strokeWidth={3} />
                </span>
              </Step>
              <Step n={3}>
                Tik rechtsboven op <strong>Voeg toe</strong>.
              </Step>
            </ol>

            {user && (
              <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <Info className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs font-semibold text-slate-600">
                  De app krijgt van iPhone een eigen geheugen, dus je logt daar één keer opnieuw in.
                  Daarna blijf je ingelogd.
                </p>
              </div>
            )}

            <button
              onClick={() => onOpenChange(false)}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-bold text-white active:scale-[0.98] transition-transform"
            >
              <Check className="w-4 h-4" /> Gelukt
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
