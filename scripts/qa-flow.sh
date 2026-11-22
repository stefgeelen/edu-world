#!/bin/sh
# QA-flow: na een commit de flowtests draaien tegen een LOKALE Supabase (Docker)
# en melden of de app nog werkt zoals het moet en of een flow te complex werd.
# Gestart door .githooks/post-commit, op de achtergrond; blokkeert nooit.
#
#   scripts/qa-flow.sh            alles: database terugzetten, flowtests, rapport
#   NO_AGENT=1 scripts/qa-flow.sh  zonder de QA-flow-agent (alleen tests + melding)
#   NO_RESET=1 scripts/qa-flow.sh  database niet terugzetten (sneller, minder zuiver)
#   FORCE=1 scripts/qa-flow.sh     ook draaien als er sinds de vorige run niets veranderde
#
# Uitzetten voor één commit:   LEAPIO_QA_FLOW=0 git commit ...
# Logboek:                     .git/qa-flow/log.txt
# Laatste rapport:             e2e/.results/rapport.md  (html: e2e/.results/html)
#
# De agent (.claude/agents/qa-flow.md) komt alleen in actie als er iets te melden
# valt (een flow kapot of complexer) of als de commit schermen/routes raakte
# (dan kijkt hij of de flowkaart en de tests nog kloppen). Bij groen en niets
# geraakt: alleen een melding, geen tokens.

set -u

root=$(git rev-parse --show-toplevel) || exit 0
cd "$root" || exit 0
state="$(git rev-parse --git-dir)/qa-flow"
mkdir -p "$state"
log="$state/log.txt"
results="$root/e2e/.results"

if ! mkdir "$state/lock" 2>/dev/null; then
  # Er draait al een run; die neemt deze commit niet mee, dus markeer voor later.
  touch "$state/again"
  exit 0
fi
trap 'rmdir "$state/lock" 2>/dev/null' EXIT INT TERM

note() { printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M')" "$*" >> "$log"; }
notify() {
  command -v osascript >/dev/null 2>&1 || return 0
  msg=$(printf '%s' "$1" | tr '"\\' "'/" | cut -c1-200)
  osascript -e "display notification \"$msg\" with title \"Leapio QA-flow\"" >/dev/null 2>&1 || true
}

# Homebrew en Docker staan niet altijd op het PATH van een git-hook.
PATH="/opt/homebrew/bin:/usr/local/bin:/Applications/Docker.app/Contents/Resources/bin:$PATH"
export PATH

run_once() {
  head=$(git rev-parse HEAD)
  last=$(cat "$state/last-tested" 2>/dev/null || git rev-parse HEAD~1)
  git merge-base --is-ancestor "$last" "$head" 2>/dev/null || last=$(git rev-parse HEAD~1)
  range="$last..$head"

  # Niets aan het gedrag veranderd (alleen docs): niets te testen.
  if [ "${FORCE:-0}" != "1" ] && [ "$last" = "$head" ]; then
    return 0
  fi
  if [ "${FORCE:-0}" != "1" ] && ! git diff --name-only "$last" HEAD | grep -v -E '^(docs/|CLAUDE\.md$|CONTEXT\.md$|EXERCISES\.md$|README\.md$|SEO-AUDIT\.md$)' | grep -q .; then
    note "$range: enkel documentatie, overgeslagen"
    echo "$head" > "$state/last-tested"
    return 0
  fi

  if ! docker info >/dev/null 2>&1; then
    note "$range: Docker draait niet, overgeslagen (CI test het wel)"
    notify "Flowtests overgeslagen: Docker Desktop draait niet. GitHub test ze bij de push."
    return 0
  fi

  note "$range: start"
  if ! supabase status >/dev/null 2>&1; then
    supabase start -x studio,imgproxy,logflare,vector,realtime,storage-api,postgres-meta,supavisor >> "$log" 2>&1 || {
      note "$range: supabase start mislukt"; notify "Lokale Supabase start niet. Zie .git/qa-flow/log.txt"; return 1; }
  fi
  if [ "${NO_RESET:-0}" != "1" ]; then
    # Lege database, alle migraties + seed: test meteen of de migraties nog kloppen.
    if ! supabase db reset --local >> "$log" 2>&1; then
      note "$range: database reset mislukt (migratie of seed kapot)"
      notify "✗ Een migratie of de seed faalt op een lege database. Zie .git/qa-flow/log.txt"
      return 1
    fi
  fi

  rm -rf "$results/metrics"
  npx playwright test >> "$log" 2>&1
  summary=$(node e2e/support/summary.mjs "$state/baseline")
  verdict=$?
  printf '%s\n' "$summary" >> "$log"
  headline=$(printf '%s' "$summary" | head -1)

  touched_flows=0
  git diff --name-only "$last" HEAD | grep -q -E '^src/(screens|routes|components/(auth|parent|dashboard|buddy))/|^e2e/|^supabase/migrations/' && touched_flows=1

  if [ "${NO_AGENT:-0}" != "1" ] && command -v claude >/dev/null 2>&1 && { [ $verdict -ne 0 ] || [ $touched_flows -eq 1 ]; }; then
    note "$range: QA-flow-agent (verdict $verdict, schermen geraakt: $touched_flows)"
    out=$(claude -p "Flowtest-run voor commits $range is klaar. Uitslag: $headline. Lees e2e/.results/summary.json en volg je opdracht." \
      --agent qa-flow \
      --model sonnet \
      --permission-mode acceptEdits \
      --allowedTools "Read Edit Write Glob Grep Bash(git log:*) Bash(git show:*) Bash(git diff:*) Bash(ls:*) Bash(cat:*) Bash(npx playwright test:*) Bash(node e2e/support/summary.mjs:*)" \
      --no-session-persistence < /dev/null 2>&1)
    printf '%s\n\n' "$out" >> "$log"
    first=$(printf '%s' "$out" | grep -v -E '^(Warning|Error):' | sed -n '/[^[:space:]]/{p;q;}')
    [ -n "$first" ] && headline="$first"
  fi

  notify "$headline"
  if [ $verdict -ne 1 ]; then
    # Geen kapotte flows: dit is de nieuwe maatstaf voor "complexer geworden".
    # (Een groei wordt zo één keer gemeld; boven het budget blijft het melden.)
    rm -rf "$state/baseline" && cp -R "$results/metrics" "$state/baseline"
  fi
  echo "$head" > "$state/last-tested"
  note "$range: klaar ($headline)"
}

runs=0
while [ $runs -lt 3 ]; do
  runs=$((runs + 1))
  rm -f "$state/again"
  run_once
  [ -f "$state/again" ] || break
done
