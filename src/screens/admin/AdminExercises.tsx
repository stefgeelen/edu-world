import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { BookOpen, ChevronRight, Eye, FlaskConical, Globe, LayoutGrid, List, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { mapDbError } from '@/lib/errorMessages';
import { useKindergartenMode, type KindergartenMode } from '@/hooks/useKindergarten';
import { CurriculumView } from '@/components/admin/CurriculumView';
import { PracticePreview } from '@/components/admin/PracticePreview';
import { exerciseFamilyKey, exerciseTypeName, GRADE_NAMES, subjectLabel } from '@/data/exerciseCatalog';
import { gradesIn } from '@/lib/curriculum';

type View = 'leerplan' | 'preview' | 'list';

const VIEWS: { id: View; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'leerplan', label: 'Leerplan', icon: LayoutGrid },
  { id: 'preview', label: 'Wat ziet een kind?', icon: Eye },
  { id: 'list', label: 'Alle oefentypes', icon: List },
];

/**
 * Test / Live for the 3de kleuterklas as a whole (kindergarten_settings.mode).
 * Test: only admins can put a child in it. Live: every parent, and the Buddy
 * forms shift one grade (the kleuter starts at Baby, the 6de leerjaar is Meester).
 */
function KindergartenSwitch() {
  const queryClient = useQueryClient();
  const { live, isLoading } = useKindergartenMode();

  const setMode = useMutation({
    mutationFn: async (mode: KindergartenMode) => {
      const { error } = await supabase.rpc('admin_set_kindergarten_mode', { p_mode: mode });
      if (error) throw error;
    },
    onSuccess: (_data, mode) => {
      queryClient.invalidateQueries({ queryKey: ['kindergarten-settings'] });
      toast.success(mode === 'all' ? 'De 3de kleuterklas staat live voor iedereen.' : 'De 3de kleuterklas staat in test: enkel admins.');
    },
    onError: (e) => toast.error(mapDbError(e)),
  });

  const busy = isLoading || setMode.isPending;
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6 shadow-sm">
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">3de kleuterklas</p>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => {
            if (live && !window.confirm('De 3de kleuterklas terug in test zetten? Kleuters die er al in zitten, blijven erin.')) return;
            setMode.mutate('admins');
          }}
          disabled={busy || !live}
          aria-pressed={!live}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold border transition-colors',
            !live
              ? 'bg-sky-600 border-sky-600 text-white'
              : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
          )}
        >
          <FlaskConical className="w-4 h-4" />
          Test (enkel admins)
        </button>
        <button
          onClick={() => {
            if (!live && !window.confirm('De 3de kleuterklas live zetten? Elke ouder kan ze dan kiezen, en de Buddy van elk kind schuift een vorm op.')) return;
            setMode.mutate('all');
          }}
          disabled={busy || live}
          aria-pressed={live}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold border transition-colors',
            live
              ? 'bg-emerald-600 border-emerald-600 text-white'
              : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
          )}
        >
          <Globe className="w-4 h-4" />
          Live (iedereen)
        </button>
      </div>
      <p className="text-xs text-slate-500 mt-3">
        {live
          ? 'Elke ouder kan de 3de kleuterklas kiezen. De Buddy begint daar als Baby; in het 6de leerjaar is hij Meester.'
          : 'Enkel admins kunnen een kind in de 3de kleuterklas zetten. De Buddy-vormen van de andere kinderen blijven zoals ze zijn.'}
      </p>
    </div>
  );
}

export function AdminExercises() {
  const navigate = useNavigate();
  const [view, setView] = useState<View>('leerplan');
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

  const openFamily = (familyKey: string) => navigate(`/admin/exercises/${encodeURIComponent(familyKey)}`);

  const families = new Map<string, typeof exercises>();
  for (const ex of exercises) {
    const key = exerciseFamilyKey(ex.route);
    if (!families.has(key)) families.set(key, []);
    families.get(key)!.push(ex);
  }

  const familyList = [...families.entries()].map(([familyKey, rows]) => ({
    familyKey,
    name: exerciseTypeName(familyKey, rows[0].title),
    subject: (rows.find((r) => r.is_active) ?? rows[0]).subject,
    grades: [...new Set(rows.map((r) => r.grade))].sort((a, b) => a - b),
    activeCount: rows.filter((r) => r.is_active).length,
    inTest: rows.some((r) => r.admin_only),
    totalCount: rows.length,
  }));

  const filtered = familyList.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = exercises.filter((ex) => ex.is_active).length;
  const inactiveCount = exercises.length - activeCount;

  return (
    <div className="p-6 md:p-8 overflow-y-auto h-full">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900">Oefeningen</h2>
            <p className="text-sm text-slate-500">
              {familyList.length} oefentypes · {activeCount} rijen actief, {inactiveCount} uit
            </p>
          </div>
        </div>

        <KindergartenSwitch />

        {/* Views */}
        <div className="mb-6 flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1" role="tablist">
          {VIEWS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={view === id}
              onClick={() => setView(id)}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold transition-colors',
                view === id ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        )}

        {!isLoading && view === 'leerplan' && <CurriculumView rows={exercises} onOpen={openFamily} />}

        {!isLoading && view === 'preview' && <PracticePreview grades={gradesIn(exercises)} />}

        {!isLoading && view === 'list' && (
          <>
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

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span>Naam</span>
                <span className="w-28 text-center">Categorie</span>
                <span className="w-40 text-center">Leerjaren</span>
                <span className="w-20 text-center">Actief</span>
              </div>

              {filtered.length === 0 ? (
                <div className="px-5 py-8 text-center text-slate-400 text-sm">
                  Geen oefeningen gevonden.
                </div>
              ) : (
                filtered.map((family, i) => {
                  const subCfg = subjectLabel(family.subject);
                  return (
                    <motion.button
                      key={family.familyKey}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      onClick={() => openFamily(family.familyKey)}
                      className="w-full grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-4 items-center border-b border-slate-100 last:border-b-0 text-left hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm text-slate-900">
                          {family.name}
                          {family.inTest && (
                            <span className="ml-2 px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 text-[10px] font-bold uppercase align-middle">
                              Test
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">{family.familyKey}</span>
                      </div>
                      <div className="w-28 flex justify-center">
                        <span className={cn('px-2.5 py-1 rounded-full text-xs font-bold', subCfg.color)}>{subCfg.label}</span>
                      </div>
                      <div className="w-40 text-center">
                        <span className="text-sm text-slate-600 font-medium">
                          {family.grades.map((g) => (g === 0 ? 'Kleuter' : (GRADE_NAMES[g] ?? `${g}`).replace(' leerjaar', ''))).join(', ')}
                        </span>
                      </div>
                      <div className="w-20 flex items-center justify-center gap-1.5">
                        <span className="text-sm font-semibold text-slate-600">{family.activeCount}/{family.totalCount}</span>
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                      </div>
                    </motion.button>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
