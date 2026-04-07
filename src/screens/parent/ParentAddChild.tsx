import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserPlus, ArrowRight, Baby, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

export function ParentAddChild() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [name, setName] = React.useState('');
  const [age, setAge] = React.useState<number | ''>('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const { data: subscription } = useQuery({
    queryKey: ['parent-subscription', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('max_children')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: childrenCount = 0 } = useQuery({
    queryKey: ['parent-children-count', user?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('children')
        .select('id', { count: 'exact', head: true })
        .eq('parent_id', user!.id);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user,
  });

  const maxChildren = subscription?.max_children ?? 1;
  const canAdd = childrenCount < maxChildren;

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
  const isFormValid = name.trim().length > 0 && age !== '' && age > 0 && canAdd;

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
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
      toast.success(`${name.trim()} is toegevoegd!`);
      navigate('/app/parent');
    } catch (err: any) {
      toast.error(err.message || 'Er ging iets mis bij het opslaan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canAdd) {
    return (
      <div className="px-4 md:px-8 py-10 max-w-md mx-auto text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h3 className="text-xl font-bold text-slate-700 mb-2">Maximaal aantal kinderen bereikt</h3>
        <p className="text-slate-500 mb-6">
          Je huidige abonnement staat maximaal {maxChildren} kind{maxChildren !== 1 ? 'eren' : ''} toe.
        </p>
        <button
          onClick={() => navigate('/app/parent/subscription')}
          className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-bold transition-colors"
        >
          Upgrade je abonnement
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8 py-6 max-w-md mx-auto space-y-6 pb-20">
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', bounce: 0.5 }}
          className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-200"
        >
          <UserPlus className="w-8 h-8 text-blue-500" />
        </motion.div>
        <h2 className="text-2xl font-black text-slate-900">Kind toevoegen</h2>
        <p className="text-sm text-slate-500 mt-1">Vul de gegevens in voor het nieuwe profiel.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200">
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
            <Baby className="w-4 h-4 text-blue-500" /> Naam
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Bijv. Emma of Liam"
            className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          />
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200">
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
            <GraduationCap className="w-4 h-4 text-teal-500" /> Leeftijd
          </label>
          <div className="flex gap-3 items-center">
            <input
              type="number"
              min="4"
              max="14"
              value={age}
              onChange={(e) => setAge(e.target.value ? parseInt(e.target.value) : '')}
              placeholder="0"
              className="w-20 bg-slate-50 border-2 border-slate-200 rounded-xl px-3 py-3 text-center text-xl font-black text-slate-800 focus:outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
            />
            {studyYear && (
              <span className="text-sm font-bold text-teal-600">→ {studyYear}</span>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={!isFormValid || isSubmitting}
          className={cn(
            'w-full py-3.5 rounded-xl font-bold text-sm transition-colors',
            isFormValid && !isSubmitting
              ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          )}
        >
          {isSubmitting ? 'Opslaan...' : 'Kind toevoegen'}
        </button>
      </form>
    </div>
  );
}
