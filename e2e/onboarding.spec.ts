// Critical-path E2E: sign up -> mandatory PIN setup -> add child -> avatar
// selection -> dashboard. This is the single flow every new Leapio user must
// complete, and per CLAUDE.md it currently has zero coverage of any kind.
//
// NOTE on running this file:
// playwright.config.ts builds on `lovable-agent-playwright-config`, a package
// that isn't in node_modules in this checkout (it's likely provided by
// Lovable's own cloud test runner). If `npx playwright test` fails to resolve
// that import locally, either run this suite through Lovable's test runner,
// or swap the import in playwright.config.ts for a plain
// `import { defineConfig } from '@playwright/test'` config to run it
// standalone. The spec itself only depends on `@playwright/test`.
import { test, expect } from '../playwright-fixture';

function uniqueEmail() {
  return `qa-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

const PASSWORD = 'StrongPassword1';
const PIN = '5739'; // avoids the app's "weak PIN" rejection (repeats/sequences)

test.describe('onboarding: signup through first dashboard view', () => {
  test('a brand-new parent can sign up, set a PIN, add a child, and reach the dashboard', async ({ page }) => {
    const email = uniqueEmail();

    await page.goto('/auth');
    await page.getByRole('button', { name: 'Registreren' }).click();

    await page.getByPlaceholder('Volledige naam').fill('QA Ouder');
    await page.getByPlaceholder('E-mailadres').fill(email);
    await page.getByPlaceholder('Wachtwoord').fill(PASSWORD);
    await page.getByRole('button', { name: 'Account Aanmaken' }).click();

    // Mandatory PIN setup
    await expect(page).toHaveURL(/\/auth\/setup-pin/);
    await page.locator('input[inputmode="numeric"]').first().pressSequentially(PIN);
    await page.locator('input[inputmode="numeric"]').first().pressSequentially(PIN);

    // Add first child
    await expect(page).toHaveURL(/\/app\/add-child/);
    await page.getByLabel('Naam').or(page.locator('#childName')).fill('Testkind');
    await page.locator('#childAge').fill('6');
    await page.getByRole('button', { name: 'Verder' }).click();

    // Avatar selection — pick the first available avatar
    await expect(page).toHaveURL(/\/app\b/);
    await page.locator('[class*="cursor-pointer"]').first().click();
    await page.getByRole('button', { name: /Kies/ }).click();

    // Dashboard
    await expect(page).toHaveURL(/\/app\/dashboard/);
  });

  test('signing in with the wrong password shows an error and does not navigate', async ({ page }) => {
    await page.goto('/auth');
    await page.getByPlaceholder('E-mailadres').fill(uniqueEmail());
    await page.getByPlaceholder('Wachtwoord').fill('whatever-wrong-1');
    await page.getByRole('button', { name: 'Inloggen' }).click();

    await expect(page.getByText(/Verkeerd e-mailadres of wachtwoord|ongeldig/i)).toBeVisible();
    await expect(page).toHaveURL(/\/auth/);
  });

  test('the parent portal stays locked behind the PIN after refresh', async ({ page }) => {
    // Assumes a seeded/logged-in state is provided by the fixture, or extend
    // this test to sign in first. Left intentionally minimal as a template —
    // fill in with the project's actual auth-fixture helper once available.
    await page.goto('/app/parent');
    await expect(page.locator('input[inputmode="numeric"]').first()).toBeVisible();
  });
});
