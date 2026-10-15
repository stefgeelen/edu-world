import { NightSkyScreen, PRIMARY_BUTTON } from '@/components/auth/NightSky';

/** Full-screen "couldn't load" with a retry, for screens that only redirect. */
export function LoadError({ onRetry, tone = 'light' }: { onRetry: () => void; tone?: 'light' | 'dark' }) {
  if (tone === 'dark') {
    return (
      <NightSkyScreen className="h-[100dvh] min-h-0 justify-center px-6">
        <div className="relative z-10 flex max-w-sm flex-col items-center gap-4 text-center">
          <p className="text-lg font-black text-white">Dat lukte even niet</p>
          <p className="font-semibold text-[#c9bdf0]">
            Controleer je internetverbinding en probeer het opnieuw.
          </p>
          <button
            type="button"
            onClick={onRetry}
            className={`w-full rounded-2xl py-3 font-black transition-all ${PRIMARY_BUTTON}`}
          >
            Opnieuw proberen
          </button>
        </div>
      </NightSkyScreen>
    );
  }
  return (
    <div className="h-[100dvh] w-full flex items-center justify-center bg-background px-6">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <p className="text-lg font-black text-foreground">Dat lukte even niet</p>
        <p className="font-semibold text-muted-foreground">
          Controleer je internetverbinding en probeer het opnieuw.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="w-full rounded-2xl border-b-4 border-emerald-700 bg-gradient-to-r from-emerald-500 to-cyan-500 py-3 font-black text-white transition-all active:translate-y-1 active:border-b-0"
        >
          Opnieuw proberen
        </button>
      </div>
    </div>
  );
}
