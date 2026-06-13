#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
site_dir="$repo_root/_site"
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

rm -rf "$site_dir"
mkdir -p "$site_dir"

echo "==> Render Quarto home"
"$quarto_bin" render "$repo_root/home-quarto"
perl -0pi -e 's/href="\.\/portfolio\//href="\/portfolio\//g' "$site_dir/index.html"

echo "==> Render portfolio documents"
(
  cd "$repo_root/portfolio"
  bash scripts/render-docs.sh
  bash scripts/build-portfolio-site.sh
)
mkdir -p "$site_dir/portfolio"
cp -a "$repo_root/portfolio/_site/." "$site_dir/portfolio/"

touch "$site_dir/.nojekyll"

echo "==> Verify expected paths"
test -f "$site_dir/index.html"
test -f "$site_dir/portfolio/index.html"
test -f "$site_dir/portfolio/servercore/index.html"
test -f "$site_dir/portfolio/servercore/chapters/01-overview.html"
test -f "$site_dir/portfolio/servercore/chapters/06-summary.html"
test ! -f "$site_dir/portfolio/servercore/chapters/07-git-history-timeline.html"
test -f "$site_dir/portfolio/runtime-web/index.html"
test -f "$site_dir/portfolio/runtime-proxy/index.html"
test -f "$site_dir/portfolio/runtime-game/index.html"
test -f "$site_dir/portfolio/client/index.html"
test -f "$site_dir/portfolio/devops/index.html"
test ! -d "$site_dir/portfolio/devops/chapters"

test ! -d "$site_dir/portfolio/server"
test ! -d "$site_dir/portfolio/servercore/docs"
test ! -f "$site_dir/portfolio/devops/DevOpsPortfolio.html"
test ! -f "$site_dir/portfolio/client/ClientPortfolio.html"

if find "$site_dir" -type f \( -name '*.qmd' -o -name '*.md' \) | grep -q .; then
  echo "source markdown files leaked into _site" >&2
  exit 1
fi

echo "Built $site_dir"
