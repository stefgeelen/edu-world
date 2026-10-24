import React from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { usePushPreferences, usePushStatus } from '@/hooks/usePushNotifications';
import type { InstallMode } from '@/hooks/useInstallPrompt';

/**
 * The "Meldingen" card body in Mijn account: switch notifications on or off
 * on this device, send a test, and pick which kinds to get (all devices).
 */
export function PushNotificationsSettings({
  installMode,
  onShowInstall,
}: {
  installMode: InstallMode;
  onShowInstall: () => void;
}) {
  const { status, isLoading, enable, disable, sendTest } = usePushStatus();
  const { preferences, update } = usePushPreferences();

  if (isLoading || !status) {
    return <Loader2 className="w-5 h-5 animate-spin text-slate-400" />;
  }

  if (status === 'unsupported') {
    return (
      <p className="text-sm text-slate-500">
        Deze browser kan geen meldingen ontvangen. Open Leapio op je telefoon om ze aan te zetten.
      </p>
    );
  }

  if (status === 'needs-install') {
    return (
      <>
        <p className="text-sm text-slate-500 mb-3">
          Op een iPhone of iPad werken meldingen alleen als Leapio op je beginscherm staat. Zet Leapio
          op je beginscherm, open het van daar en kom hier terug.
        </p>
        {installMode !== 'none' && (
          <button onClick={onShowInstall} className="text-sm font-bold text-blue-600 hover:text-blue-700">
            Laat zien hoe →
          </button>
        )}
      </>
    );
  }

  if (status === 'denied') {
    return (
      <p className="text-sm text-slate-500">
        Meldingen voor Leapio zijn geblokkeerd op dit toestel. Zet ze aan in de instellingen van je
        browser of telefoon en kom dan hier terug.
      </p>
    );
  }

  const setPreference = (key: 'buddy' | 'insights', value: boolean) =>
    update.mutate({ ...preferences, [key]: value });

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Hooguit één melding per dag, na schooltijd, en nooit &apos;s avonds laat.
      </p>

      {status === 'on' ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="text-sm text-slate-700 font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            Aan op dit toestel
          </p>
          <button
            onClick={() => sendTest.mutate()}
            disabled={sendTest.isPending}
            className="text-sm font-bold text-blue-600 hover:text-blue-700 disabled:opacity-50"
          >
            Stuur een testmelding
          </button>
          <button
            onClick={() => disable.mutate()}
            disabled={disable.isPending}
            className="text-sm font-bold text-slate-500 hover:text-slate-700 disabled:opacity-50"
          >
            Uitzetten
          </button>
        </div>
      ) : (
        <button
          onClick={() => enable.mutate()}
          disabled={enable.isPending}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-bold rounded-xl text-sm"
        >
          {enable.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          Meldingen aanzetten op dit toestel
        </button>
      )}

      <div className="border-t border-slate-100 pt-4 space-y-3">
        <PreferenceRow
          id="push-buddy"
          label="De Buddy mist je kind"
          hint="Als de Buddy honger heeft, ziek is of even weg is."
          checked={preferences.buddy}
          onChange={(v) => setPreference('buddy', v)}
        />
        <PreferenceRow
          id="push-insights"
          label="Aandachtspunten"
          hint="Als je kind een oefening nog moeilijk vindt, met een tip."
          checked={preferences.insights}
          onChange={(v) => setPreference('insights', v)}
        />
      </div>
    </div>
  );
}

function PreferenceRow({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label htmlFor={id} className="flex flex-col cursor-pointer">
        <span className="text-sm font-bold text-slate-800">{label}</span>
        <span className="text-xs text-slate-500">{hint}</span>
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
