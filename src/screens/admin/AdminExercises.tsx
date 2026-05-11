import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { BookOpen, Loader2, Search, ToggleLeft, ToggleRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const SUBJECT_LABELS: Record<string, { label: string; color: string }> = {
  math:    { label: 'Rekenen',    color: 'bg-blue-100 text-blue-700' },
  reading: { label: 'Lezen',      color: 'bg-violet-100 text-violet-700' },
  writing: { label: 'Schrijven',  color: 'bg-orange-100 text-orange-700' },
  other:   { label: 'Andere',     color: 'bg-teal-100 text-teal-700' },
};

const STAGE_LABELS: Record<string, string> = {
  'stage-1': 'Trimester 1',
  'stage-2': 'Trimester 2',
  'stage-3': 'Trimester 3',
};

export function AdminExercises() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: exercises = [], isLoading } = useQuery({
    queryKey: ['admin-exercises'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('stage')
        .order('subject')
        .order('display_order');
      if (error) throw error;
      return data;
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('exercises')
        .update({ is_active: isActive })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-exercises'] });
      queryClient.invalidateQueries({ queryKey: ['stage-exercises-progress'] });
      queryClient.invalidateQueries({ queryKey: ['stage-mastery'] });
    },
    onError: () => {
      toast.error('Kon oefening niet bijwerken.');
    },
  });

  const filtered = exercises.filter((ex) =>
    ex.title.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = exercises.filter((ex) => ex.is_active).length;
  const inactiveCount = exercises.length - activeCount;

  return (
    <div className="p-6 md:p-8 overflow-y-auto h-full">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900">Oefeningen</h2>
            <p className="text-sm text-slate-500">
              {activeCount} actief, {inactiveCount} inactief
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Zoek op naam..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        )}

        {/* Table */}
        {!isLoading && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>Naam</span>
              <span className="w-28 text-center">Categorie</span>
              <span className="w-28 text-center">Trimester</span>
              <span className="w-20 text-center">Actief</span>
            </div>

            {/* Rows */}
            {filtered.length === 0 ? (
              <div className="px-5 py-8 text-center text-slate-400 text-sm">
                Geen oefeningen gevonden.
              </div>
            ) : (
              filtered.map((ex, i) => {
                const subCfg = SUBJECT_LABELS[ex.subject] ?? { label: ex.subject, color: 'bg-slate-100 text-slate-600' };
                const stageLbl = STAGE_LABELS[ex.stage] ?? ex.stage;

                return (
                  <motion.div
                    key={ex.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className={cn(
                      'grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-4 items-center border-b border-slate-100 last:border-b-0',
                      !ex.is_active && 'bg-slate-50/50'
                    )}
                  >
                    {/* Name */}
                    <div className="flex flex-col">
                      <span className={cn('font-semibold text-sm', ex.is_active ? 'text-slate-900' : 'text-slate-400')}>
                        {ex.title}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">{ex.route}</span>
                    </div>

                    {/* Subject badge */}
                    <div className="w-28 flex justify-center">
                      <span className={cn('px-2.5 py-1 rounded-full text-xs font-bold', subCfg.color)}>
                        {subCfg.label}
                      </span>
                    </div>

                    {/* Stage */}
                    <div className="w-28 text-center">
                      <span className="text-sm text-slate-600 font-medium">{stageLbl}</span>
                    </div>

                    {/* Toggle */}
                    <div className="w-20 flex justify-center">
                      <button
                        onClick={() => toggleMutation.mutate({ id: ex.id, isActive: !ex.is_active })}
                        disabled={toggleMutation.isPending}
                        className="transition-colors"
                        title={ex.is_active ? 'Deactiveren' : 'Activeren'}
                      >
                        {ex.is_active ? (
                          <ToggleRight className="w-8 h-8 text-emerald-500" />
                        ) : (
                          <ToggleLeft className="w-8 h-8 text-slate-300" />
                        )}
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
