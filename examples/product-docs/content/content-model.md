---
id: content-model
title: Content and diagram model
description: Markdown page contracts, semantic links, native diagrams, authored SVG or HTML visuals, and large Canvas sources.
type: reference
status: observed
visibility: public
tags: markdown, diagrams, content
related: home, configuration, agent-interface, visual-types, architecture-example, large-canvas
source_refs: ../../core/build.mjs
---

## A page is Markdown with metadata

Files in `content/` use simple frontmatter. `id`, `title`, `description`, `type`, `status`, and `visibility` are required. `related` builds a semantic graph independently of visual navigation.

```markdown
---
id: authentication
title: Authentication
description: How the system identifies people and decides access.
type: architecture
status: observed
visibility: public
tags: security, identity
related: authorization
source_refs: ../src/auth.ts
---
```

Use `[Configuration](doc:configuration)` for an internal link. Use `asset:file.ext` for a published image or attachment stored in `assets/`.

## Use the supported Markdown surface

Aurelius intentionally implements a compact, deterministic Markdown surface rather than every extension from a general-purpose parser. It supports headings from level 1 through 4, paragraphs, emphasis, strong text, inline code, strikethrough, links, fenced code blocks, tables, blockquotes, callouts, horizontal rules, and flat ordered, unordered, and task lists. Diagram and Canvas tokens must occupy their own line. Headings inside fenced code are preserved as code and are not added to the table of contents, search sections, or anchor validation.

For constructs outside that set—such as nested lists, footnotes, raw HTML, or custom Markdown extensions—prefer a simpler equivalent or an authored visual whose contract is validated separately.

## Choose the right diagram surface

Architecture diagrams in `diagrams/*.json` are deliberately bounded to 9 nodes, 12 relationships, and 3 zones. They answer one architectural question clearly.

```markdown
{{diagram:publication-flow}}
```

For a large operational map, use a Canvas. It accepts grouped, positioned nodes and directional edges, preserves a large coordinate space, and publishes a dedicated full-view page with pan, zoom, fullscreen, keyboard-focusable cards, and readable details.

```markdown
{{canvas:documentation-lifecycle}}
```

Open the [large Canvas example](doc:large-canvas) to inspect a 24-step, five-phase flow. The source uses Obsidian Canvas-style `type`, `text`, `fromNode`, and `toNode` fields inside the Aurelius diagram envelope. When migrating an Obsidian Canvas, translate the relevant groups, cards, positions, edges, descriptions, and provenance into this native JSON source.

Diagram tokens do not leak into “Copy Markdown.” Aurelius replaces each token with the diagram title, description, and semantic JSON path.

## Choose who owns the layout

Aurelius provides native layout for `architecture` and `canvas`. Use native JSON when the semantic model is more important than exact composition. Use `svgSource` for a fixed vector, or `htmlSource` when an agent needs to author a complete editorial visual with its own HTML, CSS, accessible SVG, or restrained interaction.

The JSON envelope keeps `kind`, `summary`, `data`, and provenance independent from presentation. Aurelius isolates HTML, publishes a full view, and exposes the editable source through copy. For a faithful print fallback, provide `svgSource` or mark one self-contained inline SVG with `data-aurelius-print-source="true"`; every informative SVG inside authored HTML must satisfy the same accessible title and description contract. See [All visual types](doc:visual-types) for the complete registry and a full authored example.

## Keep claims traceable

`source_refs` should point to code, contracts, or documents supporting a claim. Local paths are resolved from the site root and may use `..` to cite files elsewhere in the same repository; `check` verifies that they exist. These provenance paths are emitted as text in the API but are not copied into `dist` and are not public download links. Use a stable public `https://` URL when a published reader must be able to retrieve an external source.

`visibility` is descriptive metadata for readers and downstream tooling; it is not an access-control rule. Every Markdown file in `content/` is included in HTML, search, API JSON, `llms.txt`, and `llms-full.txt`. Do not place secrets in a site, and publish internal material only behind access control supplied by the hosting environment or from a separate site/build input.
