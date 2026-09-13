import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";
import { fileURLToPath } from "node:url";

const runtimePath = fileURLToPath(new URL("../runtime/editorial-mermaid.js", import.meta.url));

test("ER manual layout controls entity placement, field ports, routes, and labels", async () => {
  const context = { window: {} };
  vm.runInNewContext(await readFile(runtimePath, "utf8"), context);
  const source = [
    "erDiagram",
    "  USERS ||--o{ AFFILIATIONS : user_id",
    "  USERS {", "    bigint id PK", "    varchar name", "  }",
    "  AFFILIATIONS {", "    bigint id PK", "    bigint user_id FK", "  }",
  ].join("\n");
  const layout = {
    canvas: { width: 1200, height: 720 },
    entities: { USERS: { x: 80, y: 80, width: 320 }, AFFILIATIONS: { x: 720, y: 400, width: 320 } },
    relationships: [{
      from: "USERS", to: "AFFILIATIONS", label: "user_id",
      fromPort: { side: "right", field: "id", fieldOffset: 8 },
      toPort: { side: "left", field: "user_id" },
      waypoints: [{ x: 512, y: 136 }, { x: 512, y: 456 }, { x: 680, y: 456 }],
      labelPlacement: { x: 544, y: 320 },
      cardinalityPlacement: { from: { x: 432, y: 152 }, to: { x: 696, y: 440 } },
      showLabel: true,
      showCardinality: true,
    }],
  };
  const svg = context.window.AureliusEditorial.render(source, "db-schema", "", {
    relationships: [{ from: "USERS", to: "AFFILIATIONS", left: "1", right: "0..N", label: "user_id" }],
  }, layout);

  assert.match(svg, /viewBox="0 0 1200 720"/);
  assert.match(svg, /<path d="M400 136/);
  assert.match(svg, /L720 476/);
  assert.match(svg, /<rect x="80" y="80" width="320"/);
  assert.match(svg, /<rect x="720" y="400" width="320"/);
  assert.match(svg, />TABLE<\/text>/, "database schemas identify boxes as tables");
  assert.ok((svg.match(/height="16"/g) || []).length >= 3, "relationship labels use opaque masks");
});

test("database schemas keep FK connections quiet by default while anchoring them to rows", async () => {
  const context = { window: {} };
  vm.runInNewContext(await readFile(runtimePath, "utf8"), context);
  const source = [
    "erDiagram",
    "  USERS ||--o{ AFFILIATIONS : user_id",
    "  USERS {", "    bigint id PK", "    varchar email", "  }",
    "  AFFILIATIONS {", "    bigint id PK", "    bigint user_id FK", "    varchar role", "  }",
  ].join("\n");
  const svg = context.window.AureliusEditorial.render(source, "db-schema", "", {
    relationships: [{ from: "USERS", to: "AFFILIATIONS", left: "1", right: "0..N", label: "user_id" }],
  }, {
    entities: { USERS: { x: 80, y: 80, width: 300 }, AFFILIATIONS: { x: 640, y: 320, width: 300 } },
    relationships: [{ from: "USERS", to: "AFFILIATIONS", label: "user_id", waypoints: [{ x: 480, y: 120 }] }],
  });

  assert.match(svg, /<path d="M380 128/, "the connector starts at the primary-key row");
  assert.match(svg, /L632 120/, "a diagonal waypoint becomes right-angle segments");
  assert.doesNotMatch(svg, /L480 120 L640 396/, "the connector never jumps diagonally into the FK row");
  assert.match(svg, /marker-end="url\(#editorial-arrow\)"/, "FK connectors retain a directional arrowhead");
  assert.equal((svg.match(/height="16"/g) || []).length, 0, "FK connectors do not repeat labels or cardinalities by default");
});

test("long state lifecycles wrap into readable rows", async () => {
  const context = { window: {} };
  vm.runInNewContext(await readFile(runtimePath, "utf8"), context);
  const source = [
    "stateDiagram-v2",
    "  [*] --> PendingFormalization",
    "  PendingFormalization --> AwaitingSignatures",
    "  AwaitingSignatures --> PendingCorrection",
    "  PendingCorrection --> Released",
    "  Released --> InProgress",
    "  InProgress --> Completed",
    "  Completed --> Paused",
    "  Paused --> Cancelled",
  ].join("\n");
  const svg = context.window.AureliusEditorial.render(source, "state", "", {});

  assert.match(svg, /viewBox="0 0 1200 440"/);
  assert.match(svg, /<rect x="96" y="136" width="144" height="64"/, "the first state stays on the first row");
  assert.match(svg, /<rect x="96" y="292" width="144" height="64"/, "later states wrap to a second row");
});

test("leaf states receive a terminal marker without redundant terminal transitions", async () => {
  const context = { window: {} };
  vm.runInNewContext(await readFile(runtimePath, "utf8"), context);
  const source = ["stateDiagram-v2", "  [*] --> Draft", "  Draft --> Approved"].join("\n");
  const svg = context.window.AureliusEditorial.render(source, "state", "", {});

  assert.match(svg, /fill="rgba\(45,49,66,\.04\)"/, "a leaf state is visually terminal");
  assert.match(svg, /r="8" fill="none" stroke="#4f5d75"/, "a leaf state gets an end marker");
});
