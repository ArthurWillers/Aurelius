---
id: declarative-visuals
title: Declarative diagrams
description: Ten declarative Mermaid examples rendered with the Diagram Design editorial system and an always-visible contextual legend.
type: guide
status: observed
visibility: public
tags: diagrams, mermaid, uml, data-modeling, charts
related: visual-types, content-model, architecture-example
source_refs: diagrams/order-decision-flow.json, diagrams/sources/order-decision-flow.mmd, diagrams/publication-sequence.json, diagrams/sources/publication-sequence.mmd, diagrams/visual-model-classes.json, diagrams/sources/visual-model-classes.mmd, diagrams/documentation-data-model.json, diagrams/sources/documentation-data-model.mmd, diagrams/document-throughput.json, diagrams/sources/document-throughput.mmd, diagrams/editorial-state.json, diagrams/sources/editorial-state.mmd, diagrams/release-plan.json, diagrams/sources/release-plan.mmd, diagrams/reader-journey.json, diagrams/sources/reader-journey.mmd, diagrams/documentation-priorities.json, diagrams/sources/documentation-priorities.mmd, diagrams/publishing-dependencies.json, diagrams/sources/publishing-dependencies.mmd
updated: 2026-09-09
diagram: order-decision-flow
---

## One declarative contract

These examples have no authored SVG or HTML. Each JSON envelope points to a small Mermaid file; `aurelius check` validates its syntax and safety, while `aurelius build` compiles its semantic roles, discards source paint, applies Diagram Design's Minimal light system, and packages the renderer for offline use. The original source and its `declarativeAnalysis` remain available to agents. Every rendered Mermaid has a legend derived from the actual notation and a bounded viewport: drag to pan, use Ctrl/⌘ + scroll or the buttons to zoom, and open fullscreen or the dedicated full view when the model is large.

```json
{
  "id": "order-decision-flow",
  "kind": "flowchart",
  "source": {
    "language": "mermaid",
    "path": "diagrams/sources/order-decision-flow.mmd"
  }
}
```

Create the same structure with `aurelius visual init my-flow --site docs --kind flowchart`. Mermaid is the default when Aurelius has an equivalent starter for the selected kind; `--format mermaid` is available when an explicit command is preferable. For a kind without such a starter, choose `--format html` or `--format svg` explicitly so the generated source never pretends that one visual grammar is another.

## Decision flow

The decision shape carries branching semantics, every outgoing route is labeled, and one focal class marks the successful outcome.

{{diagram:order-decision-flow}}

## Sequence with an alternative

Time runs downward across four actors. The `alt` fragment keeps approval and rejection outcomes in one bounded branch.

{{diagram:publication-sequence}}

## UML class model

Compartments keep attributes and operations distinct, while inheritance and composition remain explicit in the source.

{{diagram:visual-model-classes}}

## ER data model

Entities declare keys, fields, and cardinalities directly; agents receive the Mermaid source plus the structured `data` projection.

{{diagram:documentation-data-model}}

## Quantitative line chart

The chart uses Mermaid's XY grammar, but inherits the same paper, ink, muted line, typography, and accent system as the other diagrams.

{{diagram:document-throughput}}

## State machine

Transitions name the event that moves a document forward or returns it for revision. Terminal markers and the focal published state remain distinct in both the diagram and its legend.

{{diagram:editorial-state}}

## Release Gantt

The schedule separates authoring, verification, and delivery while showing completed, active, and milestone treatments without adding a second visual language.

{{diagram:release-plan}}

## Reader journey

Stages organize the experience from discovery to evidence. The sentiment curve makes the evidence-tracing friction explicit, while labels keep the finding understandable without relying on color.

{{diagram:reader-journey}}

## Priority quadrant

Reader value and implementation effort place improvements in four named regions. The legend keeps axis, point, group, and focal meanings explicit.

{{diagram:documentation-priorities}}

## Publishing dependencies

Quiet dashed groups separate sources, build, and delivery. One coral focal node carries the editorial emphasis while every connector remains individually traceable.

{{diagram:publishing-dependencies}}
