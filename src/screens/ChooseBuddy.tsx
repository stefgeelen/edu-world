import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { mapDbError } from '@/lib/errorMessages';
import { cn } from '@/lib/utils';
import { useCurrentChild } from '@/hooks/useCompleteExercise';
import { useBuddyRow } from '@/hooks/useBuddy';
import { useSpeech } from '@/hooks/useSpeech';
import { BUDDY_SPECIES_LIST, buddyChoiceMode, buddySpecies, type BuddySpeciesId } from '@/lib/buddy/species';
import { Ornaments, StarryBackground } from '@/components/dashboard/Vitrine';
import { VITRINE } from '@/components/dashboard/vitrineStyles';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { APP_PATHS } from '@/routes/paths';

/**
 * Het kind kiest zijn Buddy: de eerste keer, en daarna één keer per schooljaar
 * (blijven of wisselen). Wisselen verandert alleen het dier; Munten, voorraad
 * en groei blijven. De server bewaakt "één keer per schooljaar" (`buddy_choose`).
 */
export function ChooseBuddy() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { speak } = useSpeech();
  const { data: child } = useCurrentChild();
  const { data: buddyRow, isLoading } = useBuddyRow();
  const current = buddyRow ? buddySpecies(buddyRow.species).id : null;
  const mode = buddyRow ? buddyChoiceMode(buddyRow.species_school_year, new Date()) : null;
  const [picked, setPicked] = useState<BuddySpeciesId | null>(null);
  // Bij de jaarlijkse keuze staat de huidige Buddy al klaar.
  const selected = picked ?? (mode === 'yearly' ? current : null);

  const choose = useMutation({
    mutationFn: async (species: BuddySpeciesId) => {
      const { error } = await supabase.rpc('buddy_choose', { p_child_id: child!.id, p_species: species });
      if (error) throw error;
    },
    onSuccess: async () => {
      // Eerst de nieuwe Buddy laden, anders ziet het kind even de oude in zijn kamer.
      await queryClient.invalidateQueries({ queryKey: ['buddy-state', child?.id] });
      navigate(APP_PATHS.home, { replace: true });
    },
    onError: (e) => toast.error(mapDbError(e) || 'Je Buddy kiezen lukte niet. Probeer het nog eens.'),
  });

  if (isLoading) return <LoadingSpinner />;
  // Niets te kiezen (of geen kind): gewoon naar de Buddy.
  if (!child || !buddyRow || !mode) return <Navigate to={APP_PATHS.home} replace />;

  const pick = (id: BuddySpeciesId) => {
    setPicked(id);
    speak(buddySpecies(id).intro);
  };

  const staying = mode === 'yearly' && selected === current;
  const title = mode === 'first' ? 'Wie komt er bij jou wonen?' : 'Een nieuw schooljaar!';
  const subtitle =
    mode === 'first'
      ? 'Tik op een Buddy om hem te leren kennen.'
      : `Blijf je bij ${buddySpecies(current).name}, of kies je een nieuwe vriend? Je munten en spullen gaan mee.`;

  return (
    <div className="relative flex h-full w-full flex-col overflow-y-auto bg-gradient-to-b from-[#2d1b54] via-[#1a103c] to-[#0a0618] pb-10" style={{ fontFamily: "'Nunito', sans-serif" }}>
      <StarryBackground />

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-8 sm:pt-12">
        <header className="text-center">
          <h1 className="bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 bg-clip-text text-2xl font-black leading-tight text-transparent sm:text-3xl">
            {title}
          </h1>
          <p className="mt-2 text-sm font-semibold text-white/75">{subtitle}</p>
        </header>

        <div className="mt-6 grid grid-cols-2 gap-3" role="radiogroup" aria-label="Kies je Buddy">
          {BUDDY_SPECIES_LIST.map((species, i) => {
            const active = species.id === selected;
            return (
              <motion.button
                key={species.id}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={`${species.name}, een ${species.animal}`}
                onClick={() => pick(species.id)}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className={cn(
                  VITRINE,
                  'flex flex-col items-center p-3 transition-all active:scale-[0.97] outline-none focus-visible:ring-4 focus-visible:ring-white/70',
                  active ? 'border-amber-400 shadow-[0_0_28px_rgba(251,191,36,0.35)]' : 'border-[#3b2d71]',
                )}
              >
                {active && <Ornaments tone="border-amber-400/60" />}
                {mode === 'yearly' && species.id === current && (
                  <span className="absolute right-2 top-2 rounded-full bg-amber-400/90 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-[#1a103c]">
                    Jouw Buddy
                  </span>
                )}
                <img
                  src={species.art.happy}
                  alt=""
                  draggable={false}
                  className={cn('h-28 w-28 select-none object-contain sm:h-32 sm:w-32', active && 'animate-buddy-float')}
                />
                <span className={cn('mt-1 text-base font-black', active ? 'text-amber-200' : 'text-white/90')}>{species.name}</span>
                <span className="text-xs font-semibold capitalize text-white/55">{species.animal}</span>
              </motion.button>
            );
          })}
        </div>

        <div className="mt-6 min-h-[3.5rem] text-center" aria-live="polite">
          {selected && <p className="text-sm font-bold text-white/85">{buddySpecies(selected).intro}</p>}
        </div>

        <button
          type="button"
          disabled={!selected || choose.isPending}
          onClick={() => selected && choose.mutate(selected)}
          className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl border-b-[5px] border-amber-700 bg-gradient-to-b from-amber-300 to-amber-500 text-lg font-black text-[#1a103c] shadow-lg transition-all active:translate-y-1 active:border-b-0 disabled:opacity-40"
        >
          {choose.isPending && <Loader2 className="h-5 w-5 animate-spin" aria-hidden />}
          {!selected ? 'Kies een Buddy' : staying ? `Ik blijf bij ${buddySpecies(selected).name}!` : `Ja, ${buddySpecies(selected).name}!`}
        </button>
      </div>
    </div>
  );
}
