#!/usr/bin/env bash
# Run a Maestro flow from test/flows/ against the booted simulator.
# See docs/DEVICE-FLOWS.md.
set -euo pipefail

flow="${1:-seat-decisions}"
mobile_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
flow_file="$mobile_root/test/flows/${flow%.yaml}.yaml"

# Maestro may not be on PATH: the installer's shell-rc edit is optional.
if command -v maestro >/dev/null 2>&1; then
  maestro_bin="$(command -v maestro)"
elif [[ -x "$HOME/.maestro/bin/maestro" ]]; then
  maestro_bin="$HOME/.maestro/bin/maestro"
else
  echo "✗ maestro not found — install it per packages/mobile/docs/DEVICE-FLOWS.md" >&2
  echo "  (not 'brew install maestro'; that name is an unrelated product)" >&2
  exit 1
fi

if [[ ! -f "$flow_file" ]]; then
  echo "✗ no flow at $flow_file. Available:" >&2
  ls "$mobile_root/test/flows/" 2>/dev/null | sed 's/\.yaml$//' | sed 's/^/  /' >&2
  exit 1
fi

metro_port="${METRO_PORT:-8081}"
if ! curl -sf "http://127.0.0.1:${metro_port}/status" >/dev/null 2>&1; then
  echo "✗ Metro is not running on :${metro_port} — start it with: just mobile" >&2
  exit 1
fi

udid=$(xcrun simctl list -j devices booted | jq -r 'first(.devices[][].udid) // empty')
if [[ -z "$udid" ]]; then
  echo "✗ no booted simulator — start one with: just table-sim" >&2
  exit 1
fi

echo "… $flow on $udid"
exec "$maestro_bin" --udid "$udid" test "$flow_file"
