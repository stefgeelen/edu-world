import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BarChart3, Users, Baby, BookOpen, Trophy, Loader2 } from 'lucide-react';

export function AdminStats() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [profilesRes, childrenRes, attemptsRes, subsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('children').select('id', { count: 'exact', head: true }),
        supabase.from('exercise_attempts').select('id', { count: 'exact', head: true }),
        supabase.from('subscriptions').select('id, status, plan'),
      ]);

      const activeSubs = (subsRes.data || []).filter(s => s.status === 'active').length;

      return {
        totalUsers: profilesRes.count || 0,
        totalChildren: childrenRes.count || 0,
        totalAttempts: attemptsRes.count || 0,
        activeSubscriptions: activeSubs,
        totalSubscriptions: (subsRes.data || []).length,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const cards = [
    { label: 'Totaal gebruikers', value: stats?.totalUsers || 0, icon: Users, color: 'bg-blue-50 text-blue-600 border-blue-200' },
    { label: 'Kinderen', value: stats?.totalChildren || 0, icon: Baby, color: 'bg-violet-50 text-violet-600 border-violet-200' },
    { label: 'Oefeningen gemaakt', value: stats?.totalAttempts || 0, icon: BookOpen, color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
    { label: 'Actieve abonnementen', value: stats?.activeSubscriptions || 0, icon: Trophy, color: 'bg-amber-50 text-amber-600 border-amber-200' },
  ];

  return (
    <div className="max-w-5xl">
      <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2 mb-6">
        <BarChart3 className="w-6 h-6 text-indigo-600" />
        Statistieken
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(card => (
          <div key={card.label} className={`rounded-2xl border p-6 ${card.color}`}>
            <card.icon className="w-8 h-8 mb-3 opacity-80" />
            <p className="text-3xl font-black">{card.value}</p>
            <p className="text-sm font-bold opacity-70 mt-1">{card.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
