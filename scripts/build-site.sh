#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
site_dir="$repo_root/_site"

rm -rf "$site_dir"
mkdir -p "$site_dir"

echo "==> Build hub"
(
  cd "$repo_root/hub"
  npm run build
)
cp -a "$repo_root/hub/_site/." "$site_dir/"

echo "==> Render portfolio documents"
(
  cd "$repo_root/portfolio"
  bash scripts/render-docs.sh
  bash scripts/build-pages-site.sh
)
mkdir -p "$site_dir/portfolio"
cp -a "$repo_root/portfolio/_site/." "$site_dir/portfolio/"

touch "$site_dir/.nojekyll"

echo "==> Verify expected paths"
test -f "$site_dir/index.html"
test -f "$site_dir/portfolio/index.html"
test -f "$site_dir/portfolio/server/ServerCorePortfolio.html"
test -f "$site_dir/portfolio/servercore/index.html"
test -f "$site_dir/portfolio/servercore/docs/1.overview.html"
test -f "$site_dir/portfolio/servercore/docs/11.cicd-gitops-infra.html"
test -f "$site_dir/portfolio/server/RuntimeWebPortfolio.html"
test -f "$site_dir/portfolio/server/RuntimeProxyPortfolio.html"
test -f "$site_dir/portfolio/server/RuntimeGamePortfolio.html"
test -f "$site_dir/portfolio/client/ClientPortfolio.html"
test -f "$site_dir/portfolio/devops/DevOpsPortfolio.html"
test -f "$site_dir/portfolio/devops/OciOkeGitOpsPortfolio.html"
test -f "$site_dir/portfolio/devops/OpsDashboard.html"

if find "$site_dir" -type f \( -name '*.qmd' -o -name '*.md' \) | grep -q .; then
  echo "source markdown files leaked into _site" >&2
  exit 1
fi

echo "Built $site_dir"
