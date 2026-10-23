import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

// Sends the "you're on the waiting list" mail after someone signs up on the
// beta form (BetaSignupForm). Anyone may call this, so it only mails an address
// that signed up in the last few minutes and was never mailed before: at most
// one mail per address, ever. Rows added in Admin → Beta never get it, because
// only the form calls this function.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const RECENT_SIGNUP_MS = 15 * 60 * 1000;
const BREVO_TIMEOUT_MS = 10_000;
const SENDER_EMAIL = Deno.env.get('BETA_MAIL_SENDER') ?? 'info@leapio.be';
const SUBJECT = 'Je staat op de wachtlijst van Leapio';

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
    'Bedankt voor je inschrijving! Je staat op de wachtlijst voor de beta van Leapio.',
    '',
    'Bij Leapio oefent je kind rekenen, lezen en schrijven, en zorgt het zo voor een eigen Buddy.',
    'We openen de beta stap voor stap. Zodra je aan de beurt bent, krijg je van ons een mail met alles wat je nodig hebt om te starten.',
    '',
    'Ken je andere ouders die dit ook leuk zouden vinden? Stuur hen gerust naar https://leapio.be/beta.',
    '',
    'Wil je toch niet meer op de lijst staan? Antwoord dan op deze mail of mail naar info@leapio.be.',
    '',
    'Tot snel,',
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
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Bedankt! We laten je weten zodra je aan de beurt bent.</div>
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
          <td style="padding:0 32px 28px;${font}color:#4a4366;font-size:16px;line-height:1.6;">
            <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:#3b2d71;font-weight:800;text-align:center;">Je staat op de wachtlijst!</h1>
            <p style="margin:0 0 12px;">${escapeHtml(greeting(fullName))}</p>
            <p style="margin:0 0 12px;">Bedankt voor je inschrijving voor de beta van Leapio. Bij Leapio oefent je kind rekenen, lezen en schrijven, en zorgt het zo voor een eigen Buddy.</p>
            <p style="margin:0 0 12px;">We openen de beta stap voor stap. Zodra je aan de beurt bent, krijg je van ons een mail met alles wat je nodig hebt om te starten.</p>
            <p style="margin:0;">Ken je andere ouders die dit ook leuk zouden vinden? Stuur hen gerust naar <a href="https://leapio.be/beta" style="color:#5b34b8;">leapio.be/beta</a>.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px;"><div style="height:3px;background:#f5b82e;border-radius:3px;"></div></td>
        </tr>
        <tr>
          <td style="padding:20px 32px 28px;${font}color:#8a83a3;font-size:13px;line-height:1.5;text-align:center;">
            Je krijgt deze mail omdat dit adres zich inschreef op de wachtlijst van Leapio. Wil je er niet meer op staan, of was jij dat niet? Antwoord dan op deze mail of mail naar <a href="mailto:info@leapio.be" style="color:#5b34b8;">info@leapio.be</a>.<br><br>
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

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return json({ error: 'Invalid body' }, 400);
    }
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!email || email.length > 255) return json({ error: 'Invalid email' }, 400);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Claim the row first, so two calls at once can never both send.
    const cutoff = new Date(Date.now() - RECENT_SIGNUP_MS).toISOString();
    const { data: row, error: claimErr } = await admin
      .from('beta_signups')
      .update({ confirmation_sent_at: new Date().toISOString() })
      .eq('email', email)
      .is('confirmation_sent_at', null)
      .gte('created_at', cutoff)
      .select('id, full_name')
      .maybeSingle();
    if (claimErr) throw claimErr;
    if (!row) return json({ sent: false });

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: 'Leapio', email: SENDER_EMAIL },
        to: [{ email }],
        replyTo: { email: 'info@leapio.be' },
        subject: SUBJECT,
        htmlContent: htmlBody(row.full_name),
        textContent: textBody(row.full_name),
        tags: ['beta-waitlist'],
      }),
      signal: AbortSignal.timeout(BREVO_TIMEOUT_MS),
    });

    if (!res.ok) {
      // Release the claim so a retry can still send.
      await admin.from('beta_signups').update({ confirmation_sent_at: null }).eq('id', row.id);
      const details = await res.text();
      console.error('brevo send failed', res.status, details);
      return json({ error: 'Mail could not be sent', status: res.status }, 502);
    }

    return json({ sent: true });
  } catch (e) {
    return json({ error: 'Unexpected error', details: (e as Error).message }, 500);
  }
});
