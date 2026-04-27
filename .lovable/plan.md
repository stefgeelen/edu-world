## Doel

Voeg een "Permanent verwijderen" knop toe in het Admin gebruikersoverzicht (`/admin/users`) waarmee een admin een volledig account inclusief alle gerelateerde data kan wissen — bedoeld om testaccounts op te ruimen.

## UX

In `AdminUsers.tsx`, naast de huidige "Maak admin / Admin verwijderen" knop, een rode **"Verwijder account"** knop (Trash2 icon) per gebruikerrij.

Klikken opent een **bevestigingsdialoog** (AlertDialog) met:
- Naam + e-mail van de gebruiker
- Lijst van wat verwijderd wordt (kinderen, voortgang, badges, beloningen, abonnement, rol, profiel, auth-account)
- Tekstveld waarin de admin "VERWIJDER" moet typen om te bevestigen
- Definitieve "Permanent verwijderen" knop (disabled tot tekst klopt)

Veiligheid:
- Een admin kan zichzelf niet verwijderen (knop disabled op eigen rij).
- Na succes: toast + lijst verversen via `queryClient.invalidateQueries`.

## Technisch

### 1. Edge Function: `supabase/functions/admin-delete-user/index.ts`

Reden: het verwijderen van een `auth.users` record vereist de **service role key** — kan niet vanaf de client. RLS ontbreekt op sommige cascade-stappen, dus we doen het server-side in één functie.

Werking:
1. CORS handling.
2. JWT van caller valideren via `supabase.auth.getUser(token)` met de anon client.
3. Controleer dat caller `admin` rol heeft via `has_role` RPC.
4. Body valideren met Zod: `{ userId: string (uuid) }`.
5. Caller mag zichzelf niet verwijderen → 400.
6. Met **service role client** in deze volgorde verwijderen (children-IDs eerst ophalen):
   - `child_badges` waar child_id ∈ children van user
   - `exercise_attempts` waar child_id ∈ children
   - `child_progress` waar child_id ∈ children
   - `trimester_progress` waar child_id ∈ children
   - `rewards` waar parent_id = userId (en/of child_id ∈ children)
   - `children` waar parent_id = userId
   - `subscriptions` waar user_id = userId
   - `parent_pins` waar user_id = userId
   - `user_roles` waar user_id = userId
   - `organization_members` waar user_id = userId
   - `profiles` waar id = userId
   - `supabase.auth.admin.deleteUser(userId)` als laatste
7. Return `{ success: true }` of error met details.

`config.toml` aanpassen: voeg `[functions.admin-delete-user]` met `verify_jwt = false` toe (we valideren JWT in code).

### 2. Frontend wijzigingen in `src/screens/admin/AdminUsers.tsx`

- Importeer `Trash2` icon, `AlertDialog`-componenten van `@/components/ui/alert-dialog`.
- Nieuwe `useMutation` `deleteUser` die `supabase.functions.invoke('admin-delete-user', { body: { userId } })` aanroept.
- Bij succes: invalidate queries `admin-profiles`, `admin-roles`, `admin-subscriptions`, `admin-children` en toon toast.
- State voor dialoog: `userToDelete: Profile | null`, `confirmText: string`.
- Huidige `useAuth`-import gebruiken om eigen userId te kennen → eigen rij krijgt disabled knop met tooltip "Je kunt jezelf niet verwijderen".

### Bestanden

- **Nieuw**: `supabase/functions/admin-delete-user/index.ts`
- **Bewerkt**: `supabase/config.toml` (functieblok toevoegen)
- **Bewerkt**: `src/screens/admin/AdminUsers.tsx` (knop + dialog + mutation)

Geen DB-schema-migratie nodig — alle deletes lopen via service role.
