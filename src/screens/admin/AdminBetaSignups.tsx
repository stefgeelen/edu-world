import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Mail, Loader2, UserPlus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { campaignOf } from '@/lib/signupSource';
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

interface BetaSignup {
  id: string;
  email: string;
  full_name: string | null;
  child_grade: string | null;
  source: string | null;
  created_at: string;
}

async function fetchBetaSignups(): Promise<BetaSignup[]> {
  const { data, error } = await supabase
    .from('beta_signups')
    .select('id, email, full_name, child_grade, source, created_at')
    .order('created_at', { ascending: false })
    .limit(1000);
  if (error) throw error;
  return data || [];
}

// Wie op de wachtlijst staat, mag tijdens de beta een account maken
// (20261019120000_signup_only_from_beta_list.sql). Toegang geven = het adres
// op de lijst zetten; telt als campagne "admin".
export const ADMIN_GRANT_SOURCE = 'admin · toegang';

class AlreadyOnListError extends Error {}

async function grantBetaAccess(email: string): Promise<void> {
  const { error } = await supabase.from('beta_signups').insert({
    email: email.trim().toLowerCase(),
    source: ADMIN_GRANT_SOURCE,
  });
  if (error) {
    if (error.code === '23505') throw new AlreadyOnListError();
    throw error;
  }
}

// Van de lijst halen: dit adres kan tijdens de beta geen nieuw account meer
// maken; een bestaand account blijft werken. RLS weigert stil, dus tellen we
// de verwijderde rij.
async function removeBetaSignup(id: string): Promise<void> {
  const { data, error } = await supabase.from('beta_signups').delete().eq('id', id).select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('Not deleted');
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toCSV(rows: BetaSignup[]): string {
  const header = ['email', 'full_name', 'child_grade', 'source', 'created_at'];
  const escape = (v: string | null) => {
    if (v == null) return '';
    const s = String(v).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  const lines = rows.map(r =>
    [r.email, r.full_name, r.child_grade, r.source, r.created_at].map(escape).join(',')
  );
  return [header.join(','), ...lines].join('\n');
}

export function AdminBetaSignups() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-beta-signups'],
    queryFn: fetchBetaSignups,
  });
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const grant = useMutation({
    mutationFn: grantBetaAccess,
    onSuccess: () => {
      toast.success('Toegang gegeven. Dit adres kan nu een account maken.');
      setEmail('');
      queryClient.invalidateQueries({ queryKey: ['admin-beta-signups'] });
    },
    onError: (e: Error) => {
      if (e instanceof AlreadyOnListError) {
        toast.info('Dit adres staat al op de lijst en kan al een account maken.');
        return;
      }
      toast.error('Toegang geven is mislukt. Probeer het opnieuw.');
    },
  });
  const [toRemove, setToRemove] = useState<BetaSignup | null>(null);
  const remove = useMutation({
    mutationFn: removeBetaSignup,
    onSuccess: () => {
      toast.success('Van de wachtlijst gehaald.');
      setToRemove(null);
      queryClient.invalidateQueries({ queryKey: ['admin-beta-signups'] });
    },
    onError: () => {
      toast.error('Verwijderen is mislukt. Probeer het opnieuw.');
    },
  });
  const emailValid = EMAIL_PATTERN.test(email.trim());

  const handleGrant = (e: FormEvent) => {
    e.preventDefault();
    if (!emailValid || grant.isPending) return;
    grant.mutate(email);
  };

  const handleExport = () => {
    if (!data) return;
    const csv = toCSV(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `beta-signups-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
  }

  if (error) {
    return <div className="text-red-600 font-semibold">Fout bij laden van beta-aanmeldingen.</div>;
  }

  const rows = data || [];
  const perCampaign = Object.entries(
    rows.reduce<Record<string, number>>((acc, r) => {
      const campaign = campaignOf(r.source);
      acc[campaign] = (acc[campaign] ?? 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Beta-aanmeldingen</h2>
          <p className="text-slate-500 text-sm mt-1">{rows.length} {rows.length === 1 ? 'aanmelding' : 'aanmeldingen'}</p>
        </div>
        <button
          onClick={handleExport}
          disabled={rows.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <form
        onSubmit={handleGrant}
        className="bg-white rounded-2xl border-2 border-slate-100 p-4 space-y-3"
        aria-label="Toegang geven"
      >
        <div>
          <h3 className="font-black text-slate-900">Toegang geven</h3>
          <p className="text-slate-500 text-sm">
            Tijdens de beta kan enkel wie op deze lijst staat een account maken. Zet hier een e-mailadres op de lijst.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="naam@voorbeeld.be"
            aria-label="E-mailadres"
            className="flex-1 px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400"
          />
          <button
            type="submit"
            disabled={!emailValid || grant.isPending}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
          >
            {grant.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Toegang geven
          </button>
        </div>
      </form>

      {perCampaign.length > 0 && (
        <div className="flex flex-wrap gap-2" aria-label="Aanmeldingen per bron">
          {perCampaign.map(([campaign, count]) => (
            <span
              key={campaign}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border-2 border-slate-100 rounded-xl text-sm"
            >
              <span className="font-bold text-slate-700">{campaign}</span>
              <span className="font-black text-indigo-600">{count}</span>
            </span>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl border-2 border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-bold text-slate-700">E-mail</th>
                <th className="text-left px-4 py-3 font-bold text-slate-700">Naam</th>
                <th className="text-left px-4 py-3 font-bold text-slate-700">Leerjaar</th>
                <th className="text-left px-4 py-3 font-bold text-slate-700">Bron</th>
                <th className="text-left px-4 py-3 font-bold text-slate-700">Datum</th>
                <th className="px-4 py-3"><span className="sr-only">Acties</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    Nog geen aanmeldingen.
                  </td>
                </tr>
              ) : rows.map(r => (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    <a href={`mailto:${r.email}`} className="inline-flex items-center gap-1.5 hover:text-indigo-600">
                      <Mail className="w-3.5 h-3.5" />
                      {r.email}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{r.full_name || '—'}</td>
                  <td className="px-4 py-3 text-slate-700">{r.child_grade || '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{r.source || '—'}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(r.created_at).toLocaleString('nl-BE', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setToRemove(r)}
                      aria-label={`${r.email} verwijderen`}
                      title="Van de wachtlijst halen"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Verwijder
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AlertDialog open={!!toRemove} onOpenChange={(open) => { if (!open && !remove.isPending) setToRemove(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Van de wachtlijst halen?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-slate-600">
                <p>
                  <span className="font-bold text-slate-900">{toRemove?.email}</span> wordt van de wachtlijst verwijderd.
                  Dit kan je niet ongedaan maken.
                </p>
                <p>
                  Dit adres kan tijdens de beta geen nieuw account meer maken. Heeft het al een account, dan blijft dat gewoon werken.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              disabled={remove.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (toRemove) remove.mutate(toRemove.id);
              }}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
            >
              {remove.isPending ? (
                <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Verwijderen...</>
              ) : (
                <><Trash2 className="w-4 h-4 mr-1.5" /> Verwijderen</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
