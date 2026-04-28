import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserPlus, ArrowRight, Baby, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { mapDbError, isSubscriptionLimitError } from '@/lib/errorMessages';
import { SubscriptionLimitDialog } from '@/components/SubscriptionLimitDialog';

export function AddChild() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [age, setAge] = useState<number | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [limitDialog, setLimitDialog] = useState<{ open: boolean; message?: string }>({ open: false });

  const getStudyYear = (ageValue: number | '') => {
    if (ageValue === '') return null;
    if (ageValue <= 6) return '1ste leerjaar';
    if (ageValue === 7) return '2de leerjaar';
    if (ageValue === 8) return '3de leerjaar';
    if (ageValue === 9) return '4de leerjaar';
    if (ageValue === 10) return '5de leerjaar';
    if (ageValue >= 11) return '6de leerjaar';
    return null;
  };

  const getGrade = (ageValue: number | ''): number => {
    if (ageValue === '' || ageValue <= 6) return 1;
    if (ageValue >= 11) return 6;
    return ageValue - 5;
  };

  const studyYear = getStudyYear(age);
  const isFormValid = name.trim().length > 0 && age !== '' && age > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || !user || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('children').insert({
        name: name.trim(),
        age: age as number,
        grade: getGrade(age),
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
    <div className="min-h-[100dvh] w-full bg-slate-50 flex flex-col relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[50%] bg-gradient-to-br from-blue-400 to-teal-300 rounded-[100%] blur-3xl opacity-20 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[120%] h-[50%] bg-gradient-to-tl from-orange-400 to-pink-300 rounded-[100%] blur-3xl opacity-20 pointer-events-none" />

      {/* Header */}
      <div className="pt-12 pb-6 px-6 relative z-10 text-center">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", bounce: 0.5 }}
          className="w-20 h-20 bg-white rounded-[2rem] shadow-xl shadow-blue-500/20 flex items-center justify-center mx-auto mb-6 transform -rotate-3 border-2 border-slate-100"
        >
          <UserPlus className="w-10 h-10 text-blue-500" strokeWidth={2.5} />
        </motion.div>
        
        <motion.h1 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-3xl font-black text-slate-800 mb-2 tracking-tight"
        >
          Voeg je kind toe
        </motion.h1>
        
        <motion.p 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-slate-500 font-medium max-w-sm mx-auto"
        >
          Vul deze gegevens in om een EduWorld-profiel voor je kind te maken.
        </motion.p>
      </div>

      {/* Form Content - Bento Box Style */}
      <div className="flex-1 px-6 pb-32 relative z-10 flex flex-col items-center">
        <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6">
          
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-[2rem] p-6 shadow-xl shadow-slate-200/40 border-2 border-slate-100 relative overflow-hidden group focus-within:border-blue-300 focus-within:shadow-blue-200/50 transition-all duration-300"
          >
            <div className="absolute top-0 left-0 w-2 h-full bg-blue-500" />
            
            <label className="flex items-center gap-3 text-slate-700 font-extrabold mb-4 text-lg" htmlFor="childName">
              <div className="p-2.5 bg-blue-100 rounded-2xl text-blue-600">
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
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-5 py-4 text-xl font-bold text-slate-800 placeholder:text-slate-400 placeholder:font-medium focus:outline-none focus:border-blue-400 focus:bg-white transition-colors focus:ring-4 focus:ring-blue-100"
            />
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-[2rem] p-6 shadow-xl shadow-slate-200/40 border-2 border-slate-100 relative overflow-hidden focus-within:border-teal-300 focus-within:shadow-teal-200/50 transition-all duration-300"
          >
            <div className="absolute top-0 left-0 w-2 h-full bg-teal-400" />
            
            <label className="flex items-center gap-3 text-slate-700 font-extrabold mb-4 text-lg" htmlFor="childAge">
              <div className="p-2.5 bg-teal-100 rounded-2xl text-teal-600">
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
                onChange={(e) => setAge(e.target.value ? parseInt(e.target.value) : '')}
                placeholder="0"
                className="w-24 bg-slate-50 border-2 border-slate-200 rounded-2xl px-5 py-4 text-center text-3xl font-black text-slate-800 focus:outline-none focus:border-teal-400 focus:bg-white transition-colors focus:ring-4 focus:ring-teal-100"
              />
              
              <div className="flex-1 bg-slate-50 rounded-2xl border-2 border-slate-100 p-4 flex flex-col justify-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-teal-100 rounded-full blur-2xl opacity-50 translate-x-1/2 -translate-y-1/2" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Voorgesteld niveau</span>
                {studyYear ? (
                  <motion.span 
                    key={studyYear}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-lg sm:text-xl font-black text-teal-600 flex items-center gap-1 drop-shadow-sm"
                  >
                    {studyYear}
                  </motion.span>
                ) : (
                  <span className="text-slate-400 font-medium italic text-sm sm:text-base">Vul leeftijd in</span>
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
        className="fixed bottom-0 left-0 right-0 p-6 pb-safe bg-white border-t border-slate-200 shadow-[0_-20px_40px_rgba(0,0,0,0.08)] z-50 rounded-t-[2.5rem] flex justify-center"
      >
        <button
          onClick={handleSubmit}
          disabled={!isFormValid || isSubmitting}
          className={cn(
            "w-full max-w-md h-[4.5rem] rounded-[2rem] font-extrabold text-xl flex items-center justify-center gap-3 transition-all duration-300",
            isFormValid && !isSubmitting
              ? "bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-orange-500 text-white shadow-[0_8px_30px_rgba(249,115,22,0.4)] shadow-orange-500/50 active:scale-95 border-b-[6px] border-orange-600 active:border-b-0 active:translate-y-[6px]"
              : "bg-slate-100 text-slate-400 cursor-not-allowed border-b-[6px] border-slate-200"
          )}
        >
          {isSubmitting ? 'Opslaan...' : 'Verder'}
          {!isSubmitting && <ArrowRight className="w-6 h-6" strokeWidth={3} />}
        </button>
      </motion.div>
    </div>
    </>
  );
}
