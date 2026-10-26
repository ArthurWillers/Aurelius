export const starterColors = {
  paper: "#faf8f8", paper2: "#f1eeee", ink: "#2b2b2b", muted: "#4e4e4e",
  soft: "#777777", rule: "rgba(43, 43, 43, 0.14)", accent: "#84a59d",
  accentTint: "rgba(132, 165, 157, 0.16)", link: "#284b63",
};

function isEnglish(language) {
  return String(language || "").toLowerCase().startsWith("en");
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertString(value, field, { allowEmpty = false } = {}) {
  if (typeof value !== "string" || (!allowEmpty && !value.trim())) {
    throw new Error("Configuração inválida: `" + field + "` precisa ser uma string" + (allowEmpty ? "." : " não vazia."));
  }
}

function validateNavigationItems(items, field) {
  if (!Array.isArray(items)) throw new Error("Configuração inválida: `" + field + "` precisa ser uma lista.");
  for (const [index, item] of items.entries()) {
    if (typeof item === "string" && item.trim()) continue;
    if (isRecord(item) && Array.isArray(item.items)) {
      if (item.label !== undefined) assertString(item.label, field + "[" + index + "].label");
      validateNavigationItems(item.items, field + "[" + index + "].items");
      continue;
    }
    throw new Error("Configuração inválida: `" + field + "[" + index + "]` precisa ser um ID ou grupo de navegação.");
  }
}

export function validateRawConfig(config) {
  if (!isRecord(config)) throw new Error("Configuração inválida: `site.config.json` precisa conter um objeto JSON.");

  for (const field of ["language", "siteTitle", "siteDescription", "outputDirectory"]) {
    if (config[field] !== undefined) assertString(config[field], field);
  }
  for (const field of ["brand", "framework", "colors", "footer"]) {
    if (config[field] !== undefined && !isRecord(config[field])) {
      throw new Error("Configuração inválida: `" + field + "` precisa ser um objeto.");
    }
  }
  if (config.brand) {
    for (const field of ["title", "kicker", "name", "logoSource", "logoAlt"]) {
      if (config.brand[field] !== undefined) assertString(config.brand[field], "brand." + field);
    }
  }
  if (config.framework) {
    for (const field of ["name", "version", "runtime"]) {
      if (config.framework[field] !== undefined) assertString(config.framework[field], "framework." + field);
    }
  }
  if (config.colors) {
    for (const [field, value] of Object.entries(config.colors)) assertString(value, "colors." + field);
  }
  if (config.footer) {
    for (const field of ["left", "right"]) {
      if (config.footer[field] !== undefined) assertString(config.footer[field], "footer." + field, { allowEmpty: true });
    }
  }

  if (config.navigation !== undefined) {
    if (Array.isArray(config.navigation)) {
      validateNavigationItems(config.navigation, "navigation");
    } else if (isRecord(config.navigation)) {
      if (config.navigation.labelPrefix !== undefined) assertString(config.navigation.labelPrefix, "navigation.labelPrefix", { allowEmpty: true });
      if (config.navigation.primary !== undefined) validateNavigationItems(config.navigation.primary, "navigation.primary");
      if (config.navigation.sections !== undefined) {
        if (!Array.isArray(config.navigation.sections)) throw new Error("Configuração inválida: `navigation.sections` precisa ser uma lista.");
        for (const [index, section] of config.navigation.sections.entries()) {
          if (!isRecord(section)) throw new Error("Configuração inválida: `navigation.sections[" + index + "]` precisa ser um objeto.");
          assertString(section.label, "navigation.sections[" + index + "].label");
          validateNavigationItems(section.items, "navigation.sections[" + index + "].items");
        }
      }
    } else {
      throw new Error("Configuração inválida: `navigation` precisa ser uma lista ou objeto.");
    }
  }

  if (config.repository !== undefined && config.repository !== null) {
    if (!isRecord(config.repository)) throw new Error("Configuração inválida: `repository` precisa ser `null` ou um objeto.");
    assertString(config.repository.url, "repository.url");
  }
  if (config.versioning !== undefined) {
    validateVersioningConfig(config.versioning);
  }
  return config;
}

export function validateVersioningConfig(versioning) {
  if (!isRecord(versioning)) throw new Error("Configuração inválida: `versioning` precisa ser um objeto.");
  assertString(versioning.current, "versioning.current");
  if (!Array.isArray(versioning.versions) || versioning.versions.length < 2) {
    throw new Error("Configuração inválida: `versioning.versions` precisa listar pelo menos duas versões completas.");
  }

  const ids = new Set();
  const labels = new Set();
  const sourcePaths = new Set();
  const outputPaths = new Set();
  let currentVersion;
  for (const [index, version] of versioning.versions.entries()) {
    const field = "versioning.versions[" + index + "]";
    if (!isRecord(version)) throw new Error("Configuração inválida: `" + field + "` precisa ser um objeto.");
    assertString(version.id, field + ".id");
    assertString(version.label, field + ".label");
    assertString(version.site, field + ".site");
    assertString(version.path, field + ".path", { allowEmpty: true });
    if (!/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(version.id)) {
      throw new Error("Configuração inválida: `" + field + ".id` aceita letras minúsculas, números, pontos e hífens.");
    }
    if (ids.has(version.id)) throw new Error("Configuração inválida: versão duplicada `" + version.id + "`.");
    ids.add(version.id);
    if (labels.has(version.label)) throw new Error("Configuração inválida: rótulo de versão duplicado `" + version.label + "`.");
    labels.add(version.label);
    const sourcePath = validateVersionPath(version.site, field + ".site", { allowEmpty: false });
    if (sourcePaths.has(sourcePath)) throw new Error("Configuração inválida: site de versão duplicado `" + sourcePath + "`.");
    sourcePaths.add(sourcePath);
    const outputPath = validateVersionPath(version.path, field + ".path", { allowEmpty: true });
    if (outputPaths.has(outputPath)) throw new Error("Configuração inválida: caminho de publicação duplicado `" + (outputPath || ".") + "`.");
    outputPaths.add(outputPath);
    if (version.id === versioning.current) currentVersion = { ...version, path: outputPath };
  }

  if (!currentVersion) throw new Error("Configuração inválida: `versioning.current` não corresponde a uma versão listada.");
  if (currentVersion.path !== "") throw new Error("A versão atual precisa ser publicada na raiz, com `path` vazio.");
  const orderedSourcePaths = [...sourcePaths].sort();
  for (let index = 0; index < orderedSourcePaths.length - 1; index += 1) {
    if (orderedSourcePaths[index + 1].startsWith(orderedSourcePaths[index] + "/")) {
      throw new Error("Sites-fonte de versões não podem se sobrepor.");
    }
  }
  for (const version of versioning.versions) {
    const outputPath = validateVersionPath(version.path, "versioning.versions.path", { allowEmpty: true });
    if (version.id !== versioning.current && !outputPath.startsWith("versions/")) {
      throw new Error("Versões secundárias precisam usar um caminho dentro de `versions/`.");
    }
  }
  const orderedOutputPaths = [...outputPaths].filter(Boolean).sort();
  for (let index = 0; index < orderedOutputPaths.length - 1; index += 1) {
    if (orderedOutputPaths[index + 1].startsWith(orderedOutputPaths[index] + "/")) {
      throw new Error("Caminhos de publicação de versões não podem se sobrepor.");
    }
  }
  return versioning;
}

function validateVersionPath(value, field, { allowEmpty }) {
  if (typeof value !== "string" || (!allowEmpty && !value.trim())) {
    throw new Error("Configuração inválida: `" + field + "` precisa ser um caminho relativo.");
  }
  if (value === "" && allowEmpty) return "";
  if (value.startsWith("/") || value.includes("\\") || value.includes("?") || value.includes("#")) {
    throw new Error("Configuração inválida: `" + field + "` precisa ser um caminho URL relativo e sem consulta.");
  }
  const segments = value.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error("Configuração inválida: `" + field + "` não aceita segmentos vazios, `.` ou `..`.");
  }
  return segments.join("/");
}

export function normalizeNavigation(navigation, language = "en") {
  if (Array.isArray(navigation)) return { primary: navigation.slice(0, 5), sections: [{ label: isEnglish(language) ? "Documentation" : "Documentação", items: navigation }] };
  const value = navigation && typeof navigation === "object" ? navigation : {};
  return {
    labelPrefix: typeof value.labelPrefix === "string" ? value.labelPrefix : "",
    primary: Array.isArray(value.primary) ? value.primary : ["home"],
    sections: Array.isArray(value.sections) ? value.sections : [],
  };
}

export function navigationItemIds(items = []) {
  return items.flatMap((item) => {
    if (typeof item === "string") return [item];
    if (item && typeof item === "object" && Array.isArray(item.items)) return navigationItemIds(item.items);
    return [];
  });
}

export function normalizedConfig(config) {
  validateRawConfig(config);
  const normalized = {
    language: "en", siteTitle: "Documentation",
    siteDescription: "Static documentation for people and agents.",
    outputDirectory: "dist", framework: { name: "Aurelius", version: "0.6.0" },
    navigation: { primary: ["home"], sections: [] }, repository: null, ...config,
    brand: {
      title: "Documentation", kicker: "knowledge base", name: config.siteTitle || "Documentation",
      logoAlt: "Documentation logo", ...(config.brand || {}),
    },
    framework: { name: "Aurelius", version: "0.6.0", ...(config.framework || {}) },
    colors: { ...starterColors, ...(config.colors || {}) },
  };
  normalized.navigation = normalizeNavigation(config.navigation || normalized.navigation, normalized.language);
  normalized.repository = config.repository && typeof config.repository === "object" && typeof config.repository.url === "string"
    ? { url: config.repository.url }
    : null;
  return normalized;
}

export function messages(config) {
  const english = isEnglish(config.language);
  return english
    ? {
        home: "Home", primaryNavigation: "Primary navigation", search: "Search", searchPlaceholder: "Search…",
        documentActions: "Document actions", copyMarkdown: "Copy Markdown", savePdf: "Save as PDF", copyLink: "Copy link",
        copySvg: "Copy SVG", copyHtml: "Copy HTML", copyMermaid: "Copy Mermaid", htmlCopied: "HTML copied.", mermaidCopied: "Mermaid copied.", viewFullDiagram: "View full diagram", openFull: "Open full view ↗", backTo: "Back to",
        interactiveCanvas: "Interactive Canvas", canvasControls: "Canvas controls", zoomOut: "Zoom out", zoomIn: "Zoom in",
        reset: "Reset", fullscreen: "Fullscreen", zoomLevel: "Zoom level", closeFullscreen: "Exit fullscreen",
        canvasSource: "Canvas · drag to move · Ctrl/⌘ + scroll to zoom", mermaidCanvas: "Diagram Design · Mermaid · drag to move · Ctrl/⌘ + scroll to zoom", mermaidControls: "Mermaid diagram controls", mermaidViewport: "Navigable Mermaid diagram", legend: "Legend", detail: "Detail", selectPhase: "Select a step",
        selectPhaseHelp: "Select a Canvas card to read its complete details.", focus: "Select", openDetail: "OPEN DETAIL",
        semanticSource: "Semantic source", visualSource: "Visual source", declarativeSource: "Declarative source", semanticReading: "Semantic reading", structuredData: "Structured data", noteContract: "Page contract", metadata: "Metadata", visibility: "Visibility",
        updated: "Updated", authors: "Authors", relations: "Related", sources: "Sources", onThisPage: "On this page",
        pageFormats: "Page formats", otherFormats: "Other formats", apiJson: "API JSON", previous: "← Previous", next: "Next →",
        pager: "Previous and next documents", documentationNavigation: "Documentation navigation", repository: "Repository",
        siteProjection: "The site is a projection. Markdown and JSON remain the contracts that people, automations, and agents can review.",
        staticDocumentation: "Static documentation", sourceForReaders: "Source for people and agents", markdownCopied: "Markdown copied.",
        markdownError: "Could not read the Markdown.", codeCopied: "Code copied.", svgCopied: "SVG copied.", linkCopied: "Link copied.",
        genericDocument: "document", diagram: "Diagram", canvas: "Canvas",
        metadataId: "ID", status: "Status", tags: "Tags", markdown: "Markdown",
        apiReading: "READING API", documentById: "One document per ID", predictableDiscovery: "Predictable discovery",
        htmlEditorialLayer: "HTML is the editorial layer. The same information is also available as JSON, with sections, relationships, status, and sources.",
        agentDiscovery: "Agents can start at the index, search, and traverse relationships without extracting meaning from the screen.",
        indexAndGraph: "INDEX AND GRAPH", inlineMermaidSource: "inline Mermaid in diagrams/",
        mermaidLoading: "Rendering declarative diagram…", mermaidError: "Could not render this diagram.",
        mermaidSourceError: "Could not read the Mermaid source.", svgSourceError: "Could not read the SVG.", htmlSourceError: "Could not read the HTML.",
        canvasMap: "CANVAS · NAVIGABLE MAP",
      }
    : {
        home: "Início", primaryNavigation: "Navegação principal", search: "Buscar", searchPlaceholder: "Buscar…",
        documentActions: "Ações do documento", copyMarkdown: "Copiar Markdown", savePdf: "Salvar em PDF", copyLink: "Copiar link",
        copySvg: "Copiar SVG", copyHtml: "Copiar HTML", copyMermaid: "Copiar Mermaid", htmlCopied: "HTML copiado.", mermaidCopied: "Mermaid copiado.", viewFullDiagram: "Ver diagrama inteiro", openFull: "Abrir inteiro ↗", backTo: "Voltar a",
        interactiveCanvas: "Canvas interativo", canvasControls: "Controles do Canvas", zoomOut: "Diminuir zoom", zoomIn: "Aumentar zoom",
        reset: "Repor", fullscreen: "Tela cheia", zoomLevel: "Nível de zoom", closeFullscreen: "Fechar tela cheia",
        canvasSource: "Canvas · arraste para mover · Ctrl/⌘ + scroll para zoom", mermaidCanvas: "Diagram Design · Mermaid · arraste para mover · Ctrl/⌘ + scroll para zoom", mermaidControls: "Controles do diagrama Mermaid", mermaidViewport: "Diagrama Mermaid navegável", legend: "Legenda", detail: "Detalhe", selectPhase: "Selecione uma etapa",
        selectPhaseHelp: "Selecione um cartão do Canvas para ler os detalhes completos.", focus: "Selecionar", openDetail: "ABRIR DETALHE",
        semanticSource: "Fonte semântica", visualSource: "Fonte visual", declarativeSource: "Fonte declarativa", semanticReading: "Leitura semântica", structuredData: "Dados estruturados", noteContract: "Contrato da nota", metadata: "Metadados", visibility: "Visibilidade",
        updated: "Atualizado", authors: "Autores", relations: "Relações", sources: "Fontes", onThisPage: "Nesta página",
        pageFormats: "Formatos desta página", otherFormats: "Outros formatos", apiJson: "JSON da API", previous: "← Anterior", next: "Próximo →",
        pager: "Documentos anterior e próximo", documentationNavigation: "Navegação da documentação", repository: "Repositório",
        siteProjection: "O site é uma projeção. Markdown e JSON continuam sendo os contratos que pessoas, automações e agentes podem revisar.",
        staticDocumentation: "Documentação estática", sourceForReaders: "Fonte para pessoas e agentes", markdownCopied: "Markdown copiado.",
        markdownError: "Não foi possível ler o Markdown.", codeCopied: "Código copiado.", svgCopied: "SVG copiado.", linkCopied: "Link copiado.",
        genericDocument: "documento", diagram: "Diagrama", canvas: "Canvas",
        metadataId: "ID", status: "Status", tags: "Tags", markdown: "Markdown",
        apiReading: "API DE LEITURA", documentById: "Um documento por ID", predictableDiscovery: "Descoberta previsível",
        htmlEditorialLayer: "O HTML é a camada editorial. A mesma informação também sai em JSON, com seções, relações, status e fontes.",
        agentDiscovery: "Agentes podem começar no índice, pesquisar e atravessar relações sem extrair significado da tela.",
        indexAndGraph: "ÍNDICE E GRAFO", inlineMermaidSource: "Mermaid inline em diagrams/",
        mermaidLoading: "Renderizando diagrama declarativo…", mermaidError: "Não foi possível renderizar este diagrama.",
        mermaidSourceError: "Não foi possível ler a fonte Mermaid.", svgSourceError: "Não foi possível ler o SVG.", htmlSourceError: "Não foi possível ler o HTML.",
        canvasMap: "CANVAS · MAPA NAVEGÁVEL",
      };
}
