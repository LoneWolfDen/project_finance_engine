#!/bin/bash
# Compare the working tree's finance-engine-v3.5 against a git ref (default HEAD).
# The ref's rendered output is the baseline; any difference in any tab, chart,
# export, chat reply or modal is printed and the script exits non-zero.
#   ./run.sh            # working tree vs last commit
#   ./run.sh main       # working tree vs main
set -eo pipefail
REF=${1:-HEAD}
HERE=$(cd "$(dirname "$0")" && pwd)
APP=$(cd "$HERE/../.." && pwd)
REPO=$(git -C "$APP" rev-parse --show-toplevel)
APP_REL=${APP#"$REPO"/}
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
[ -d "$HERE/node_modules" ] || (cd "$HERE" && npm install --silent)
git -C "$REPO" archive "$REF" "$APP_REL" | tar -x -C "$TMP"
cd "$HERE"
echo "Baseline: $REF"
node harness.js "$TMP/$APP_REL" 3201 "$TMP/base.json"
echo "Working tree:"
node harness.js "$APP" 3202 "$TMP/new.json"
node compare.js "$TMP/base.json" "$TMP/new.json"
# Same results in other time zones (dates are UTC; local time once shifted weekdays and months)
for tz in America/New_York Asia/Kolkata; do
  HARNESS_TZ=$tz node harness.js "$APP" 3206 "$TMP/tz.json" > /dev/null
  echo -n "$tz: " && node compare.js "$TMP/new.json" "$TMP/tz.json"
done
node startup-check.js "$APP" 3203 | tail -1
node currency-check.js "$APP" 3204 | tail -1
node versions-check.js "$APP" 3205 | tail -1
node robustness-check.js "$APP" 3207 | tail -1
node excel-check.js "$APP" 3208 | tail -1
node offline-check.js "$APP" 3209 | tail -1
node tables-check.js "$APP" 3210 | tail -1
