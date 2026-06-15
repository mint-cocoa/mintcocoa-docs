#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source_root="${DOCS_V2_SOURCE_DIR:-$repo_root/docs-v2}"
build_root="${DOCS_V2_BUILD_DIR:-$repo_root/build/docs-v2}"
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

require_path() {
  local path="$1"
  if [[ ! -e "$path" ]]; then
    echo "required path not found: $path" >&2
    exit 1
  fi
}

copy_if_exists() {
  local src="$1"
  local dest="$2"
  if [[ -e "$src" ]]; then
    mkdir -p "$(dirname "$dest")"
    cp -a "$src" "$dest"
  fi
}

require_path "$source_root/home-quarto/index.qmd"
require_path "$source_root/portfolio/content/index.qmd"
require_path "$source_root/portfolio/content/servercore/chapters"
require_path "$source_root/portfolio/content/runtime"
require_path "$source_root/portfolio/content/client"
require_path "$source_root/portfolio/content/devops/azure-aks-production-architecture.qmd"

rm -rf "$build_root" "$site_dir"
mkdir -p "$build_root" "$site_dir"
export XDG_CACHE_HOME="${XDG_CACHE_HOME:-$build_root/.cache}"
export DENO_DIR="${DENO_DIR:-$build_root/.deno}"
mkdir -p "$XDG_CACHE_HOME" "$DENO_DIR"

echo "==> Stage docs-v2 sources"
mkdir -p "$build_root/home-quarto" "$build_root/portfolio"
cp -a "$source_root/home-quarto/." "$build_root/home-quarto/"
cp -a "$source_root/portfolio/content" "$build_root/portfolio/content"

copy_if_exists "$repo_root/home-quarto/_quarto.yml" "$build_root/home-quarto/_quarto.yml"
copy_if_exists "$repo_root/home-quarto/styles.css" "$build_root/home-quarto/styles.css"

copy_if_exists "$repo_root/portfolio/_quarto.yml" "$build_root/portfolio/_quarto.yml"
copy_if_exists "$repo_root/portfolio/content/_quarto.yml" "$build_root/portfolio/content/_quarto.yml"
copy_if_exists "$repo_root/portfolio/content/runtime/_quarto.yml" "$build_root/portfolio/content/runtime/_quarto.yml"
copy_if_exists "$repo_root/portfolio/content/client/_quarto.yml" "$build_root/portfolio/content/client/_quarto.yml"
copy_if_exists "$repo_root/portfolio/content/portfolio.css" "$build_root/portfolio/content/portfolio.css"
copy_if_exists "$repo_root/portfolio/content/devops/_quarto.yml" "$build_root/portfolio/content/devops/_quarto.yml"
copy_if_exists "$repo_root/portfolio/content/devops/portfolio.css" "$build_root/portfolio/content/devops/portfolio.css"
copy_if_exists "$repo_root/portfolio/content/devops/favicon.svg" "$build_root/portfolio/content/devops/favicon.svg"
copy_if_exists "$repo_root/portfolio/content/devops/icons.svg" "$build_root/portfolio/content/devops/icons.svg"
copy_if_exists "$repo_root/portfolio/content/servercore/downloads" "$build_root/portfolio/content/servercore/downloads"
cp -a "$repo_root/portfolio/scripts" "$build_root/portfolio/scripts"

# The published v2 DevOps document is intentionally stored under a descriptive
# source filename, while the public route remains /portfolio/devops/.
cp "$source_root/portfolio/content/devops/azure-aks-production-architecture.qmd" \
  "$build_root/portfolio/content/devops/index.qmd"
rm -f "$build_root/portfolio/content/devops/azure-aks-production-architecture.html"
rm -rf "$build_root/portfolio/content/devops/azure-aks-production-architecture_files"

echo "==> Render docs-v2 home"
"$quarto_bin" render "$build_root/home-quarto"
perl -0pi -e 's/href="\.\/portfolio\//href="\/portfolio\//g' "$build_root/_site/index.html"
cp -a "$build_root/_site/." "$site_dir/"

echo "==> Render docs-v2 portfolio documents"
(
  cd "$build_root/portfolio"
  bash scripts/render-docs.sh
  bash scripts/build-portfolio-site.sh
)
mkdir -p "$site_dir/portfolio"
cp -a "$build_root/portfolio/_site/." "$site_dir/portfolio/"

touch "$site_dir/.nojekyll"

echo "==> Verify expected docs-v2 paths"
test -f "$site_dir/index.html"
test -f "$site_dir/portfolio/index.html"
test -f "$site_dir/portfolio/servercore/index.html"
test -f "$site_dir/portfolio/servercore/chapters/01-overview.html"
test -f "$site_dir/portfolio/servercore/chapters/06-summary.html"
test ! -f "$site_dir/portfolio/servercore/chapters/07-git-history-timeline.html"
test -f "$site_dir/portfolio/servercore/downloads/ServerCore-Portfolio-jinhoo.pdf"
test -f "$site_dir/portfolio/runtime-web/index.html"
test -f "$site_dir/portfolio/runtime-proxy/index.html"
test -f "$site_dir/portfolio/runtime-game/index.html"
test -f "$site_dir/portfolio/client/index.html"
test -f "$site_dir/portfolio/devops/index.html"
test ! -d "$site_dir/portfolio/devops/chapters"

test ! -d "$site_dir/portfolio/server"
test ! -d "$site_dir/portfolio/servercore/docs"
test ! -f "$site_dir/portfolio/devops/DevOpsPortfolio.html"
test ! -f "$site_dir/portfolio/devops/azure-aks-production-architecture.html"
test ! -f "$site_dir/portfolio/client/ClientPortfolio.html"

allowed_markdown="$site_dir/portfolio/devops/production-infrastructure-architecture.md"
leaked_markdown="$(
  find "$site_dir" -type f \( -name '*.qmd' -o -name '*.md' \) \
    | grep -vFx "$allowed_markdown" || true
)"
if [[ -n "$leaked_markdown" ]]; then
  echo "source markdown files leaked into _site" >&2
  echo "$leaked_markdown" >&2
  exit 1
fi

if find "$site_dir" -type d \( -name '.venv' -o -name '_servercore' -o -name 'generated-quarto' \) | grep -q .; then
  echo "authoring-only directories leaked into _site" >&2
  exit 1
fi

if ! grep -q "Azure AKS 기반 Kubernetes 프로덕션 인프라 아키텍처" "$site_dir/portfolio/devops/index.html"; then
  echo "docs-v2 DevOps document was not rendered" >&2
  exit 1
fi

echo "Built docs-v2 site at $site_dir"
