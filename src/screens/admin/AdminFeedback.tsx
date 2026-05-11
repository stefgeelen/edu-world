import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Loader2, MessageSquare } from 'lucide-react';

const CATEGORY_LABELS: Record<string, string> = {
  bug: 'Bug',
  suggestion: 'Suggestie',
  compliment: 'Compliment',
  other: 'Overig',
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  new: { label: 'Nieuw', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  in_review: { label: 'In behandeling', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  resolved: { label: 'Afgehandeld', className: 'bg-green-100 text-green-700 border-green-200' },
};

export function AdminFeedback() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'new' | 'in_review' | 'resolved'>('all');
  const [selected, setSelected] = useState<any | null>(null);
  const [editStatus, setEditStatus] = useState<string>('new');
  const [editNotes, setEditNotes] = useState<string>('');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['admin-feedback'],
    queryFn: async () => {
      const { data: feedback, error } = await supabase
        .from('feedback')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const userIds = [...new Set(feedback.map((f: any) => f.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
      return feedback.map((f: any) => ({ ...f, profile: profileMap.get(f.user_id) }));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      const { error } = await supabase
        .from('feedback')
        .update({ status: editStatus, admin_notes: editNotes || null })
        .eq('id', selected.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Feedback bijgewerkt');
      queryClient.invalidateQueries({ queryKey: ['admin-feedback'] });
      setSelected(null);
    },
    onError: (err: any) => toast.error(err?.message ?? 'Bijwerken mislukt'),
  });

  const openDetail = (item: any) => {
    setSelected(item);
    setEditStatus(item.status);
    setEditNotes(item.admin_notes ?? '');
  };

  const filtered = filter === 'all' ? items : items.filter((i: any) => i.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-xl">
            <MessageSquare className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900">Feedback</h2>
            <p className="text-sm text-slate-500">{items.length} berichten van ouders</p>
          </div>
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle statussen</SelectItem>
            <SelectItem value="new">Nieuw</SelectItem>
            <SelectItem value="in_review">In behandeling</SelectItem>
            <SelectItem value="resolved">Afgehandeld</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">Geen feedback gevonden.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Datum</TableHead>
                <TableHead>Afzender</TableHead>
                <TableHead>Categorie</TableHead>
                <TableHead>Onderwerp</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item: any) => {
                const status = STATUS_LABELS[item.status] ?? STATUS_LABELS.new;
                return (
                  <TableRow key={item.id} className="cursor-pointer" onClick={() => openDetail(item)}>
                    <TableCell className="text-sm text-slate-500">
                      {new Date(item.created_at).toLocaleDateString('nl-BE')}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-semibold text-slate-900">{item.profile?.full_name ?? '—'}</div>
                      <div className="text-xs text-slate-400">{item.profile?.email ?? ''}</div>
                    </TableCell>
                    <TableCell className="text-sm">{CATEGORY_LABELS[item.category]}</TableCell>
                    <TableCell className="text-sm font-medium text-slate-900 max-w-xs truncate">{item.subject}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={status.className}>{status.label}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selected?.subject}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                <span>{CATEGORY_LABELS[selected.category]}</span>
                <span>·</span>
                <span>{selected.profile?.full_name ?? '—'} ({selected.profile?.email ?? ''})</span>
                <span>·</span>
                <span>{new Date(selected.created_at).toLocaleString('nl-BE')}</span>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-800 whitespace-pre-wrap">
                {selected.message}
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Nieuw</SelectItem>
                    <SelectItem value="in_review">In behandeling</SelectItem>
                    <SelectItem value="resolved">Afgehandeld</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Interne notitie / reactie aan ouder</Label>
                <Textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={4}
                  placeholder="Optionele notitie of reactie (zichtbaar voor de ouder)"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Annuleren</Button>
            <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
