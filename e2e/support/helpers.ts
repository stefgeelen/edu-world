import type { Page } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { expect, type FlowMeter } from './fixtures';

/**
 * Bouwstenen die meerdere flows delen. Elke helper doet wat een echte ouder of
 * kind doet, via de knoppen op het scherm. Met `flow` erbij tellen de tikken en
 * velden mee voor het complexiteitsbudget; zonder `flow` niet (voorbereiding).
 */

export const PASSWORD = 'StrongPassword1';
export const PIN = '5739'; // geen herhaling of reeks: de app weigert zwakke codes

export function uniqueEmail(tag = 'ouder') {
  return `qa-${tag}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.test`;
}

/** Zonder FlowMeter: gewoon klikken en invullen. */
const plain = {
  tap: (l: ReturnType<Page['locator']>) => l.click(),
  fill: (l: ReturnType<Page['locator']>, v: string) => l.fill(v),
  type: (l: ReturnType<Page['locator']>, v: string) => l.pressSequentially(v),
};
type Actor = Pick<FlowMeter, 'tap' | 'fill' | 'type'>;

export async function signUp(page: Page, email: string, flow: Actor = plain) {
  await page.goto('/toegang?registreren');
  await flow.fill(page.getByPlaceholder('Volledige naam'), 'QA Ouder');
  await flow.fill(page.getByPlaceholder('E-mailadres'), email);
  await flow.fill(page.getByPlaceholder('Wachtwoord'), PASSWORD);
  await flow.tap(page.getByRole('button', { name: /Account Aanmaken/ }));
  await expect(page).toHaveURL(/\/auth\/setup-pin/);
}

export async function logIn(page: Page, email: string, flow: Actor = plain) {
  await page.goto('/toegang');
  await flow.fill(page.getByPlaceholder('E-mailadres'), email);
  await flow.fill(page.getByPlaceholder('Wachtwoord'), PASSWORD);
  await flow.tap(page.locator('form').getByRole('button', { name: /Inloggen/ }));
}

/** Toegangscode kiezen en bevestigen, daarna de meldingen-vraag overslaan. */
export async function setPin(page: Page, flow: Actor = plain) {
  await expect(page.getByText(/Maak je toegangscode/)).toBeVisible();
  await flow.type(page.locator('input[inputmode="numeric"]'), PIN);
  await expect(page.getByText(/Bevestig je nieuwe code/)).toBeVisible();
  await flow.type(page.locator('input[inputmode="numeric"]'), PIN);
  await skipNotifications(page, flow);
}

/** De meldingen-vraag komt alleen als de browser ze ondersteunt: dan "Later". */
export async function skipNotifications(page: Page, flow: Actor = plain) {
  const later = page.getByRole('button', { name: 'Later' });
  await expect(page).toHaveURL(/\/auth\/meldingen|\/app\/add-child/);
  await Promise.race([
    later.waitFor({ state: 'visible' }).catch(() => {}),
    page.waitForURL(/\/app\/add-child/).catch(() => {}),
  ]);
  if (await later.isVisible()) await flow.tap(later);
  await expect(page).toHaveURL(/\/app\/add-child/);
}

export async function addChild(page: Page, name: string, age: number, flow: Actor = plain) {
  await expect(page).toHaveURL(/\/app\/add-child/);
  await flow.fill(page.locator('#childName'), name);
  await flow.fill(page.locator('#childAge'), String(age));
  await flow.tap(page.getByRole('button', { name: 'Verder' }));
}

export async function chooseBuddy(page: Page, buddy = 'Nootje', flow: Actor = plain) {
  await expect(page).toHaveURL(/\/app\/kies-je-buddy/);
  await flow.tap(page.getByRole('radio', { name: new RegExp(`^${buddy},`) }));
  await flow.tap(page.getByRole('button', { name: new RegExp(`^Ja, ${buddy}!`) }));
  await expect(page).toHaveURL(/\/app\/home/);
}

/**
 * Een ouder met één kind dat zijn Buddy al koos, ingelogd en in de Buddy-kamer.
 * De snelle weg voor flows die niet over de onboarding gaan. Standaard 6 jaar
 * (1ste leerjaar), de grootste groep gebruikers.
 */
export async function parentWithChild(page: Page, opts: { childName?: string; age?: number } = {}) {
  const email = uniqueEmail();
  await signUp(page, email);
  await setPin(page);
  await addChild(page, opts.childName ?? 'Testkind', opts.age ?? 6);
  await chooseBuddy(page);
  return { email };
}

export async function childIdByName(db: SupabaseClient, email: string, name: string) {
  const { data: users, error: uErr } = await db.auth.admin.listUsers({ perPage: 1000 });
  if (uErr) throw uErr;
  const user = users.users.find((u) => u.email === email);
  if (!user) throw new Error(`Geen gebruiker ${email}`);
  const { data, error } = await db.from('children').select('id').eq('parent_id', user.id).eq('name', name).single();
  if (error) throw error;
  return { parentId: user.id, childId: data.id as string };
}

/**
 * Een rekenoefening (Sommen) beantwoorden: leest de som op het scherm en tikt
 * het juiste (of bewust een fout) antwoord.
 */
export async function answerSum(page: Page, correct: boolean) {
  const heading = page.getByRole('heading').filter({ hasText: '=' }).first();
  await expect(heading).toContainText('?');
  const spans = heading.locator('span');
  const a = Number(await spans.nth(0).innerText());
  const op = (await spans.nth(1).innerText()).trim();
  const b = Number(await spans.nth(2).innerText());
  const answer = op === '+' ? a + b : op === '−' || op === '-' ? a - b : op === '×' ? a * b : a / b;
  const buttons = page.locator('button').filter({ hasText: /^\d+$/ });
  const count = await buttons.count();
  for (let i = 0; i < count; i++) {
    const value = Number((await buttons.nth(i).innerText()).trim());
    if ((value === answer) === correct) {
      await buttons.nth(i).click();
      return;
    }
  }
  throw new Error(`Geen ${correct ? 'juist' : 'fout'} antwoord gevonden voor ${a} ${op} ${b}`);
}
