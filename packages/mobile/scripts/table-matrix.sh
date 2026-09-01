#!/usr/bin/env bash
# Simulator helpers for the Skia table dev harness (/table-dev).
#
# Usage:
#   table-matrix.sh solo "<device>" [phase]   ONE sim at a time: shuts down all
#                                             other sims, boots <device>, deep-links.
#                                             Daily driver for layout work.
#   table-matrix.sh [phase]                   boot the FULL 4-sim size matrix and
#                                             deep-link all (heavy! occasional sweeps)
#   table-matrix.sh shots [outdir]            screenshot every booted sim
#                                             (default: <repo>/screenshots/matrix)
#   table-matrix.sh list                      show resolved simulator UDIDs
#
# phase: playing (default) | bidding | declaring | second_deal | game_over
# Metro port: METRO_PORT env var (default 8081).
# Rotation can't be scripted — press Cmd+← in the simulator (it remembers).
set -euo pipefail

METRO_PORT="${METRO_PORT:-8081}"
REPO_ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"

# The full-sweep matrix: smallest/biggest iPhone, smallest/biggest iPad.
# Names must match `xcrun simctl list devices available` exactly.
DEVICES=(
  "iPhone 16e"
  "iPhone 17 Pro Max"
  "iPad mini (A17 Pro)"
  "iPad Pro 13-inch (M5)"
)

udid_for() {
  local name="$1" udid
  # Prefer a sim with this name that is already booted (any runtime)
  udid=$(xcrun simctl list -j devices booted | jq -r --arg n "$name" \
    'first(.devices[][] | select(.name == $n).udid) // empty')
  if [[ -z "$udid" ]]; then
    # Otherwise take the newest runtime's available device
    udid=$(xcrun simctl list -j devices available | jq -r --arg n "$name" \
      '[.devices | to_entries | sort_by(.key) | reverse | .[] | .value[] | select(.name == $n)] | (.[0].udid // empty)')
  fi
  echo "$udid"
}

booted_sims() { # "<udid>\t<name>" per line
  xcrun simctl list -j devices booted | jq -r '.devices[][] | "\(.udid)\t\(.name)"'
}

ensure_expo_go() {
  local udid="$1" expo_go
  if ! xcrun simctl get_app_container "$udid" host.exp.Exponent >/dev/null 2>&1; then
    expo_go=$(ls -d "$HOME/.expo/ios-simulator-app-cache/"*.app 2>/dev/null | sort -V | tail -1 || true)
    if [[ -n "$expo_go" ]]; then
      echo "… installing $(basename "$expo_go")"
      xcrun simctl install "$udid" "$expo_go"
    else
      echo "⚠ Expo Go missing and no cache found — press shift+i in the Expo CLI once"
    fi
  fi
}

wait_for_metro() {
  local tries=60
  echo "… waiting for Metro on :${METRO_PORT}"
  until curl -sf "http://127.0.0.1:${METRO_PORT}/status" >/dev/null 2>&1; do
    tries=$((tries - 1))
    if [[ $tries -le 0 ]]; then
      echo "✗ Metro never came up on :${METRO_PORT} — start it: cd pidro_frontend/packages/mobile && bun run start"
      exit 1
    fi
    sleep 2
  done
}

link() { xcrun simctl openurl "$1" "exp://127.0.0.1:${METRO_PORT}/--/table-dev?phase=$2"; }

# ── solo: one sim at a time ──────────────────────────────────────────────────
if [[ "${1:-}" == "solo" ]]; then
  name="${2:?usage: table-matrix.sh solo \"<device name>\" [phase]}"
  phase="${3:-playing}"
  udid=$(udid_for "$name")
  [[ -z "$udid" ]] && { echo "✗ no simulator named '$name' — see: xcrun simctl list devices available"; exit 1; }
  while IFS=$'\t' read -r u n; do
    [[ -z "$u" || "$u" == "$udid" ]] && continue
    echo "… shutting down $n"
    xcrun simctl shutdown "$u" >/dev/null 2>&1 || true
  done < <(booted_sims)
  xcrun simctl boot "$udid" 2>/dev/null && echo "… booting $name" || true
  open -a Simulator
  xcrun simctl bootstatus "$udid" >/dev/null
  ensure_expo_go "$udid"
  wait_for_metro
  link "$udid" "$phase"
  echo "✓ $name → /table-dev?phase=$phase   (Cmd+← = landscape, sim remembers)"
  exit 0
fi

# ── shots ────────────────────────────────────────────────────────────────────
if [[ "${1:-}" == "shots" ]]; then
  outdir="${2:-$REPO_ROOT/screenshots/matrix}"
  mkdir -p "$outdir"
  count=0
  while IFS=$'\t' read -r udid name; do
    [[ -z "$udid" ]] && continue
    slug=$(echo "$name" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9' '-' | sed 's/^-//;s/-$//')
    xcrun simctl io "$udid" screenshot "$outdir/$slug.png" >/dev/null
    echo "✓ $outdir/$slug.png"
    count=$((count + 1))
  done < <(booted_sims)
  [[ $count -eq 0 ]] && { echo "✗ no booted simulators"; exit 1; }
  exit 0
fi

# ── list ─────────────────────────────────────────────────────────────────────
if [[ "${1:-}" == "list" ]]; then
  for name in "${DEVICES[@]}"; do
    printf '%-28s %s\n' "$name" "$(udid_for "$name")"
  done
  exit 0
fi

# ── full matrix: boot + deep-link all (heavy) ────────────────────────────────
PHASE="${1:-playing}"

declare -a UDIDS=()
for name in "${DEVICES[@]}"; do
  udid=$(udid_for "$name")
  if [[ -z "$udid" ]]; then
    echo "⚠ no simulator named '$name' — skipping (edit DEVICES in $0)"
    continue
  fi
  UDIDS+=("$udid")
  xcrun simctl boot "$udid" 2>/dev/null && echo "… booting $name" || echo "✓ $name already booted"
done
[[ ${#UDIDS[@]} -eq 0 ]] && { echo "✗ no simulators resolved"; exit 1; }

open -a Simulator

for udid in "${UDIDS[@]}"; do
  xcrun simctl bootstatus "$udid" >/dev/null
done
for udid in "${UDIDS[@]}"; do
  ensure_expo_go "$udid"
done

wait_for_metro

for udid in "${UDIDS[@]}"; do
  link "$udid" "$PHASE"
done

echo ""
echo "✓ ${#UDIDS[@]} simulators → /table-dev?phase=${PHASE}"
echo "  landscape: Cmd+← in each simulator (once — sims remember orientation)"
echo "  screenshots: just shots   →  screenshots/matrix/*.png"
