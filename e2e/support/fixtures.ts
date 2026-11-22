import { test as base, expect, type Locator, type Page, type TestInfo } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { localSupabase } from './localSupabase';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/**
 * Wat elke flowtest krijgt:
 * - `page`: een browser die alleen met deze computer mag praten (productie is
 *   onbereikbaar), en die de test laat falen op een JavaScript-crash in de app.
 * - `flow`: telt per flow de tikken, ingevulde velden en schermen, en vergelijkt
 *   ze met e2e/budgets.json. Te veel = waarschuwing ("te complex"), geen fout.
 * - `db`: een beheerdersverbinding met de lokale database, om na te kijken wat
 *   een flow écht heeft opgeslagen.
 */

interface Budget {
  taps: number;
  fields: number;
  screens: number;
  why: string;
}

export interface FlowMetrics {
  flow: string;
  taps: number;
  fields: number;
  screens: string[];
  durationMs: number;
  budget: Budget | null;
  overBudget: string[];
}

const BUDGETS: Record<string, Budget> = JSON.parse(
  fs.readFileSync(path.join(HERE, '..', 'budgets.json'), 'utf8'),
).flows;
const METRICS_DIR = path.join(HERE, '..', '.results', 'metrics');

export class FlowMeter {
  private name: string | null = null;
  private taps = 0;
  private fields = 0;
  private screens: string[] = [];
  private started = 0;
  private onNav = () => this.recordScreen();

  constructor(private page: Page, private info: TestInfo) {}

  /** Tel op een ander tabblad (vóór start()). */
  watch(page: Page) {
    this.page = page;
  }

  /** Begin met tellen. `name` is de sleutel in e2e/budgets.json en e2e/FLOWS.md. */
  start(name: string) {
    if (!BUDGETS[name]) throw new Error(`Flow "${name}" staat niet in e2e/budgets.json.`);
    this.name = name;
    this.taps = 0;
    this.fields = 0;
    this.screens = [];
    this.started = Date.now();
    this.recordScreen();
    this.page.on('framenavigated', this.onNav);
  }

  /** De app openen op `url` als eerste stap van de flow (het vorige scherm telt niet mee). */
  async open(url: string) {
    this.page.off('framenavigated', this.onNav);
    await this.page.goto(url);
    this.screens = [];
    this.recordScreen();
    this.page.on('framenavigated', this.onNav);
  }

  /** Een tik die de gebruiker moet doen om vooruit te komen. */
  async tap(target: Locator) {
    if (this.name) this.taps += 1;
    await target.click();
  }

  /** Een veld dat de gebruiker moet invullen. */
  async fill(target: Locator, value: string) {
    if (this.name) this.fields += 1;
    await target.fill(value);
  }

  /** Een code of getal intikken in een veld (telt als één veld). */
  async type(target: Locator, value: string) {
    if (this.name) this.fields += 1;
    await target.pressSequentially(value);
  }

  private recordScreen() {
    if (!/^https?:/.test(this.page.url())) return; // about:blank vóór de eerste goto
    const p = new URL(this.page.url()).pathname;
    if (this.screens[this.screens.length - 1] !== p) this.screens.push(p);
  }

  /** Stop met tellen en vergelijk met het budget. */
  end(): FlowMetrics {
    if (!this.name) throw new Error('flow.end() zonder flow.start()');
    this.page.off('framenavigated', this.onNav);
    this.recordScreen();
    const budget = BUDGETS[this.name] ?? null;
    const overBudget: string[] = [];
    if (budget) {
      if (this.taps > budget.taps) overBudget.push(`${this.taps} tikken (budget ${budget.taps})`);
      if (this.fields > budget.fields) overBudget.push(`${this.fields} velden (budget ${budget.fields})`);
      if (this.screens.length > budget.screens)
        overBudget.push(`${this.screens.length} schermen (budget ${budget.screens})`);
    }
    const metrics: FlowMetrics = {
      flow: this.name,
      taps: this.taps,
      fields: this.fields,
      screens: this.screens,
      durationMs: Date.now() - this.started,
      budget,
      overBudget,
    };
    fs.mkdirSync(METRICS_DIR, { recursive: true });
    fs.writeFileSync(path.join(METRICS_DIR, `${this.name}.json`), JSON.stringify(metrics, null, 2));
    if (overBudget.length) {
      this.info.annotations.push({
        type: 'te-complex',
        description: `${this.name}: ${overBudget.join(', ')}. Pad: ${this.screens.join(' → ')}`,
      });
    }
    this.name = null;
    return metrics;
  }
}

const LOCAL = /^(https?|wss?):\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//;

export const test = base.extend<{ flow: FlowMeter; db: SupabaseClient }>({
  context: async ({ context }, provide) => {
    // Alleen deze computer. Productie (*.supabase.co), fonts, analytics: geblokkeerd.
    await context.route(
      (url) => !LOCAL.test(url.toString()) && !url.toString().startsWith('data:'),
      (route) => route.abort('blockedbyclient'),
    );
    await provide(context);
  },

  page: async ({ page }, provide, testInfo) => {
    const crashes: string[] = [];
    const consoleErrors: string[] = [];
    const serverErrors: string[] = [];
    page.on('pageerror', (err) => crashes.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !/net::ERR_BLOCKED_BY_CLIENT|Failed to load resource/.test(msg.text())) {
        consoleErrors.push(msg.text().slice(0, 300));
      }
    });
    page.on('response', (res) => {
      // Spraak (synthesize-speech) draait lokaal niet: die 500 is verwacht.
      if (res.status() >= 500 && !res.url().includes('/functions/v1/synthesize-speech')) serverErrors.push(`${res.status()} ${res.request().method()} ${res.url()}`);
    });

    await provide(page);

    for (const e of consoleErrors.slice(0, 5)) testInfo.annotations.push({ type: 'console-error', description: e });
    for (const e of serverErrors.slice(0, 5)) testInfo.annotations.push({ type: 'server-error', description: e });
    // Een crash in de app is altijd een fout, ook als de flow toevallig verder kon.
    expect(crashes, 'De app crashte (uncaught error) tijdens deze flow').toEqual([]);
  },

  flow: async ({ page }, provide, testInfo) => {
    await provide(new FlowMeter(page, testInfo));
  },

  // Playwright wil hier een object-pattern, ook als de fixture niets nodig heeft.
  // eslint-disable-next-line no-empty-pattern
  db: async ({}, provide) => {
    const sb = localSupabase();
    await provide(createClient(sb.url, sb.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } }));
  },
});

export { expect };
