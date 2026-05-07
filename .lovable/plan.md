## Feedback van ouders

Ouders kunnen vanuit het ouderportaal feedback sturen. Deze wordt opgeslagen in de database en is zichtbaar voor admins in een nieuwe sectie van het admin panel.

### Database
Nieuwe tabel `feedback`:
- `user_id` (verwijst naar ingelogde ouder)
- `category` (bug / suggestion / compliment / other)
- `subject` (korte titel)
- `message` (vrije tekst, max 2000 tekens)
- `status` (new / in_review / resolved) — default `new`
- `admin_notes` (optioneel, alleen door admin te bewerken)
- standaard `id`, `created_at`, `updated_at`

RLS-regels:
- Ouders kunnen hun eigen feedback aanmaken en inzien
- Admins kunnen alle feedback inzien en bijwerken (status + notities)
- Niemand kan verwijderen

### Ouderportaal
- Nieuw tabblad **"Feedback"** in `ParentLayout` (icoon: MessageSquare)
- Nieuwe route `/app/parent/feedback` → scherm `ParentFeedback.tsx`
- Bevat:
  - Formulier (categorie dropdown, onderwerp, bericht) met Zod-validatie en React Hook Form
  - Lijst met eerder verstuurde feedback van de ouder, inclusief status badge en eventuele admin-reactie

### Admin portaal
- Nieuw tabblad **"Feedback"** in `AdminDashboard` navigatie (icoon: MessageSquare)
- Nieuwe route `/admin/feedback` → scherm `AdminFeedback.tsx`
- Toont tabel met alle feedback (afzender naam/e-mail via join op `profiles`, datum, categorie, onderwerp, status)
- Klikbare rij opent detail drawer/dialog met volledig bericht, status-wijziging en admin-notitie veld

### Technische details
- Bestanden:
  - `supabase/migrations/<timestamp>_feedback.sql` (tabel + RLS + updated_at trigger)
  - `src/screens/parent/ParentFeedback.tsx`
  - `src/screens/admin/AdminFeedback.tsx`
  - Edits: `src/routes/parentRoutes.tsx`, `src/routes/adminRoutes.tsx`, `src/screens/parent/ParentLayout.tsx`, `src/screens/admin/AdminDashboard.tsx`
- Data via TanStack Query hooks; mutations invalideren `['feedback', ...]` keys
- Toast bij verzenden / status update via sonner
- Volledig nl-NL teksten
