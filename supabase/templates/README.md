# Auth email templates

Leapio-branded, Dutch versions of the Supabase Auth emails. Supabase does not read these files: paste each one into Supabase → Authentication → Emails (there is one Supabase project, see `CLAUDE.md`). Keep these files the source of truth and paste again after a change.

| File | Supabase template | Subject |
|------|-------------------|---------|
| `confirm-signup.html` | Confirm signup | Bevestig je e-mailadres voor Leapio |
| `reset-password.html` | Reset password | Kies een nieuw wachtwoord voor Leapio |
| `change-email.html` | Change email address | Bevestig je nieuwe e-mailadres voor Leapio |

The app does not use Magic link, Invite user or Reauthentication.

The logo is `public/email-logo-v2.png`: the light-background horizontal logo from `brand/leapio-logo/svg/leapio-logo-horizontaal-kleur.svg`, rendered at 640 px (~8 KB) and shown at 220 px, loaded from `https://leapio.be/email-logo-v2.png`. After a logo change, render it under a new file name: mail clients (Gmail) cache images per URL.

The sender and the "powered by Supabase" footer come from Supabase's built-in mailer, not from these templates. They disappear only with custom SMTP (Authentication → Emails → SMTP Settings).
