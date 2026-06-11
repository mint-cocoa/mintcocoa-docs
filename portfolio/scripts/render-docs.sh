#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

quarto_bin="${QUARTO_BIN:-quarto}"
if ! command -v "$quarto_bin" >/dev/null 2>&1; then
  if [[ -x "/c/Program Files/Quarto/bin/quarto" ]]; then
    quarto_bin="/c/Program Files/Quarto/bin/quarto"
  elif [[ -f "/mnt/c/Program Files/Quarto/bin/quarto.exe" ]]; then
    quarto_bin="/mnt/c/Program Files/Quarto/bin/quarto.exe"
  elif [[ -x "C:/Program Files/Quarto/bin/quarto.exe" ]]; then
    quarto_bin="C:/Program Files/Quarto/bin/quarto.exe"
  else
    echo "quarto executable not found" >&2
    exit 127
  fi
fi

rm -rf docs/servercore
rm -rf docs/server/ServerCorePortfolio_files
rm -f docs/server/ServerCorePortfolio.pdf
node scripts/prepare-servercore-docs.js
"$quarto_bin" render generated-quarto

"$quarto_bin" render docs/index.qmd --to html
"$quarto_bin" render docs/server/ServerCorePortfolio.qmd --to html
"$quarto_bin" render docs/server/RuntimeWebPortfolio.qmd --to html
"$quarto_bin" render docs/server/RuntimeProxyPortfolio.qmd --to html
"$quarto_bin" render docs/server/RuntimeGamePortfolio.qmd --to html
"$quarto_bin" render docs/client/ClientPortfolio.qmd --to html
"$repo_root/scripts/render-devops.sh"
