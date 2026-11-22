import { execSync } from 'node:child_process';

export interface LocalSupabase {
  url: string;
  anonKey: string;
  serviceKey: string;
  mailUrl: string;
}

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

/**
 * Het veiligheidsslot: de URL moet naar deze computer wijzen. Een flowtest maakt
 * echte accounts en kinderen aan; op productie zou dat beta-gebruikers en
 * statistieken vervuilen.
 */
export function assertLocal(url: string): void {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error(`Flowtests: ongeldige Supabase-URL "${url}".`);
  }
  if (!LOCAL_HOSTS.has(host)) {
    throw new Error(
      `Flowtests weigeren te starten: Supabase-URL "${url}" is niet lokaal. ` +
        'Ze draaien alleen tegen `supabase start` (Docker), nooit tegen productie.',
    );
  }
}

/**
 * URL en sleutels van de lokale Supabase, uit `supabase status`. Eén keer per
 * run opgehaald en via process.env doorgegeven aan de workers.
 */
export function localSupabase(): LocalSupabase {
  if (!process.env.E2E_SUPABASE_URL) {
    let out: string;
    try {
      out = execSync('supabase status -o env', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    } catch {
      throw new Error(
        'Flowtests: de lokale Supabase draait niet. Start Docker Desktop en dan `supabase start` ' +
          '(of gebruik `npm run test:flows`, dat doet het voor je).',
      );
    }
    const env: Record<string, string> = {};
    for (const line of out.split('\n')) {
      const m = line.match(/^([A-Z_]+)="?(.*?)"?$/);
      if (m) env[m[1]] = m[2];
    }
    process.env.E2E_SUPABASE_URL = env.API_URL;
    process.env.E2E_SUPABASE_ANON_KEY = env.ANON_KEY || env.PUBLISHABLE_KEY;
    process.env.E2E_SUPABASE_SERVICE_KEY = env.SERVICE_ROLE_KEY || env.SECRET_KEY;
    process.env.E2E_MAIL_URL = env.INBUCKET_URL || env.MAILPIT_URL || 'http://127.0.0.1:54324';
  }
  const sb = {
    url: process.env.E2E_SUPABASE_URL!,
    anonKey: process.env.E2E_SUPABASE_ANON_KEY!,
    serviceKey: process.env.E2E_SUPABASE_SERVICE_KEY!,
    mailUrl: process.env.E2E_MAIL_URL!,
  };
  assertLocal(sb.url);
  if (!sb.anonKey || !sb.serviceKey) throw new Error('Flowtests: geen sleutels gevonden in `supabase status`.');
  return sb;
}
