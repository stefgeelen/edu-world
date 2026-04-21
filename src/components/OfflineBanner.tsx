import React from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

const PARENT_ROUTE_PREFIXES = ['/app/parent', '/admin', '/auth'];

/**
 * Globale offline-banner. Toont een aangepaste boodschap voor kind- of
 * ouderroutes. Sticky bovenaan de viewport.
 */
export function OfflineBanner() {
  const online = useOnlineStatus();
  const { pathname } = useLocation();

  const isParentArea = PARENT_ROUTE_PREFIXES.some((p) => pathname.startsWith(p));

  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: 'spring', bounce: 0.3, duration: 0.5 }}
          className="fixed top-0 inset-x-0 z-[100] pointer-events-none"
          role="status"
          aria-live="polite"
        >
          {isParentArea ? (
            <div className="bg-slate-900 text-white text-xs font-bold py-2 px-4 flex items-center justify-center gap-2 shadow-md pointer-events-auto">
              <WifiOff className="w-3.5 h-3.5" />
              Geen internetverbinding
            </div>
          ) : (
            <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-white py-3 px-5 flex items-center justify-center gap-3 shadow-xl pointer-events-auto">
              <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-xl">
                📡
              </div>
              <p className="text-sm md:text-base font-black">
                Geen internet — vraag een grote om hulp!
              </p>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
