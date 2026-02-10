#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/../.."

NAME="${1:-}"

echo "=== Ralph Init${NAME:+ ($NAME)} ==="

# 1. Check bun is available
if ! command -v bun &> /dev/null; then
  echo "ERROR: bun is not installed"
  exit 1
fi
echo "[ok] bun found: $(bun --version)"

# 2. Install dependencies
echo "[..] Installing dependencies..."
bun install --frozen-lockfile 2>/dev/null || bun install
echo "[ok] Dependencies installed"

# 3. Build shared package (web depends on it)
echo "[..] Building @pidro/shared..."
bun run --cwd ../shared build
echo "[ok] @pidro/shared built"

# 4. Verify required ralph files exist (if name provided)
if [ -n "$NAME" ]; then
  for f in \
    "docs/ralph/${NAME}-spec.md" \
    "docs/ralph/${NAME}-impl.md" \
    "docs/ralph/${NAME}-build.md" \
    "docs/ralph/${NAME}-plan.md" \
    "docs/ralph/${NAME}-tests.json" \
    "docs/ralph/${NAME}-progress.txt" \
    "docs/ralph/AGENTS.md"; do
    if [ ! -f "$f" ]; then
      echo "WARN: Missing $f"
    else
      echo "[ok] $f exists"
    fi
  done
fi

# 5. Run baseline checks
echo "[..] Running baseline checks..."
bun run typecheck && echo "[ok] typecheck" || echo "[!!] typecheck failed"
bun run lint      && echo "[ok] lint"      || echo "[!!] lint failed"
bun run test      && echo "[ok] tests"     || echo "[!!] tests failed"

echo ""
echo "=== Init complete ==="
