import { useQuery } from '@tanstack/react-query';
import { Download, Mail, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
