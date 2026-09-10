import path from "node:path";

import { documentUsesDiagram } from "./content.mjs";

export function documentOutputPath(document) {
  return document.id === "home"
    ? "index.html"
    : path.posix.join(document.id, "index.html");
}

export function visualRenderMode(diagram) {
  if (diagram._mermaid) return "mermaid";
  if (diagram._html) return "html";
  if (diagram.kind === "canvas") return "canvas";
  if (diagram._svg) return "svg";
  return "native";
}

export function publicDocumentProjection(document) {
  return {
    id: document.id,
    title: document.title,
    description: document.description,
    type: document.type,
    status: document.status,
    visibility: document.visibility,
    tags: document.tags,
    related: document.related,
    href: documentOutputPath(document),
    markdown: path.posix.join("markdown", document.id + ".md"),
    api: path.posix.join("api", "documents", document.id + ".json"),
  };
}

export function graphProjection(documents) {
  return {
    nodes: documents.map((document) => ({
      id: document.id,
      title: document.title,
      type: document.type,
      status: document.status,
      visibility: document.visibility,
      tags: document.tags,
    })),
    edges: documents.flatMap((document) =>
      document.related.map((target) => ({ source: document.id, target, kind: "related" })),
    ),
  };
}

export function visualReferencesForDocument(document, diagrams) {
  return diagrams
    .filter((diagram) => documentUsesDiagram(document, diagram.id))
    .map((diagram) => ({
      id: diagram.id,
      kind: diagram.kind,
      title: diagram.title,
      description: diagram.description,
      summary: diagram.summary || diagram.description,
      renderMode: visualRenderMode(diagram),
      api: path.posix.join("api", "diagrams", diagram.id + ".json"),
      human: path.posix.join("diagrams", diagram.id + ".html"),
    }));
}

export function searchProjection(document, diagrams) {
  return {
    id: document.id,
    title: document.title,
    description: document.description,
    tags: document.tags,
    sections: document.sections,
    visuals: diagrams
      .filter((diagram) => documentUsesDiagram(document, diagram.id))
      .map((diagram) => ({
        id: diagram.id,
        kind: diagram.kind,
        title: diagram.title,
        description: diagram.description,
        summary: diagram.summary || diagram.description,
        data: diagram.data || null,
      })),
  };
}

export function indexDiagramProjection(diagram) {
  return {
    id: diagram.id,
    kind: diagram.kind,
    title: diagram.title,
    description: diagram.description,
    format: visualRenderMode(diagram),
    summary: diagram.summary || diagram.description,
  };
}

export function apiDiagramProjection(diagram) {
  return {
    ...diagram,
    _svg: undefined,
    _html: undefined,
    _mermaid: undefined,
    _mermaidSource: undefined,
    source: diagram._mermaid
      ? {
          language: "mermaid",
          code: diagram._mermaidSource || diagram._mermaid,
          ...(diagram.source?.path ? { sourcePath: diagram.source.path } : {}),
        }
      : diagram.source,
    renderMode: visualRenderMode(diagram),
    apiVersion: 1,
  };
}
