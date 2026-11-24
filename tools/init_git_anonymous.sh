#!/usr/bin/env bash
# Initialise this folder as a git repository whose commits do not reveal the
# authors. The identity is repo-local: your global git config is untouched.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ -d .git ]; then
  echo "note: .git already exists in $(pwd); reusing it"
else
  if git init -b main >/dev/null 2>&1; then
    :
  else
    git init >/dev/null
    git symbolic-ref HEAD refs/heads/main
  fi
  echo "initialised git repository on branch main"
fi

git config --local user.name "Anonymous Author"
git config --local user.email "anonymous@example.com"
git config --local commit.gpgsign false
git config --local tag.gpgsign false

git add -A
if git diff --cached --quiet; then
  echo "nothing to commit"
else
  git commit -q -m "Anonymous demo page: cross-dialect TTS audio samples"
fi

echo
echo "latest commit:"
git log --format='  %h  %an <%ae>  %s' -n 1
echo
echo "reminder: create the GitHub repo from a neutral throw-away account, and"
echo "          check 'git log --format=\"%an <%ae>\"' before pushing."
