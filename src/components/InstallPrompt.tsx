import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { AddToHomeScreen } from '@/components/AddToHomeScreen';
import { Download, X, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Bottom banner offering to put Leapio on the home screen.
 *
 * Two things it used to get wrong. It only ever appeared where
 * `beforeinstallprompt` fires, which is every platform except the one most of
 * these families use — on iPhone it was silently dead. And it appeared on the
 * marketing pages, competing with the signup form it was sitting on top of.
 *
 * Now it runs on the signed-in screens only, and iOS gets the guided sheet.
 */

/** Long enough that it never lands on top of a page the parent is still reading. */
const APPEAR_AFTER_MS = 4000;

/** Screens where an install offer makes sense: the app itself and the door to it. */
function isRelevantRoute(pathname: string) {
  return pathname.startsWith('/app') || pathname === '/auth';
}

export function InstallPrompt() {
  const { pathname } = useLocation();
  const { mode, shouldOffer, promptInstall, dismiss } = useInstallPrompt();
  const [visible, setVisible] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const eligible = shouldOffer && isRelevantRoute(pathname);

  useEffect(() => {
    if (!eligible) {
      setVisible(false);
      return;
    }
    const timer = setTimeout(() => setVisible(true), APPEAR_AFTER_MS);
    return () => clearTimeout(timer);
  }, [eligible]);

  const handleAction = () => {
    if (mode === 'native') {
      void promptInstall();
      return;
    }
    setSheetOpen(true);
  };

  return (
    <>
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-sm"
          >
            <div className="relative rounded-2xl bg-gradient-to-r from-[hsl(var(--edu-blue))] to-[hsl(var(--edu-teal))] p-4 shadow-xl">
              <button
                onClick={() => { setVisible(false); dismiss(); }}
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
                  <p className="font-bold text-white text-sm">Zet Leapio op je beginscherm 🎒</p>
                  <p className="text-white/80 text-xs mt-0.5">
                    {mode === 'native'
                      ? 'Eén tik, en Leapio opent als een echte app.'
                      : 'Dan opent Leapio als een echte app, met een eigen icoon.'}
                  </p>
                </div>
              </div>

              <button
                onClick={handleAction}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-sm font-bold text-[hsl(var(--edu-blue))] transition-transform active:scale-95"
              >
                <Download className="h-4 w-4" />
                {mode === 'native' ? 'Installeren' : 'Laat zien hoe'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AddToHomeScreen open={sheetOpen} onOpenChange={setSheetOpen} mode={mode} />
    </>
  );
}
