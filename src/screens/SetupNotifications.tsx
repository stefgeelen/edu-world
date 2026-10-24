import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bell, Heart, Lightbulb, Moon, Smartphone } from 'lucide-react';
import { NightSkyScreen, VitrineCard, PRIMARY_BUTTON } from '@/components/auth/NightSky';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { AddToHomeScreen } from '@/components/AddToHomeScreen';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { usePushStatus } from '@/hooks/usePushNotifications';
import { cn } from '@/lib/utils';

/**
 * Onboarding step right after the parent PIN: ask once whether the parent
 * wants push notifications. Skipped on its own when there is nothing to ask
 * (already on, blocked, or a browser without push). On an iPhone in Safari
 * push only works from the home screen, so the parent gets those steps
 * instead and switches notifications on later in the parent portal.
 */
export function SetupNotifications() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirectTo = params.get('redirect') ?? '/app/add-child';
  const { status, isLoading, enable } = usePushStatus();
  const install = useInstallPrompt();
  const [showInstall, setShowInstall] = useState(false);

  const nothingToAsk = status === 'on' || status === 'denied' || status === 'unsupported';

  useEffect(() => {
    if (!isLoading && nothingToAsk) navigate(redirectTo, { replace: true });
  }, [isLoading, nothingToAsk, navigate, redirectTo]);

  if (isLoading || !status || nothingToAsk) return <LoadingSpinner tone="dark" />;

  const next = () => navigate(redirectTo, { replace: true });

  const turnOn = () => {
    enable.mutate(undefined, { onSettled: next });
  };

  return (
    <NightSkyScreen className="justify-center px-6 py-10">
      <AddToHomeScreen open={showInstall} onOpenChange={setShowInstall} mode={install.mode} />

      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', bounce: 0.5 }}
        className="relative z-10 w-20 h-20 bg-amber-400 rounded-3xl shadow-xl shadow-amber-400/25 border-b-4 border-amber-600 flex items-center justify-center mb-6"
      >
        <Bell className="w-10 h-10 text-[#1a103c]" strokeWidth={2.5} />
      </motion.div>

      <motion.h1
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-10 text-2xl md:text-3xl font-black text-white mb-2 text-center max-w-md"
      >
        Wil je weten wanneer de Buddy je kind mist?
      </motion.h1>
      <motion.p
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="relative z-10 text-[#c9bdf0] font-bold mb-8 text-center max-w-sm"
      >
        Een korte melding op je telefoon, zodat jij je kind een duwtje kan geven.
      </motion.p>

      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="relative z-10 w-full max-w-sm">
        <VitrineCard className="p-6 md:p-8 flex flex-col gap-5">
          <ul className="space-y-3 text-sm font-bold text-[#e4dcff]">
            <Reason icon={Heart}>Als de Buddy honger heeft of je kind al even niet oefende</Reason>
            <Reason icon={Lightbulb}>Als je kind iets nog moeilijk vindt, met een tip</Reason>
            <Reason icon={Moon}>Hooguit één per dag, en nooit 's avonds laat</Reason>
          </ul>

          {status === 'needs-install' ? (
            <>
              <p className="text-sm font-bold text-[#c9bdf0]">
                <Smartphone className="inline w-4 h-4 mr-1 -mt-0.5" />
                Op een iPhone of iPad werken meldingen alleen als Leapio op je beginscherm staat. Open
                Leapio daarna van daar en zet meldingen aan bij Account in het ouderportaal.
              </p>
              <button
                type="button"
                onClick={() => setShowInstall(true)}
                className={cn('w-full py-4 rounded-2xl font-black text-lg transition-all', PRIMARY_BUTTON)}
              >
                Laat zien hoe
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={turnOn}
              disabled={enable.isPending}
              className={cn('w-full py-4 rounded-2xl font-black text-lg transition-all', PRIMARY_BUTTON)}
            >
              {enable.isPending ? 'Even geduld…' : 'Meldingen aanzetten'}
            </button>
          )}

          <button
            type="button"
            onClick={next}
            disabled={enable.isPending}
            className="text-sm font-bold text-amber-300 hover:text-amber-200 transition-colors"
          >
            Later
          </button>
        </VitrineCard>
      </motion.div>

      <p className="relative z-10 text-xs font-bold text-[#9d8bce] mt-6 text-center max-w-sm">
        Je kan meldingen altijd aan- of uitzetten in het ouderportaal.
      </p>
    </NightSkyScreen>
  );
}

function Reason({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 items-start">
      <Icon className="w-5 h-5 flex-shrink-0 text-amber-300" />
      <span>{children}</span>
    </li>
  );
}
