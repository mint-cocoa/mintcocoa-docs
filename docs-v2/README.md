# docs-v2

Clean source snapshot for the current public docs site.

This directory intentionally keeps only:

- original public `.qmd` and `.md` source documents
- files directly referenced by those documents
- the dashboard file kept as the explicit exception
- one source document per currently published page when an older duplicate exists

It intentionally excludes rendered output and render support files such as
`_site/`, `portfolio/docs/`, `generated-quarto/`, Quarto caches, copied site
libraries, stale screenshots, obsolete diagrams, PDFs, and old evidence files.
