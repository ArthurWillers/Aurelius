import { access } from "node:fs/promises";
import path from "node:path";
import { documentUsesDiagram, markdownWithoutFencedCode, safeAssetPath } from "./content.mjs";
import { nativeDiagramKinds, supportedDiagramKinds } from "./diagrams/registry.mjs";
import { navigationItemIds } from "./config.mjs";
import { slugify } from "./shared.mjs";

async function ensureExists(file, message) {
  try { await access(file); } catch { throw new Error(message || "Arquivo ausente: " + file); }
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
