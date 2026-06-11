#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
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

rm -rf "$repo_root/docs/devops"
"$quarto_bin" render "$repo_root/devops-quarto"

find "$repo_root/docs/devops" -type f -name '*.html' -exec perl -pi -e 's/[ \t]+$//' {} +
