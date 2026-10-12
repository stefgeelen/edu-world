import React, { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { mapDbError } from '@/lib/errorMessages';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import type { ParentChild } from '@/hooks/useParentChildren';

interface ChooseActiveChildrenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  childrenList: ParentChild[];
  /** How many children the package lets play. */
  allowed: number;
}

/**
 * More children than the package allows: the parent picks who keeps playing.
 * The others stay paused (nothing is deleted) until there is room again.
 */
export function ChooseActiveChildrenDialog({ open, onOpenChange, childrenList, allowed }: ChooseActiveChildrenDialogProps) {
  const queryClient = useQueryClient();
  const [chosen, setChosen] = useState<string[]>([]);

  useEffect(() => {
    if (open) setChosen(childrenList.filter(c => !c.paused).map(c => c.id));
  }, [open, childrenList]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('set_active_children', { p_child_ids: chosen });
      if (error) throw error;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['parent-children'] }),
        queryClient.invalidateQueries({ queryKey: ['players'] }),
        queryClient.invalidateQueries({ queryKey: ['my-child'] }),
      ]);
      toast.success('Opgeslagen');
      onOpenChange(false);
    },
    onError: (e) => toast.error(mapDbError(e)),
  });

  const toggle = (id: string) =>
    setChosen(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= allowed) return prev;
      return [...prev, id];
    });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!save.isPending) onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Wie mag spelen?</DialogTitle>
          <DialogDescription>
            Je abonnement laat {allowed} {allowed === 1 ? 'kind' : 'kinderen'} spelen. De andere kinderen worden
            gepauzeerd: hun Buddy, munten en voortgang blijven bewaard.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2" role="group" aria-label="Kinderen die mogen spelen">
          {childrenList.map(child => {
            const on = chosen.includes(child.id);
            const full = !on && chosen.length >= allowed;
            return (
              <button
                key={child.id}
                type="button"
                role="checkbox"
                aria-checked={on}
                disabled={full}
                onClick={() => toggle(child.id)}
                className={cn(
                  'w-full flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all',
                  on ? 'border-blue-500 bg-blue-50' : 'border-slate-200',
                  full && 'opacity-50 cursor-not-allowed'
                )}
              >
                <span className={cn(
                  'w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0',
                  on ? 'bg-blue-500 border-blue-500' : 'border-slate-300'
                )}>
                  {on && <Check className="w-3.5 h-3.5 text-white" />}
                </span>
                <span className="font-bold text-slate-900">{child.name}</span>
              </button>
            );
          })}
        </div>

        <DialogFooter className="gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={save.isPending}
            className="px-4 py-2 rounded-xl text-sm font-bold text-slate-500 hover:text-slate-700"
          >
            Annuleren
          </button>
          <button
            type="button"
            onClick={() => save.mutate()}
            disabled={chosen.length === 0 || save.isPending}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
          >
            {save.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Opslaan
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
