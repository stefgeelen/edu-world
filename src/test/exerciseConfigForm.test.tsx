import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { CONFIG_FORMS, validateConfig } from '@/data/exerciseConfigFields';
import { ExerciseConfigForm } from '@/components/admin/ExerciseConfigForm';

/** Every (route, config) pair written by a migration, e.g. the grade-1 backfill and grade 2. */
function configsFromMigration(file: string): Array<{ family: string; config: Record<string, unknown> }> {
  const sql = readFileSync(resolve(__dirname, '../../supabase/migrations', file), 'utf8');
  const found: Array<{ family: string; config: Record<string, unknown> }> = [];
  const patterns = [
    /SET config = '([^']+)'::jsonb WHERE route = '([^']+)'/g, // backfill
    /\('([^']+)',\s*'stage-\d',\s*'[^']*',\s*\d+,\s*'([^']+)'::jsonb\)/g, // grade 2
  ];
  for (const m of sql.matchAll(patterns[0])) found.push({ family: m[2].replace(/\/[^/]*$/, ''), config: JSON.parse(m[1]) });
  for (const m of sql.matchAll(patterns[1])) found.push({ family: m[1].replace(/\/[^/]*$/, ''), config: JSON.parse(m[2]) });
  return found;
}

describe('validateConfig', () => {
  it('accepts every config the migrations write (grade 1 and grade 2)', () => {
    const all = [
      ...configsFromMigration('20260831150000_backfill_exercise_config.sql'),
      ...configsFromMigration('20261013120000_grade_2_maths.sql'),
      ...configsFromMigration('20261014120000_half_double.sql'),
    ];
    expect(all.length).toBeGreaterThan(40);
    for (const { family, config } of all) {
      const form = CONFIG_FORMS[family];
      expect(form, family).toBeDefined();
      expect(validateConfig(form, config), `${family} ${JSON.stringify(config)}`).toBeNull();
    }
  });

  it('accepts the Tafels configs of the 2de leerjaar', () => {
    const sql = readFileSync(resolve(__dirname, '../../supabase/migrations/20261013180000_times_tables.sql'), 'utf8');
    const configs = [...sql.matchAll(/'stage-\d', \d+, '([^']+)'::jsonb/g)].map((m) => JSON.parse(m[1]));
    expect(configs).toHaveLength(3);
    for (const config of configs) expect(validateConfig(CONFIG_FORMS['/exercises/times-tables'], config)).toBeNull();
  });

  it('refuses deeltafels for a table the child cannot pick', () => {
    expect(validateConfig(CONFIG_FORMS['/exercises/times-tables'], { tables: [2, 5], divisionTables: [3] })).toMatch(/niet bij 3/);
  });

  it('refuses numbers outside what the screen can show', () => {
    const form = CONFIG_FORMS['/exercises/comparison'];
    expect(validateConfig(form, { maxNumber: 100 })).toMatch(/tussen 2 en 99/);
    expect(validateConfig(form, { maxNumber: 12.5 })).toMatch(/geheel getal/);
    expect(validateConfig(form, {})).toMatch(/vul dit in/);
  });

  it('refuses a smallest number above the largest', () => {
    expect(validateConfig(CONFIG_FORMS['/exercises/sum-split'], { minSum: 30, maxSum: 20 })).toMatch(/niet groter/);
  });

  it('needs at least one choice where one is required', () => {
    expect(validateConfig(CONFIG_FORMS['/exercises/even-odd'], { maxNumber: 20, kinds: [] })).toMatch(/minstens één/);
  });

  it('refuses a number line too long to show', () => {
    expect(validateConfig(CONFIG_FORMS['/exercises/number-line'], { maxNumber: 100 })).toMatch(/101 punten/);
    expect(validateConfig(CONFIG_FORMS['/exercises/number-line'], { maxNumber: 100, steps: [10] })).toBeNull();
  });

  it('refuses a money price below the smallest coin', () => {
    expect(validateConfig(CONFIG_FORMS['/exercises/money'], { denominations: [500], maxPriceCents: 200 })).toMatch(/kleiner/);
  });
});

describe('ExerciseConfigForm', () => {
  afterEach(() => cleanup());

  it('saves the edited values and keeps keys it does not know', () => {
    const onSave = vi.fn();
    render(
      <ExerciseConfigForm
        form={CONFIG_FORMS['/exercises/math']}
        initialConfig={{ operators: ['+', '-'], maxNumber: 20, allowNegative: false, legacy: 1 }}
        saving={false}
        onSave={onSave}
      />,
    );
    fireEvent.change(screen.getByLabelText('Hoogste getal'), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText('Over het tiental (brug)'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: '×' }));
    fireEvent.click(screen.getByRole('button', { name: 'Opslaan' }));

    expect(onSave).toHaveBeenCalledWith({
      operators: ['+', '-', '×'], maxNumber: 100, allowNegative: false, legacy: 1, bridge: 'without',
    });
  });

  it('shows the problem and does not save an invalid config', () => {
    const onSave = vi.fn();
    render(<ExerciseConfigForm form={CONFIG_FORMS['/exercises/comparison']} initialConfig={{ maxNumber: 20 }} saving={false} onSave={onSave} />);
    fireEvent.change(screen.getByLabelText('Hoogste getal'), { target: { value: '150' } });
    fireEvent.click(screen.getByRole('button', { name: 'Opslaan' }));

    expect(screen.getByRole('alert')).toHaveTextContent('tussen 2 en 99');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('edits money prices in euro and stores cents', () => {
    const onSave = vi.fn();
    render(
      <ExerciseConfigForm
        form={CONFIG_FORMS['/exercises/money']}
        initialConfig={{ denominations: [1000, 500], maxPriceCents: 2000 }}
        saving={false}
        onSave={onSave}
      />,
    );
    expect(screen.getByLabelText('Hoogste prijs (€)')).toHaveValue(20);
    fireEvent.change(screen.getByLabelText('Hoogste prijs (€)'), { target: { value: '50' } });
    fireEvent.click(screen.getByRole('button', { name: 'Opslaan' }));
    expect(onSave).toHaveBeenCalledWith({ denominations: [1000, 500], maxPriceCents: 5000 });
  });

  it('warns when a row has no settings yet', () => {
    render(<ExerciseConfigForm form={CONFIG_FORMS['/exercises/comparison']} initialConfig={null} saving={false} onSave={vi.fn()} />);
    expect(screen.getByText(/standaardwaarden van het 1ste leerjaar/)).toBeInTheDocument();
  });
});
