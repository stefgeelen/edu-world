import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { MessageSquare, Send, Loader2 } from 'lucide-react';
import { z } from 'zod';

const schema = z.object({
  category: z.enum(['bug', 'suggestion', 'compliment', 'other']),
  subject: z.string().trim().min(1, 'Onderwerp is verplicht').max(150),
  message: z.string().trim().min(1, 'Bericht is verplicht').max(2000),
});

const CATEGORY_LABELS: Record<string, string> = {
  bug: 'Probleem / bug',
  suggestion: 'Suggestie',
  compliment: 'Compliment',
  other: 'Overig',
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  new: { label: 'Nieuw', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  in_review: { label: 'In behandeling', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  resolved: { label: 'Afgehandeld', className: 'bg-green-100 text-green-700 border-green-200' },
};

export function ParentFeedback() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<'bug' | 'suggestion' | 'compliment' | 'other'>('suggestion');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['feedback', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const parsed = schema.parse({ category, subject, message });
      const { error } = await supabase.from('feedback').insert({
        user_id: user!.id,
        ...parsed,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Bedankt! Je feedback is verstuurd.');
      setSubject('');
      setMessage('');
      setCategory('suggestion');
      queryClient.invalidateQueries({ queryKey: ['feedback', user?.id] });
    },
    onError: (err: any) => {
      const msg = err?.errors?.[0]?.message ?? err?.message ?? 'Er ging iets mis';
      toast.error(msg);
    },
  });

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-blue-100 rounded-2xl">
          <MessageSquare className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-900">Feedback</h2>
          <p className="text-sm text-slate-500">Help ons EduWorld te verbeteren — laat ons weten wat je denkt.</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border-2 border-slate-100 p-6 space-y-4">
        <div className="space-y-2">
          <Label>Categorie</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Onderwerp</Label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Korte titel"
            maxLength={150}
          />
        </div>
        <div className="space-y-2">
          <Label>Bericht</Label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Vertel ons meer..."
            rows={6}
            maxLength={2000}
          />
          <p className="text-xs text-slate-400 text-right">{message.length} / 2000</p>
        </div>
        <Button
          onClick={() => submitMutation.mutate()}
          disabled={submitMutation.isPending || !subject.trim() || !message.trim()}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white"
        >
          {submitMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Send className="w-4 h-4 mr-2" />
          )}
          Verstuur feedback
        </Button>
      </div>

      <div>
        <h3 className="text-lg font-bold text-slate-900 mb-3">Eerder verstuurd</h3>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center text-slate-400 text-sm">
            Nog geen feedback verstuurd.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item: any) => {
              const status = STATUS_LABELS[item.status] ?? STATUS_LABELS.new;
              return (
                <div key={item.id} className="bg-white rounded-2xl shadow-sm border-2 border-slate-100 p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-900">{item.subject}</p>
                      <p className="text-xs text-slate-400">
                        {CATEGORY_LABELS[item.category]} · {new Date(item.created_at).toLocaleDateString('nl-BE')}
                      </p>
                    </div>
                    <Badge variant="outline" className={status.className}>{status.label}</Badge>
                  </div>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{item.message}</p>
                  {item.admin_notes && (
                    <div className="mt-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
                      <p className="text-xs font-bold text-blue-700 mb-1">Reactie EduWorld</p>
                      <p className="text-sm text-blue-900 whitespace-pre-wrap">{item.admin_notes}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
