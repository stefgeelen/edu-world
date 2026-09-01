import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { BookOpen, Loader2, Search, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const SUBJECT_LABELS: Record<string, { label: string; color: string }> = {
  math:    { label: 'Rekenen',    color: 'bg-blue-100 text-blue-700' },
  reading: { label: 'Lezen',      color: 'bg-violet-100 text-violet-700' },
  writing: { label: 'Schrijven',  color: 'bg-orange-100 text-orange-700' },
  other:   { label: 'Andere',     color: 'bg-teal-100 text-teal-700' },
};

function familyKeyFor(route: string): string {
  return route.replace(/\/\d+$/, '');
}

export function AdminExercises() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data: exercises = [], isLoading } = useQuery({
    queryKey: ['admin-exercises'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('subject')
        .order('display_order');
      if (error) throw error;
      return data;
    },
  });

  const families = new Map<string, typeof exercises>();
  for (const ex of exercises) {
    const key = familyKeyFor(ex.route);
    if (!families.has(key)) families.set(key, []);
    families.get(key)!.push(ex);
  }

  const familyList = [...families.entries()].map(([familyKey, rows]) => ({
    familyKey,
    title: rows[0].title,
    subject: rows[0].subject,
    grades: [...new Set(rows.map((r) => r.grade))].sort((a, b) => a - b),
    activeCount: rows.filter((r) => r.is_active).length,
    totalCount: rows.length,
  }));

  const filtered = familyList.filter((f) =>
    f.title.toLowerCase().includes(search.toLowerCase())
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
              <span className="w-32 text-center">Graden</span>
              <span className="w-20 text-center">Actief</span>
            </div>

            {/* Rows */}
            {filtered.length === 0 ? (
              <div className="px-5 py-8 text-center text-slate-400 text-sm">
                Geen oefeningen gevonden.
              </div>
            ) : (
              filtered.map((family, i) => {
                const subCfg = SUBJECT_LABELS[family.subject] ?? { label: family.subject, color: 'bg-slate-100 text-slate-600' };

                return (
                  <motion.button
                    key={family.familyKey}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    onClick={() => navigate(`/admin/exercises/${encodeURIComponent(family.familyKey)}`)}
                    className="w-full grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-4 items-center border-b border-slate-100 last:border-b-0 text-left hover:bg-slate-50 transition-colors"
                  >
                    {/* Name */}
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm text-slate-900">{family.title}</span>
                      <span className="text-xs text-slate-400 font-mono">{family.familyKey}</span>
                    </div>

                    {/* Subject badge */}
                    <div className="w-28 flex justify-center">
                      <span className={cn('px-2.5 py-1 rounded-full text-xs font-bold', subCfg.color)}>
                        {subCfg.label}
                      </span>
                    </div>

                    {/* Grades */}
                    <div className="w-32 text-center">
                      <span className="text-sm text-slate-600 font-medium">
                        {family.grades.map((g) => `Graad ${g}`).join(', ')}
                      </span>
                    </div>

                    {/* Active count + chevron */}
                    <div className="w-20 flex items-center justify-center gap-1.5">
                      <span className="text-sm font-semibold text-slate-600">
                        {family.activeCount}/{family.totalCount}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </div>
                  </motion.button>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
