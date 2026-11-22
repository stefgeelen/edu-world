import { defineConfig, devices } from '@playwright/test';
import { localSupabase } from './e2e/support/localSupabase';

/**
 * Flowtests: de app in een echte browser, tegen een LOKALE Supabase (Docker,
 * `supabase start`). Nooit tegen productie: `localSupabase()` weigert elke URL
 * die niet lokaal is, en de fixture in e2e/support/fixtures.ts blokkeert in de
 * browser elk verzoek naar *.supabase.co.
 *
 * Draaien:  npm run test:flows   (zet de database eerst terug op de migraties + seed)
 * Snel:     npx playwright test  (zonder reset)
 * Kijken:   npx playwright test --ui
 */
const sb = localSupabase();
const PORT = 5174;

export default defineConfig({
  testDir: './e2e/flows',
  outputDir: './e2e/.results/artifacts',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3,
  retries: 0, // Een flowtest die soms faalt is een bug, geen pech.
  reporter: [
    ['list'],
    ['json', { outputFile: './e2e/.results/report.json' }],
    ['html', { outputFolder: './e2e/.results/html', open: 'never' }],
  ],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'nl-BE',
    timezoneId: 'Europe/Brussels',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    // Meldingen-vraag na de PIN: de browser zegt meteen "nee", dan slaat de app ze over.
    permissions: [],
  },
  projects: [
    { name: 'mobiel', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort --mode e2e`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    // Bestaande omgevingsvariabelen winnen van .env: zo praat de app met de lokale Supabase.
    env: {
      VITE_SUPABASE_URL: sb.url,
      VITE_SUPABASE_PUBLISHABLE_KEY: sb.anonKey,
      VITE_SUPABASE_PROJECT_ID: 'local',
    },
  },
});
