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
  assert.ok((svg.match(/height="16"/g) || []).length >= 3, "relationship labels use opaque masks");
});
