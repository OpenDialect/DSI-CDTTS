#!/usr/bin/env bash
# Build the offline supplement zip: reviewers unzip it and double-click
# index.html. Everything the page needs is inside; no network required.
# The deployment checklist and the git history are intentionally excluded.
set -euo pipefail

cd "$(dirname "$0")/.."

out="${1:-DSI-CDTTS-demo-page.zip}"
rm -f "$out"

zip -r -q -X "$out" \
  index.html \
  .nojekyll \
  README.md \
  LICENSE \
  assets \
  cases \
  docs \
  tools \
  -x '*.DS_Store' '*__pycache__*' '*/.*' '*.zip'

echo "wrote $out"
du -h "$out" | awk '{print "size: "$1}'
echo "verify with:  unzip -l $out | head -20"
