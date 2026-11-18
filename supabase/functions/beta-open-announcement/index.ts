import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { requireUser } from '../_shared/requireUser.ts';

// The one-off mail "De beta van Leapio is open" to the waiting list (Admin →
// Beta). Admins only, and only while registration is open, else the link in
// the mail would lead to a refusal.
//
// Each call claims the next batch (oldest first) through
// _claim_beta_open_mail_batch, which sets beta_signups.open_mail_sent_at right
// away: an address is mailed at most once, never twice by two calls at once,
// and never when it already has an account. When Brevo refuses a mail (e.g.
// its daily limit), that row and the rest of the batch are released and the
// call answers `stopped`, so the admin can try again later.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const BREVO_TIMEOUT_MS = 10_000;
const DEFAULT_BATCH = 50;
const SENDER_EMAIL = Deno.env.get('BETA_MAIL_SENDER') ?? 'info@leapio.be';
const SUBJECT = 'De beta van Leapio is open!';
const SIGNUP_URL = 'https://leapio.be/toegang?registreren';

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function greeting(fullName: string | null): string {
  const name = fullName?.trim();
  return name ? `Hallo ${name},` : 'Hallo,';
}

function textBody(fullName: string | null): string {
  return [
    greeting(fullName),
    '',
    'Goed nieuws: de beta van Leapio is open, en je hoeft niet langer te wachten.',
    '',
    `Maak hier je gratis account: ${SIGNUP_URL}`,
    '',
    'Daarna kies je een toegangscode voor jezelf, voeg je je kind toe en kiest je kind een eigen Buddy. Zo kan het meteen beginnen met oefenen.',
    '',
    'Het is nog een beta. Loopt er iets mis, of heb je een idee? Antwoord gewoon op deze mail: we lezen alles.',
    '',
    'Veel plezier,',
    'Leapio',
  ].join('\n');
}

function htmlBody(fullName: string | null): string {
  const font = "font-family:Nunito,'Segoe UI',Arial,sans-serif;";
  return `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${SUBJECT}</title>
</head>
<body style="margin:0;padding:0;background:#f4f1fb;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Je hoeft niet langer te wachten: maak je gratis account.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f1fb;">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:#ffffff;border-radius:20px;">
        <tr>
          <td align="center" style="padding:32px 32px 20px;">
            <a href="https://leapio.be" style="text-decoration:none;"><img src="https://leapio.be/email-logo-v2.png" width="220" height="61" alt="Leapio" style="display:block;border:0;width:220px;height:61px;"></a>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 8px;${font}color:#4a4366;font-size:16px;line-height:1.6;">
            <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:#3b2d71;font-weight:800;text-align:center;">De beta is open!</h1>
            <p style="margin:0 0 12px;">${escapeHtml(greeting(fullName))}</p>
            <p style="margin:0 0 12px;">Goed nieuws: de beta van Leapio is open, en je hoeft niet langer te wachten.</p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:8px 32px 20px;">
            <a href="${SIGNUP_URL}" style="display:inline-block;background:#f5b82e;color:#1a103c;${font}font-size:17px;font-weight:800;text-decoration:none;padding:14px 28px;border-radius:14px;">Maak je gratis account</a>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 28px;${font}color:#4a4366;font-size:16px;line-height:1.6;">
            <p style="margin:0 0 12px;">Daarna kies je een toegangscode voor jezelf, voeg je je kind toe en kiest je kind een eigen Buddy. Zo kan het meteen beginnen met oefenen.</p>
            <p style="margin:0;">Het is nog een beta. Loopt er iets mis, of heb je een idee? Antwoord gewoon op deze mail: we lezen alles.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px;"><div style="height:3px;background:#f5b82e;border-radius:3px;"></div></td>
        </tr>
        <tr>
          <td style="padding:20px 32px 28px;${font}color:#8a83a3;font-size:13px;line-height:1.5;text-align:center;">
            Je krijgt deze mail omdat dit adres op de wachtlijst van Leapio stond. Wil je geen mails meer van ons? Antwoord dan op deze mail of mail naar <a href="mailto:info@leapio.be" style="color:#5b34b8;">info@leapio.be</a>.<br><br>
            <strong style="color:#3b2d71;">Leapio</strong> &middot; oefenen met je eigen Buddy &middot; <a href="https://leapio.be" style="color:#5b34b8;text-decoration:none;">leapio.be</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');
    if (!BREVO_API_KEY) return json({ error: 'BREVO_API_KEY is not set' }, 500);

    const caller = await requireUser(req);
    if (!caller) return json({ error: 'Unauthorized' }, 401);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: roleRow, error: roleErr } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .eq('role', 'admin')
      .maybeSingle();
    if (roleErr) throw roleErr;
    if (!roleRow) return json({ error: 'Forbidden' }, 403);

    const { data: isOpen, error: openErr } = await admin.rpc('registration_is_open');
    if (openErr) throw openErr;
    if (isOpen !== true) return json({ error: 'Registration is closed' }, 409);

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // No body: default batch size.
    }
    const limit = Number.isInteger(body?.limit) ? Math.min(Math.max(body.limit, 1), 100) : DEFAULT_BATCH;

    const { data: rows, error: claimErr } = await admin.rpc('_claim_beta_open_mail_batch', { p_limit: limit });
    if (claimErr) throw claimErr;
    const batch = (rows ?? []) as { id: string; email: string; full_name: string | null }[];

    let sent = 0;
    let stopped: string | null = null;
    for (let i = 0; i < batch.length; i++) {
      const row = batch[i];
      let ok = false;
      try {
        const res = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json', accept: 'application/json' },
          body: JSON.stringify({
            sender: { name: 'Leapio', email: SENDER_EMAIL },
            to: [{ email: row.email }],
            replyTo: { email: 'info@leapio.be' },
            subject: SUBJECT,
            htmlContent: htmlBody(row.full_name),
            textContent: textBody(row.full_name),
            tags: ['beta-open'],
          }),
          signal: AbortSignal.timeout(BREVO_TIMEOUT_MS),
        });
        ok = res.ok;
        if (!ok) console.error('brevo send failed', res.status, await res.text());
      } catch (e) {
        console.error('brevo send error', (e as Error).message);
      }

      if (!ok) {
        // Release this row and the rest of the batch, so a later try sends them.
        const unsent = batch.slice(i).map((r) => r.id);
        await admin.from('beta_signups').update({ open_mail_sent_at: null }).in('id', unsent);
        stopped = 'brevo';
        break;
      }
      sent++;
    }

    const { count, error: countErr } = await admin.rpc('_beta_open_mail_pending_rows', {}, { count: 'exact', head: true });
    if (countErr) throw countErr;

    return json({ sent, remaining: count ?? 0, stopped });
  } catch (e) {
    return json({ error: 'Unexpected error', details: (e as Error).message }, 500);
  }
});
