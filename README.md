# mintcocoa-docs

Unified source for the MintCocoa docs hub and the `/portfolio/` technical documents.

Production URL: `https://docs.mintcocoa.dev`

## Layout

```text
hub/         React + Vite landing hub served at /
portfolio/  Quarto documents and DevOps documentation served at /portfolio/
scripts/    Unified build scripts
```

The generated static site artifact is `_site/`. GitHub Pages is kept as a public
mirror, and the OCI OKE deployment serves the same artifact from a container.

## Build

```bash
npm ci --prefix hub
bash scripts/build-site.sh
```

Expected output:

```text
_site/index.html
_site/portfolio/index.html
_site/portfolio/devops/index.html
_site/portfolio/devops/OpsDashboard.html
_site/portfolio/devops/OciOkeGitOpsPortfolio.html
```

## Source Repositories

This repository consolidates content that previously lived in:

- `mint-cocoa/mint-cocoa.github.io`
- `mint-cocoa/portfolio`

## Container

```bash
bash scripts/build-site.sh
docker build -t ghcr.io/mint-cocoa/mintcocoa-docs:local .
docker run --rm -p 8080:8080 ghcr.io/mint-cocoa/mintcocoa-docs:local
```

Health check:

```bash
curl http://localhost:8080/healthz
```
