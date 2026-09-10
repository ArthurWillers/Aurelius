import assert from "node:assert/strict";
import test from "node:test";

import { compileMermaidDesign } from "../core/diagrams/mermaid-design.mjs";

test("Mermaid design compiler keeps meaning and discards source paint", () => {
  const source = [
    "flowchart LR",
    "  start([Start]) --> decision{Ready?}",
    "  decision -- Yes --> publish([Publish])",
    "  class publish focal",
    "  classDef focal fill:#ff0000,stroke:#00ff00",
    "  linkStyle 0 stroke:#0000ff",
  ].join("\n");
  const compiled = compileMermaidDesign(source, "flowchart-v2");

  assert.equal(compiled.analysis.grammar, "flowchart");
  assert.equal(compiled.analysis.direction, "LR");
  assert.deepEqual(compiled.analysis.focus, ["publish"]);
  assert.deepEqual(compiled.analysis.roles, ["step", "decision", "outcome", "connection", "focal"]);
  assert.equal(compiled.analysis.discarded.paintDirectives, 2);
  assert.match(compiled.renderSource, /class publish focal/);
  assert.doesNotMatch(compiled.renderSource, /classDef|linkStyle|#ff0000|#0000ff/);
});

test("Mermaid design compiler derives an ER legend from used semantics", () => {
  const compiled = compileMermaidDesign([
    "erDiagram",
    "  DOCUMENT ||--o{ SECTION : contains",
    "  DOCUMENT {",
    "    string id PK",
    "  }",
    "  SECTION {",
    "    string document_id FK",
    "  }",
  ].join("\n"), "er");

  assert.deepEqual(compiled.analysis.roles, ["entity", "primary-key", "foreign-key", "relationship"]);
});

test("Mermaid design compiler lowers readable ER cardinalities without losing them", () => {
  const compiled = compileMermaidDesign([
    "erDiagram",
    "  DOCUMENT 1 -- N SECTION : contains",
    "  USER N -- N ROLE : receives",
  ].join("\n"), "er");

  assert.match(compiled.renderSource, /DOCUMENT \|\|--\|\{ SECTION : contains/);
  assert.match(compiled.renderSource, /USER \|\{--\|\{ ROLE : receives/);
  assert.deepEqual(compiled.analysis.relationships, [
    { from: "DOCUMENT", left: "1", right: "N", to: "SECTION", label: "contains" },
    { from: "USER", left: "N", right: "N", to: "ROLE", label: "receives" },
  ]);
});
