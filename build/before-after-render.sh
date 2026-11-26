#!/usr/bin/env bash
# Develops the renders listed in build/before-after.render-job.json (written by build/before-after.js) with the real
# Halatto engine: the HalattoSiteExamplesTests suite of QutjoWukmp on the iOS simulator. No job file = nothing to do.
# Env: HALATTO_SDK (default ~/code/swift-packages/QutjoWukmp), HALATTO_SIMULATOR (xcodebuild destination),
# HALATTO_SCHEME. Same simulator choice as youmarkt/scripts/halatto-render.sh.
set -euo pipefail
JOB="$(cd "$(dirname "$0")" && pwd)/before-after.render-job.json"
if [ ! -f "$JOB" ]; then echo "No renders missing."; exit 0; fi
SDK="${HALATTO_SDK:-$HOME/code/swift-packages/QutjoWukmp}"
DEST="${HALATTO_SIMULATOR:-}"
if [ -z "$DEST" ]; then
  UDID="$(xcrun simctl list devices available -j | /usr/bin/python3 -c '
import json, sys
devices = [d for runtime, items in json.load(sys.stdin)["devices"].items() if "iOS" in runtime for d in items]
pick = next((d for d in devices if d["name"] == "iPhone 17 Pro"), None) or next((d for d in devices if d["name"].startswith("iPhone")), None)
print(pick["udid"] if pick else "")
')"
  if [ -z "$UDID" ]; then echo "No iPhone simulator found: install one in Xcode or set HALATTO_SIMULATOR" >&2; exit 1; fi
  DEST="platform=iOS Simulator,id=$UDID"
fi
cd "$SDK"
SCHEME="${HALATTO_SCHEME:-}"
if [ -z "$SCHEME" ]; then
  if xcodebuild -list 2>/dev/null | grep -q "QutjoWukmp-Package"; then SCHEME="QutjoWukmp-Package"; else SCHEME="QutjoWukmp"; fi
fi
echo "Developing $(/usr/bin/python3 -c 'import json,sys; print(len(json.load(open(sys.argv[1]))["items"]))' "$JOB") render(s) on the simulator …"
TEST_RUNNER_HALATTO_SITE_EXAMPLES_JOB="$JOB" xcodebuild test \
  -scheme "$SCHEME" \
  -destination "$DEST" \
  -only-testing:QutjoWukmpTests/HalattoSiteExamplesTests \
  -quiet
