---
id: agent-interface
title: Agent interfaces
description: Retrieve documentation through llms.txt and the JSON API without scraping the rendered site.
type: reference
status: observed
visibility: public
tags: llms, api, agents
related: home, content-model, publishing
source_refs: ../../core/build.mjs, ../../AGENTS.md
---

## Start at the published entry points

After `build`, an agent reads `dist/llms.txt` to discover the subject, then `dist/api/manifest.json` to learn the API version and published paths.

## Retrieve structured documents

`dist/api/index.json` lists documents. Every `dist/api/documents/{id}.json` record includes metadata, sections, relationships, and `sourceRefs`. Use `dist/api/graph.json` to traverse related pages and `dist/api/search.json` to retrieve by topic.

For linear context, `dist/llms-full.txt` concatenates the Markdown sources. Human-readable Markdown copies live in `dist/markdown/{id}.md`.

Visual records live at `dist/api/diagrams/{id}.json`. Authored HTML is not duplicated into that JSON; agents receive the visual `kind`, a standalone `summary`, structured `data`, provenance, dimensions, and `renderMode`. Markdown projections expand real diagram directives into readable descriptions while preserving directive examples inside fenced code blocks.

## Do not infer facts from a drawing

HTML and diagrams are reading projections. The JSON API and declared `sourceRefs` are the contracts for traceable facts. This lets an agent answer precisely without depending on browser layout or SVG geometry.
