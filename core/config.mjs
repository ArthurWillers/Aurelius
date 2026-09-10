export const starterColors = {
  paper: "#faf8f8", paper2: "#f1eeee", ink: "#2b2b2b", muted: "#4e4e4e",
  soft: "#777777", rule: "rgba(43, 43, 43, 0.14)", accent: "#84a59d",
  accentTint: "rgba(132, 165, 157, 0.16)", link: "#284b63",
};

function isEnglish(language) {
  return String(language || "").toLowerCase().startsWith("en");
}

export function normalizeNavigation(navigation, language = "en") {
  if (Array.isArray(navigation)) return { primary: navigation.slice(0, 5), sections: [{ label: isEnglish(language) ? "Documentation" : "Documentação", items: navigation }] };
  const value = navigation && typeof navigation === "object" ? navigation : {};
  return {
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
  const normalized = {
    language: "en", siteTitle: "Documentation",
    siteDescription: "Static documentation for people and agents.",
    outputDirectory: "dist", framework: { name: "Aurelius", version: "0.4.0" },
    navigation: { primary: ["home"], sections: [] }, ...config,
    brand: {
      title: "Documentation", kicker: "knowledge base", name: config.siteTitle || "Documentation",
      logoAlt: "Documentation logo", ...(config.brand || {}),
    },
    framework: { name: "Aurelius", version: "0.4.0", ...(config.framework || {}) },
    colors: { ...starterColors, ...(config.colors || {}) },
  };
  normalized.navigation = normalizeNavigation(config.navigation || normalized.navigation, normalized.language);
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
        selectPhaseHelp: "Use a Canvas card to select a step and read its summary.", focus: "Select", openDetail: "OPEN DETAIL",
        semanticSource: "Semantic source", visualSource: "Visual source", declarativeSource: "Declarative source", semanticReading: "Semantic reading", structuredData: "Structured data", noteContract: "Page contract", metadata: "Metadata", visibility: "Visibility",
        updated: "Updated", authors: "Authors", relations: "Related", sources: "Sources", onThisPage: "On this page",
        pageFormats: "Page formats", otherFormats: "Other formats", apiJson: "API JSON", previous: "← Previous", next: "Next →",
        pager: "Previous and next documents", documentationNavigation: "Documentation navigation",
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
        selectPhaseHelp: "Use um cartão do Canvas para selecionar uma etapa e ler seu resumo.", focus: "Selecionar", openDetail: "ABRIR DETALHE",
        semanticSource: "Fonte semântica", visualSource: "Fonte visual", declarativeSource: "Fonte declarativa", semanticReading: "Leitura semântica", structuredData: "Dados estruturados", noteContract: "Contrato da nota", metadata: "Metadados", visibility: "Visibilidade",
        updated: "Atualizado", authors: "Autores", relations: "Relações", sources: "Fontes", onThisPage: "Nesta página",
        pageFormats: "Formatos desta página", otherFormats: "Outros formatos", apiJson: "JSON da API", previous: "← Anterior", next: "Próximo →",
        pager: "Documentos anterior e próximo", documentationNavigation: "Navegação da documentação",
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
