# Aurelius Content Contract

Every file in `content/` is Markdown with simple frontmatter. The required fields are `id`, `title`, `description`, `type`, `status`, and `visibility`. Use comma-separated lists for `tags`, `related`, `source_refs`, and, when needed, `authors`. `updated` accepts a date or a free-form editorial version.

```markdown
---
id: authentication
title: Authentication
description: How the system identifies people and decides access.
type: architecture
status: observed
visibility: internal
tags: security, identity
related: authorization, audit
source_refs: ../app/AuthService.php, ../routes/web.php
authors: Platform, Security
updated: 2026-09-08
diagram: authentication-flow
---
```

- `id` is unique and stable; `home` is the home page.
- `related` may point only to another existing `id`.
- `source_refs` is resolved from the site root and must exist when declared. Paths containing `..` may cite local sources outside the site directory; they remain textual provenance in the API and are not copied to `dist`. For an external technical source that readers can retrieve, use a stable public `https://` URL.
- `visibility` is descriptive metadata, not access control. Every file in `content/` is emitted to HTML, search, the API, `llms.txt`, and `llms-full.txt`; do not put secrets in the site, and protect the publication or separate the inputs when content is internal.
- The supported Markdown subset includes H1–H4 headings, paragraphs, emphasis, links, inline and fenced code, tables, blockquotes, callouts, rules, and flat lists. Headings inside code fences do not create sections or anchors. Prefer simple equivalents for extensions outside this contract.
- `diagram` points to the `id` of a JSON source in `diagrams/`.
- `{{diagram:id}}` includes any visual that is not a Canvas; `{{canvas:id}}` includes a Canvas.
- `asset:file.ext` points to `assets/file.ext`, which is copied to the output.

## Readable architecture

Architectures are declarative: describe nodes, zones, and relationships; Aurelius chooses distinct ports and draws orthogonal connectors with rounded corners. Do not use SVG coordinates in `edges.path`. Keep no more than 9 nodes, 12 relationships, and 3 zones; when the model is larger, publish an overview and detail pages.

```json
{
  "id": "runtime-overview",
  "kind": "architecture",
  "title": "Publication path",
  "description": "The build receives Markdown, produces a static projection, and exposes contracts for agents.",
  "zones": [
    { "label": "BUILD", "x": 40, "y": 40, "width": 640, "height": 240 }
  ],
  "nodes": [
    { "id": "content", "kind": "input", "tag": "SOURCE", "label": "Markdown and JSON", "detail": "versioned", "x": 80, "y": 120, "width": 180, "height": 100 },
    { "id": "build", "kind": "focal", "tag": "BUILD", "label": "Aurelius", "detail": "static projection", "x": 400, "y": 120, "width": 180, "height": 100 }
  ],
  "edges": [
    { "id": "compile", "from": "content", "to": "build", "label": "COMPILE", "tone": "accent" }
  ]
}
```

Use a 4px grid for `x`, `y`, `width`, and `height`; do not overlap nodes. `label` is a short human phrase, `detail` contains the technical data, and `tag` identifies the category. The resulting SVG includes a title and description for screen readers, a legend built only from the types actually used, and an action to copy the vector on the page.

The build produces `markdown/{id}.md`, `api/documents/{id}.json`, `api/graph.json`, `api/search.json`, `api/manifest.json`, JSON schemas, `llms.txt`, and `llms-full.txt`. These files are the preferred interface for agents; `dist/` is never an editing source.

## Visual sources

An envelope in `diagrams/` may use declarative Mermaid, the native JSON renderer, an accessible `svgSource`, or an isolated authored `htmlSource`. Mermaid is the first option for UML, decisions, flowcharts, sequence diagrams, state diagrams, ER diagrams, Gantt charts, journeys, and charts that its grammar can represent:

```json
{
  "id": "approval-flow",
  "kind": "flowchart",
  "title": "Approval flow",
  "description": "An approved request is published; a rejected request returns for revision.",
  "source": {
    "language": "mermaid",
    "path": "diagrams/sources/approval-flow.mmd"
  },
  "summary": "Approval publishes the request. Rejection returns the item to its author for revision.",
  "data": { "outcomes": ["published", "revision"] }
}
```

Use exactly one of `source.path` (`.mmd` or `.mermaid`) and `source.code`. `check` runs the Mermaid parser and blocks configuration directives, links, and callbacks; `build` applies the site's light tokens and packages the local runtime. In every mode, keep `id`, `kind`, `title`, `description`, a self-contained `summary` when the visual carries relevant information, `sourceRefs`, and semantic `data` when agents should query values or relationships.

The SVG must declare `viewBox`, `role="img"`, `aria-labelledby`, `<title>`, and `<desc>`; local references such as `url(#arrow)` are accepted when the ID exists, while executable, external, or ambiguous content is rejected. Authored HTML must be a complete, clear, self-contained document that works without access to the site's DOM; scripts require `interactive: true`, and the complete state must remain available without JavaScript. Use `svgSource` as a static fallback for an HTML visual when print quality matters, or mark a self-contained inline SVG with `data-aurelius-print-source="true"`.

Read [the visual authoring contract](html-visuals.md) to choose the mode, fill in `presentation`, preserve responsive legibility, offer copy actions, and validate the full view and print output. The build publishes metadata without duplicating private SVG or HTML payloads in the API.
