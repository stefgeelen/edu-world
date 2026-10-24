#!/bin/sh
# Na een commit: laat de doc-sync agent (.claude/agents/doc-sync.md) nakijken of
# de FSD en de TSD moeten bijgewerkt worden. Gestart door .githooks/post-commit,
# op de achtergrond. Werkt elke keer alle commits af sinds de vorige run, dus
# een commit die binnenkomt terwijl er al een run bezig is, komt in de volgende.
#
# Uitzetten voor één commit:   LEAPIO_DOC_SYNC=0 git commit ...
# Uitzetten voorgoed:          git config --unset core.hooksPath
# Logboek:                     .git/doc-sync/log.txt
# Met de hand draaien:         scripts/doc-sync.sh   (DRY_RUN=1 toont enkel de commits)

set -u

root=$(git rev-parse --show-toplevel) || exit 0
cd "$root" || exit 0
state="$(git rev-parse --git-dir)/doc-sync"
mkdir -p "$state"
log="$state/log.txt"
fsd="$(dirname "$(dirname "$root")")/Functional specs"

# Eén run tegelijk.
if ! mkdir "$state/lock" 2>/dev/null; then
  exit 0
fi
trap 'rmdir "$state/lock" 2>/dev/null' EXIT INT TERM

note() { printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M')" "$*" >> "$log"; }

notify() {
  command -v osascript >/dev/null 2>&1 || return 0
  msg=$(printf '%s' "$1" | tr '"\\' "'/" | cut -c1-200)
  osascript -e "display notification \"$msg\" with title \"Leapio docs\"" >/dev/null 2>&1 || true
}

# Alleen bestanden die niets aan het gedrag veranderen: dan valt er niets na te kijken.
docs_only() {
  git diff --name-only "$1" HEAD | grep -v -E '^(docs/|CLAUDE\.md$|CONTEXT\.md$|EXERCISES\.md$|README\.md$|\.claude/|scripts/doc-sync\.sh$|\.githooks/)' | grep -q . && return 1
  return 0
}

runs=0
while [ $runs -lt 3 ]; do
  runs=$((runs + 1))
  head=$(git rev-parse HEAD)
  last=$(cat "$state/last-reviewed" 2>/dev/null || git rev-parse HEAD~1)

  # Een herschreven geschiedenis (rebase, amend): begin bij de vorige commit.
  git merge-base --is-ancestor "$last" "$head" 2>/dev/null || last=$(git rev-parse HEAD~1)
  [ "$last" = "$head" ] && exit 0

  range="$last..$head"
  if docs_only "$last"; then
    note "$range: enkel documentatie, overgeslagen"
    echo "$head" > "$state/last-reviewed"
    continue
  fi

  if [ "${DRY_RUN:-0}" = "1" ]; then
    git log --format='%h %s' "$range"
    exit 0
  fi

  note "$range: start"
  out=$(claude -p "Kijk commits $range na en werk de FSD en de TSD bij waar nodig." \
    --agent doc-sync \
    --model sonnet \
    --permission-mode acceptEdits \
    --allowedTools "Read Edit Write Glob Grep Bash(git log:*) Bash(git show:*) Bash(git diff:*) Bash(git rev-parse:*) Bash(ls:*) Bash(wc:*)" \
    --add-dir "$fsd" \
    --no-session-persistence 2>&1)
  status=$?
  printf '%s\n\n' "$out" >> "$log"

  if [ $status -ne 0 ]; then
    note "$range: mislukt (exit $status)"
    if printf '%s' "$out" | grep -q -i 'not logged in'; then
      notify "De documentatie kon niet nagekeken worden: log in met 'claude' in de Terminal."
      exit 1
    fi
    notify "Nakijken van de documentatie mislukt. Zie .git/doc-sync/log.txt"
    exit 1
  fi

  echo "$head" > "$state/last-reviewed"
  note "$range: klaar"
  notify "$(printf '%s' "$out" | sed -n '/[^[:space:]]/{p;q;}')"
done
