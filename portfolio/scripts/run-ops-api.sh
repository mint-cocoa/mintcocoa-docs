#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ -f .env.ops ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.ops
  set +a
fi

exec "${UV_BIN:-/home/cocoa/.local/bin/uv}" run uvicorn ops_api.main:app \
  --host "${OPS_API_HOST:-0.0.0.0}" \
  --port "${OPS_API_PORT:-18081}"
