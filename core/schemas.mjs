import { diagramDesignKinds } from "./diagrams/registry.mjs";

export function documentSchema() {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema", $id: "https://aurelius.local/schema/document.schema.json",
    title: "Aurelius document", type: "object",
    required: ["id", "title", "description", "type", "status", "visibility", "body", "sections", "sourcePath", "apiVersion"],
    properties: {
      id: { type: "string", pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" }, title: { type: "string", minLength: 1 },
      description: { type: "string", minLength: 1 }, type: { type: "string", minLength: 1 }, status: { type: "string", minLength: 1 },
      visibility: { type: "string", minLength: 1 }, tags: { type: "array", items: { type: "string" }, uniqueItems: true },
      related: { type: "array", items: { type: "string" }, uniqueItems: true }, sourceRefs: { type: "array", items: { type: "string" } },
      authors: { type: "array", items: { type: "string" } }, updated: { type: ["string", "null"] }, diagram: { type: ["string", "null"] },
      body: { type: "string" }, sections: { type: "array" }, visuals: { type: "array", items: { type: "object", required: ["id", "kind", "title", "summary", "renderMode", "api", "human"] } }, sourcePath: { type: "string" }, apiVersion: { const: 1 },
    },
  };
}

export function diagramSchema() {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema", $id: "https://aurelius.local/schema/diagram.schema.json",
    title: "Aurelius diagram", type: "object", required: ["id", "kind", "title", "description", "nodes", "edges"],
    properties: {
      id: { type: "string", pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" }, kind: { enum: [...diagramDesignKinds, "canvas", "custom"] },
      title: { type: "string", minLength: 1 }, description: { type: "string", minLength: 1 }, nodes: { type: "array" }, edges: { type: "array" },
      groups: { type: "array" }, zones: { type: "array" }, sourceRefs: { type: "array", items: { type: "string" } },
      svgSource: { type: "string" }, htmlSource: { type: "string" }, interactive: { type: "boolean" }, summary: { type: "string" },
      source: {
        type: "object",
        required: ["language"],
        properties: {
          language: { const: "mermaid" },
          path: { type: "string", pattern: "\\.(?:mmd|mermaid)$" },
          code: { type: "string", minLength: 1 },
          sourcePath: { type: "string", pattern: "\\.(?:mmd|mermaid)$" },
        },
        oneOf: [
          { required: ["path"], not: { required: ["code"] } },
          { required: ["code"], not: { required: ["path"] } },
        ],
      },
      mermaidType: { type: "string" },
      declarativeAnalysis: {
        type: "object",
        properties: {
          grammar: { type: "string" }, direction: { type: ["string", "null"] },
          roles: { type: "array", items: { type: "string" }, uniqueItems: true },
          focus: { type: "array", items: { type: "string" }, uniqueItems: true },
          relationships: { type: "array", items: { type: "object", properties: { from: { type: "string" }, to: { type: "string" }, left: { type: "string" }, right: { type: "string" }, label: { type: "string" } } } },
          discarded: { type: "object", properties: { paintDirectives: { type: "integer", minimum: 0 } } },
        },
      },
      presentation: { type: "object", properties: { width: { type: "number", minimum: 640, maximum: 2200 }, height: { type: "number", minimum: 280, maximum: 1600 } } },
      data: { type: ["object", "array", "null"] }, sourcePath: { type: "string" }, renderMode: { enum: ["native", "svg", "html", "mermaid", "canvas"] }, apiVersion: { const: 1 },
    },
    allOf: [
      { if: { properties: { renderMode: { const: "html" } }, required: ["renderMode"] }, then: { required: ["htmlSource", "summary", "presentation"] } },
      { if: { properties: { renderMode: { const: "mermaid" } }, required: ["renderMode"] }, then: { required: ["source", "summary"] } },
      { if: { properties: { kind: { const: "custom" } }, required: ["kind"] }, then: { required: ["htmlSource", "summary", "presentation"] } },
      { if: { properties: { kind: { const: "canvas" } }, required: ["kind"] }, then: { not: { anyOf: [{ required: ["htmlSource"] }, { required: ["svgSource"] }] } } },
    ],
  };
}
