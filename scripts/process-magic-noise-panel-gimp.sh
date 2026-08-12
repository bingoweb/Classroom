#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GIMP_BIN="/Applications/GIMP.app/Contents/MacOS/gimp-console-3.2"

if [[ ! -x "$GIMP_BIN" ]]; then
  GIMP_BIN="$(command -v gimp || true)"
fi

if [[ -z "$GIMP_BIN" || ! -x "$GIMP_BIN" ]]; then
  echo "GIMP 3.x bulunamadı." >&2
  exit 1
fi

cd "$ROOT"
export CLASSROOM_ROOT="$ROOT"
"$GIMP_BIN" -n -i -s -c \
  --batch-interpreter=python-fu-eval \
  --batch='exec(open("scripts/process-magic-noise-panel-gimp.py").read())' \
  --quit
