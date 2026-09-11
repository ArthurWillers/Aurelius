# Visual Authoring Contract

Read this reference when creating, importing, or revising an Aurelius visual. The goal is to keep a single visual source readable on the page, in full view, in print, and in agent-facing projections.

## Choose the source

| Source | Use when | Avoid when |
|---|---|---|
| Declarative Mermaid | UML, decisions, flowcharts, sequence, state, ER, Gantt, journeys, or a chart fits the Mermaid grammar and maintenance should avoid SVG/HTML. | The composition needs a grammar Mermaid cannot represent clearly or needs authored interaction. |

In declarative ER diagrams, readable relationship cardinalities are also accepted: `A 1 -- N B : contains`, `A N -- N B : associates`, and `A 1 -- 1 B : owns`. The build converts them to crow-foot notation before validating Mermaid, without changing the source that agents receive.
| Native JSON | The structure fits Aurelius's semantic model and should remain easy to edit as data. This is the first option for `architecture` and `canvas`. | The composition needs a visual grammar that the native renderer does not represent well. |
| `svgSource` | The result is static, vector-based, and needs precise composition. | Interaction is required or a complete editorial page is needed around the chart. |
| `htmlSource` | An agent needs to control HTML, CSS, and SVG to produce an editorial composition, an advanced chart, or accessible interaction. | A native renderer or simple SVG already communicates the same content. |

The authoring mode does not change the semantic type: keep `kind` as `sankey`, `sequence`, `timeline`, or another registered type. A Mermaid source uses `source.language: mermaid` and exactly one of `source.path` and `source.code`; do not combine it with `svgSource` or `htmlSource`. Authored HTML may declare an additional `svgSource` as a static fallback for print and copying; it must not declare a second primary source.

The Mermaid runtime provides a viewport constrained by `presentation.height`, drag panning, zoom through buttons or Ctrl/⌘ + scroll, reset, fullscreen, a full-view route, and a mandatory contextual legend. Dense diagrams may declare `presentation.initialZoom` (0.5–4) and `presentation.initialPosition` (`center` or `start`); `start` opens near the flow origin according to the Mermaid direction. Zoom uses the viewport's actual aspect ratio to make use of both available width and height. An editorial JavaScript compiler derives the roles actually used by the source, following the trust boundary and the Diagram Design Mermaid importer IR; authored `style`, `classDef`, and `linkStyle` are discarded before rendering. Use this for large models without shrinking text until it becomes unreadable; `summary`, `data`, and `declarativeAnalysis` remain the compact view for agents and degraded print output. The legend stays outside the pan area so it remains readable inline, on the dedicated page, in fullscreen, and in print.

## Authored HTML envelope

Create the scaffold with:

```text
aurelius visual init publication-cost --site ./docs --kind sankey --format html
```

The artifact is referenced by a JSON file in `diagrams/`:

```json
{
  "id": "publication-cost",
  "kind": "sankey",
  "title": "Where publication time goes",
  "description": "A Sankey diagram showing review time split across validation stages and outcomes.",
  "summary": "Twelve thousand minutes enter four validation stages. Most time reaches the passed outcome; flaky reruns consume one thousand minutes.",
  "htmlSource": "diagrams/artifacts/publication-cost.html",
  "svgSource": "diagrams/artifacts/publication-cost.svg",
  "presentation": { "width": 1200, "height": 720 },
  "interactive": false,
  "data": {
    "unit": "minutes",
    "flows": [
      { "from": "CI", "to": "Unit tests", "value": 5200 },
      { "from": "Unit tests", "to": "Passed", "value": 4400 }
    ]
  },
  "sourceRefs": ["content/publishing.md"]
}
```

- `htmlSource` points to a complete HTML document local to the site root.
- `summary` is self-contained text: record the conclusion or structure a person needs to understand without rendering the visual. Do not describe box positions.
- `data` preserves important values and relationships in a traceable format. It does not need to duplicate the complete HTML markup.
- `presentation.width` and `presentation.height` declare the authored frame in CSS pixels. Choose a frame large enough for readable labels; the reader provides overflow and full view. For a dense map, `initialZoom` can open directly at a readable scale and `initialPosition: "start"` keeps the flow entry visible.
- `interactive` is `false` by default. Set it to `true` only when interaction materially improves the meaning and a complete state exists without JavaScript.
- `svgSource` is optional but recommended for important visuals in PDF. The fallback must represent the same complete state as the HTML. For automatic extraction, mark exactly one SVG with `data-aurelius-print-source="true"`, keep all styles and variables it uses inside it, and preserve the accessibility contract; CSS declared only in `<head>` does not travel with copying or printing. Without this marker or an `svgSource`, the PDF uses the text alternative based on `summary`.

Do not put `htmlSource` content in `data`, Markdown, or frontmatter. The build keeps visual code isolated and publishes only metadata and semantics in the API.

## HTML requirements

The document must be self-contained and work in Aurelius isolation:

- Use `<!doctype html>`, `lang`, `<title>`, and a single main content area. Declare CSS in the file itself and keep the background light; an Aurelius site has no dark variant.
- Prefer inline SVG for diagrams and charts. An informative SVG needs `role="img"`, `aria-labelledby` pointing to `<title>` and `<desc>`, `<title>` as its first child, and a useful `<desc>`, with IDs unique and prefixed by the slug. When it is the print source, include `data-aurelius-print-source="true"` and a complete internal `<style>`.
- Do not use `iframe`, `object`, `embed`, forms, automatic navigation, `base`, `meta refresh`, network requests, or remote images. Remote fonts allowed by the build are an optional enhancement; always provide a readable local stack.
- Do not attempt to reach `parent`, cookies, storage, the clipboard, or the external DOM. Scripts may operate only inside the artifact and require `interactive: true`.
- The initial state and `prefers-reduced-motion: reduce` must show the complete content. Animation and hover must not reveal indispensable facts.
- Declare the brand CSS tokens and fallbacks in the file itself: the iframe is isolated and does not inherit the host site's styles. Do not use a monospaced font for all text; reserve it for commands, IDs, values, and compact axes.

Isolation is part of the contract, not a layout technique. The artifact must remain correct when opened on its own and must not depend on the host site's styles or scripts.

## Legibility, scale, and navigation

- Design within the frame declared in `presentation`; use a coherent `viewBox` and text sized appropriately for the destination. In a wide visual, preserve reading scale and let the container scroll horizontally instead of shrinking labels until they become illegible.
- Keep human titles short, labels next to their data, and contrast sufficient on the light paper. Use color as reinforcement, never as the only code.
- For large maps, provide visual hierarchy and orientation points. Full view must make the whole understandable; dense details must remain legible with zoom or overflow.
- In Canvas interaction, ordinary scrolling moves the surface, dragging moves the view, and the indicated modifier controls zoom. Clicking an item selects it or shows detail; it must not apply unexpected zoom.
- Split an explanation when too many elements prevent reading. A large process map may be legitimate, but it still needs grouping, phase labels, and an overview without overlaps.

## Print, copying, and text alternative

Consider four outputs before finishing:

1. The inline page shows the visual at a useful scale and provides access to full view.
2. Full view preserves the authored frame and controls do not cover content.
3. Print uses `svgSource` when available; without it, a text alternative with `summary`, title, and source must remain. Do not accept an empty iframe or clipped content as a valid PDF.
4. Copying provides the relevant editable representation: HTML for an authored artifact and SVG when a fallback exists. Markdown and the API receive the title, summary, data, and artifact reference—never only `{{diagram:id}}` without context.

## Quality with or without `diagram-design`

If the `diagram-design` skill is available, first choose the semantic pattern and visual type, read only that type's reference, and adapt a light variant to the site's tokens. Use the skill's validators when accessible. Aurelius does not depend on this skill and must not copy its assets during the build.

Without the skill, preserve the same essential results: an appropriate type, little decoration, explicit hierarchy, traceable connectors, a legend outside the data area, at most two visual focal points, and no shadows or effects that reduce contrast. For very dense diagrams, prioritize traceability of every line and split the subject into overview plus detail pages.

## Verification

After editing sources:

```text
aurelius check --site ./docs
aurelius build --site ./docs
aurelius dev --site ./docs
```

In the browser, verify the page that embeds the visual and its full-view route. Test desktop and narrow widths, browser zoom, keyboard navigation, visible focus, copying HTML/SVG, absence of trapped scrolling, loaded fonts, and `prefers-reduced-motion`. Open print preview and confirm that the title, summary, fallback, and code blocks are not clipped or split into illegible fragments.
