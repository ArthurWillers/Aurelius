import { diagramDesignKinds } from "./diagrams/registry.mjs";

const slug = { type: "string", pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" };
const nonEmptyString = { type: "string", minLength: 1 };
const stringList = { type: "array", items: { type: "string" } };

export function documentSchema() {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://aurelius.local/schema/document.schema.json",
    title: "Aurelius document",
    type: "object",
    additionalProperties: false,
    required: [
      "id", "title", "description", "type", "status", "visibility", "tags", "related", "sourceRefs",
      "authors", "updated", "diagram", "body", "sections", "sourcePath", "visuals", "apiVersion",
    ],
    properties: {
      id: slug,
      title: nonEmptyString,
      description: nonEmptyString,
      type: nonEmptyString,
      status: nonEmptyString,
      visibility: nonEmptyString,
      tags: { ...stringList, uniqueItems: true },
      related: { ...stringList, items: slug, uniqueItems: true },
      sourceRefs: stringList,
      authors: stringList,
      updated: { type: ["string", "null"] },
      diagram: { anyOf: [slug, { type: "null" }] },
      body: { type: "string" },
      sections: { type: "array", items: { $ref: "#/$defs/section" } },
      visuals: { type: "array", items: { $ref: "#/$defs/visualReference" } },
      sourcePath: nonEmptyString,
      apiVersion: { const: 1 },
    },
    $defs: {
      section: {
        type: "object",
        additionalProperties: false,
        required: ["id", "level", "title", "text", "line"],
        properties: {
          id: nonEmptyString,
          level: { type: "integer", minimum: 1, maximum: 4 },
          title: nonEmptyString,
          text: { type: "string" },
          line: { type: "integer", minimum: 1 },
        },
      },
      visualReference: {
        type: "object",
        additionalProperties: false,
        required: ["id", "kind", "title", "description", "summary", "renderMode", "api", "human"],
        properties: {
          id: slug,
          kind: { enum: [...diagramDesignKinds, "canvas", "custom"] },
          title: nonEmptyString,
          description: nonEmptyString,
          summary: nonEmptyString,
          renderMode: { enum: ["native", "svg", "html", "mermaid", "canvas"] },
          api: nonEmptyString,
          human: nonEmptyString,
        },
      },
    },
  };
}

export function diagramSchema() {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://aurelius.local/schema/diagram.schema.json",
    title: "Aurelius diagram",
    type: "object",
    required: [
      "id", "kind", "title", "description", "nodes", "edges", "groups", "zones", "sourceRefs",
      "sourcePath", "renderMode", "apiVersion",
    ],
    properties: {
      id: slug,
      kind: { enum: [...diagramDesignKinds, "canvas", "custom"] },
      title: nonEmptyString,
      description: nonEmptyString,
      nodes: { type: "array", items: { $ref: "#/$defs/node" } },
      edges: { type: "array", items: { $ref: "#/$defs/edge" } },
      groups: { type: "array", items: { $ref: "#/$defs/group" } },
      zones: { type: "array", items: { $ref: "#/$defs/zone" } },
      sourceRefs: stringList,
      svgSource: nonEmptyString,
      htmlSource: nonEmptyString,
      interactive: { type: "boolean" },
      summary: nonEmptyString,
      source: { $ref: "#/$defs/mermaidSource" },
      mermaidType: nonEmptyString,
      declarativeAnalysis: { $ref: "#/$defs/declarativeAnalysis" },
      presentation: { $ref: "#/$defs/presentation" },
      layout: { $ref: "#/$defs/erLayout" },
      data: { type: ["object", "array", "null"] },
      width: { type: "number" },
      height: { type: "number" },
      canvasWidth: { type: "number" },
      canvasHeight: { type: "number" },
      sourcePath: nonEmptyString,
      renderMode: { enum: ["native", "svg", "html", "mermaid", "canvas"] },
      apiVersion: { const: 1 },
    },
    $defs: {
      node: {
        type: "object",
        properties: {
          id: nonEmptyString,
          kind: nonEmptyString,
          type: nonEmptyString,
          tag: nonEmptyString,
          label: nonEmptyString,
          title: nonEmptyString,
          detail: { type: "string" },
          summary: { type: "string" },
          text: { type: "string" },
          x: { type: "number" },
          y: { type: "number" },
          width: { type: "number", exclusiveMinimum: 0 },
          height: { type: "number", exclusiveMinimum: 0 },
        },
      },
      edge: {
        type: "object",
        properties: {
          id: nonEmptyString,
          from: nonEmptyString,
          to: nonEmptyString,
          fromNode: nonEmptyString,
          toNode: nonEmptyString,
          label: { type: "string" },
          tone: { type: "string" },
          dashed: { type: "boolean" },
          fromSide: { enum: ["left", "right", "top", "bottom"] },
          toSide: { enum: ["left", "right", "top", "bottom"] },
          path: { type: "string" },
        },
      },
      group: {
        type: "object",
        properties: {
          id: nonEmptyString,
          label: nonEmptyString,
          title: nonEmptyString,
          x: { type: "number" }, y: { type: "number" },
          width: { type: "number", exclusiveMinimum: 0 }, height: { type: "number", exclusiveMinimum: 0 },
        },
      },
      zone: {
        type: "object",
        properties: {
          label: nonEmptyString,
          x: { type: "number" }, y: { type: "number" },
          width: { type: "number", exclusiveMinimum: 0 }, height: { type: "number", exclusiveMinimum: 0 },
        },
      },
      mermaidSource: {
        type: "object",
        additionalProperties: false,
        required: ["language", "code"],
        properties: {
          language: { const: "mermaid" },
          code: nonEmptyString,
          sourcePath: { type: "string", pattern: "\\.(?:mmd|mermaid)$" },
        },
      },
      declarativeAnalysis: {
        type: "object",
        required: ["grammar", "direction", "roles", "focus", "relationships", "discarded"],
        properties: {
          grammar: nonEmptyString,
          direction: { type: ["string", "null"] },
          roles: { ...stringList, uniqueItems: true },
          focus: { ...stringList, uniqueItems: true },
          relationships: { type: "array", items: { $ref: "#/$defs/relationship" } },
          discarded: {
            type: "object",
            required: ["paintDirectives"],
            properties: { paintDirectives: { type: "integer", minimum: 0 } },
          },
        },
      },
      relationship: {
        type: "object",
        properties: {
          from: { type: "string" }, to: { type: "string" }, left: { type: "string" }, right: { type: "string" }, label: { type: "string" },
        },
      },
      presentation: {
        type: "object",
        required: ["width", "height"],
        properties: {
          width: { type: "number", minimum: 640, maximum: 2200 },
          height: { type: "number", minimum: 280, maximum: 1600 },
          initialZoom: { type: "number", minimum: 0.5, maximum: 4 },
          initialPosition: { enum: ["center", "start"] },
        },
      },
      erLayout: {
        type: "object",
        description: "Optional manual layout for declarative ER and database-schema diagrams.",
        additionalProperties: false,
        properties: {
          canvas: { $ref: "#/$defs/layoutCanvas" },
          entities: {
            type: "object",
            additionalProperties: { $ref: "#/$defs/erEntityLayout" },
          },
          relationships: {
            type: "array",
            items: { $ref: "#/$defs/erRelationshipLayout" },
          },
        },
      },
      layoutCanvas: {
        type: "object",
        additionalProperties: false,
        required: ["width", "height"],
        properties: {
          width: { type: "number", minimum: 640, maximum: 3200 },
          height: { type: "number", minimum: 280, maximum: 2000 },
        },
      },
      erEntityLayout: {
        type: "object",
        additionalProperties: false,
        required: ["x", "y"],
        properties: {
          x: { type: "number", minimum: 0, maximum: 3200 },
          y: { type: "number", minimum: 0, maximum: 2000 },
          width: { type: "number", minimum: 160, maximum: 640 },
        },
      },
      erRelationshipLayout: {
        type: "object",
        additionalProperties: false,
        required: ["from", "to"],
        properties: {
          from: nonEmptyString,
          to: nonEmptyString,
          label: { type: "string" },
          fromPort: { $ref: "#/$defs/erPort" },
          toPort: { $ref: "#/$defs/erPort" },
          waypoints: { type: "array", maxItems: 20, items: { $ref: "#/$defs/layoutPoint" } },
          labelPlacement: { $ref: "#/$defs/layoutPoint" },
          cardinalityPlacement: {
            type: "object",
            additionalProperties: false,
            properties: { from: { $ref: "#/$defs/layoutPoint" }, to: { $ref: "#/$defs/layoutPoint" } },
          },
          bridges: { type: "array", items: { $ref: "#/$defs/erBridge" } },
        },
      },
      erPort: {
        type: "object",
        additionalProperties: false,
        properties: {
          side: { enum: ["left", "right", "top", "bottom"] },
          field: nonEmptyString,
          offset: { type: "number", minimum: 0, maximum: 1 },
          fieldOffset: { type: "number", minimum: -8, maximum: 8 },
        },
      },
      layoutPoint: {
        type: "object",
        additionalProperties: false,
        required: ["x", "y"],
        properties: { x: { type: "number", minimum: 0, maximum: 3200 }, y: { type: "number", minimum: 0, maximum: 2000 } },
      },
      erBridge: {
        type: "object",
        additionalProperties: false,
        required: ["x", "y", "orientation"],
        properties: {
          x: { type: "number", minimum: 0, maximum: 3200 },
          y: { type: "number", minimum: 0, maximum: 2000 },
          orientation: { enum: ["horizontal", "vertical"] },
        },
      },
    },
    allOf: [
      { if: { properties: { renderMode: { const: "html" } }, required: ["renderMode"] }, then: { required: ["htmlSource", "summary", "presentation"] } },
      { if: { properties: { renderMode: { const: "mermaid" } }, required: ["renderMode"] }, then: { required: ["source", "summary"] } },
      { if: { properties: { kind: { const: "custom" } }, required: ["kind"] }, then: { required: ["htmlSource", "summary", "presentation"] } },
      { if: { properties: { kind: { const: "canvas" } }, required: ["kind"] }, then: { not: { anyOf: [{ required: ["htmlSource"] }, { required: ["svgSource"] }, { required: ["source"] }] } } },
    ],
  };
}
