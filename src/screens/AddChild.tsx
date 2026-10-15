import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserPlus, ArrowRight, ArrowLeft, Baby, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { mapDbError, isSubscriptionLimitError } from '@/lib/errorMessages';
import { SubscriptionLimitDialog } from '@/components/SubscriptionLimitDialog';
import { getGradeAssignment } from '@/lib/gradeFromAge';
import { GradeChoice } from '@/components/GradeChoice';
import { NightSkyScreen, PRIMARY_BUTTON, DISABLED_BUTTON } from '@/components/auth/NightSky';
import { Ornaments } from '@/components/dashboard/Vitrine';
import leapioLogo from '@/assets/brand/leapio-logo-donker.svg';

const CARD = 'bg-gradient-to-br from-[#1a103c]/90 via-[#241650]/80 to-[#1a103c]/90 backdrop-blur-xl rounded-3xl p-6 border-[3px] border-amber-400/30 shadow-[0_8px_32px_rgba(251,191,36,0.12)] relative overflow-hidden focus-within:border-amber-400/70 transition-all duration-300';
const CHILD_INPUT = 'bg-[#0f0828]/70 border-2 border-[#3b2d71] rounded-2xl px-5 py-4 text-white placeholder:text-[#9d8bce] focus:outline-none focus:border-amber-400 transition-colors [color-scheme:dark]';

export function AddChild() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [age, setAge] = useState<number | ''>('');
  // Null until the parent picks a grade: then the age's suggestion applies.
  const [chosenGrade, setChosenGrade] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [limitDialog, setLimitDialog] = useState<{ open: boolean; message?: string }>({ open: false });

  const gradeAssignment = getGradeAssignment(age);
  const isFormValid = name.trim().length > 0 && age !== '' && age > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || !user || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('children').insert({
        name: name.trim(),
        age: age as number,
        grade: chosenGrade ?? gradeAssignment?.assignedGrade ?? 1,
        parent_id: user.id,
      });

      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['my-child'] });
      toast.success(`${name.trim()} is toegevoegd!`);
      navigate('/app');
    } catch (err: any) {
      if (isSubscriptionLimitError(err)) {
        setLimitDialog({ open: true, message: mapDbError(err) });
      } else {
        toast.error(mapDbError(err));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
    <SubscriptionLimitDialog
      open={limitDialog.open}
      onOpenChange={(o) => setLimitDialog({ open: o, message: limitDialog.message })}
      message={limitDialog.message}
    />
    <NightSkyScreen className="items-stretch">

      {/* Back: there is no screen before this one in the app, so it leaves to the website. */}
      <button
        type="button"
        onClick={() => navigate('/')}
        aria-label="Terug"
        className="absolute top-4 left-4 z-20 w-11 h-11 rounded-2xl bg-[#0f0828]/70 border-2 border-[#3b2d71] flex items-center justify-center text-[#c9bdf0] hover:text-white hover:border-amber-400 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
      </button>

      {/* Header */}
      <div className="pt-12 pb-6 px-6 relative z-10 text-center">
        <img src={leapioLogo} alt="Leapio" className="h-10 w-auto mx-auto mb-6" />
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", bounce: 0.5 }}
          className="w-20 h-20 bg-amber-400 rounded-[2rem] shadow-xl shadow-amber-400/25 flex items-center justify-center mx-auto mb-6 transform -rotate-3 border-b-4 border-amber-600"
        >
          <UserPlus className="w-10 h-10 text-[#1a103c]" strokeWidth={2.5} />
        </motion.div>
        
        <motion.h1 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-3xl font-black text-white mb-2 tracking-tight"
        >
          Voeg je kind toe
        </motion.h1>
        
        <motion.p 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-[#c9bdf0] font-bold max-w-sm mx-auto"
        >
          Vul deze gegevens in om een Leapio-profiel voor je kind te maken.
        </motion.p>
      </div>

      {/* Form Content - Bento Box Style */}
      <div className="flex-1 px-6 pb-32 relative z-10 flex flex-col items-center">
        <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6">
          
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className={CARD}
          >
            <Ornaments tone="border-amber-400/40" />
            
            <label className="flex items-center gap-3 text-white font-extrabold mb-4 text-lg" htmlFor="childName">
              <div className="p-2.5 bg-amber-400/15 rounded-2xl text-amber-300">
                <Baby className="w-6 h-6" strokeWidth={2.5} />
              </div>
              Naam
            </label>
            
            <input
              id="childName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Bijv. Emma of Liam"
              className={cn(CHILD_INPUT, 'w-full text-xl font-bold placeholder:font-semibold')}
            />
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className={CARD}
          >
            <Ornaments tone="border-amber-400/40" />
            
            <label className="flex items-center gap-3 text-white font-extrabold mb-4 text-lg" htmlFor="childAge">
              <div className="p-2.5 bg-amber-400/15 rounded-2xl text-amber-300">
                <GraduationCap className="w-6 h-6" strokeWidth={2.5} />
              </div>
              Leeftijd
            </label>
            
            <div className="flex gap-4 items-stretch">
              <input
                id="childAge"
                type="number"
                min="4"
                max="14"
                value={age}
                onChange={(e) => {
                  setAge(e.target.value ? parseInt(e.target.value) : '');
                  // A new age brings a new suggestion; an earlier pick no longer applies.
                  setChosenGrade(null);
                }}
                placeholder="0"
                className={cn(CHILD_INPUT, 'w-24 text-center text-3xl font-black')}
              />
              
              <div className="flex-1 bg-[#0f0828]/50 rounded-2xl border-2 border-[#3b2d71] p-4 flex flex-col justify-center relative overflow-hidden">
                <span className="text-xs font-bold text-[#9d8bce] uppercase tracking-wider mb-2">Leerjaar</span>
                {gradeAssignment ? (
                  <GradeChoice assignment={gradeAssignment} chosen={chosenGrade} onChoose={setChosenGrade} tone="dark" />
                ) : (
                  <span className="text-[#9d8bce] font-semibold italic text-sm sm:text-base">Vul leeftijd in</span>
                )}
              </div>
            </div>
          </motion.div>

        </form>
      </div>

      {/* Fixed Bottom Action */}
      <motion.div 
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 200, damping: 20 }}
        className="fixed bottom-0 left-0 right-0 p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] bg-[#0a0618]/90 backdrop-blur-xl border-t-2 border-amber-400/20 shadow-[0_-20px_40px_rgba(0,0,0,0.4)] z-50 rounded-t-[2.5rem] flex justify-center"
      >
        <button
          onClick={handleSubmit}
          disabled={!isFormValid || isSubmitting}
          className={cn(
            "w-full max-w-md h-16 rounded-2xl font-black text-xl flex items-center justify-center gap-3 transition-all duration-300",
            isFormValid && !isSubmitting ? PRIMARY_BUTTON : DISABLED_BUTTON
          )}
        >
          {isSubmitting ? 'Opslaan...' : 'Verder'}
          {!isSubmitting && <ArrowRight className="w-6 h-6" strokeWidth={3} />}
        </button>
      </motion.div>
    </NightSkyScreen>
    </>
  );
}
