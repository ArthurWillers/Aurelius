---
id: large-canvas
title: Example: large documentation lifecycle
description: A five-phase, 24-step Canvas demonstrating how Aurelius handles a process map at business-workflow scale.
type: process
status: observed
visibility: public
tags: canvas, flowchart, large-diagram
related: content-model, architecture-example, publishing
source_refs: diagrams/documentation-lifecycle.json, ../../core/build.mjs
diagram: documentation-lifecycle
---

## A process map that is intentionally large

This Canvas spans roughly 4,000 by 1,600 logical pixels. Its five groups and 24 focusable cards mirror the scale of a complete operational flow instead of compressing it into an unreadable article illustration.

{{canvas:documentation-lifecycle}}

## How to explore it

- Scroll horizontally in the embedded view to preserve readable text.
- Choose “Open full view” for a fitted panorama with the entire process visible.
- Use the 40%–300% zoom range, reset, or fullscreen controls to move between overview and detail. The current scale is announced beside the controls.
- Drag anywhere — including over a card — to move the Canvas. A normal mouse wheel pans; `Ctrl/⌘ + wheel` zooms around the pointer.
- Select a card with a pointer, `Tab`, `Enter`, or `Space` to expose its summary without changing zoom or position.

The JSON deliberately follows familiar Canvas fields such as `type`, `text`, `fromNode`, and directional sides. Aurelius normalizes those fields into accessible SVG while preserving the semantic source for agents.
