Flow-QA voor Leapio. Argument: $ARGUMENTS

Kies op basis van het argument:

## Geen argument, of "run"
Draai `NO_AGENT=1 scripts/qa-flow.sh` niet; doe het rechtstreeks zodat je meekijkt:
1. Controleer dat Docker draait (`docker info`) en de lokale Supabase (`supabase status`); start ze anders (`supabase start -x studio,imgproxy,logflare,vector,realtime,storage-api,postgres-meta,supavisor`).
2. `supabase db reset --local`, dan `npx playwright test`, dan `node e2e/support/summary.mjs .git/qa-flow/baseline`.
3. Volg daarna de opdracht van de `qa-flow`-agent (`.claude/agents/qa-flow.md`) zelf: kapotte flows verklaren, complexiteit melden, dekking nakijken, `e2e/.results/rapport.md` schrijven.

## "verken <gebied>" (bv. "verken ouderportaal", "verken winkel")
Verkennend testen: klik zelf door dat deel van de app, zoals een ouder of kind dat voor het eerst doet.
1. Zorg dat de lokale Supabase draait en start de app tegen die database: `VITE_SUPABASE_URL` en `VITE_SUPABASE_PUBLISHABLE_KEY` uit `supabase status -o env`, `npx vite --port 5174 --mode e2e`. Nooit tegen productie.
2. Maak een testouder via de app (`/toegang?registreren`, adres `qa-verken-<tijd>@example.test`, wachtwoord `StrongPassword1`, PIN `5739`).
3. Open de app in de ingebouwde browser (preview) op mobiel formaat en klik door het gebied. Let op: knoppen die niets doen, schermen die blijven laden, foutmeldingen, console-fouten (`read_console_messages`), 4xx/5xx op `rpc/` (`read_network_requests`), teksten die niet kloppen met CLAUDE.md, en stappen die voor een kind van 6 te moeilijk zijn.
4. Meld per vondst: wat, waar (pad + screenshot), hoe vaak het lukt om het te herhalen. Wat herhaalbaar is: stel een flowtest voor (en schrijf hem in `e2e/flows/` als de gebruiker dat wil).
Verander geen app-code zonder het te vragen.

## "budget <flow> <waarde>"
De eigenaar past bewust een complexiteitsbudget aan: wijzig `e2e/budgets.json` en zet de reden in `why`.
