import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X } from 'lucide-react';
import { usePushStatus } from '@/hooks/usePushNotifications';

const DISMISSED_KEY = 'leapio.push-nudge-dismissed';

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false; // blocked storage: show it, it can still be closed for this visit
  }
}

/**
 * One invitation on Mijn Kinderen for parents who passed onboarding before
 * notifications existed, or tapped "Later". Closed for good with the X.
 */
export function PushNudge() {
  const navigate = useNavigate();
  const { status, enable } = usePushStatus();
  const [dismissed, setDismissed] = useState(readDismissed);

  if (dismissed || (status !== 'off' && status !== 'needs-install')) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // Only for this visit then.
    }
  };

  return (
    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
      <div className="p-2 bg-amber-100 rounded-lg">
        <Bell className="w-4 h-4 text-amber-700" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-black text-slate-900">Wil je weten wanneer de Buddy je kind mist?</p>
        <p className="text-sm text-slate-600 mt-0.5">Hooguit één melding per dag, na schooltijd.</p>
        <button
          onClick={() => (status === 'off' ? enable.mutate() : navigate('/app/parent/account'))}
          disabled={enable.isPending}
          className="mt-2 text-sm font-bold text-blue-600 hover:text-blue-700 disabled:opacity-50"
        >
          {status === 'off' ? 'Meldingen aanzetten →' : 'Zo zet je ze aan →'}
        </button>
      </div>
      <button onClick={dismiss} aria-label="Sluiten" className="p-1 text-slate-400 hover:text-slate-600">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
