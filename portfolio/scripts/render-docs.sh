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
rm -rf docs/index_files
rm -rf docs/server/RuntimeWebPortfolio_files
rm -rf docs/server/RuntimeProxyPortfolio_files
rm -rf docs/server/RuntimeGamePortfolio_files
rm -rf docs/server/examples
rm -rf docs/server/ServerCorePortfolio_files
rm -rf docs/server/ServerRuntimeProblemSolving_files
rm -f docs/server/ServerCorePortfolio.html
rm -f docs/server/ServerCorePortfolio.pdf
rm -f docs/server/ServerRuntimeProblemSolving.html
rm -f docs/server/SessionLifecycleVisualizer.html
rm -rf docs/client/ClientPortfolio_files
node scripts/prepare-servercore-docs.js
"$quarto_bin" render generated-quarto

"$quarto_bin" render content/index.qmd --to html
(
  "$quarto_bin" render "$repo_root/content/runtime"
)
(
  "$quarto_bin" render "$repo_root/content/client"
)
find "$repo_root/docs/server" "$repo_root/docs/client" -maxdepth 1 -type f -name '*.html' \
  -exec perl -0pi -e 's/(href|src)="\.\/portfolio\//$1="\/portfolio\//g' {} +
"$repo_root/scripts/render-devops.sh"

rm -rf "$repo_root/content/.quarto"
rm -rf "$repo_root/content/index_files"
rm -rf "$repo_root/content/client/.quarto"
rm -rf "$repo_root/content/client/ClientPortfolio_files"
rm -rf "$repo_root/content/runtime/.quarto"
rm -rf "$repo_root/content/runtime/RuntimeWebPortfolio_files"
rm -rf "$repo_root/content/runtime/RuntimeProxyPortfolio_files"
rm -rf "$repo_root/content/runtime/RuntimeGamePortfolio_files"
rm -rf "$repo_root/content/devops/.quarto"
rm -f "$repo_root/content/.gitignore"
rm -f "$repo_root/content/client/.gitignore"
rm -f "$repo_root/content/runtime/.gitignore"
rm -f "$repo_root/content/devops/.gitignore"
