import { access } from "node:fs/promises";
import path from "node:path";
import { documentUsesDiagram, markdownWithoutFencedCode, safeAssetPath } from "./content.mjs";
import { nativeDiagramKinds, supportedDiagramKinds } from "./diagrams/registry.mjs";
import { navigationItemIds } from "./config.mjs";
import { slugify } from "./shared.mjs";

async function ensureExists(file, message) {
  try { await access(file); } catch { throw new Error(message || "Arquivo ausente: " + file); }
}

function plainObject(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }

function layoutPoint(value, label, diagram, canvas) {
  if (!plainObject(value) || !Number.isFinite(value.x) || !Number.isFinite(value.y)) throw new Error(label + " precisa declarar x e y numéricos em " + diagram.sourcePath);
  if (value.x < 0 || value.x > canvas.width || value.y < 0 || value.y > canvas.height) throw new Error(label + " precisa ficar dentro do canvas em " + diagram.sourcePath);
}

function validateERLayout(diagram) {
  if (diagram.layout === undefined) return;
  if (!plainObject(diagram.layout)) throw new Error("layout precisa ser objeto em " + diagram.sourcePath);
  if (!new Set(["er", "db-schema"]).has(diagram.kind) || !diagram._mermaid) throw new Error("layout é suportado apenas em diagramas Mermaid er e db-schema: " + diagram.sourcePath);
  const canvas = diagram.layout.canvas || { width: Number(diagram.presentation?.width) || 1200, height: Number(diagram.presentation?.height) || 760 };
  if (!plainObject(canvas) || !Number.isFinite(canvas.width) || !Number.isFinite(canvas.height) || canvas.width < 640 || canvas.width > 3200 || canvas.height < 280 || canvas.height > 2000) throw new Error("layout.canvas precisa ter width 640–3200 e height 280–2000 em " + diagram.sourcePath);
  if (diagram.layout.entities !== undefined) {
    if (!plainObject(diagram.layout.entities)) throw new Error("layout.entities precisa ser objeto em " + diagram.sourcePath);
    for (const [id, entity] of Object.entries(diagram.layout.entities)) {
      layoutPoint(entity, "layout.entities." + id, diagram, canvas);
      if (entity.width !== undefined && (!Number.isFinite(entity.width) || entity.width < 160 || entity.width > 640)) throw new Error("layout.entities." + id + ".width precisa ficar entre 160–640 em " + diagram.sourcePath);
    }
  }
  if (diagram.layout.relationships === undefined) return;
  if (!Array.isArray(diagram.layout.relationships)) throw new Error("layout.relationships precisa ser lista em " + diagram.sourcePath);
  const relationships = diagram.declarativeAnalysis?.relationships || [];
  for (const [index, relationship] of diagram.layout.relationships.entries()) {
    const label = "layout.relationships[" + index + "]";
    if (!plainObject(relationship) || typeof relationship.from !== "string" || typeof relationship.to !== "string") throw new Error(label + " precisa declarar from e to em " + diagram.sourcePath);
    if (!relationships.some((item) => item.from === relationship.from && item.to === relationship.to && (relationship.label === undefined || item.label === relationship.label))) throw new Error(label + " não corresponde a uma relação Mermaid em " + diagram.sourcePath);
    for (const visibility of ["showLabel", "showCardinality"]) if (relationship[visibility] !== undefined && typeof relationship[visibility] !== "boolean") throw new Error(label + "." + visibility + " precisa ser booleano em " + diagram.sourcePath);
    for (const portName of ["fromPort", "toPort"]) {
      const port = relationship[portName];
      if (port === undefined) continue;
      if (!plainObject(port) || (port.side !== undefined && !["left", "right", "top", "bottom"].includes(port.side)) || (port.field !== undefined && typeof port.field !== "string") || (port.offset !== undefined && (!Number.isFinite(port.offset) || port.offset < 0 || port.offset > 1)) || (port.fieldOffset !== undefined && (!Number.isFinite(port.fieldOffset) || port.fieldOffset < -8 || port.fieldOffset > 8))) throw new Error(label + "." + portName + " é inválido em " + diagram.sourcePath);
    }
    if (relationship.waypoints !== undefined) {
      if (!Array.isArray(relationship.waypoints) || relationship.waypoints.length > 20) throw new Error(label + ".waypoints aceita até 20 pontos em " + diagram.sourcePath);
      relationship.waypoints.forEach((point, pointIndex) => layoutPoint(point, label + ".waypoints[" + pointIndex + "]", diagram, canvas));
    }
    if (relationship.labelPlacement !== undefined) layoutPoint(relationship.labelPlacement, label + ".labelPlacement", diagram, canvas);
    if (relationship.cardinalityPlacement !== undefined) {
      if (!plainObject(relationship.cardinalityPlacement)) throw new Error(label + ".cardinalityPlacement precisa ser objeto em " + diagram.sourcePath);
      for (const endpoint of ["from", "to"]) if (relationship.cardinalityPlacement[endpoint] !== undefined) layoutPoint(relationship.cardinalityPlacement[endpoint], label + ".cardinalityPlacement." + endpoint, diagram, canvas);
    }
    if (relationship.bridges !== undefined) {
      if (!Array.isArray(relationship.bridges)) throw new Error(label + ".bridges precisa ser lista em " + diagram.sourcePath);
      relationship.bridges.forEach((bridge, bridgeIndex) => {
        layoutPoint(bridge, label + ".bridges[" + bridgeIndex + "]", diagram, canvas);
        if (!plainObject(bridge) || !["horizontal", "vertical"].includes(bridge.orientation)) throw new Error(label + ".bridges[" + bridgeIndex + "].orientation precisa ser horizontal ou vertical em " + diagram.sourcePath);
      });
    }
  }
}

function validateStateLayout(diagram) {
  if (diagram.layout === undefined) return;
  if (!plainObject(diagram.layout) || diagram.kind !== "state" || !diagram._mermaid) throw new Error("layout é suportado apenas em diagramas Mermaid state, er e db-schema: " + diagram.sourcePath);
  const canvas = diagram.layout.canvas || { width: Number(diagram.presentation?.width) || 1200, height: Number(diagram.presentation?.height) || 760 };
  if (!plainObject(canvas) || !Number.isFinite(canvas.width) || !Number.isFinite(canvas.height) || canvas.width < 640 || canvas.width > 3200 || canvas.height < 280 || canvas.height > 2000) throw new Error("layout.canvas precisa ter width 640–3200 e height 280–2000 em " + diagram.sourcePath);
  const states = new Set(), transitions = [];
  for (const line of diagram._mermaid.split(/\r?\n/)) {
    const match = line.match(/^\s*([^:\s]+)\s*-->\s*([^:\s]+)(?:\s*:\s*(.+))?/);
    if (!match) continue;
    for (const id of [match[1], match[2]]) if (id !== "[*]") states.add(id);
    transitions.push({ from: match[1], to: match[2], label: (match[3] || "").trim() });
  }
  if (diagram.layout.states !== undefined) {
    if (!plainObject(diagram.layout.states)) throw new Error("layout.states precisa ser objeto em " + diagram.sourcePath);
    for (const [id, state] of Object.entries(diagram.layout.states)) {
      if (!states.has(id)) throw new Error("layout.states." + id + " não corresponde a um estado Mermaid em " + diagram.sourcePath);
      layoutPoint(state, "layout.states." + id, diagram, canvas);
      if (state.width !== undefined && (!Number.isFinite(state.width) || state.width < 120 || state.width > 480)) throw new Error("layout.states." + id + ".width precisa ficar entre 120–480 em " + diagram.sourcePath);
      if (state.height !== undefined && (!Number.isFinite(state.height) || state.height < 48 || state.height > 160)) throw new Error("layout.states." + id + ".height precisa ficar entre 48–160 em " + diagram.sourcePath);
    }
  }
  if (diagram.layout.transitions === undefined) return;
  if (!Array.isArray(diagram.layout.transitions)) throw new Error("layout.transitions precisa ser lista em " + diagram.sourcePath);
  for (const [index, transition] of diagram.layout.transitions.entries()) {
    const label = "layout.transitions[" + index + "]";
    if (!plainObject(transition) || typeof transition.from !== "string" || typeof transition.to !== "string") throw new Error(label + " precisa declarar from e to em " + diagram.sourcePath);
    if (!transitions.some((item) => item.from === transition.from && item.to === transition.to && (transition.label === undefined || item.label === transition.label))) throw new Error(label + " não corresponde a uma transição Mermaid em " + diagram.sourcePath);
    for (const side of ["fromSide", "toSide"]) if (transition[side] !== undefined && !["left", "right", "top", "bottom"].includes(transition[side])) throw new Error(label + "." + side + " é inválido em " + diagram.sourcePath);
    if (transition.waypoints !== undefined) {
      if (!Array.isArray(transition.waypoints) || transition.waypoints.length > 20) throw new Error(label + ".waypoints aceita até 20 pontos em " + diagram.sourcePath);
      transition.waypoints.forEach((point, pointIndex) => layoutPoint(point, label + ".waypoints[" + pointIndex + "]", diagram, canvas));
    }
    if (transition.labelPlacement !== undefined) layoutPoint(transition.labelPlacement, label + ".labelPlacement", diagram, canvas);
  }
}

export async function validate(documents, diagrams, config, siteRoot) {
  const documentIds = new Set();
  const diagramIds = new Set();
  if (!documents.length) throw new Error("Nenhum documento Markdown encontrado.");

  for (const document of documents) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(document.id)) throw new Error("ID de documento inválido em " + document.sourcePath + ": use letras minúsculas, números e hífens.");
    if (documentIds.has(document.id)) throw new Error("ID de documento duplicado: " + document.id);
    documentIds.add(document.id);
    for (const reference of document.sourceRefs) {
      if (/^https?:\/\//i.test(reference)) continue;
      await ensureExists(path.resolve(siteRoot, reference), "Referência de origem ausente em " + document.id + ": " + reference);
    }
    for (const match of document.body.matchAll(/(?:\]\(|src=["'])asset:([^\s)"']+)/gi)) {
      const assetPath = safeAssetPath(match[1]);
      await ensureExists(path.join(siteRoot, "assets", assetPath), "Asset ausente em " + document.id + ": " + assetPath);
    }
  }

  if (!documentIds.has("home")) throw new Error('Documento inicial ausente: crie um documento com id "home".');
  if (!config.navigation || !Array.isArray(config.navigation.primary) || !Array.isArray(config.navigation.sections)) throw new Error("navigation precisa definir primary e sections em site.config.json.");
  if (config.repository != null) {
    if (typeof config.repository !== "object" || typeof config.repository.url !== "string") throw new Error("repository precisa definir uma URL quando declarada.");
    try {
      const url = new URL(config.repository.url);
      if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("protocol");
    } catch {
      throw new Error("repository.url precisa ser uma URL HTTP(S) válida.");
    }
  }
  const validateNavigationItems = (items, location) => {
    if (!Array.isArray(items)) throw new Error(location + " precisa definir items como lista.");
    for (const item of items) {
      if (typeof item === "string") continue;
      if (!item || typeof item !== "object" || !item.label || !Array.isArray(item.items)) {
        throw new Error(location + " aceita IDs de documentos ou pastas com label e items.");
      }
      validateNavigationItems(item.items, "Pasta de navegação " + item.label);
    }
  };
  if (!config.navigation.primary.every((id) => typeof id === "string")) throw new Error("navigation.primary aceita apenas IDs de documentos.");
  for (const section of config.navigation.sections) {
    if (!section.label) throw new Error("Cada seção de navigation precisa de label.");
    validateNavigationItems(section.items, "Seção de navegação " + section.label);
  }
  const navigationIds = [...config.navigation.primary, ...config.navigation.sections.flatMap((section) => navigationItemIds(section.items))];
  for (const navigationId of navigationIds) if (!documentIds.has(navigationId)) throw new Error("Item de navegação inexistente: " + navigationId);

  for (const document of documents) {
    for (const related of document.related) if (!documentIds.has(related)) throw new Error("Relação inexistente em " + document.id + ": " + related);
    for (const match of document.body.matchAll(/\]\(doc:([a-z0-9-]+)(?:#[^)]+)?\)/gi)) if (!documentIds.has(match[1])) throw new Error("Link Aurelius inexistente em " + document.id + ": " + match[1]);
    for (const match of document.body.matchAll(/\]\(doc:([a-z0-9-]+)#([^)\s]+)(?:\s+[^)]*)?\)/gi)) {
      const target = documents.find((item) => item.id === match[1]);
      const anchor = slugify(match[2]);
      if (target && !target.sections.some((section) => section.id === anchor)) throw new Error("Âncora inexistente em " + document.id + ": " + match[1] + "#" + match[2]);
    }
  }

  for (const diagram of diagrams) {
    if (!diagram.id) throw new Error("Diagrama sem ID em " + diagram.sourcePath);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(diagram.id)) throw new Error("ID de diagrama inválido em " + diagram.sourcePath + ": use letras minúsculas, números e hífens.");
    if (!diagram.kind) throw new Error("Tipo ausente em " + diagram.sourcePath);
    if (!diagram.title || !diagram.description) throw new Error("Título ou descrição ausente no diagrama " + diagram.sourcePath);
    for (const field of ["nodes", "edges", "groups", "zones", "sourceRefs"]) {
      if (!Array.isArray(diagram[field])) throw new Error(field + " precisa ser uma lista em " + diagram.sourcePath);
    }
    if (diagram.summary !== undefined && typeof diagram.summary !== "string") throw new Error("summary precisa ser texto em " + diagram.sourcePath);
    if (diagram.interactive !== undefined && typeof diagram.interactive !== "boolean") throw new Error("interactive precisa ser booleano em " + diagram.sourcePath);
    if (diagram.presentation !== undefined) {
      if (!diagram.presentation || typeof diagram.presentation !== "object" || Array.isArray(diagram.presentation)) throw new Error("presentation precisa ser objeto em " + diagram.sourcePath);
      if (!Number.isFinite(diagram.presentation.width) || diagram.presentation.width < 640 || diagram.presentation.width > 2200 || !Number.isFinite(diagram.presentation.height) || diagram.presentation.height < 280 || diagram.presentation.height > 1600) throw new Error("presentation.width precisa ficar entre 640–2200 e presentation.height entre 280–1600 em " + diagram.sourcePath);
      if (diagram.presentation.initialZoom !== undefined && (!Number.isFinite(diagram.presentation.initialZoom) || diagram.presentation.initialZoom < 0.5 || diagram.presentation.initialZoom > 4)) throw new Error("presentation.initialZoom precisa ficar entre 0.5–4 em " + diagram.sourcePath);
      if (diagram.presentation.initialPosition !== undefined && !["center", "start"].includes(diagram.presentation.initialPosition)) throw new Error("presentation.initialPosition precisa ser center ou start em " + diagram.sourcePath);
    }
    if (!supportedDiagramKinds.has(diagram.kind)) throw new Error("Tipo de diagrama não suportado em " + diagram.sourcePath + ": " + diagram.kind);
    if (diagramIds.has(diagram.id)) throw new Error("ID de diagrama duplicado: " + diagram.id);
    diagramIds.add(diagram.id);
    const authored = Boolean(diagram._html || diagram._svg);
    const declarative = Boolean(diagram._mermaid);
    if (!nativeDiagramKinds.has(diagram.kind) && !authored && !declarative) throw new Error("O tipo " + diagram.kind + " requer source declarativo, htmlSource ou svgSource em " + diagram.sourcePath);
    if (diagram.kind === "canvas" && (authored || declarative)) throw new Error("O tipo canvas aceita apenas fonte JSON semântica em " + diagram.sourcePath);
    if (diagram.kind === "custom" && !diagram._html) throw new Error("O tipo custom requer htmlSource em " + diagram.sourcePath);
    if (diagram._html && !diagram.presentation) throw new Error("Artefato HTML precisa de presentation.width (640–2200) e presentation.height (280–1600) em " + diagram.sourcePath);
    if (declarative && (!diagram.summary || diagram.summary.trim().length < 24)) throw new Error("Fonte declarativa precisa de summary com pelo menos 24 caracteres em " + diagram.sourcePath);
    if (declarative && diagram.interactive) throw new Error("Fonte Mermaid não aceita interactive: true; interações executáveis são bloqueadas em " + diagram.sourcePath);
    if (diagram.data !== undefined && diagram.data !== null && typeof diagram.data !== "object") throw new Error("data precisa ser objeto, lista ou null em " + diagram.sourcePath);
    if (diagram.kind === "state") validateStateLayout(diagram);
    else validateERLayout(diagram);
    for (const reference of diagram.sourceRefs || []) {
      if (/^https?:\/\//i.test(reference)) continue;
      await ensureExists(path.resolve(siteRoot, reference), "Referência de origem ausente no diagrama " + diagram.id + ": " + reference);
    }

    if (diagram._html || diagram._svg || diagram._mermaid) continue;
    const nodes = diagram.nodes || [];
    const nodeIds = new Set();
    const edgeIds = new Set();
    if (diagram.kind === "architecture" && nodes.length > 9) throw new Error("Arquitetura " + diagram.id + " excede 9 nós: divida visão geral e detalhe.");
    if (diagram.kind === "architecture" && diagram.edges.length > 12) throw new Error("Arquitetura " + diagram.id + " excede 12 conexões: divida o diagrama.");
    if (diagram.kind === "architecture" && diagram.zones.length > 3) throw new Error("Arquitetura " + diagram.id + " excede 3 zonas: considere um swimlane.");
    for (const node of nodes) {
      if (!node.id || nodeIds.has(node.id)) throw new Error("Nó ausente ou duplicado em " + diagram.id);
      nodeIds.add(node.id);
      if (!node.label && !node.title && !node.text) throw new Error("Nó sem rótulo em " + diagram.id + ": " + node.id);
      if (diagram.kind === "architecture" && !node.tag) throw new Error("Nó sem tag em " + diagram.id + ": " + node.id);
    }
    for (const edge of diagram.edges || []) {
      if (diagram.kind === "architecture" && (!edge.id || edgeIds.has(edge.id))) throw new Error("Aresta sem ID ou duplicada em " + diagram.id);
      if (diagram.kind === "architecture") edgeIds.add(edge.id);
      if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) throw new Error("Aresta sem origem ou destino em " + diagram.id + ": " + edge.id);
      if (edge.from === edge.to) throw new Error("Aresta não pode ligar um nó a ele mesmo: " + edge.id);
      if (edge.label && String(edge.label).length > 24) throw new Error("Rótulo de aresta longo demais em " + edge.id + " (máximo 24 caracteres).");
    }
    for (const node of nodes) for (const property of ["x", "y", "width", "height"]) {
      if (!Number.isFinite(node[property])) throw new Error("Geometria inválida no nó " + node.id + ": " + property);
      if (diagram.kind === "architecture" && node[property] % 4 !== 0) throw new Error("Geometria fora da grade de 4px no nó " + node.id + ": " + property);
    }
    for (let index = 0; diagram.kind === "architecture" && index < nodes.length; index += 1) for (let otherIndex = index + 1; otherIndex < nodes.length; otherIndex += 1) {
      const left = nodes[index]; const right = nodes[otherIndex];
      const overlaps = left.x < right.x + right.width && left.x + left.width > right.x && left.y < right.y + right.height && left.y + left.height > right.y;
      if (overlaps) throw new Error("Nós sobrepostos em " + diagram.id + ": " + left.id + " e " + right.id);
    }
    for (const zone of diagram.kind === "architecture" ? diagram.zones || [] : []) {
      for (const property of ["x", "y", "width", "height"]) if (!Number.isFinite(zone[property]) || zone[property] % 4 !== 0) throw new Error("Zona fora da grade de 4px em " + diagram.id + ": " + property);
      if (!zone.label) throw new Error("Zona sem rótulo em " + diagram.id);
    }
  }

  for (const document of documents) {
    if (document.diagram && !diagramIds.has(document.diagram)) throw new Error("Diagrama inexistente em " + document.id + ": " + document.diagram);
    for (const token of markdownWithoutFencedCode(document.body).matchAll(/^\s*\{\{(diagram|canvas):([^}]+)\}\}\s*$/gm)) {
      const diagram = diagrams.find((item) => item.id === token[2]);
      if (!diagram) throw new Error("Token aponta para diagrama ausente em " + document.id + ": " + token[2]);
      const compatible = token[1] === "canvas" ? diagram.kind === "canvas" : diagram.kind !== "canvas";
      if (!compatible) throw new Error("Token {{" + token[1] + ":...}} incompatível com " + diagram.id + " (" + diagram.kind + ").");
    }
  }
  for (const diagram of diagrams) if (!documents.some((document) => documentUsesDiagram(document, diagram.id))) throw new Error("Diagrama sem página de origem: " + diagram.id);
}
