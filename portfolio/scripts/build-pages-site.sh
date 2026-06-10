#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
site_dir="$repo_root/_site"

rm -rf "$site_dir"
mkdir -p "$site_dir"

cp -a "$repo_root/docs/." "$site_dir/"
find "$site_dir" -type d \( -name '.venv' -o -name '_servercore' \) -prune -exec rm -rf {} +
find "$site_dir" -type f \( -name '*.qmd' -o -name '*.md' \) -delete
touch "$site_dir/.nojekyll"

test -f "$site_dir/index.html"
test -f "$site_dir/server/ServerCorePortfolio.html"
test -f "$site_dir/servercore/index.html"
test -f "$site_dir/servercore/docs/1.overview.html"
test -f "$site_dir/servercore/docs/11.cicd-gitops-infra.html"
test -f "$site_dir/server/SessionLifecycleVisualizer.html"
test -f "$site_dir/server/RuntimeWebPortfolio.html"
test -f "$site_dir/server/RuntimeProxyPortfolio.html"
test -f "$site_dir/server/RuntimeGamePortfolio.html"
test -f "$site_dir/client/ClientPortfolio.html"
test -f "$site_dir/devops/DevOpsPortfolio.html"
test -f "$site_dir/devops/OpsDashboard.html"

if find "$site_dir" -type f \( -name '*.qmd' -o -name '*.md' \) | grep -q .; then
  echo "source markdown files leaked into _site" >&2
  exit 1
fi

if find "$site_dir" -type d \( -name '.venv' -o -name '_servercore' -o -name 'generated-quarto' \) | grep -q .; then
  echo "authoring-only directories leaked into _site" >&2
  exit 1
fi
