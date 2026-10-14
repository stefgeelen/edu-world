import { Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePlayers, type Player } from '@/hooks/usePlayers';
import { setPlayingChildId, usePlayingChildId } from '@/lib/playingChild';
import { buddySpecies } from '@/lib/buddy/species';
import { cn } from '@/lib/utils';
import { Ornaments, StarryBackground } from '@/components/dashboard/Vitrine';
import { VITRINE } from '@/components/dashboard/vitrineStyles';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { LoadError } from '@/components/LoadError';
import { loadFailed } from '@/lib/queryStatus';
import { APP_PATHS } from '@/routes/paths';

/**
 * "Wie speelt er?": each child taps their own Buddy. This device remembers the
 * choice, so it only shows again via the "Wissel" button on the dashboard (or
 * when the remembered child is gone or paused). A child that has not chosen a
 * Buddy yet goes on to "Kies je Buddy" through AppStart.
 */
export function WhoIsPlaying() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const playingChildId = usePlayingChildId(user?.id);
  const playersQuery = usePlayers();
  const { data: players } = playersQuery;

  if (loadFailed(playersQuery)) return <LoadError onRetry={() => void playersQuery.refetch()} />;
  if (players === undefined) return <LoadingSpinner />;
  if (players.length === 0) return <Navigate to={APP_PATHS.start} replace />;

  const play = (player: Player) => {
    if (player.paused || !user) return;
    setPlayingChildId(user.id, player.id);
    navigate(APP_PATHS.start, { replace: true });
  };

  return (
    <div className="relative flex h-full w-full flex-col overflow-y-auto bg-gradient-to-b from-[#2d1b54] via-[#1a103c] to-[#0a0618] pb-10" style={{ fontFamily: "'Nunito', sans-serif" }}>
      <StarryBackground />

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-10 sm:pt-14">
        <header className="text-center">
          <h1 className="bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 bg-clip-text text-3xl font-black leading-tight text-transparent">
            Wie speelt er?
          </h1>
          <p className="mt-2 text-sm font-semibold text-white/75">Tik op jouw Buddy.</p>
        </header>

        <div className="mt-8 grid grid-cols-2 gap-3">
          {players.map((player, i) => {
            const buddy = player.species ? buddySpecies(player.species) : null;
            const current = player.id === playingChildId && !player.paused;
            return (
              <motion.button
                key={player.id}
                type="button"
                disabled={player.paused}
                onClick={() => play(player)}
                aria-label={player.paused ? `${player.name}, gepauzeerd` : player.name}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className={cn(
                  VITRINE,
                  'flex flex-col items-center p-3 transition-all outline-none focus-visible:ring-4 focus-visible:ring-white/70',
                  player.paused
                    ? 'cursor-not-allowed border-[#3b2d71] opacity-45 grayscale'
                    : 'active:scale-[0.97]',
                  current ? 'border-amber-400 shadow-[0_0_28px_rgba(251,191,36,0.35)]' : !player.paused && 'border-[#3b2d71]',
                )}
              >
                {current && <Ornaments tone="border-amber-400/60" />}
                <div className="relative flex h-28 w-28 items-center justify-center sm:h-32 sm:w-32">
                  {buddy ? (
                    <img src={buddy.art.happy} alt="" draggable={false} className="h-full w-full select-none object-contain" />
                  ) : (
                    <span className="flex h-24 w-24 items-center justify-center rounded-full border-[3px] border-dashed border-amber-300/50 text-5xl font-black text-amber-200/80">
                      ?
                    </span>
                  )}
                  {player.paused && (
                    <span className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#3b2d71] bg-[#0f0828]">
                      <Lock className="h-4 w-4 text-white/80" aria-hidden />
                    </span>
                  )}
                </div>
                <span className={cn('mt-1 max-w-full truncate text-lg font-black', current ? 'text-amber-200' : 'text-white/90')}>
                  {player.name}
                </span>
                <span className="text-xs font-semibold text-white/55">
                  {player.paused ? 'Gepauzeerd' : buddy ? `met ${buddy.name}` : 'Kies je Buddy!'}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
