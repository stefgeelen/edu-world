import { test, expect } from '../support/fixtures';
import { addChild, chooseBuddy, logIn, setPin, signUp, uniqueEmail } from '../support/helpers';

// Flow "onboarding" (e2e/FLOWS.md): een nieuwe ouder tot in de Buddy-kamer.
test('nieuwe ouder: account → PIN → kind → Buddy → Buddy-kamer', async ({ page, flow, db }) => {
  const email = uniqueEmail();

  flow.start('onboarding');
  await signUp(page, email, flow);
  await setPin(page, flow);
  await addChild(page, 'Mila', 6, flow);
  await chooseBuddy(page, 'Vosje', flow);
  flow.end();

  // Wat er echt in de database staat.
  const { data: kids } = await db.from('children').select('id, name, grade').eq('name', 'Mila');
  const mila = kids?.find(Boolean);
  expect(mila, 'het kind is opgeslagen').toBeTruthy();
  expect(mila!.grade).toBe(1);
  const { data: buddy } = await db.from('buddy_states').select('species').eq('child_id', mila!.id).single();
  expect(buddy?.species).toBe('vosje');
});

test('fout wachtwoord: foutmelding, geen toegang', async ({ page }) => {
  await logIn(page, uniqueEmail('onbekend'));
  await expect(page.getByText(/e-mailadres of wachtwoord/i)).toBeVisible();
  await expect(page).toHaveURL(/\/toegang/);
});

test('een ingelogde ouder die terugkomt, landt meteen in de Buddy-kamer', async ({ page }) => {
  const email = uniqueEmail();
  await signUp(page, email);
  await setPin(page);
  await addChild(page, 'Noor', 7);
  await chooseBuddy(page);

  await page.goto('/app');
  await expect(page).toHaveURL(/\/app\/home/);
});
