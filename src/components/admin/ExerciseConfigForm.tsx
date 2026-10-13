import React, { useId, useState } from 'react';
import { Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { validateConfig, type ConfigField, type ConfigForm } from '@/data/exerciseConfigFields';

type Config = Record<string, unknown>;

interface Props {
  form: ConfigForm;
  initialConfig: unknown;
  saving: boolean;
  onSave: (config: Config) => void;
}

/**
 * The settings of one exercise row as a form. Saves only what passes
 * validateConfig; keys the form doesn't know are kept untouched.
 */
export function ExerciseConfigForm({ form, initialConfig, saving, onSave }: Props) {
  const [draft, setDraft] = useState<Config>(() =>
    initialConfig && typeof initialConfig === 'object' ? { ...(initialConfig as Config) } : {},
  );
  const [error, setError] = useState<string | null>(null);

  const set = (key: string, value: unknown) => {
    setError(null);
    setDraft((d) => {
      const next = { ...d };
      if (value === undefined) delete next[key];
      else next[key] = value;
      return next;
    });
  };

  const handleSave = () => {
    const problem = validateConfig(form, draft);
    setError(problem);
    if (!problem) onSave(draft);
  };

  return (
    <div className="flex flex-col gap-3">
      {!initialConfig && (
        <p className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Nog geen instellingen: deze oefening gebruikt de standaardwaarden van het 1ste leerjaar.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {form.fields.map((field) => (
          <Field key={field.key} field={field} value={draft[field.key]} onChange={(v) => set(field.key, v)} />
        ))}
      </div>
      {error && <p role="alert" className="text-xs font-semibold text-red-600">{error}</p>}
      <button
        onClick={handleSave}
        disabled={saving}
        className="self-end flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 disabled:opacity-50"
      >
        <Save className="w-3.5 h-3.5" />
        Opslaan
      </button>
    </div>
  );
}

function Field({ field, value, onChange }: { field: ConfigField; value: unknown; onChange: (v: unknown) => void }) {
  const id = useId();
  const label = <label htmlFor={id} className="block text-xs font-bold text-slate-600 mb-1">{field.label}</label>;
  const inputClass = 'w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300';

  if (field.kind === 'number' || field.kind === 'euro') {
    const scale = field.kind === 'euro' ? 100 : 1;
    const shown = typeof value === 'number' ? value / scale : '';
    return (
      <div>
        {label}
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={field.min}
          max={field.max}
          step={field.kind === 'euro' ? 0.05 : 1}
          value={shown}
          onChange={(e) => onChange(e.target.value === '' ? undefined : Math.round(Number(e.target.value) * scale))}
          className={inputClass}
        />
        {field.kind === 'number' && field.hint && <p className="mt-1 text-[11px] text-slate-400">{field.hint}</p>}
      </div>
    );
  }

  if (field.kind === 'boolean') {
    return (
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 self-end py-1.5">
        <input type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4 accent-indigo-600" />
        {field.label}
      </label>
    );
  }

  if (field.kind === 'select') {
    const index = field.choices.findIndex((c) => c.value === value);
    return (
      <div>
        {label}
        <select
          id={id}
          value={index}
          onChange={(e) => {
            const i = Number(e.target.value);
            onChange(i < 0 ? undefined : field.choices[i].value);
          }}
          className={inputClass}
        >
          {(field.optional || index < 0) && <option value={-1}>{field.optional ? 'Maakt niet uit' : 'Kies…'}</option>}
          {field.choices.map((c, i) => <option key={String(c.value)} value={i}>{c.label}</option>)}
        </select>
      </div>
    );
  }

  const selected = Array.isArray(value) ? value : [];
  const toggle = (v: string | number) => {
    const next = selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v];
    // Keep the order of the choices, so saved configs read the same every time.
    const ordered = field.choices.map((c) => c.value).filter((c) => next.includes(c));
    onChange(ordered.length === 0 && field.optional ? undefined : ordered);
  };
  return (
    <div className="sm:col-span-2">
      <span className="block text-xs font-bold text-slate-600 mb-1">{field.label}</span>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={field.label}>
        {field.choices.map((c) => {
          const on = selected.includes(c.value);
          return (
            <button
              key={String(c.value)}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(c.value)}
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-bold border transition-colors',
                on ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300',
              )}
            >
              {c.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
