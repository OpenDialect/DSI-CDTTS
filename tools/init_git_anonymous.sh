#!/usr/bin/env bash
# Initialise this folder as a git repository whose commits do not reveal the
# authors. The identity is repo-local: your global git config is untouched.
# Refuses to run on a history that already contains a non-anonymous author.
set -euo pipefail

cd "$(dirname "$0")/.."

ANON_NAME="Anonymous Author"
ANON_EMAIL="anonymous@example.com"

if [ -d .git ]; then
  echo "note: .git already exists in $(pwd); checking its history"
  offenders="$(git log --all --format='%an <%ae>' 2>/dev/null | grep -v -F "$ANON_NAME <$ANON_EMAIL>" || true)"
  if [ -n "$offenders" ]; then
    echo "ERROR: existing history contains non-anonymous commits:" >&2
    echo "$offenders" | head -5 >&2
    echo "Remove .git/ and re-run this script if the history is disposable." >&2
    exit 1
  fi
else
  if git init -b main >/dev/null 2>&1; then
    :
  else
    git init >/dev/null
    git symbolic-ref HEAD refs/heads/main
  fi
  echo "initialised git repository on branch main"
fi

git config --local user.name "$ANON_NAME"
git config --local user.email "$ANON_EMAIL"
git config --local commit.gpgsign false
git config --local tag.gpgsign false

git add -A
if git diff --cached --quiet; then
  echo "nothing to commit"
else
  git commit -q -m "Anonymous demo page: cross-dialect TTS audio samples"
fi

bad="$(git log --all --format='%an <%ae>' | grep -v -F "$ANON_NAME <$ANON_EMAIL>" || true)"
if [ -n "$bad" ]; then
  echo "ERROR: non-anonymous commit detected, do not push:" >&2
  echo "$bad" | head -5 >&2
  exit 1
fi

echo
echo "latest commit:"
git log --format='  %h  %an <%ae>  %s' -n 1
echo
echo "remotes (push only with the anonymous deploy key):"
git remote -v || true
echo
echo "next: create the repo from a neutral throw-away account, add the deploy key"
echo "      to that account, then 'git push -u origin main'. See DEPLOY.md."
