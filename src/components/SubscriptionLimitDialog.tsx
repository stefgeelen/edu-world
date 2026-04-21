import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface SubscriptionLimitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message?: string;
}

/**
 * Modal die wordt getoond wanneer een ouder probeert een kind toe te voegen
 * boven het abonnementslimiet. Bevat een directe upgrade-CTA.
 */
export function SubscriptionLimitDialog({
  open,
  onOpenChange,
  message,
}: SubscriptionLimitDialogProps) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/40 mx-auto mb-3">
            <Crown className="w-8 h-8 text-white" strokeWidth={2.5} />
          </div>
          <DialogTitle className="text-center text-xl font-black">
            Maximum aantal kinderen bereikt
          </DialogTitle>
          <DialogDescription className="text-center text-sm pt-1">
            {message ??
              'Je hebt het maximum aantal kinderen voor je huidige abonnement bereikt. Upgrade om meer kinderen toe te voegen.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 pt-3">
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              navigate('/app/parent/subscription');
            }}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black shadow-lg shadow-amber-500/30 active:scale-95 transition-all"
          >
            Bekijk abonnementen
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-full py-2.5 rounded-2xl text-slate-500 hover:text-slate-700 text-sm font-bold transition-colors"
          >
            Annuleren
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
