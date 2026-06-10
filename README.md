# mintcocoa-site

Unified source for the `mint-cocoa.github.io` hub and the `/portfolio/` technical documents.

## Layout

```text
hub/         React + Vite landing hub served at /
portfolio/  Quarto documents and the DevOps dashboard served at /portfolio/
scripts/    Unified build scripts
```

The generated GitHub Pages artifact is `_site/`.

## Build

```bash
npm ci --prefix hub
npm ci --prefix portfolio/dashboard
bash scripts/build-site.sh
```

Expected output:

```text
_site/index.html
_site/portfolio/index.html
_site/portfolio/devops/OpsDashboard.html
_site/portfolio/devops/OciOkeGitOpsPortfolio.html
```

## Source Repositories

This repository consolidates content that previously lived in:

- `mint-cocoa/mint-cocoa.github.io`
- `mint-cocoa/portfolio`

