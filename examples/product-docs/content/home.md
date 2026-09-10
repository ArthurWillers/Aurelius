---
id: home
title: Aurelius
description: A static documentation generator that delivers a polished reading experience and predictable contracts for agents.
type: overview
status: observed
visibility: public
tags: documentation, static-site, agents
related: getting-started, configuration, content-model, agent-interface, publishing, large-canvas
source_refs: ../../README.md, ../../package.json
diagram: publication-flow
---

## Documentation without a second source of truth

Aurelius starts with versioned Markdown and JSON. One build publishes that knowledge as an accessible static site, recoverable Markdown, and a small JSON API for agents. Your content is not trapped in a CMS, database, or proprietary editor.

{{diagram:publication-flow}}

## Install it and create your first site

Install the framework as a versioned development dependency. A published npm package is the preferred path because the package and lockfile make local work and CI use the same release:

```bash
npm install --save-dev @avw/aurelius@^0.4.0
npx --no-install aurelius init docs --title "Product documentation" --logo brand.svg
npx --no-install aurelius check --site docs
npx --no-install aurelius build --site docs
```

Until the package is published, install a tagged Git release with `npm install --save-dev github:ArthurWillers/aurelius#v0.4.0`. Clone the generator only when contributing or customizing it. `init` creates two pages, an editable visual identity, and a diagram. Continue with [Installation and commands](doc:getting-started) for the complete workflow.

## What a build publishes

- Accessible static HTML with search, layered navigation, print styling, and Markdown copy.
- Markdown files in `markdown/` and a linear corpus in `llms-full.txt`.
- JSON discovery through `api/manifest.json`, `api/index.json`, `api/search.json`, and `api/graph.json`.
- Declarative architecture diagrams, large navigable Canvases, accessible SVG, and isolated authored HTML visuals with semantic equivalents for agents.

Read [Site configuration](doc:configuration), [Content and diagram model](doc:content-model), and [Agent interfaces](doc:agent-interface) before publishing.
