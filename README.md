# mintcocoa-docs

Unified Quarto source for the MintCocoa docs hub and the `/portfolio/` technical documents.

Production URL: `https://docs.mintcocoa.dev`

## Layout

```text
home-quarto/        Quarto landing hub source served at /
portfolio/content/  Portfolio and DevOps documentation source served at /portfolio/
portfolio/scripts/  Portfolio render helpers
scripts/            Unified build scripts
```

Generated artifacts are intentionally not tracked:

```text
_site/                       Final static site artifact
portfolio/_site/             Intermediate portfolio site artifact
portfolio/docs/              Intermediate Quarto render output
portfolio/generated-quarto/  Generated Quarto source from upstream docs
```

GitHub Pages is kept as a public mirror, and the Azure AKS deployment serves the
same `_site/` artifact from a container.

## Build

```bash
bash scripts/build-site.sh
```

Expected output:

```text
_site/index.html
_site/portfolio/index.html
_site/portfolio/servercore/index.html
_site/portfolio/runtime-web/index.html
_site/portfolio/runtime-proxy/index.html
_site/portfolio/runtime-game/index.html
_site/portfolio/client/index.html
_site/portfolio/devops/index.html
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
