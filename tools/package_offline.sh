#!/usr/bin/env bash
# Build the offline supplement zip: reviewers unzip it and double-click
# index.html. Everything the page needs is inside; no network required.
set -euo pipefail

cd "$(dirname "$0")/.."

out="${1:-DSI-CDTTS-demo-page.zip}"
rm -f "$out"

zip -r -q -X "$out" \
  index.html \
  .nojekyll \
  README.md \
  DEPLOY.md \
  LICENSE \
  assets \
  cases \
  docs \
  -x '*.DS_Store' '*__pycache__*' '*/.*'

echo "wrote $out"
du -h "$out" | awk '{print "size: "$1}'
echo "verify with:  unzip -l $out | head -20"
