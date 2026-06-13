#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
site_dir="$repo_root/_site"

rm -rf "$site_dir"
mkdir -p "$site_dir"

copy_dir() {
  local src="$1"
  local dest="$2"
  if [[ -d "$src" ]]; then
    mkdir -p "$(dirname "$dest")"
    cp -a "$src" "$dest"
  fi
}

copy_html_doc() {
  local src_html="$1"
  local src_assets="$2"
  local dest_dir="$3"
  mkdir -p "$dest_dir"
  cp "$src_html" "$dest_dir/index.html"
  copy_dir "$src_assets" "$dest_dir/$(basename "$src_assets")"
}

cp "$repo_root/docs/index.html" "$site_dir/index.html"
cp "$repo_root/docs/portfolio.css" "$site_dir/portfolio.css"
copy_dir "$repo_root/docs/index_files" "$site_dir/index_files"

copy_dir "$repo_root/docs/servercore" "$site_dir/servercore"

copy_html_doc \
  "$repo_root/docs/server/RuntimeWebPortfolio.html" \
  "$repo_root/docs/server/RuntimeWebPortfolio_files" \
  "$site_dir/runtime-web"
copy_html_doc \
  "$repo_root/docs/server/RuntimeProxyPortfolio.html" \
  "$repo_root/docs/server/RuntimeProxyPortfolio_files" \
  "$site_dir/runtime-proxy"
copy_html_doc \
  "$repo_root/docs/server/RuntimeGamePortfolio.html" \
  "$repo_root/docs/server/RuntimeGamePortfolio_files" \
  "$site_dir/runtime-game"
copy_html_doc \
  "$repo_root/docs/client/ClientPortfolio.html" \
  "$repo_root/docs/client/ClientPortfolio_files" \
  "$site_dir/client"
if [[ -f "$repo_root/docs/client/ClientPortfolio.pdf" ]]; then
  cp "$repo_root/docs/client/ClientPortfolio.pdf" "$site_dir/client/ClientPortfolio.pdf"
fi

copy_dir "$repo_root/docs/devops" "$site_dir/devops"

touch "$site_dir/.nojekyll"

test -f "$site_dir/index.html"
test -f "$site_dir/servercore/index.html"
test -f "$site_dir/servercore/chapters/01-overview.html"
test -f "$site_dir/servercore/chapters/06-summary.html"
test ! -f "$site_dir/servercore/chapters/07-git-history-timeline.html"
test -f "$site_dir/runtime-web/index.html"
test -f "$site_dir/runtime-proxy/index.html"
test -f "$site_dir/runtime-game/index.html"
test -f "$site_dir/client/index.html"
test -f "$site_dir/devops/index.html"
test ! -d "$site_dir/devops/chapters"

test ! -d "$site_dir/server"
test ! -d "$site_dir/servercore/docs"
test ! -f "$site_dir/devops/DevOpsPortfolio.html"
test ! -f "$site_dir/client/ClientPortfolio.html"

allowed_markdown="$site_dir/devops/production-infrastructure-architecture.md"
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
