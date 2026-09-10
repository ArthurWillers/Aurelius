---
name: documentation-migration
description: Plan or carry out a documentation migration from another application, beginning with Obsidian vaults. Use when inventorying source documentation, preserving links and metadata, or translating it to Markdown or an Aurelius site; do not use for ordinary writing in an existing destination.
---

# Documentation Migration

Migrate the documentation's meaning, traceability, and navigability—not merely its files. Start by identifying the source application's native objects and the target's supported content model. Keep the source read-only until an inventory and an explicit migration plan exist.

## Shared workflow

1. Establish scope: source location, target, whether the original must remain usable, and whether the work is a trial, a full cutover, or an archive.
2. Inventory source objects, including documents, attachments, links, metadata, collections/views, diagrams, and application- or plugin-specific data. Record totals and exceptions before changing content.
3. Define a mapping for each source object. Mark each mapping as **native**, **translated**, **archived**, or **unsupported**. Never silently discard or simulate an unsupported feature.
4. Migrate a small representative slice first. Resolve internal references using stable destination IDs, then process the remainder.
5. Validate content, links, assets, metadata, and any visual or structured objects. Compare the destination inventory with the source inventory and deliver an exceptions report.

Do not infer a controlled taxonomy, visibility policy, or publication status from folder names, tags, or personal notes. Ask when that choice changes the intended audience or public exposure.

## Obsidian source

For an Obsidian vault, read [the Obsidian migration reference](references/obsidian.md) before planning or editing. It incorporates the upstream `obsidian-markdown`, `obsidian-bases`, and `json-canvas` skill guidance, narrowed to migration decisions.

Treat the vault as a filesystem dataset. Include `.md`, `.canvas`, `.base`, attachments, and relevant `.obsidian` configuration in the inventory, but keep application settings and community-plugin state separate from documentation content. Features supplied by a plugin—such as Dataview queries or custom callouts—need an explicit target decision.

## Aurelius target

When the destination is an Aurelius site, also use the repository's `aurelius-documentation` skill. Follow its content contract and edit only source files, never `dist/`.

- Give each migrated document a stable `id`; map Obsidian wikilinks only after their target ID is known. Use Aurelius `doc:` links for resolved internal references.
- Map only substantiated implementation facts to `source_refs`. If a source-note path is used as a reference, preserve that file within the site so the reference resolves; do not fill `source_refs` merely to record that a note was migrated.
- Convert tags only after normalizing their vocabulary. Preserve aliases, unresolved links, original paths, and migration decisions in a report or other explicitly chosen metadata—Aurelius's standard content contract does not make them automatic link aliases.
- Translate a Canvas to a semantic Aurelius diagram envelope when the visual communicates useful relationships. Preserve its groups, node types, positions where useful, edges, labels, summary, and source references. Do not replace a Canvas with a screenshot.
- A Base is a query/view definition, not a document. Preserve its `.base` source and choose explicitly between a static exported view, a narrative index, a custom target implementation, or an unsupported-item record. Do not represent a static table as a live view.

Run `aurelius check --site <site>` after source changes. Build only when a generated projection is requested, then confirm the expected agent-facing API entries and affected documents are present.

## Extending to another application

Add a focused reference under `references/` only after inspecting that application's native export and its actual data model. Document: object inventory, link/asset behavior, metadata and collection semantics, unsupported features, a source-to-target mapping, and validation checks. Keep generic rules here; do not turn an Obsidian-specific limitation into a universal rule.
