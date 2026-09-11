---
name: aurelius-documentation
description: Create, revise, migrate, or validate Aurelius documentation sites from Markdown plus native, SVG, or authored-HTML visuals. Use for Aurelius sites, not generic prose or unrelated diagrams.
---

# Aurelius Documentation

Use this repository-local skill from any agent harness that discovers project skills. Keep an Aurelius site useful as an editorial static site, Markdown exports, and a structured API for agents. Edit sources, never generated `dist/` files.

## Locate and inspect

Find `site.config.json` first. Its directory is the site root. Inspect the relevant `content/*.md`, `diagrams/*.json`, and technical sources before documenting behavior. Create a site only when the user requests one.

Read [the content contract](references/content-contract.md) before adding a document or changing a relation. When creating or revising a visual, also read [the visual authoring contract](references/html-visuals.md).

## Use the CLI

Prefer explicit commands:

```text
aurelius init <path> [--title <title>] [--logo <logo.svg|logo.png>]
aurelius visual init <id> --site <path> --kind <kind> [--format mermaid|html|svg]
aurelius check --site <path>
aurelius build --site <path>
aurelius dev --site <path> [--port 4173]
```

When working in the Aurelius source repository, use `npm run aurelius -- <command>`. In a consumer project, use its locally installed `aurelius` executable. Do not assume Codex, a plugin manager, or a particular package runner.

## Write with provenance

- Keep each note narrowly scoped and give it a stable `id`.
- Use `source_refs` for files that substantiate implementation facts; do not manufacture references merely to fill the field.
- Model relationships with `related` so agents can traverse the domain without inferring links from page layout.
- Use standard Markdown with a `doc:` destination for internal body links and `asset:` only for files under `assets/` that must be published.
- Keep public, internal, observed, proposed, and draft claims explicit in frontmatter.
- Treat `visibility` as descriptive metadata, never as access control: all content is emitted. Protect an internal deployment at the host or use separate site inputs, and never place secrets in an Aurelius site.
- Never edit `dist/`; it is a disposable projection.

## Choose the visual source deliberately

Create a visual only when it explains the subject better than prose or a small table. Aurelius supports four authoring paths: Mermaid declarative source (the CLI default only when it has an equivalent starter for the selected kind), native semantic JSON, an accessible `svgSource`, and a complete isolated `htmlSource`. If the CLI requires an explicit HTML or SVG format, do not bypass that guard with a generic Mermaid flowchart under another semantic kind. Prefer Mermaid when the subject fits its grammar and native JSON when Aurelius owns a specialized semantic layout. Use SVG for a fixed vector composition and authored HTML for editorial layout, advanced charts, or restrained interaction. Do not flatten useful semantics into presentation markup: keep `summary`, optional structured `data`, and provenance in the JSON envelope.

When the repository-local `diagram-design` skill is available at `../diagram-design`, use its type-selection and chosen type reference while authoring. Apply the Aurelius site's tokens and light-only presentation, then run its visual checks when its scripts are available. It is an optional authoring companion, never a runtime or build dependency; without it, follow Aurelius's own visual contract.

Use `{{diagram:id}}` for every non-Canvas visual and `{{canvas:id}}` only for Canvas. Make the inline view, full view, copied representation, agent-facing summary, and printed fallback communicate the same subject. Never rely on hover, animation, color, or visual geometry as the only carrier of meaning.

For an Obsidian migration, translate the Canvas into the native JSON envelope: preserve the relevant groups, positioned nodes, edges, titles, summaries, and source references. Do not turn a large Canvas into a screenshot: this loses keyboard navigation, selectable details, graph edges, and agent-readable structure.

## Validate and build

Run `aurelius check --site <path>` after source edits. Run `aurelius build --site <path>` only when a generated projection is requested; it recreates the configured dedicated output directory and rejects overlap with site sources. For agent-facing changes, confirm that `llms.txt`, `llms-full.txt`, `api/manifest.json`, `markdown/{id}.md`, and the affected JSON document were produced. For a visual change, inspect its inline and full views in a browser at desktop and narrow widths, test keyboard access and copy actions, and inspect print preview; a successful build alone is not visual verification.
