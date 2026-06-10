#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

quarto render docs/index.qmd --to html
quarto render docs/server/ServerCorePortfolio.qmd --to html
quarto render docs/server/RuntimeWebPortfolio.qmd --to html
quarto render docs/server/RuntimeProxyPortfolio.qmd --to html
quarto render docs/server/RuntimeGamePortfolio.qmd --to html
quarto render docs/client/ClientPortfolio.qmd --to html
quarto render docs/devops/OciOkeGitOpsPortfolio.qmd --to html
"$repo_root/scripts/render-devops.sh"
