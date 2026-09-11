# Migrate an Obsidian vault

This reference guides the migration of a vault to organized Markdown or an Aurelius site. It is based on the official skills from `kepano/obsidian-skills`: [obsidian-markdown](https://github.com/kepano/obsidian-skills/tree/main/skills/obsidian-markdown), [obsidian-bases](https://github.com/kepano/obsidian-skills/tree/main/skills/obsidian-bases), and [json-canvas](https://github.com/kepano/obsidian-skills/tree/main/skills/json-canvas). Consult the upstream references when the task is to edit the vault, rather than only migrate it.

## Inventory before copying

Inspect the vault without changing it and produce a table of counts and exceptions:

| Object | Look for | Decision to record |
|---|---|---|
| Notes | `*.md` | destination, `id`, frontmatter status, and links |
| Internal links | `[[note]]`, `[[note#section]]`, `[[note|label]]`, `[[note#^block]]` | resolved target, preserved anchor, or exception |
| Embeds | `![[...]]` | transcluded content, asset, or reference to translate |
| Properties | YAML frontmatter | fields preserved, renamed, or discarded with a reason |
| Tags | `#tag` and `tags:` | normalized vocabulary and naming |
| Attachments | images, PDF, audio, video, and other files | path, optional hash, destination, and references |
| Canvas | `*.canvas` | semantic translation, source preservation, or exception |
| Bases | `*.base` | static view, narrative index, custom implementation, or unsupported item |
| Configuration | `.obsidian/` and plugins | preserve as context/files; never confuse with published content |

Include ambiguous links, notes with the same name, broken embeds, invalid frontmatter, unreferenced files, missing referenced files, and plugin syntax in the report. The absence of a reference does not authorize deleting an asset: it may be intentional independent content.

## Markdown and properties

Obsidian extends Markdown with wikilinks, embeds, callouts, properties, comments, and tags. Keep CommonMark as the foundation and make an explicit conversion decision for each extension.

| Obsidian source | Aurelius target | Rule |
|---|---|---|
| `[[Note]]` | `[Note](doc:note-id)` | only after resolving `Note` to the destination `id` |
| `[[Note\|Label]]` | `[Label](doc:note-id)` | preserve the displayed text |
| `[[Note#Section]]` | equivalent anchor when the destination has a stable slug | verify the generated anchor; if it does not exist, record an exception |
| `[[Note#^block]]` | link to a section or transposed content | Aurelius does not provide automatic compatibility with Obsidian block IDs |
| `![[image.png]]` | `asset:image.png` or published Markdown image | copy the asset and rewrite references |
| `![[Note]]` | transposed content or explicit link | do not simulate dynamic inclusion without target support |
| callout `> [!type]` | Markdown blockquote or chosen editorial pattern | preserve meaning and title; do not depend on Obsidian appearance |
| YAML properties | Aurelius frontmatter | deliberately fill the target's required Aurelius fields |
| `tags`/`#tag` | `tags` | normalize spelling, hierarchy, and synonyms before import |

Properties such as `aliases` and `cssclasses` are Obsidian semantics; do not treat them as native target features. Preserve aliases in a redirect map or report when they are needed to find old content. Preserve `cssclasses` only when there is an equivalent style decision.

Do not convert external URLs to `doc:` links, and do not turn unresolved wikilinks into false links. A good result keeps a traceable list of every link that could not be resolved.

## Canvas JSON

An `.canvas` file contains `nodes` and `edges` arrays; each edge references the IDs of its source and target nodes. Before converting, validate JSON, ID uniqueness, and `fromNode`/`toNode` integrity. Inventory `text`, `file`, `link`, and `group` nodes, along with labels and edge directions.

For Aurelius, use a native JSON diagram source whenever it represents the subject well. Preserve relationships as structured data, a `summary` understandable without the image, and `sourceRefs` for the source supporting the claim. Groups become zones when appropriate; file nodes may become links to migrated documents. A Canvas whose layout is purely spatial may remain as a source file accompanied by a textual explanation instead of becoming an inaccessible image.

## Bases and plugin features

An `.base` file is YAML defining filters, formulas, properties, and views. A view may be a table, cards, list, or map. It is a query over notes and must be evaluated as behavior, not copied as if it were a static page.

For each Base, record filters, required properties, formulas, sorting, grouping, limit, and summaries. If exporting a static table, declare the cutoff date and the rule that generated it. If a note lacks an expected property, do not hide the error: keep the absence condition in the rule or report.

Queries and community-plugin syntax are not part of standard Markdown or the Obsidian format. Detect code blocks, frontmatter, or comments that depend on them; preserve the source and request a product decision before reimplementing, freezing as a static result, or excluding it from scope.

## Migration validation

Perform at least these checks before declaring the migration complete:

1. Every note, attachment, Canvas, and Base has a destination or a recorded exception.
2. Every converted internal link resolves to the expected destination; unresolved links and embeds appear in the report.
3. Every referenced asset was copied once, is available at the published path, and retained its content relationship.
4. Resulting frontmatter is valid and satisfies the target contract; identify fields that were transformed or discarded.
5. Diagrams preserve meaning without depending on the Obsidian app; Bases are not presented as interactive when the delivery is a static export.
6. In Aurelius, run `aurelius check --site <site>` and, when a build was requested, inspect the generated Markdown pages and API for affected documents.
