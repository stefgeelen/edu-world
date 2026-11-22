import { test, expect } from '../support/fixtures';
import { PIN, childIdByName, parentWithChild } from '../support/helpers';

// Flows "ouderportaal" en "wie-speelt-er" (e2e/FLOWS.md).

test('ouder opent het ouderportaal vanuit het dashboard, achter de PIN', async ({ page: setup, context, flow }) => {
  await parentWithChild(setup, { childName: 'Jules' });
  // Een ouder die later terugkomt: nieuw tabblad, dus de PIN moet opnieuw.
  // (Vlak na het instellen van de PIN is het portaal in dezelfde sessie open.)
  const page = await context.newPage();
  flow.watch(page);
  await page.goto('/app/dashboard');

  flow.start('ouderportaal');
  await flow.tap(page.getByRole('button', { name: 'Ouderportaal' }));
  await expect(page).toHaveURL(/\/app\/parent/);
  await flow.type(page.locator('input[inputmode="numeric"]'), PIN);
  await expect(page.getByRole('heading', { name: 'Mijn Kinderen' })).toBeVisible();
  flow.end();
  await expect(page.getByText('Jules').first()).toBeVisible();
});

test('ouderportaal blijft op slot na herladen zonder PIN in deze sessie', async ({ page, context }) => {
  await parentWithChild(page);
  // Nieuw tabblad = nieuwe sessie: de PIN zit in sessionStorage en mag niet meekomen.
  const fresh = await context.newPage();
  await fresh.goto('/app/parent');
  await expect(fresh.locator('input[inputmode="numeric"]')).toBeVisible();
  await expect(fresh.getByRole('heading', { name: 'Mijn Kinderen' })).toHaveCount(0);
});

test('gezin met twee kinderen: bij het openen kiest het kind zichzelf', async ({ page, flow, db }) => {
  const { email } = await parentWithChild(page, { childName: 'Anna' });
  const { parentId } = await childIdByName(db, email, 'Anna');

  // Pakket Basis (2 kinderen) en een tweede kind, zoals de admin en de ouder dat zouden doen.
  const { error: subErr, count } = await db
    .from('subscriptions')
    .update({ plan: 'basic', status: 'active', max_children: 2 }, { count: 'exact' })
    .eq('user_id', parentId);
  if (subErr) throw subErr;
  if (!count) {
    const { error } = await db.from('subscriptions').insert({ user_id: parentId, plan: 'basic', status: 'active', max_children: 2 });
    if (error) throw error;
  }
  const { error: kidErr } = await db.from('children').insert({ parent_id: parentId, name: 'Wout', age: 8, grade: 2 });
  if (kidErr) throw kidErr;

  // Dit toestel weet nog niet wie speelt.
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.includes('playing')) localStorage.removeItem(k);
  });

  flow.start('wie-speelt-er');
  await flow.open('/app');
  await expect(page).toHaveURL(/\/app\/wie-speelt-er/);
  await flow.tap(page.getByRole('button', { name: /^Anna/ }));
  await expect(page).toHaveURL(/\/app\/home/);
  flow.end();

  // Wout koos nog geen Buddy: hij gaat eerst langs de Buddy-keuze.
  await page.goto('/app/wie-speelt-er');
  await page.getByRole('button', { name: /^Wout/ }).click();
  await expect(page).toHaveURL(/\/app\/kies-je-buddy/);
});
