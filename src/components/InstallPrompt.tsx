import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { Download, X, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * A friendly, non-intrusive install banner that slides up
 * from the bottom. Only shows when the browser supports
 * installation and the user hasn't dismissed it.
 */
export function InstallPrompt() {
  const { canInstall, promptInstall, dismiss } = useInstallPrompt();

  return (
    <AnimatePresence>
      {canInstall && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200, delay: 3 }}
          className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-sm"
        >
          <div className="relative rounded-2xl bg-gradient-to-r from-[hsl(var(--edu-blue))] to-[hsl(var(--edu-teal))] p-4 shadow-xl">
            <button
              onClick={dismiss}
              className="absolute right-2 top-2 rounded-full p-1 text-white/70 hover:text-white transition-colors"
              aria-label="Sluiten"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <Smartphone className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-sm">
                  Voeg Leapio toe! 🎒
                </p>
                <p className="text-white/80 text-xs mt-0.5">
                  Installeer de app op je startscherm voor snelle toegang
                </p>
              </div>
            </div>

            <button
              onClick={promptInstall}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-sm font-bold text-[hsl(var(--edu-blue))] transition-transform active:scale-95"
            >
              <Download className="h-4 w-4" />
              Installeren
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
