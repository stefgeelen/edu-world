import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { invokeFunction } from '@/lib/invokeFunction';
import { motion } from 'framer-motion';
import { Users, Search, Shield, ShieldCheck, ShieldOff, Loader2, Mail, Calendar, UserCheck, Crown, Trash2, AlertTriangle, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';
import { useAuth } from '@/context/AuthContext';
import { timeAgoNl, daysSince } from '@/lib/relativeTime';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

type Profile = Tables<'profiles'>;

/**
 * Green while the account is still showing up, amber once a fortnight has
 * passed, red once it has effectively gone quiet. Never-seen stays neutral —
 * it is a gap in the funnel, not a lapsed user.
 */
function lastSeenTone(lastSeenAt: string | null) {
  const days = daysSince(lastSeenAt);
  if (days === null) return 'text-slate-400';
  if (days <= 7) return 'text-emerald-600';
  if (days <= 14) return 'text-amber-600';
  return 'text-red-500';
}
type UserRole = Tables<'user_roles'>;

export function AdminUsers() {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'recent' | 'seen'>('recent');
  const [userToDelete, setUserToDelete] = useState<Profile | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  const { data: profiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Profile[];
    },
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_roles').select('*');
      if (error) throw error;
      return data as UserRole[];
    },
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('subscriptions').select('*');
      if (error) throw error;
      return data;
    },
  });

  const { data: children = [] } = useQuery({
    queryKey: ['admin-children'],
    queryFn: async () => {
      const { data, error } = await supabase.from('children').select('*');
      if (error) throw error;
      return data;
    },
  });

  const toggleAdmin = useMutation({
    mutationFn: async ({ userId, makeAdmin }: { userId: string; makeAdmin: boolean }) => {
      if (makeAdmin) {
        const { error } = await supabase.from('user_roles').insert({ user_id: userId, role: 'admin' });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', 'admin');
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
      toast.success('Rol bijgewerkt');
    },
    onError: () => toast.error('Fout bij bijwerken rol'),
  });

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      const data = await invokeFunction<{ error?: string }>('admin-delete-user', { userId }, 30_000);
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-children'] });
      toast.success('Account permanent verwijderd');
      setUserToDelete(null);
      setConfirmText('');
    },
    onError: (e: Error) => toast.error(e.message || 'Verwijderen mislukt'),
  });

  const getUserRoles = (userId: string) => roles.filter(r => r.user_id === userId).map(r => r.role);
  const getUserSub = (userId: string) => subscriptions.find(s => s.user_id === userId);
  const getUserChildren = (userId: string) => children.filter(c => c.parent_id === userId);

  const filtered = profiles
    .filter(p =>
      !search ||
      p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.email?.toLowerCase().includes(search.toLowerCase())
    )
    // "Laatst actief" sorts never-seen accounts last rather than first: an
    // account that has never opened the app is a different problem from one
    // that opened it and stopped.
    .sort((a, b) => {
      if (sort === 'recent') return 0;
      const av = a.last_seen_at ? new Date(a.last_seen_at).getTime() : -Infinity;
      const bv = b.last_seen_at ? new Date(b.last_seen_at).getTime() : -Infinity;
      return bv - av;
    });

  const seenLast7d = profiles.filter(p => {
    const d = daysSince(p.last_seen_at);
    return d !== null && d <= 7;
  }).length;

  if (loadingProfiles) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            Gebruikers
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            {profiles.length} geregistreerde gebruikers · {seenLast7d} actief in de laatste 7 dagen
          </p>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
          {([['recent', 'Nieuwste'], ['seen', 'Laatst actief']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSort(key)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                sort === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Zoek op naam of e-mail..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 bg-white"
        />
      </div>

      {/* User list */}
      <div className="space-y-3">
        {filtered.map((profile, i) => {
          const userRoles = getUserRoles(profile.id);
          const isAdmin = userRoles.includes('admin');
          const sub = getUserSub(profile.id);
          const childCount = getUserChildren(profile.id).length;

          return (
            <motion.div
              key={profile.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.3) }}
              className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col md:flex-row md:items-center gap-4"
            >
              {/* User info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-slate-900 truncate">
                    {profile.full_name || 'Geen naam'}
                  </h3>
                  {isAdmin && (
                    <span className="flex items-center gap-1 text-[10px] font-black bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                      <Crown className="w-3 h-3" /> Admin
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {profile.email || '—'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(profile.created_at).toLocaleDateString('nl-NL')}
                  </span>
                  <span className="flex items-center gap-1">
                    <UserCheck className="w-3 h-3" />
                    {profile.user_type}
                  </span>
                  <span
                    className={cn(
                      'flex items-center gap-1 font-bold',
                      lastSeenTone(profile.last_seen_at)
                    )}
                    title={profile.last_seen_at ? new Date(profile.last_seen_at).toLocaleString('nl-BE') : 'Nog nooit ingelogd'}
                  >
                    <Activity className="w-3 h-3" />
                    {timeAgoNl(profile.last_seen_at)}
                  </span>
                </div>
              </div>

              {/* Subscription badge */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={cn(
                  'text-xs font-bold px-2.5 py-1 rounded-lg border',
                  sub?.status === 'active'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : sub?.status === 'trialing'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-slate-50 text-slate-500 border-slate-200'
                )}>
                  {sub ? `${sub.plan} · ${sub.status}` : 'Geen abonnement'}
                </span>
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                  {childCount} {childCount === 1 ? 'kind' : 'kinderen'}
                </span>
              </div>

              {/* Admin toggle */}
              <button
                onClick={() => {
                  const action = isAdmin ? 'verwijderen als admin' : 'maken tot admin';
                  if (!window.confirm(`Weet je zeker dat je ${profile.full_name || profile.email || 'deze gebruiker'} wilt ${action}?`)) return;
                  toggleAdmin.mutate({ userId: profile.id, makeAdmin: !isAdmin });
                }}
                disabled={toggleAdmin.isPending}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all flex-shrink-0 border',
                  isAdmin
                    ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                    : 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100'
                )}
              >
                {isAdmin ? (
                  <><ShieldOff className="w-3.5 h-3.5" /> Admin verwijderen</>
                ) : (
                  <><ShieldCheck className="w-3.5 h-3.5" /> Maak admin</>
                )}
              </button>

              {/* Permanent delete */}
              <button
                onClick={() => {
                  setConfirmText('');
                  setUserToDelete(profile);
                }}
                disabled={profile.id === currentUser?.id || deleteUser.isPending}
                title={profile.id === currentUser?.id ? 'Je kunt jezelf niet verwijderen' : 'Account permanent verwijderen'}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all flex-shrink-0 border',
                  profile.id === currentUser?.id
                    ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
                    : 'bg-red-500 text-white border-red-600 hover:bg-red-600'
                )}
              >
                <Trash2 className="w-3.5 h-3.5" /> Verwijder
              </button>
            </motion.div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-400 font-semibold">Geen gebruikers gevonden</p>
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={(open) => { if (!open) { setUserToDelete(null); setConfirmText(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Account permanent verwijderen
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-slate-600">
                <p>
                  Je staat op het punt om{' '}
                  <span className="font-bold text-slate-900">
                    {userToDelete?.full_name || userToDelete?.email || 'deze gebruiker'}
                  </span>{' '}
                  permanent te verwijderen. Deze actie kan <strong>niet</strong> ongedaan gemaakt worden.
                </p>
                <p className="font-semibold text-slate-700">Het volgende wordt verwijderd:</p>
                <ul className="list-disc pl-5 space-y-0.5 text-xs">
                  <li>Profiel & login (auth)</li>
                  <li>Alle kinderen en hun voortgang</li>
                  <li>Oefenpogingen, badges & trimester-voortgang</li>
                  <li>Beloningen, abonnement & PIN</li>
                  <li>Rollen & organisatie-lidmaatschappen</li>
                </ul>
                <div className="pt-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Typ <span className="text-red-600">VERWIJDER</span> om te bevestigen:
                  </label>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    autoFocus
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
                    placeholder="VERWIJDER"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteUser.isPending}>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              disabled={confirmText !== 'VERWIJDER' || deleteUser.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (userToDelete) deleteUser.mutate(userToDelete.id);
              }}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
            >
              {deleteUser.isPending ? (
                <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Verwijderen...</>
              ) : (
                <><Trash2 className="w-4 h-4 mr-1.5" /> Permanent verwijderen</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
