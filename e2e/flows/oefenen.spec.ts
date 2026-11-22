import { test, expect } from '../support/fixtures';
import type { Page } from '@playwright/test';
import { answerSum, childIdByName, parentWithChild } from '../support/helpers';

// Flows "oefening-starten", "oefening-afmaken" en "game-over" (e2e/FLOWS.md).

async function munten(db: import('@supabase/supabase-js').SupabaseClient, childId: string) {
  const { data, error } = await db.from('buddy_states').select('munten').eq('child_id', childId).single();
  if (error) throw error;
  return data.munten as number;
}

/** Vanaf het openen van de app tot in de eerste Sommen-oefening, zoals een kind het doet. */
async function startSums(page: Page, flow?: import('../support/fixtures').FlowMeter) {
  const tap = flow ? (l: ReturnType<Page['locator']>) => flow.tap(l) : (l: ReturnType<Page['locator']>) => l.click();
  if (flow) await flow.open('/app');
  else await page.goto('/app');
  await expect(page).toHaveURL(/\/app\/home/);
  await tap(page.getByRole('button', { name: 'Dashboard' }));
  await tap(page.getByRole('button', { name: /Alle oefeningen/ }));
  await expect(page).toHaveURL(/\/app\/oefenen/);
  await tap(page.getByRole('button', { name: /^Sommen/ }).first());
  await expect(page).toHaveURL(/\/app\/exercises\/math\//);
}

test('kind opent de app en start een oefening', async ({ page, flow }) => {
  await parentWithChild(page);
  flow.start('oefening-starten');
  await startSums(page, flow);
  flow.end();
  await expect(page.getByText('Kies het juiste antwoord!')).toBeVisible();
});

test('oefening afmaken: 5 juiste antwoorden → terug naar Alle oefeningen, met Munten', async ({ page, flow, db }) => {
  const { email } = await parentWithChild(page, { childName: 'Lou' });
  const { childId } = await childIdByName(db, email, 'Lou');
  const before = await munten(db, childId);
  await startSums(page);

  flow.start('oefening-afmaken');
  for (let i = 0; i < 5; i++) {
    await answerSum(page, true);
    if (i < 4) await expect(page.getByRole('heading').filter({ hasText: '=' }).first()).toContainText('?');
  }
  await expect(page).toHaveURL(/\/app\/oefenen/, { timeout: 15_000 });
  flow.end();

  // De beloning staat echt in de database, en het scherm toont ze.
  await expect.poll(() => munten(db, childId), { message: 'Munten na een afgewerkte oefening' }).toBeGreaterThan(before);
  const after = await munten(db, childId);
  await expect(page.getByLabel(`${after} Munten`)).toBeVisible();
  const { count } = await db.from('exercise_attempts').select('*', { count: 'exact', head: true }).eq('child_id', childId);
  expect(count, 'precies één poging opgeslagen').toBe(1);
});

test('game-over: 3 fouten → terug, geen Munten, wel genoteerd als moeilijk', async ({ page, flow, db }) => {
  const { email } = await parentWithChild(page, { childName: 'Bas' });
  const { childId } = await childIdByName(db, email, 'Bas');
  const before = await munten(db, childId);
  await startSums(page);

  flow.start('game-over');
  for (let i = 0; i < 3; i++) {
    await answerSum(page, false);
    if (i < 2) await expect(page.locator('button').filter({ hasText: /^\d+$/ }).first()).toBeEnabled();
  }
  await expect(page).toHaveURL(/\/app\/oefenen/, { timeout: 15_000 });
  flow.end();

  expect(await munten(db, childId), 'game-over betaalt niets').toBe(before);
  const { count: attempts } = await db.from('exercise_attempts').select('*', { count: 'exact', head: true }).eq('child_id', childId);
  expect(attempts, 'geen afgewerkte poging').toBe(0);
  await expect
    .poll(async () => (await db.from('exercise_incomplete_attempts').select('*', { count: 'exact', head: true }).eq('child_id', childId)).count, {
      message: 'game-over komt in de Aandachtspunten',
    })
    .toBe(1);
});
