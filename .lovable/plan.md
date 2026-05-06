## Doel

Voeg een **"Mijn Account"** sectie toe aan het ouderportaal waar de ouder zijn/haar persoonlijke gegevens kan beheren.

## Nieuwe pagina: `/app/parent/account`

Toegankelijk via een nieuwe tab "Account" in de `ParentLayout` navigatie (naast Kinderen, Beloningen, Abonnement).

### Secties op de pagina

1. **Profielgegevens** (uit `profiles` tabel)
   - Volledige naam (bewerkbaar)
   - E-mailadres (read-only — tonen met uitleg dat dit via "wijzig e-mail" gaat)
   - Avatar URL / initialen weergave
   - Opslaan-knop → update `profiles` rij

2. **E-mailadres wijzigen**
   - Knop opent inline form
   - Gebruikt `supabase.auth.updateUser({ email })`
   - Toont melding dat bevestigingsmail wordt verstuurd

3. **Wachtwoord wijzigen**
   - Inline form: nieuw wachtwoord + bevestiging
   - Zod validatie (min 8 tekens)
   - `supabase.auth.updateUser({ password })`

4. **Ouder-PIN wijzigen**
   - Knop linkt naar bestaande `/auth/setup-pin?change=1&redirect=/app/parent/account`
   - (Hergebruikt bestaande flow — nu staat dit als icoontje rechtsboven; we houden dat én voegen het hier toe als duidelijke menu-optie)

5. **Account informatie**
   - Aanmaakdatum
   - Abonnementstype (badge, link naar Abonnement)

6. **Gevarenzone**
   - "Account verwijderen" knop met bevestigingsdialog
   - Roept een nieuwe edge function `delete-account` aan (security definer met service role) die alle data + auth user verwijdert

## Technische uitwerking

### Nieuwe bestanden
- `src/screens/parent/ParentAccount.tsx` — hoofdpagina met alle secties
- `src/components/parent/ProfileForm.tsx` — naam-formulier (RHF + Zod)
- `src/components/parent/ChangeEmailForm.tsx`
- `src/components/parent/ChangePasswordForm.tsx`
- `src/components/parent/DeleteAccountDialog.tsx`
- `supabase/functions/delete-account/index.ts` — edge function (verify_jwt = true) die `auth.admin.deleteUser` aanroept

### Bestaande bestanden te wijzigen
- `src/routes/parentRoutes.tsx` — nieuwe lazy route `account`
- `src/screens/parent/ParentLayout.tsx` — `User` icon tab toevoegen aan `NAV_ITEMS`

### Data flow
- Profiel-query: `useQuery(['parent-profile', user.id])` → `profiles` tabel
- Mutaties: `useMutation` met `queryClient.invalidateQueries(['parent-profile'])`
- Foutafhandeling via bestaande `mapAuthError` / `mapDbError` helpers
- Toast notificaties via `sonner`

### Stijl
Volgt bestaande ParentLayout-stijl: witte cards op `bg-slate-50`, blauwe accent (`bg-blue-500`), rounded-xl, schaduw-sm. Mobile-first met `max-w-3xl mx-auto`.

### Beveiliging
- E-mail/wachtwoord wijzigen verloopt via Supabase Auth (gebruiker is al ingelogd én PIN-geverifieerd via `ParentPinGate`)
- Account verwijderen vereist:
  - Type-bevestiging ("VERWIJDER" intypen)
  - Edge function valideert `auth.uid()` en verwijdert eigen account
  - RLS cascadeert via `parent_id` foreign key gedrag (kinderen, rewards, etc. — controleren of cascade nodig is, anders expliciet wissen in edge function)

## Wat NIET in deze stap zit
- Notificatie-instellingen (geen bestaande infrastructuur)
- Taal/locale switcher (project is volledig nl-NL)
- Avatar upload (gebruikt nu nog geen storage bucket voor parent avatars)

Mocht je een van deze wel willen, laat het weten — ik kan het toevoegen.