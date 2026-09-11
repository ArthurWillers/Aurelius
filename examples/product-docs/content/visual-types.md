---
id: visual-types
title: All visual types
description: The complete visual registry and the declarative Mermaid, native JSON, SVG, and authored HTML paths available in Aurelius.
type: reference
status: observed
visibility: public
tags: diagrams, mermaid, declarative, svg, html, renderers, registry
related: declarative-visuals, content-model, architecture-example, large-canvas
source_refs: ../../core/diagrams/registry.mjs, ../../core/diagrams/gallery.mjs, diagrams/documentation-access-sankey.json, diagrams/artifacts/documentation-access-sankey.html
---

## Declarative by default

Use [Declarative diagrams](doc:declarative-visuals) for complete Mermaid examples covering decision flows, sequence diagrams, UML classes, ER modeling, and a quantitative chart. Those examples contain no authored SVG or HTML: Aurelius validates the Mermaid source, applies the site's visual tokens, and preserves the code plus semantic data for agents.

## A fully authored HTML visual

Some visuals need editorial control beyond a built-in layout engine. In that case, an author or agent can provide a complete, self-contained HTML document with inline CSS and accessible SVG. Aurelius keeps that authored composition intact while the JSON envelope preserves a readable summary and the underlying quantities for agents.

The example below uses illustrative data. It deliberately keeps labels large, constrains the chart to three stages, and exposes every value in semantic JSON instead of asking an agent to infer numbers from ribbon thickness. Its informative inline SVG has an accessible title and description and is marked as the static print source.

{{diagram:documentation-access-sankey}}

Its source envelope is small:

```json
{
  "id": "documentation-access-sankey",
  "kind": "sankey",
  "htmlSource": "diagrams/artifacts/documentation-access-sankey.html",
  "summary": "A detailed text equivalent for readers and agents.",
  "presentation": { "width": 1200, "height": 720 },
  "data": { "stages": [], "nodes": [], "flows": [] }
}
```

Use authored HTML only when precise visual grammar is part of the explanation and Mermaid or a native diagram cannot express it. Every non-Canvas mode uses `{{diagram:id}}`; Canvas alone uses `{{canvas:id}}`.

## Forty-two accepted source kinds

Aurelius accepts all 40 visual grammars defined by `diagram-design`, its interactive `canvas` kind, and a `custom` escape hatch. The CLI defaults to Mermaid only for kinds with a semantically equivalent starter: `flowchart`, `sequence`, `state`, `er`, `db-schema`, `uml-class`, `gantt`, `journey`, `bar`, `line`, `quadrant`, `timeline`, and `sankey`. Other named kinds require an explicit `--format html` or `--format svg` instead of receiving a misleading generic flowchart. `architecture` and `canvas` also have native layout engines; Canvas accepts semantic JSON only, and `custom` accepts authored HTML only.

| Family | Accepted `kind` values |
| --- | --- |
| Systems | `architecture`, `it-state`, `high-level`, `medallion`, `dp-integration`, `deployment` |
| Behavior | `flowchart`, `sequence`, `state`, `process`, `data-flow`, `swimlane`, `journey` |
| Structure | `er`, `db-schema`, `uml-class`, `tree`, `nested`, `org-chart`, `layers`, `dependency` |
| Planning | `timeline`, `gantt`, `kanban`, `story-map`, `wardley` |
| Analysis | `quadrant`, `venn`, `pyramid`, `fishbone`, `dp-security-matrix` |
| Quantitative | `radar`, `polar`, `bar`, `line`, `scatter`, `treemap`, `sankey` |
| Cycles and maps | `loop`, `canvas` |
| Purpose-built | `custom` |

## Renderer gallery

These are not thirty-nine copies of the same box diagram. Each preview demonstrates the defining grammar of one named type: lifelines for sequences, lanes for swimlanes, axes for quantitative charts, containment for nested views, and so on. The gallery deliberately places one visual per row, so a UML, ER, or schema specimen is never compressed beside a second specimen. `canvas` has its own large interactive example, and `custom` is not shown because it deliberately has no prescribed grammar. The full Sankey above demonstrates the fidelity possible with authored HTML.

{{renderer-gallery}}

## Register a typed SVG artifact

Ask a diagram authoring tool to produce an accessible standalone SVG, then add a small JSON envelope:

```json
{
  "id": "checkout-sequence",
  "kind": "sequence",
  "title": "Checkout request sequence",
  "description": "A browser submits checkout and receives a confirmed order.",
  "svgSource": "diagrams/artifacts/checkout-sequence.svg",
  "data": {
    "actors": ["browser", "checkout-api", "orders"]
  },
  "sourceRefs": ["../src/checkout.ts"]
}
```

Include it in Markdown with the regular diagram token:

```markdown
{{diagram:checkout-sequence}}
```

## Accessibility and safety checks

The SVG must declare a `viewBox`, `role="img"`, and `aria-labelledby`. Its first children must be identified `<title>` and `<desc>` elements. Aurelius rejects scripts, event handlers, embedded HTML, external media, remote links, data URLs, and CSS imports. Local SVG references such as `url(#gradient-id)` are valid when the referenced ID exists; external or unresolved `url(...)` values are rejected. Every informative SVG inside authored HTML follows the same accessibility contract.

The build publishes the artifact inline in the page, provides a standalone full view and a copy action, and writes metadata plus semantic `data` to `api/diagrams/{id}.json`. Treat copying as the stable author-facing export action; do not depend on a generated public `.svg` path for an authored source. Private SVG and HTML payloads are deliberately omitted from the JSON API.

For authored HTML, use `svgSource` when a separately maintained print vector is appropriate. Otherwise mark exactly one complete inline SVG as the fallback:

```html
<svg data-aurelius-print-source="true"
     viewBox="0 0 1200 720"
     role="img"
     aria-labelledby="release-title release-desc">
  <title id="release-title">Release flow</title>
  <desc id="release-desc">A release moves from review through validation to publication.</desc>
  <style>/* Keep every style needed by this copied and printed SVG here. */</style>
  <!-- visual content -->
</svg>
```

## Declarative, native, SVG, and authored HTML are intentionally different

Mermaid means the author declares structure and Aurelius owns validation, styling, and runtime rendering. Native layout means Aurelius computes geometry from semantic fields. SVG-backed means the fixed vector is authored before the build. Authored HTML means an agent owns the complete isolated composition, while Aurelius owns validation, navigation, copying, printing fallback, and publication. All four remain versionable and traceable; only the layout responsibility differs.
