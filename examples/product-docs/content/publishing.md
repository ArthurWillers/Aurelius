---
id: publishing
title: Preview and static publishing
description: Validate locally, build dist, and host the result on any static platform.
type: guide
status: observed
visibility: public
tags: workflow, publishing, github-pages
related: home, getting-started, agent-interface
source_refs: ../../core/dev.mjs, ../../core/build.mjs
---

## Work with a local preview

The development server watches `content/`, `diagrams/`, `assets/`, and `site.config.json`, rebuilds the site, and asks the browser to reload.

```bash
npx --no-install aurelius dev --site docs --port 4173
```

Document routes work both with and without a trailing slash—for example, `/getting-started` and `/getting-started/` both serve the generated `getting-started/index.html`.

## Validate before building

`check` does not write `dist/`. It stops on duplicate IDs, broken relationships, missing anchors or assets, inconsistent diagrams, and unsafe output paths.

```bash
npx --no-install aurelius check --site docs
npx --no-install aurelius build --site docs
```

## Publish on GitHub Pages with GitHub Actions

In the repository that owns the site, open **Settings → Pages** and select **GitHub Actions** as the publication source. Create `.github/workflows/deploy-aurelius.yml` with this workflow; adjust `main` and `docs` if your branch or site directory is different:

```yaml
name: Deploy Aurelius to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run aurelius -- check --site docs
      - run: npm run aurelius -- build --site docs
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v4
        with:
          path: docs/dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

Commit the site sources, the workflow, `package.json`, and `package-lock.json`; do not commit `docs/dist`. `build` recreates only the configured `outputDirectory`, and the workflow publishes the generated artifact. Relative links let the site work under a GitHub Pages project path or a custom domain without a base-URL setting.

You can host on another static platform too. Keep `content/`, `diagrams/`, `assets/`, and `site.config.json` in the repository; never hand-edit generated files.

Publishing is all-or-nothing for the selected site root. `visibility` travels with each document as metadata but does not filter files or enforce authorization. If some material is private, protect the whole deployment at the host or maintain separate public and internal site inputs; never rely on `visibility: internal` to keep content out of `dist`.

## Remove a site you no longer want

The documentation directory is independent from Aurelius itself. If you decide not to keep a `docs/` site, remove it from version control with `git rm -r docs` and remove or update the workflow so it no longer builds that path. That also stops the GitHub Pages deployment for the site.

## Review PDF output

The print stylesheet forces the light palette, hides interactive navigation, and keeps ordinary code figures together on one page with `break-inside: avoid-page`. Authored HTML can use an explicit `svgSource` or one self-contained inline SVG marked with `data-aurelius-print-source="true"`, so the PDF does not depend on printing an iframe. Keep the fallback's styles inside the SVG itself; styles from the HTML `<head>` cannot travel with a copied or printed vector. A code sample taller than the printable sheet is the browser's unavoidable exception; split unusually long examples into meaningful blocks before publishing.
