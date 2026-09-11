import {
  access,
  cp,
  mkdir,
  readdir,
  readFile,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { messages, navigationItemIds, normalizedConfig, starterColors } from "./config.mjs";
import {
  createHeadingSlugger,
  documentUsesDiagram,
  extractSections,
  parseMarkdown,
  plainHeading,
  safeAssetPath,
} from "./content.mjs";
import {
  diagramKindLabel,
  validateAccessibleSvg,
} from "./diagrams/registry.mjs";
import {
  htmlArtifactFrame,
  htmlArtifactSummary,
  inlineSvgFromHtmlArtifact,
  svgArtifactImage,
  validateHtmlArtifact,
} from "./diagrams/artifacts.mjs";
import { validateMermaidSource } from "./diagrams/mermaid.mjs";
import {
  renderRendererGallery,
  rendererGalleryMarkdown,
} from "./diagrams/gallery.mjs";
import { diagramSchema, documentSchema } from "./schemas.mjs";
import {
  apiDiagramProjection,
  documentOutputPath,
  graphProjection,
  indexDiagramProjection,
  publicDocumentProjection,
  searchProjection,
  visualReferencesForDocument,
} from "./projections.mjs";
import {
  escapeAttribute,
  escapeHtml,
  listValue,
  roundToFour,
  scriptSafeJson,
  slugify,
} from "./shared.mjs";
import { validate } from "./validation.mjs";

const frameworkRoot = path.resolve(
  fileURLToPath(new URL("..", import.meta.url)),
);
const mermaidBrowserBundle = fileURLToPath(
  import.meta.resolve("mermaid/dist/mermaid.min.js"),
);
const optionValue = (name) => {
  const position = process.argv.indexOf(name);
  return position >= 0 ? process.argv[position + 1] : null;
};
const requestedSite = optionValue("--site");
const siteRoot = requestedSite
  ? path.resolve(process.cwd(), requestedSite)
  : null;
const contentDirectory = siteRoot && path.join(siteRoot, "content");
const diagramsDirectory = siteRoot && path.join(siteRoot, "diagrams");
let outputDirectory;

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function ensureExists(file, message) {
  try {
    await access(file);
  } catch {
    throw new Error(message || "Arquivo ausente: " + file);
  }
}

function logoMimeType(file) {
  const extension = path.extname(file).toLocaleLowerCase("en-US");
  return (
    {
      ".avif": "image/avif",
      ".gif": "image/gif",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".svg": "image/svg+xml",
      ".webp": "image/webp",
    }[extension] || "application/octet-stream"
  );
}

async function isEmptyOrMissing(directory) {
  try {
    return (await readdir(directory)).length === 0;
  } catch (error) {
    if (error && error.code === "ENOENT") return true;
    throw error;
  }
}

function starterLogoSvg() {
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" role="img" aria-label="Documentation logo">',
    '<rect width="96" height="96" rx="20" fill="#84a59d"/>',
    '<path d="M48 20 20 74h14l5-11h18l5 11h14L48 20Zm0 25 5 10H43l5-10Z" fill="#faf8f8"/>',
    "</svg>",
  ].join("");
}

function starterConfig(title, logoFileName = "logo.svg") {
  return (
    JSON.stringify(
      {
        siteTitle: title,
        siteDescription: "Static documentation for people and agents.",
        language: "en",
        outputDirectory: "dist",
        framework: { name: "Aurelius", version: "0.4.5" },
        brand: {
          title: "Documentation",
          kicker: "knowledge base",
          name: title,
          logoSource: "assets/" + logoFileName,
          logoAlt: "Documentation logo",
        },
        navigation: {
          primary: ["home", "getting-started"],
          sections: [
            { label: "Overview", items: ["home"] },
            { label: "Guides", items: ["getting-started"] },
          ],
        },
        colors: starterColors,
      },
      null,
      2,
    ) + "\n"
  );
}

async function automaticallyDetectedLogo() {
  const supportedExtensions = [".svg", ".png", ".jpeg", ".jpg"];
  let files;
  try {
    files = await readdir(process.cwd(), { withFileTypes: true });
  } catch {
    return null;
  }
  const byLowerCaseName = new Map(
    files
      .filter((entry) => entry.isFile())
      .map((entry) => [entry.name.toLowerCase(), entry.name]),
  );
  for (const extension of supportedExtensions) {
    const fileName = byLowerCaseName.get("logo" + extension);
    if (fileName) return path.join(process.cwd(), fileName);
  }
  return null;
}

function starterHome(title) {
  return [
    "---",
    "id: home",
    "title: " + title,
    "description: A versioned knowledge base for people and agents.",
    "type: overview",
    "status: draft",
    "visibility: public",
    "tags: documentation, overview",
    "related: getting-started",
    "source_refs:",
    "diagram: starter-overview",
    "---",
    "",
    "## Start here",
    "",
    "This site starts with a home page, a contribution guide, and a diagram. Replace the example content with facts about your product and keep verifiable claims close to their technical sources.",
    "",
    "{{diagram:starter-overview}}",
    "",
    "## For agents",
    "",
    "After a build, agents can start with `llms.txt` and `api/manifest.json`; people can navigate this page and the relationships between documents.",
    "",
  ].join("\n");
}

function starterGettingStarted() {
  return [
    "---",
    "id: getting-started",
    "title: Maintain this documentation",
    "description: A short path from technical sources to readable, discoverable pages.",
    "type: guide",
    "status: draft",
    "visibility: public",
    "tags: onboarding, writing",
    "related: home",
    "source_refs:",
    "---",
    "",
    "## Edit the source",
    "",
    "Create or update Markdown files in `content/`, using a stable `id` and `source_refs` to trace technical facts.",
    "",
    "## Validate before publishing",
    "",
    "Run `aurelius check --site .` to verify relationships, anchors, assets, and diagrams. Then run `aurelius build --site .` to update `dist/`.",
    "",
    "## Use the included skills",
    "",
    "The initialized site includes `.agents/skills/` with the Aurelius authoring and documentation-migration workflows. Keep these files with the site so people and agents can use the same instructions as the installed Aurelius version.",
    "",
    "## Navigate the contracts",
    "",
    "Publication provides HTML for people plus Markdown and JSON for agents. Use [the home page](doc:home) as the starting point.",
    "",
  ].join("\n");
}

function starterOverviewDiagram() {
  return JSON.stringify(
    {
      id: "starter-overview",
      kind: "architecture",
      title: "From source to documentation",
      description: "Markdown and technical sources pass through Aurelius validation and become an editorial experience with reading contracts for agents.",
      zones: [
        { label: "SOURCE", x: 40, y: 48, width: 320, height: 320 },
        { label: "PUBLICATION", x: 400, y: 48, width: 744, height: 320 },
      ],
      nodes: [
        { id: "markdown", kind: "input", tag: "CONTENT", label: "Markdown", detail: "versioned notes", x: 80, y: 112, width: 128, height: 104 },
        { id: "sources", kind: "input", tag: "SOURCES", label: "References", detail: "traceable facts", x: 80, y: 240, width: 128, height: 104 },
        { id: "build", kind: "focal", tag: "BUILD", label: "Aurelius", detail: "validates and projects", x: 448, y: 164, width: 176, height: 104 },
        { id: "site", kind: "backend", tag: "SITE", label: "Human reading", detail: "accessible HTML", x: 680, y: 96, width: 176, height: 104 },
        { id: "api", kind: "store", tag: "API", label: "Agent reading", detail: "JSON and llms.txt", x: 680, y: 232, width: 176, height: 104 },
      ],
      edges: [
        { id: "compile", from: "markdown", to: "build", label: "COMPILA" },
        { id: "ground", from: "sources", to: "build", label: "SUPPORTS", tone: "accent" },
        { id: "render", from: "build", to: "site", label: "RENDERS" },
        { id: "index", from: "build", to: "api", label: "INDEXES", tone: "link" },
      ],
    },
    null,
    2,
  ) + "\n";
}

export async function initializeDocumentation(targetArgument) {
  if (!targetArgument || targetArgument.startsWith("-")) {
    throw new Error("Informe a pasta: aurelius init caminho/para/documentacao");
  }

  const targetDirectory = path.resolve(process.cwd(), targetArgument);
  if (!(await isEmptyOrMissing(targetDirectory))) {
    throw new Error(
      "A pasta de destino precisa estar vazia: " + targetDirectory,
    );
  }

  const title = optionValue("--title") || "Nova documentação";
  const suppliedLogo = optionValue("--logo");
  const detectedLogo = suppliedLogo ? null : await automaticallyDetectedLogo();
  const selectedLogo = suppliedLogo
    ? path.resolve(process.cwd(), suppliedLogo)
    : detectedLogo;
  let logoFileName = "logo.svg";
  if (selectedLogo) {
    const logoPath = selectedLogo;
    const extension = path.extname(logoPath).toLowerCase();
    if (![".svg", ".png", ".jpeg", ".jpg"].includes(extension)) {
      throw new Error("--logo aceita somente arquivos .svg, .png, .jpeg ou .jpg.");
    }
    await ensureExists(logoPath, "Logo ausente: " + logoPath);
    logoFileName = "logo" + extension;
  }
  const skillsSource = path.join(frameworkRoot, ".agents", "skills");
  await ensureExists(skillsSource, "Skills portáteis do Aurelius ausentes no pacote instalado.");
  await Promise.all([
    mkdir(path.join(targetDirectory, "assets"), { recursive: true }),
    mkdir(path.join(targetDirectory, "content"), { recursive: true }),
    mkdir(path.join(targetDirectory, "diagrams"), { recursive: true }),
    mkdir(path.join(targetDirectory, ".agents"), { recursive: true }),
  ]);
  await Promise.all([
    selectedLogo
      ? cp(selectedLogo, path.join(targetDirectory, "assets", logoFileName))
      : writeFile(path.join(targetDirectory, "assets", logoFileName), starterLogoSvg()),
    writeFile(
      path.join(targetDirectory, "content", "home.md"),
      starterHome(title),
    ),
    writeFile(
      path.join(targetDirectory, "content", "getting-started.md"),
      starterGettingStarted(),
    ),
    writeFile(
      path.join(targetDirectory, "diagrams", "starter-overview.json"),
      starterOverviewDiagram(),
    ),
    writeFile(
      path.join(targetDirectory, "site.config.json"),
      starterConfig(title, logoFileName),
    ),
    cp(skillsSource, path.join(targetDirectory, ".agents", "skills"), { recursive: true }),
  ]);

  console.log("Site Aurelius criado em " + targetDirectory);
  console.log("Skills Aurelius copiadas para " + path.join(targetDirectory, ".agents", "skills"));
  if (detectedLogo) console.log("Logo detectado: " + detectedLogo);
}

async function readDocuments() {
  const files = await collectFiles(contentDirectory, ".md");
  const documents = [];

  for (const file of files) {
    const raw = await readFile(file, "utf8");
    const parsed = parseMarkdown(raw, file);
    const frontmatter = parsed.frontmatter;

    for (const key of [
      "id",
      "title",
      "description",
      "type",
      "status",
      "visibility",
    ]) {
      if (!frontmatter[key])
        throw new Error("Campo " + key + " ausente em " + file);
    }

    documents.push({
      id: frontmatter.id,
      title: frontmatter.title,
      description: frontmatter.description,
      type: frontmatter.type,
      status: frontmatter.status,
      visibility: frontmatter.visibility,
      tags: frontmatter.tags,
      related: frontmatter.related,
      sourceRefs: frontmatter.source_refs,
      authors: listValue(frontmatter.authors),
      updated: frontmatter.updated || null,
      diagram: frontmatter.diagram || null,
      body: parsed.body,
      raw,
      sections: extractSections(parsed.body),
      sourcePath: path.relative(siteRoot, file),
    });
  }

  return documents;
}

function canvasTextContent(value, fallback) {
  const lines = String(value || "").split(/\r?\n/).map((line) => line.trim());
  const heading = lines.find((line) => /^#{1,6}\s+/.test(line));
  const title = heading ? heading.replace(/^#{1,6}\s+/, "") : lines.find(Boolean) || fallback;
  const summary = lines
    .filter((line) => line && line !== heading)
    .join(" ")
    .replace(/[*_`>#]/g, "")
    .trim();
  return { title, summary: summary || "No additional description." };
}

function normalizeCanvasDiagram(diagram) {
  const groups = (diagram.groups || []).map((group) => ({
    ...group,
    label: group.label || group.title || "GROUP",
  }));
  const nodes = (diagram.nodes || []).map((node) => {
    const content = canvasTextContent(node.text, node.id);
    return {
      ...node,
      kind: node.kind || (node.shape === "diamond" ? "decision" : "step"),
      title: node.title || node.label || content.title,
      summary: node.summary || content.summary,
    };
  });
  const allBoxes = [...groups, ...nodes];
  const minX = Math.min(0, ...allBoxes.map((item) => item.x));
  const minY = Math.min(0, ...allBoxes.map((item) => item.y));
  const offsetX = minX < 32 ? 32 - minX : 0;
  const offsetY = minY < 32 ? 32 - minY : 0;
  const move = (item) => ({ ...item, x: item.x + offsetX, y: item.y + offsetY });
  diagram.groups = groups.map(move);
  diagram.nodes = nodes.map(move);
  diagram.edges = (diagram.edges || []).map((edge, index) => ({
    ...edge,
    id: edge.id || "edge-" + (index + 1),
    from: edge.from || edge.fromNode,
    to: edge.to || edge.toNode,
    fromSide: edge.fromSide || "right",
    toSide: edge.toSide || "left",
  }));
  const shiftedBoxes = [...diagram.groups, ...diagram.nodes];
  diagram.canvasWidth = Math.ceil(Math.max(1400, ...shiftedBoxes.map((item) => item.x + item.width + 32)));
  diagram.canvasHeight = Math.ceil(Math.max(576, ...shiftedBoxes.map((item) => item.y + item.height + 32)));
  return diagram;
}

function resolveSiteSource(reference, label) {
  const absolute = path.resolve(siteRoot, String(reference || ""));
  const relative = path.relative(siteRoot, absolute);
  if (!reference || !relative || relative.startsWith(".." + path.sep) || path.isAbsolute(relative)) {
    throw new Error(label + " precisa apontar para um arquivo dentro do site: " + reference);
  }
  return absolute;
}

async function readDiagrams() {
  const files = await collectFiles(diagramsDirectory, ".json");
  const diagrams = [];

  for (const file of files) {
    const diagram = await readJson(file);
    diagram.sourcePath = path.relative(siteRoot, file);
    diagram.nodes = diagram.nodes || [];
    diagram.edges = diagram.edges || [];
    diagram.groups = diagram.groups || [];
    diagram.zones = diagram.zones || [];
    diagram.sourceRefs = diagram.sourceRefs || [];
    if (diagram.source !== undefined) {
      if (!diagram.source || typeof diagram.source !== "object" || Array.isArray(diagram.source)) {
        throw new Error("source precisa ser um objeto em " + diagram.sourcePath);
      }
      if (diagram.source.language !== "mermaid") {
        throw new Error("Linguagem declarativa não suportada em " + diagram.sourcePath + ": " + (diagram.source.language || "(ausente)"));
      }
      const hasPath = typeof diagram.source.path === "string" && diagram.source.path.trim();
      const hasCode = typeof diagram.source.code === "string" && diagram.source.code.trim();
      if (Boolean(hasPath) === Boolean(hasCode)) {
        throw new Error("source precisa declarar exatamente um de path ou code em " + diagram.sourcePath);
      }
      let mermaidCode = diagram.source.code;
      if (hasPath) {
        if (!/\.(?:mmd|mermaid)$/i.test(diagram.source.path)) {
          throw new Error("Fonte Mermaid precisa usar a extensão .mmd ou .mermaid: " + diagram.source.path);
        }
        const mermaidPath = resolveSiteSource(diagram.source.path, "source.path");
        await ensureExists(mermaidPath, "Fonte Mermaid ausente: " + diagram.source.path);
        mermaidCode = await readFile(mermaidPath, "utf8");
      }
      const parsed = await validateMermaidSource(mermaidCode, diagram);
      diagram._mermaid = parsed.renderCode;
      diagram._mermaidSource = parsed.code;
      diagram.mermaidType = parsed.diagramType;
      diagram.declarativeAnalysis = parsed.analysis;
    }
    if (diagram.source && (diagram.htmlSource || diagram.svgSource)) {
      throw new Error("source declarativo não pode ser combinado com htmlSource ou svgSource em " + diagram.sourcePath);
    }
    if (diagram.htmlSource) {
      if (!/\.html?$/i.test(diagram.htmlSource)) {
        throw new Error("htmlSource precisa apontar para um arquivo .html: " + diagram.htmlSource);
      }
      const htmlPath = resolveSiteSource(diagram.htmlSource, "htmlSource");
      await ensureExists(htmlPath, "Artefato HTML ausente: " + diagram.htmlSource);
      diagram._html = validateHtmlArtifact(await readFile(htmlPath, "utf8"), diagram);
    }
    if (diagram.svgSource) {
      if (path.extname(diagram.svgSource).toLowerCase() !== ".svg") {
        throw new Error("svgSource precisa apontar para um arquivo .svg: " + diagram.svgSource);
      }
      const svgPath = resolveSiteSource(diagram.svgSource, "svgSource");
      await ensureExists(svgPath, "Artefato SVG ausente: " + diagram.svgSource);
      diagram._svg = validateAccessibleSvg(await readFile(svgPath, "utf8"), diagram);
    }
    if (diagram._html && !diagram._svg) diagram._svg = inlineSvgFromHtmlArtifact(diagram);
    diagrams.push(diagram.kind === "canvas" ? normalizeCanvasDiagram(diagram) : diagram);
  }

  return diagrams;
}

async function collectFiles(directory, extension) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(file, extension)));
    } else if (entry.isFile() && entry.name.endsWith(extension)) {
      files.push(file);
    }
  }

  return files.sort();
}

function relativeOutputHref(fromOutput, targetOutput) {
  const relative = path.posix.relative(
    path.posix.dirname(fromOutput),
    targetOutput,
  );
  return relative || "index.html";
}

function relativeHref(fromId, targetOutput) {
  return relativeOutputHref(documentOutputPath({ id: fromId }), targetOutput);
}

function pageHref(fromId, targetId) {
  return relativeHref(fromId, documentOutputPath({ id: targetId }));
}

function outputHref(fromId, outputPath) {
  return relativeHref(fromId, outputPath);
}

function renderRootVariables(colors) {
  return [
    ":root {",
    "  --paper: " + colors.paper + ";",
    "  --paper-2: " + colors.paper2 + ";",
    "  --ink: " + colors.ink + ";",
    "  --muted: " + colors.muted + ";",
    "  --soft: " + colors.soft + ";",
    "  --rule: " + colors.rule + ";",
    "  --accent: " + colors.accent + ";",
    "  --accent-tint: " + colors.accentTint + ";",
    "  --link: " + colors.link + ";",
    "}",
  ].join("\n");
}

function nodeAppearance(kind, colors) {
  const appearances = {
    focal: {
      fill: colors.accentTint,
      stroke: colors.accent,
      tag: colors.accent,
    },
    backend: { fill: colors.paper, stroke: colors.ink, tag: colors.muted },
    store: {
      fill: colors.paper2,
      stroke: colors.muted,
      tag: colors.muted,
    },
    external: {
      fill: colors.paper,
      stroke: colors.rule,
      tag: colors.muted,
    },
    input: {
      fill: colors.paper2,
      stroke: colors.soft,
      tag: colors.muted,
    },
    security: {
      fill: colors.accentTint,
      stroke: colors.accent,
      tag: colors.muted,
      dash: "4 4",
    },
    optional: {
      fill: colors.paper,
      stroke: colors.rule,
      tag: colors.muted,
      dash: "4 3",
    },
    step: { fill: colors.paper, stroke: colors.ink, tag: colors.muted },
    decision: {
      fill: colors.accentTint,
      stroke: colors.accent,
      tag: colors.accent,
    },
  };
  return appearances[kind] || appearances.backend;
}

function themeAwareDiagramColors(colors) {
  return {
    paper: "var(--paper, " + colors.paper + ")",
    paper2: "var(--paper-2, " + colors.paper2 + ")",
    ink: "var(--ink, " + colors.ink + ")",
    muted: "var(--muted, " + colors.muted + ")",
    soft: "var(--soft, " + colors.soft + ")",
    rule: "var(--rule, " + colors.rule + ")",
    accent: "var(--accent, " + colors.accent + ")",
    accentTint: "var(--accent-tint, " + colors.accentTint + ")",
    link: "var(--link, " + colors.link + ")",
  };
}

function wrapSvgText(value, maxCharacters) {
  const words = String(value || "").trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? line + " " + word : word;
    if (candidate.length <= maxCharacters || !line) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 2).map((item, index, all) =>
    index === 1 && all.length === 2 && item.length > maxCharacters
      ? item.slice(0, Math.max(1, maxCharacters - 1)) + "…"
      : item,
  );
}

function architectureNodeSvg(node, colors) {
  const appearance = nodeAppearance(node.kind, colors);
  const centerX = node.x + node.width / 2;
  const tag = String(node.tag || node.kind || "COMPONENTE").toUpperCase();
  const tagWidth = roundToFour(Math.max(40, tag.length * 5 + 16));
  const tagX = node.x + 12;
  const labelLines = wrapSvgText(node.label, Math.max(12, Math.floor((node.width - 28) / 7)));
  const hasDetail = Boolean(node.detail);
  const nameStart = node.y + node.height - (hasDetail ? 38 : 30) - (labelLines.length - 1) * 14;
  const dash = appearance.dash ? ' stroke-dasharray="' + appearance.dash + '"' : "";
  return [
    '<g class="architecture-node" data-node="' + escapeAttribute(node.id) + '">',
    '<rect x="' + node.x + '" y="' + node.y + '" width="' + node.width + '" height="' + node.height + '" rx="8" fill="' + colors.paper + '"/>',
    '<rect x="' + node.x + '" y="' + node.y + '" width="' + node.width + '" height="' + node.height + '" rx="8" fill="' + appearance.fill + '" stroke="' + appearance.stroke + '" stroke-width="1"' + dash + "/>",
    '<rect x="' + tagX + '" y="' + (node.y + 12) + '" width="' + tagWidth + '" height="12" rx="4" fill="transparent" stroke="' + appearance.stroke + '" stroke-width="0.8"/>',
    '<text x="' + (tagX + tagWidth / 2) + '" y="' + (node.y + 21) + '" fill="' + appearance.tag + '" font-size="8" font-family="Geist Mono, ui-monospace, monospace" text-anchor="middle" letter-spacing="0.08em">' + escapeHtml(tag) + "</text>",
    '<text x="' + centerX + '" y="' + nameStart + '" fill="' + colors.ink + '" font-size="12" font-weight="600" font-family="Inter, system-ui, sans-serif" text-anchor="middle">' +
      labelLines.map((line, index) => '<tspan x="' + centerX + '" dy="' + (index ? 14 : 0) + '">' + escapeHtml(line) + "</tspan>").join("") +
      "</text>",
    hasDetail
      ? '<text x="' + centerX + '" y="' + (node.y + node.height - 16) + '" fill="' + colors.muted + '" font-size="8" font-family="Geist Mono, ui-monospace, monospace" text-anchor="middle">' + escapeHtml(node.detail) + "</text>"
      : "",
    "</g>",
  ].join("");
}

function edgeSides(from, to) {
  const dx = to.x + to.width / 2 - (from.x + from.width / 2);
  const dy = to.y + to.height / 2 - (from.y + from.height / 2);
  if (Math.abs(dx) >= Math.abs(dy)) {
    return { primary: "horizontal", from: dx >= 0 ? "right" : "left", to: dx >= 0 ? "left" : "right" };
  }
  return { primary: "vertical", from: dy >= 0 ? "bottom" : "top", to: dy >= 0 ? "top" : "bottom" };
}

function nodePort(node, side, index, count) {
  const length = side === "left" || side === "right" ? node.height : node.width;
  const padding = 20;
  const available = Math.max(0, length - padding * 2);
  const offset = roundToFour(padding + (available * (index + 1)) / (count + 1));
  if (side === "left") return { x: node.x, y: node.y + offset };
  if (side === "right") return { x: node.x + node.width, y: node.y + offset };
  if (side === "top") return { x: node.x + offset, y: node.y };
  return { x: node.x + offset, y: node.y + node.height };
}

function routedArchitectureEdges(diagram) {
  const nodes = new Map(diagram.nodes.map((node) => [node.id, node]));
  const items = diagram.edges.map((edge) => ({ ...edge, sides: edgeSides(nodes.get(edge.from), nodes.get(edge.to)) }));
  const groups = new Map();
  for (const item of items) {
    for (const key of [item.from + ":" + item.sides.from, item.to + ":" + item.sides.to]) {
      groups.set(key, [...(groups.get(key) || []), item]);
    }
  }
  return items.map((item) => {
    const sourceGroup = groups.get(item.from + ":" + item.sides.from);
    const targetGroup = groups.get(item.to + ":" + item.sides.to);
    return {
      ...item,
      start: nodePort(nodes.get(item.from), item.sides.from, sourceGroup.indexOf(item), sourceGroup.length),
      end: nodePort(nodes.get(item.to), item.sides.to, targetGroup.indexOf(item), targetGroup.length),
    };
  });
}

function roundedRoute(edge) {
  const { start, end } = edge;
  if (edge.sides.primary === "horizontal") {
    if (start.y === end.y) return { path: "M " + start.x + "," + start.y + " H " + end.x, label: { x: (start.x + end.x) / 2, y: start.y, side: "above" } };
    const middle = roundToFour((start.x + end.x) / 2);
    const verticalDirection = end.y > start.y ? 1 : -1;
    const firstDirection = middle > start.x ? 1 : -1;
    const secondDirection = end.x > middle ? 1 : -1;
    const radius = Math.max(4, Math.floor(Math.min(8, Math.abs(end.y - start.y) / 2, Math.abs(middle - start.x), Math.abs(end.x - middle)) / 4) * 4);
    return {
      path: "M " + start.x + "," + start.y + " H " + (middle - firstDirection * radius) + " Q " + middle + "," + start.y + " " + middle + "," + (start.y + verticalDirection * radius) + " V " + (end.y - verticalDirection * radius) + " Q " + middle + "," + end.y + " " + (middle + secondDirection * radius) + "," + end.y + " H " + end.x,
      label: { x: middle, y: (start.y + end.y) / 2, side: "right" },
    };
  }
  if (start.x === end.x) return { path: "M " + start.x + "," + start.y + " V " + end.y, label: { x: start.x, y: (start.y + end.y) / 2, side: "right" } };
  const middle = roundToFour((start.y + end.y) / 2);
  const horizontalDirection = end.x > start.x ? 1 : -1;
  const firstDirection = middle > start.y ? 1 : -1;
  const secondDirection = end.y > middle ? 1 : -1;
  const radius = Math.max(4, Math.floor(Math.min(8, Math.abs(end.x - start.x) / 2, Math.abs(middle - start.y), Math.abs(end.y - middle)) / 4) * 4);
  return {
    path: "M " + start.x + "," + start.y + " V " + (middle - firstDirection * radius) + " Q " + start.x + "," + middle + " " + (start.x + horizontalDirection * radius) + "," + middle + " H " + (end.x - horizontalDirection * radius) + " Q " + end.x + "," + middle + " " + end.x + "," + (middle + secondDirection * radius) + " V " + end.y,
    label: { x: (start.x + end.x) / 2, y: middle, side: "above" },
  };
}

function architectureEdgeSvg(edge, colors, diagramId) {
  const tone = { accent: { stroke: colors.accent, marker: diagramId + "-arrow-accent" }, link: { stroke: colors.link, marker: diagramId + "-arrow-link" }, default: { stroke: colors.muted, marker: diagramId + "-arrow" } }[edge.tone === "accent" || edge.tone === "link" ? edge.tone : "default"];
  const route = roundedRoute(edge);
  const dashed = edge.tone === "optional" || edge.tone === "return" || edge.dashed;
  const label = edge.label ? String(edge.label).toUpperCase().slice(0, 24) : "";
  const labelWidth = roundToFour(Math.max(48, label.length * 5 + 16));
  const labelParts = !label ? "" : route.label.side === "above"
    ? '<rect x="' + roundToFour(route.label.x - labelWidth / 2) + '" y="' + (route.label.y - 24) + '" width="' + labelWidth + '" height="12" rx="4" fill="' + colors.paper + '"/><text x="' + route.label.x + '" y="' + (route.label.y - 15) + '" fill="' + tone.stroke + '" font-size="8" font-family="Geist Mono, ui-monospace, monospace" text-anchor="middle" letter-spacing="0.06em">' + escapeHtml(label) + "</text>"
    : '<rect x="' + (route.label.x + 8) + '" y="' + (route.label.y - 8) + '" width="' + labelWidth + '" height="12" rx="4" fill="' + colors.paper + '"/><text x="' + (route.label.x + 16) + '" y="' + (route.label.y + 1) + '" fill="' + tone.stroke + '" font-size="8" font-family="Geist Mono, ui-monospace, monospace" letter-spacing="0.06em">' + escapeHtml(label) + "</text>";
  return '<path d="' + route.path + '" fill="none" stroke="' + tone.stroke + '" stroke-width="' + (dashed ? "1" : "1.2") + '"' + (dashed ? ' stroke-dasharray="4 3"' : "") + ' marker-end="url(#' + tone.marker + ')"/>' + labelParts;
}

function architectureLegend(diagram, colors, width, legendY, config) {
  const english = String(config?.language || "").toLowerCase().startsWith("en");
  const labels = english
    ? { focal: "CORE", backend: "SERVICE", store: "STORE", external: "EXTERNAL", input: "INPUT", security: "SECURITY", optional: "OPTIONAL", step: "STEP", decision: "DECISION" }
    : { focal: "NÚCLEO", backend: "SERVIÇO", store: "REGISTRO", external: "EXTERNO", input: "ENTRADA", security: "SEGURANÇA", optional: "OPCIONAL", step: "ETAPA", decision: "DECISÃO" };
  const kinds = [...new Set(diagram.nodes.map((node) => node.kind || "backend"))].slice(0, 5);
  let cursor = 144;
  const items = kinds.map((kind) => {
    const appearance = nodeAppearance(kind, colors);
    const item = '<rect x="' + cursor + '" y="' + (legendY + 12) + '" width="12" height="12" rx="4" fill="' + appearance.fill + '" stroke="' + appearance.stroke + '" stroke-width="1"' + (appearance.dash ? ' stroke-dasharray="' + appearance.dash + '"' : "") + '/><text x="' + (cursor + 24) + '" y="' + (legendY + 22) + '" fill="' + colors.muted + '" font-size="8" font-family="Geist Mono, ui-monospace, monospace">' + labels[kind] + "</text>";
    cursor += roundToFour((labels[kind] || kind).length * 6 + 56);
    return item;
  }).join("");
  return '<line x1="40" y1="' + legendY + '" x2="' + (width - 40) + '" y2="' + legendY + '" stroke="' + colors.rule + '" stroke-width="0.8"/><text x="40" y="' + (legendY + 22) + '" fill="' + colors.muted + '" font-size="8" font-family="Geist Mono, ui-monospace, monospace" letter-spacing="0.14em">' + (english ? "LEGEND" : "LEGENDA") + '</text>' + items;
}

function renderArchitectureSvg(diagram, colors, config = {}) {
  const themeColors = themeAwareDiagramColors(colors);
  const marker = (id, fill) => '<marker id="' + id + '" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="' + fill + '"/></marker>';
  const contentRight = Math.max(1280, ...diagram.nodes.map((node) => node.x + node.width + 40), ...diagram.zones.map((zone) => zone.x + zone.width + 40));
  const contentBottom = Math.max(560, ...diagram.nodes.map((node) => node.y + node.height), ...diagram.zones.map((zone) => zone.y + zone.height));
  const width = roundToFour(Math.max(diagram.width || 0, contentRight));
  const height = roundToFour(Math.max(diagram.height || 0, contentBottom + 112));
  const zones = diagram.zones.map((zone) => {
    const labelWidth = roundToFour(Math.max(64, String(zone.label || "ZONA").length * 6 + 16));
    return '<g><rect x="' + zone.x + '" y="' + zone.y + '" width="' + zone.width + '" height="' + zone.height + '" rx="8" fill="' + themeColors.paper2 + '" fill-opacity="0.55" stroke="' + themeColors.rule + '" stroke-width="0.8" stroke-dasharray="4 4"/><rect x="' + (zone.x + 12) + '" y="' + (zone.y + 8) + '" width="' + labelWidth + '" height="12" rx="4" fill="' + themeColors.paper + '"/><text x="' + (zone.x + 20) + '" y="' + (zone.y + 20) + '" fill="' + themeColors.muted + '" font-size="8" font-family="Geist Mono, ui-monospace, monospace" letter-spacing="0.12em">' + escapeHtml(zone.label || "ZONA") + "</text></g>";
  }).join("");
  const edges = routedArchitectureEdges(diagram).map((edge) => architectureEdgeSvg(edge, themeColors, diagram.id)).join("");
  const nodes = diagram.nodes.map((node) => architectureNodeSvg(node, themeColors)).join("");
  const legendY = height - 64;
  return [
    '<svg class="architecture-diagram' + (width > 1440 ? " architecture-diagram--wide" : "") + '"' + (width > 1440 ? ' style="--diagram-min-width: ' + width + 'px"' : "") + ' viewBox="0 0 ' + width + " " + height + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="' + diagram.id + "-title " + diagram.id + '-desc">',
    '<title id="' + diagram.id + '-title">' + escapeHtml(diagram.title) + "</title>",
    '<desc id="' + diagram.id + '-desc">' + escapeHtml(diagram.description) + "</desc>",
    "<defs>", marker(diagram.id + "-arrow", themeColors.muted), marker(diagram.id + "-arrow-accent", themeColors.accent), marker(diagram.id + "-arrow-link", themeColors.link), "</defs>",
    '<rect width="' + width + '" height="' + height + '" fill="' + themeColors.paper + '"/>', zones, edges, nodes, architectureLegend(diagram, themeColors, width, legendY, config), "</svg>",
  ].join("");
}

function renderDiagramSvg(diagram, colors, config = {}) {
  if (diagram._svg) return diagram._svg;
  if (diagram._html) return "";
  return diagram.kind === "architecture"
    ? renderArchitectureSvg(diagram, colors, config)
    : diagram._svg;
}

function svgTextLines(value, maxCharacters, maximumLines = 2) {
  const words = String(value || "").split(/\s+/).filter(Boolean);
  const lines = [];
  for (const word of words) {
    const current = lines[lines.length - 1];
    if (!current || (current + " " + word).length > maxCharacters) lines.push(word);
    else lines[lines.length - 1] += " " + word;
  }
  if (lines.length > maximumLines) {
    lines.length = maximumLines;
    lines[maximumLines - 1] = lines[maximumLines - 1].replace(/[.…]*$/, "") + "…";
  }
  return lines;
}

function canvasNodeSvg(node, colors, copy) {
  const appearance = nodeAppearance(node.kind, colors);
  const centerX = node.x + node.width / 2;
  const dash = appearance.dash
    ? ' stroke-dasharray="' + appearance.dash + '"'
    : "";
  const tag = String(node.tag || (node.kind === "focal" ? "ACTIVE" : node.kind)).toUpperCase();
  const titleLines = svgTextLines(node.title, Math.max(14, Math.floor(node.width / 8)), 2);
  const title = titleLines.map((line, index) =>
    '<tspan x="' + centerX + '" dy="' + (index ? 17 : 0) + '">' + escapeHtml(line) + "</tspan>",
  ).join("");

  return [
    '<g class="canvas-node" data-canvas-node tabindex="0" role="button" aria-label="' + escapeAttribute(copy.focus) + " " +
      escapeAttribute(node.title) +
      '" data-x="' +
      node.x +
      '" data-y="' +
      node.y +
      '" data-width="' +
      node.width +
      '" data-height="' +
      node.height +
      '" data-title="' +
      escapeAttribute(node.title) +
      '" data-summary="' +
      escapeAttribute(node.summary) +
      '">',
    '<rect x="' +
      node.x +
      '" y="' +
      node.y +
      '" width="' +
      node.width +
      '" height="' +
      node.height +
      '" rx="8" fill="' +
      colors.paper +
      '"/>',
    '<rect x="' +
      node.x +
      '" y="' +
      node.y +
      '" width="' +
      node.width +
      '" height="' +
      node.height +
      '" rx="8" fill="' +
      appearance.fill +
      '" stroke="' +
      appearance.stroke +
      '" stroke-width="1"' +
      dash +
      "/>",
    '<text x="' +
      (node.x + 12) +
      '" y="' +
      (node.y + 20) +
      '" fill="' +
      appearance.tag +
      '" font-size="12" font-family="Geist Mono, ui-monospace, monospace" font-weight="600" letter-spacing="0.08em">' +
      escapeHtml(tag) +
      "</text>",
    '<text x="' +
      centerX +
      '" y="' +
      (node.y + (titleLines.length > 1 ? 48 : 55)) +
      '" fill="' +
      colors.ink +
      '" font-size="22" font-family="Inter, system-ui, sans-serif" font-weight="600" text-anchor="middle">' +
      title +
      "</text>",
    '<text x="' +
      centerX +
      '" y="' +
      (node.y + node.height - 16) +
      '" fill="' +
      colors.muted +
      '" font-size="11" font-family="Geist Mono, ui-monospace, monospace" text-anchor="middle">' + escapeHtml(copy.openDetail) + "</text>",
    "</g>",
  ].join("");
}

function canvasPort(node, side) {
  if (side === "left") return { x: node.x, y: node.y + node.height / 2 };
  if (side === "top") return { x: node.x + node.width / 2, y: node.y };
  if (side === "bottom") return { x: node.x + node.width / 2, y: node.y + node.height };
  return { x: node.x + node.width, y: node.y + node.height / 2 };
}

function canvasRoute(edge, nodeMap) {
  if (edge.path) return edge.path;
  const from = nodeMap.get(edge.from);
  const to = nodeMap.get(edge.to);
  const start = canvasPort(from, edge.fromSide);
  const end = canvasPort(to, edge.toSide);
  if (["left", "right"].includes(edge.fromSide)) {
    const middleX = roundToFour((start.x + end.x) / 2);
    return "M " + start.x + "," + start.y + " H " + middleX + " V " + end.y + " H " + end.x;
  }
  const middleY = roundToFour((start.y + end.y) / 2);
  return "M " + start.x + "," + start.y + " V " + middleY + " H " + end.x + " V " + end.y;
}

function canvasEdgeSvg(edge, colors, diagramId, nodeMap) {
  const tone = {
    accent: {
      stroke: colors.accent,
      marker: diagramId + "-canvas-arrow-accent",
      dash: "",
    },
    return: {
      stroke: colors.link,
      marker: diagramId + "-canvas-arrow-link",
      dash: ' stroke-dasharray="4 3"',
    },
    default: {
      stroke: colors.muted,
      marker: diagramId + "-canvas-arrow",
      dash: "",
    },
  }[edge.tone || "default"];

  return (
    '<path d="' +
    canvasRoute(edge, nodeMap) +
    '" fill="none" stroke="' +
    tone.stroke +
    '" stroke-width="1.2"' +
    tone.dash +
    ' marker-end="url(#' +
    tone.marker +
    ')"/>'
  );
}

function renderCanvasSvg(diagram, colors, config) {
  const copy = messages(config);
  const marker = (id, fill) =>
    '<marker id="' +
    id +
    '" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="' +
    fill +
    '"/></marker>';

  const groups = diagram.groups
    .map((group) =>
      [
        "<g>",
        '<rect x="' +
          group.x +
          '" y="' +
          group.y +
          '" width="' +
          group.width +
          '" height="' +
          group.height +
          '" rx="12" fill="' + colors.paper + '" fill-opacity="0.72" stroke="' +
          colors.rule +
          '" stroke-width="0.8"/>',
        '<text x="' +
          (group.x + 16) +
          '" y="' +
          (group.y + 28) +
          '" fill="' +
          colors.muted +
          '" font-size="14" font-family="Geist Mono, ui-monospace, monospace" font-weight="600" letter-spacing="0.1em">' +
          escapeHtml(group.label) +
          "</text>",
        "</g>",
      ].join(""),
    )
    .join("");

  const width = diagram.canvasWidth || 1400;
  const height = diagram.canvasHeight || 576;
  const nodeMap = new Map(diagram.nodes.map((node) => [node.id, node]));
  return [
    '<svg data-canvas class="' + (width > 1600 ? "canvas-diagram--wide" : "") + '" style="--canvas-min-width:' + width + 'px" viewBox="0 0 ' + width + " " + height + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="' +
      diagram.id +
      "-canvas-title " +
      diagram.id +
      '-canvas-desc">',
    '<title id="' +
      diagram.id +
      '-canvas-title">' +
      escapeHtml(diagram.title) +
      "</title>",
    '<desc id="' +
      diagram.id +
      '-canvas-desc">' +
      escapeHtml(diagram.description) +
      "</desc>",
    "<defs>",
    marker(diagram.id + "-canvas-arrow", colors.muted),
    marker(diagram.id + "-canvas-arrow-accent", colors.accent),
    marker(diagram.id + "-canvas-arrow-link", colors.link),
    "</defs>",
    '<rect width="' + width + '" height="' + height + '" fill="' + colors.paper2 + '"/>',
    groups,
    diagram.edges
      .map((edge) => canvasEdgeSvg(edge, colors, diagram.id, nodeMap))
      .join(""),
    diagram.nodes.map((node) => canvasNodeSvg(node, colors, copy)).join(""),
    "</svg>",
  ].join("");
}

function mermaidSourceLabel(diagram, config) {
  return diagram.source?.path || messages(config).inlineMermaidSource + diagram.id + ".json";
}

function mermaidLegendItems(diagram, config) {
  const english = String(config.language || "").toLowerCase().startsWith("en");
  const labels = english
    ? {
        node: "Node", focal: "Focal", connection: "Connection", step: "Step", decision: "Decision", outcome: "Outcome",
        actor: "Actor", request: "Request", response: "Response", alternative: "Alternative", state: "State", transition: "Transition", terminal: "Terminal",
        entity: "Entity", primaryKey: "Primary key", foreignKey: "Foreign key", relationship: "Relationship", class: "Class", interface: "Interface", inheritance: "Inheritance", composition: "Composition",
        series: "Series", axis: "Axis", task: "Task", milestone: "Milestone", completed: "Completed", active: "Active", stage: "Stage", score: "Score", group: "Group", dependency: "Dependency", item: "Item", aggregation: "Aggregation",
      }
    : {
        node: "Nó", focal: "Foco", connection: "Conexão", step: "Etapa", decision: "Decisão", outcome: "Resultado",
        actor: "Ator", request: "Requisição", response: "Resposta", alternative: "Alternativa", state: "Estado", transition: "Transição", terminal: "Terminal",
        entity: "Entidade", primaryKey: "Chave primária", foreignKey: "Chave estrangeira", relationship: "Relacionamento", class: "Classe", interface: "Interface", inheritance: "Herança", composition: "Composição",
        series: "Série", axis: "Eixo", task: "Tarefa", milestone: "Marco", completed: "Concluída", active: "Ativa", stage: "Etapa", score: "Pontuação", group: "Grupo", dependency: "Dependência", item: "Item", aggregation: "Agregação",
      };
  const roleItems = {
    node: ["box", labels.node], focal: ["focal", labels.focal], connection: ["arrow", labels.connection],
    step: ["box", labels.step], decision: ["decision", labels.decision], outcome: ["terminal", labels.outcome],
    actor: ["actor", labels.actor], request: ["arrow", labels.request], response: ["dashed", labels.response], alternative: ["group", labels.alternative],
    state: ["box", labels.state], transition: ["arrow", labels.transition], terminal: ["terminal", labels.terminal],
    entity: ["entity", labels.entity], "primary-key": ["pk", labels.primaryKey], "foreign-key": ["fk", labels.foreignKey], relationship: ["relation", labels.relationship],
    class: ["class", labels.class], interface: ["interface", labels.interface], inheritance: ["inheritance", labels.inheritance], composition: ["composition", labels.composition], aggregation: ["relation", labels.aggregation],
    series: ["series", labels.series], axis: ["axis", labels.axis], task: ["task", labels.task], milestone: ["milestone", labels.milestone], completed: ["completed", labels.completed], active: ["active", labels.active],
    stage: ["group", labels.stage], score: ["score", labels.score], group: ["group", labels.group], dependency: ["arrow", labels.dependency], item: ["point", labels.item],
  };
  const analyzedRoles = [...(diagram.declarativeAnalysis?.roles || [])];
  if ((diagram.data?.focus || diagram.data?.aggregateRoot) && !analyzedRoles.includes("focal")) analyzedRoles.push("focal");
  const analyzed = analyzedRoles.map((role) => roleItems[role]).filter(Boolean);
  if (analyzed.length) return analyzed;
  const byKind = {
    flowchart: [["box", labels.step], ["decision", labels.decision], ["focal", labels.outcome], ["arrow", labels.connection]],
    sequence: [["actor", labels.actor], ["arrow", labels.request], ["dashed", labels.response], ["group", labels.alternative]],
    state: [["box", labels.state], ["arrow", labels.transition], ["terminal", labels.terminal], ["focal", labels.focal]],
    er: [["entity", labels.entity], ["pk", labels.primaryKey], ["fk", labels.foreignKey], ["relation", labels.relationship]],
    "db-schema": [["entity", labels.entity], ["pk", labels.primaryKey], ["fk", labels.foreignKey], ["relation", labels.relationship]],
    "uml-class": [["class", labels.class], ["interface", labels.interface], ["inheritance", labels.inheritance], ["composition", labels.composition]],
    line: [["series", labels.series], ["axis", labels.axis], ["focal", labels.focal]],
    bar: [["series", labels.series], ["axis", labels.axis], ["focal", labels.focal]],
    waterfall: [["series", labels.series], ["axis", labels.axis], ["focal", labels.focal]],
    scatter: [["series", labels.series], ["axis", labels.axis], ["focal", labels.focal]],
    gantt: [["task", labels.task], ["milestone", labels.milestone], ["completed", labels.completed], ["active", labels.active]],
    journey: [["group", labels.stage], ["box", labels.item], ["score", labels.score], ["focal", labels.focal]],
    quadrant: [["group", labels.group], ["point", labels.item], ["axis", labels.axis], ["focal", labels.focal]],
    dependency: [["box", labels.node], ["group", labels.group], ["focal", labels.focal], ["arrow", labels.dependency]],
  };
  return byKind[diagram.kind] || [["box", labels.node], ["arrow", labels.connection]];
}

function renderMermaidLegend(diagram, config) {
  const copy = messages(config);
  return '<footer class="mermaid-legend" aria-label="' + escapeAttribute(copy.legend) + '"><strong>' + escapeHtml(copy.legend) +
    '</strong><ul>' + mermaidLegendItems(diagram, config).map(([style, label]) =>
      '<li><span class="mermaid-legend__mark mermaid-legend__mark--' + escapeAttribute(style) + '" aria-hidden="true"></span>' + escapeHtml(label) + '</li>',
    ).join("") + "</ul></footer>";
}

function renderMermaidSurface(diagram, options = {}) {
  const config = options.config || { language: "pt-BR" };
  const copy = messages(config);
  const height = Math.max(280, Math.min(900, Number(diagram.presentation?.height) || 480));
  const initialZoom = Math.max(0.5, Math.min(4, Number(diagram.presentation?.initialZoom) || 1));
  const initialPosition = diagram.presentation?.initialPosition === "start" ? "start" : "center";
  const focus = [diagram.data?.focus, diagram.data?.aggregateRoot, diagram.declarativeAnalysis?.focus].flat(2).filter(Boolean);
  const openLink = options.openHref
    ? '<a class="mermaid-open" href="' + escapeAttribute(options.openHref) + '">' + escapeHtml(copy.openFull) + "</a>"
    : "";
  return [
    '<section class="mermaid-shell' + (options.standalone ? " mermaid-shell--standalone" : "") +
      '" data-mermaid-shell data-mermaid data-mermaid-title="' + escapeAttribute(diagram.title) +
      '" data-mermaid-description="' + escapeAttribute(diagram.description) +
      '" data-mermaid-kind="' + escapeAttribute(diagram.kind) +
      '" data-mermaid-initial-zoom="' + initialZoom +
      '" data-mermaid-initial-position="' + initialPosition +
      '" data-mermaid-focus="' + escapeAttribute(JSON.stringify(focus)) +
      '" data-mermaid-analysis="' + escapeAttribute(JSON.stringify(diagram.declarativeAnalysis || {})) +
      '" style="--mermaid-height:' + height + 'px">',
    '<header class="mermaid-toolbar"><p>' + escapeHtml(copy.mermaidCanvas) +
      '</p><div class="mermaid-controls" aria-label="' + escapeAttribute(copy.mermaidControls) + '">',
    '<button type="button" data-mermaid-control="out" aria-label="' + escapeAttribute(copy.zoomOut) + '">−</button>',
    '<output data-mermaid-zoom aria-label="' + escapeAttribute(copy.zoomLevel) + '" aria-live="polite">100%</output>',
    '<button type="button" data-mermaid-control="in" aria-label="' + escapeAttribute(copy.zoomIn) + '">+</button>',
    '<button type="button" data-mermaid-control="reset">' + escapeHtml(copy.reset) + "</button>",
    '<button type="button" data-mermaid-control="full" aria-pressed="false">' + escapeHtml(copy.fullscreen) + "</button>",
    openLink,
    "</div></header>",
    '<div class="mermaid-surface" data-mermaid-viewport tabindex="0" aria-label="' + escapeAttribute(copy.mermaidViewport) + '">',
    '<script type="application/json" data-mermaid-source>' + scriptSafeJson(diagram._mermaid) + "</script>",
    '<div class="mermaid-target" data-mermaid-target aria-busy="true"><p class="mermaid-loading">' + escapeHtml(copy.mermaidLoading) + "</p></div>",
    '<noscript><section class="mermaid-fallback"><h2>' + escapeHtml(diagram.title) + "</h2><p>" +
      escapeHtml(diagram.summary || diagram.description) + "</p></section></noscript>",
    "</div>",
    renderMermaidLegend(diagram, config),
    "</section>",
  ].join("");
}

function mermaidScripts(outputFile, config, mermaidJs) {
  const runtimeHref = relativeOutputHref(outputFile, "assets/aurelius/mermaid.min.js");
  const copy = messages(config);
  const design = {
    paper: "#f5f5f5", paper2: "#ececec", ink: "#2d3142", muted: "#4f5d75", soft: "#7a8399",
    rule: "rgba(45,49,66,0.12)", ruleSolid: "#bfc0c0", accent: "#eb6c36",
    accentTint: "rgba(235,108,54,0.08)", link: "#2e5aa8",
  };
  const runtimeConfig = {
    errorMessage: copy.mermaidError,
    fontFamily: "Geist, Inter, system-ui, sans-serif",
    design,
    themeVariables: {
      background: design.paper,
      primaryColor: "#ffffff",
      primaryTextColor: design.ink,
      primaryBorderColor: design.ink,
      lineColor: design.muted,
      secondaryColor: design.accentTint,
      tertiaryColor: design.paper2,
      mainBkg: "#ffffff",
      nodeBorder: design.ink,
      clusterBkg: "rgba(45,49,66,0.02)",
      clusterBorder: design.ruleSolid,
      edgeLabelBackground: design.paper,
      textColor: design.ink,
      titleColor: design.ink,
      actorBkg: "#ffffff",
      actorBorder: design.ink,
      actorTextColor: design.ink,
      signalColor: design.muted,
      signalTextColor: design.soft,
      labelBoxBkgColor: design.paper2,
      labelBoxBorderColor: design.ruleSolid,
      labelTextColor: design.ink,
      activationBkgColor: design.accentTint,
      activationBorderColor: design.accent,
      sectionBkgColor: design.paper2,
      altSectionBkgColor: "rgba(45,49,66,0.03)",
      gridColor: design.rule,
      taskBkgColor: "rgba(79,93,117,0.10)",
      taskBorderColor: design.soft,
      activeTaskBkgColor: design.accentTint,
      activeTaskBorderColor: design.accent,
      doneTaskBkgColor: "rgba(45,49,66,0.05)",
      doneTaskBorderColor: design.muted,
      quadrant1Fill: "rgba(45,49,66,0.025)",
      quadrant2Fill: "rgba(79,93,117,0.045)",
      quadrant3Fill: "rgba(45,49,66,0.025)",
      quadrant4Fill: "rgba(79,93,117,0.045)",
      quadrant1TextFill: design.muted,
      quadrant2TextFill: design.muted,
      quadrant3TextFill: design.muted,
      quadrant4TextFill: design.muted,
      quadrantPointFill: design.muted,
      quadrantPointTextFill: design.ink,
      quadrantXAxisTextFill: design.muted,
      quadrantYAxisTextFill: design.muted,
      xyChart: {
        backgroundColor: design.paper,
        titleColor: design.ink,
        dataLabelColor: design.ink,
        legendTextColor: design.muted,
        xAxisTitleColor: design.ink,
        xAxisLabelColor: design.muted,
        xAxisTickColor: design.ruleSolid,
        xAxisLineColor: design.ink,
        yAxisTitleColor: design.ink,
        yAxisLabelColor: design.muted,
        yAxisTickColor: design.ruleSolid,
        yAxisLineColor: design.ink,
        plotColorPalette: [design.accent, design.muted, design.soft, design.ink].join(","),
      },
    },
    themeCSS: [
      "svg{background:" + design.paper + "!important;color:" + design.ink + "}",
      ".node rect,.node circle,.node ellipse,.node polygon,.node path{fill:#fff!important;stroke:" + design.ink + "!important;stroke-width:1px!important;filter:none!important}",
      ".node rect{rx:6px;ry:6px}",
      ".node polygon{fill:" + design.paper + "!important}",
      ".node.focal rect,.node.focal circle,.node.focal ellipse,.node.focal polygon,.node.focal path,.aurelius-focal rect,.aurelius-focal circle,.aurelius-focal path,.aurelius-focal polygon{fill:" + design.accentTint + "!important;stroke:" + design.accent + "!important;stroke-width:1.2px!important}",
      ".node.optional rect,.node.optional path{fill:rgba(45,49,66,0.02)!important;stroke:rgba(45,49,66,0.28)!important;stroke-dasharray:4 3}",
      ".nodeLabel,.label text,.label span,.label p{color:" + design.ink + "!important;fill:" + design.ink + "!important;font-family:Geist,Inter,system-ui,sans-serif!important;font-size:12px!important;font-weight:600!important}",
      ".cluster rect{fill:rgba(45,49,66,0.02)!important;stroke:" + design.ruleSolid + "!important;stroke-width:.8px!important;stroke-dasharray:4 4;rx:8px;ry:8px}",
      ".cluster-label text,.cluster-label span,.cluster-label p{fill:" + design.muted + "!important;color:" + design.muted + "!important;font-family:Geist Mono,ui-monospace,monospace!important;font-size:8px!important;font-weight:500!important;letter-spacing:.14em;text-transform:uppercase}",
      ".flowchart-link,.edgePath path,.relation,.relationshipLine{stroke:" + design.muted + "!important;stroke-width:1.2px!important;filter:none!important}",
      ".arrowheadPath{fill:" + design.muted + "!important;stroke:" + design.muted + "!important}",
      ".marker,.marker path{fill:none!important;stroke:" + design.muted + "!important;stroke-width:1.2px!important}",
      ".edgeLabel rect,.labelBkg,.relationshipLabelBox{fill:" + design.paper + "!important;opacity:1!important;rx:2px;ry:2px}",
      ".edgeLabel,.edgeLabel p,.edgeLabel span,.edgeLabel text,.relationshipLabel{color:" + design.soft + "!important;fill:" + design.soft + "!important;font-family:Geist Mono,ui-monospace,monospace!important;font-size:8px!important;font-weight:400!important;letter-spacing:.06em}",
      ".actor{fill:#fff!important;stroke:" + design.ink + "!important;stroke-width:1px!important;rx:6px;ry:6px}",
      "text.actor{fill:" + design.ink + "!important;font-family:Geist,Inter,system-ui,sans-serif!important;font-size:12px!important;font-weight:600!important}",
      ".actor-line{stroke:" + design.ruleSolid + "!important;stroke-width:.8px!important;stroke-dasharray:4 4}",
      ".messageLine0,.messageLine1{stroke:" + design.muted + "!important;stroke-width:1.2px!important}",
      ".messageText{fill:" + design.soft + "!important;font-family:Geist Mono,ui-monospace,monospace!important;font-size:8px!important;letter-spacing:.04em}",
      ".labelBox,.loopLine{fill:rgba(45,49,66,0.02)!important;stroke:" + design.ruleSolid + "!important;stroke-width:.8px!important}",
      ".labelText,.loopText{fill:" + design.muted + "!important;font-family:Geist Mono,ui-monospace,monospace!important;font-size:8px!important;font-weight:500!important;letter-spacing:.12em}",
      ".activation0,.activation1,.activation2{fill:" + design.accentTint + "!important;stroke:" + design.accent + "!important;stroke-width:1px!important}",
      ".classGroup rect,.classBox{fill:#fff!important;stroke:" + design.ink + "!important;stroke-width:1px!important;rx:6px;ry:6px;filter:none!important}",
      ".classGroup text,.classText{fill:" + design.ink + "!important;font-family:Geist Mono,ui-monospace,monospace!important;font-size:9px!important}",
      ".classGroup .classTitle,.classTitle{font-family:Geist,Inter,system-ui,sans-serif!important;font-size:12px!important;font-weight:600!important}",
      ".er .entityBox{fill:#fff!important;stroke:" + design.ink + "!important;stroke-width:1px!important;rx:6px;ry:6px;filter:none!important}",
      ".er .attributeBoxEven{fill:#fff!important;stroke:" + design.ruleSolid + "!important}",
      ".er .attributeBoxOdd{fill:rgba(45,49,66,0.035)!important;stroke:" + design.ruleSolid + "!important}",
      ".er .entityLabel,.er .entityTitleText{fill:" + design.ink + "!important;font-family:Geist,Inter,system-ui,sans-serif!important;font-size:12px!important;font-weight:600!important}",
      ".er .attributeBoxEven text,.er .attributeBoxOdd text,.er .attributeBoxEven tspan,.er .attributeBoxOdd tspan{fill:" + design.muted + "!important;font-family:Geist Mono,ui-monospace,monospace!important;font-size:9px!important}",
      ".line-plot-0 path,.plot.line-plot-0 path,.plot .line-plot-0 path{fill:none!important;stroke:" + design.accent + "!important;stroke-width:2.4px!important}",
      ".plot .data-point{fill:" + design.accent + "!important;stroke:" + design.paper + "!important;stroke-width:1.2px!important}",
      ".x-axis text,.y-axis text,.tick text,.chart-title,.journey-section,.task text{fill:" + design.muted + "!important;font-family:Geist Mono,ui-monospace,monospace!important;font-size:8px!important}",
      ".quadrant-point,.data-points .data-point circle{fill:" + design.muted + "!important;stroke:" + design.paper + "!important}",
      ".aurelius-focal .quadrant-point,.quadrant-point.aurelius-focal,.data-points .data-point.aurelius-focal circle{fill:" + design.accentTint + "!important;stroke:" + design.accent + "!important;stroke-width:1.2px!important}",
      ".quadrant-point-text,.data-points .data-point text{fill:" + design.ink + "!important;color:" + design.ink + "!important;font-family:Geist,Inter,system-ui,sans-serif!important;font-size:9px!important;font-weight:500!important}",
    ].join(""),
  };
  return [
    '<script src="' + escapeAttribute(runtimeHref) + '"></script>',
    "<script>window.__AURELIUS_MERMAID__ = " + scriptSafeJson(runtimeConfig) + ";</script>",
    "<script>" + mermaidJs + "</script>",
  ].join("\n");
}

function renderStandaloneMermaid(
  diagram,
  diagramCss,
  siteJs,
  mermaidJs,
  logoDataUrl,
  returnHref,
  sourceTitle,
  config,
) {
  const copy = messages(config);
  const outputFile = path.posix.join("diagrams", diagram.id + ".html");
  return [
    "<!DOCTYPE html>",
    '<html lang="' + escapeAttribute(config.language) + '">',
    "<head>",
    '<meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    "<title>" + escapeHtml(diagram.title) + "</title>",
    '<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@400;500;600&family=Inter:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap" rel="stylesheet">',
    "<style>", renderRootVariables(config.colors),
    ' :root { --sans: "Inter", system-ui, sans-serif; --serif: "Instrument Serif", Georgia, serif; --mono: "Geist Mono", ui-monospace, monospace; }',
    diagramCss, "</style>", "</head>", "<body>",
    '<main class="frame">',
    '<header class="diagram-topbar"><a class="diagram-back" href="' + escapeAttribute(returnHref) + '">← ' +
      escapeHtml(copy.backTo) + " " + escapeHtml(sourceTitle) + '</a><div class="diagram-identity"><img src="' +
      escapeAttribute(logoDataUrl) + '" alt="' + escapeAttribute(config.brand.logoAlt) + '">' +
      escapeHtml(config.brand.name || config.siteTitle) + "</div></header>",
    '<p class="eyebrow">' + escapeHtml(diagramKindLabel(diagram.kind)) + " · MERMAID · DECLARATIVE</p>",
    "<h1>" + escapeHtml(diagram.title) + "</h1>",
    '<section data-standalone-visual><div class="diagram-actions"><button type="button" data-copy-mermaid>' +
      escapeHtml(copy.copyMermaid) + '</button><button type="button" data-copy-svg>' + escapeHtml(copy.copySvg) +
      '</button><button type="button" data-print>' + escapeHtml(copy.savePdf) +
      '</button><span class="action-status" data-action-status role="status" aria-live="polite"></span></div>',
    renderMermaidSurface(diagram, { config, standalone: true }),
    '<details class="mermaid-summary"><summary>' + escapeHtml(copy.semanticReading) + "</summary><p>" +
      escapeHtml(diagram.summary || diagram.description) + "</p></details></section>",
    "</main>",
    "<script>window.__SEARCH_INDEX__ = []; window.__AURELIUS_MESSAGES__ = " + scriptSafeJson(copy) + ";</script>",
    mermaidScripts(outputFile, config, mermaidJs),
    "<script>" + siteJs + "</script>",
    "</body></html>",
  ].join("\n");
}

function renderStandaloneDiagram(
  diagram,
  colors,
  diagramCss,
  siteJs,
  logoDataUrl,
  returnHref,
  sourceTitle,
  config,
) {
  const copy = messages(config);
  const svg = renderDiagramSvg(diagram, colors, config);
  const authoredSvg = Boolean(diagram._svg);
  const visual = authoredSvg ? svgArtifactImage(svg, diagram) : svg;
  return [
    "<!DOCTYPE html>",
    '<html lang="' + escapeAttribute(config.language) + '">',
    "<head>",
    '<meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    "<title>" + escapeHtml(diagram.title) + "</title>",
    '<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@400;500;600&family=Inter:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap" rel="stylesheet">',
    "<style>",
    renderRootVariables(colors),
    ' :root { --sans: "Inter", system-ui, sans-serif; --serif: "Instrument Serif", Georgia, serif; --mono: "Geist Mono", ui-monospace, monospace; }',
    diagramCss,
    "</style>",
    "</head>",
    "<body>",
    '<main class="frame">',
    '<header class="diagram-topbar">',
    '<a class="diagram-back" href="' +
      escapeAttribute(returnHref) +
      '">← ' + escapeHtml(copy.backTo) + " " +
      escapeHtml(sourceTitle) +
      "</a>",
    '<div class="diagram-identity"><img src="' +
      escapeAttribute(logoDataUrl) +
      '" alt="' +
      escapeAttribute(config.brand.logoAlt) +
      '">' +
      escapeHtml(config.brand.name || config.siteTitle) +
      "</div>",
    "</header>",
    '<p class="eyebrow">' + escapeHtml(diagramKindLabel(diagram.kind)) + ' · DIAGRAM DESIGN</p>',
    "<h1>" + escapeHtml(diagram.title) + "</h1>",
    '<section data-standalone-visual>',
    '<div class="diagram-actions"><button type="button" data-copy-svg>' + escapeHtml(copy.copySvg) +
      '</button><button type="button" data-print>' + escapeHtml(copy.savePdf) +
      '</button><span class="action-status" data-action-status role="status" aria-live="polite"></span></div>',
    authoredSvg ? '<script type="application/json" data-artifact-svg>' + scriptSafeJson(svg) + "</script>" : "",
    '<div class="diagram-scroll">',
    visual,
    "</div>",
    "</section>",
    "</main>",
    "<script>window.__SEARCH_INDEX__ = []; window.__AURELIUS_MESSAGES__ = " + scriptSafeJson(copy) + ";</script>",
    "<script>" + siteJs + "</script>",
    "</body>",
    "</html>",
  ].join("\n");
}

function renderArchitectureFigure(document, diagram, colors, config) {
  if (diagram._mermaid) return renderMermaidFigure(document, diagram, config);
  if (diagram._html) return renderHtmlArtifactFigure(document, diagram, config);
  const copy = messages(config);
  const svg = renderDiagramSvg(diagram, colors, config);
  const authoredSvg = Boolean(diagram._svg);
  const visual = authoredSvg ? svgArtifactImage(svg, diagram) : svg;
  const standaloneHref = outputHref(
    document.id,
    path.posix.join("diagrams", diagram.id + ".html"),
  );
  return [
    '<figure class="diagram-figure">',
    '<div class="diagram-scroll">',
    visual,
    "</div>",
    '<figcaption class="figure-caption"><span>' + escapeHtml(copy.semanticSource) + ': <code>diagrams/' +
      escapeHtml(diagram.id) +
    '.json</code></span><span class="diagram-actions"><button type="button" data-copy-svg>' + escapeHtml(copy.copySvg) + '</button><a class="diagram-link" href="' +
      escapeAttribute(standaloneHref) +
      '" aria-label="' + escapeAttribute(copy.viewFullDiagram) + ': ' +
      escapeAttribute(diagram.title) +
      '">' + escapeHtml(copy.viewFullDiagram) + '</a><span class="action-status" data-action-status role="status" aria-live="polite"></span></span></figcaption>',
    authoredSvg ? '<script type="application/json" data-artifact-svg>' + scriptSafeJson(svg) + "</script>" : "",
    "</figure>",
  ].join("");
}

function renderMermaidFigure(document, diagram, config) {
  const copy = messages(config);
  const standaloneHref = outputHref(document.id, path.posix.join("diagrams", diagram.id + ".html"));
  return [
    '<figure class="diagram-figure mermaid-figure">',
    renderMermaidSurface(diagram, { config, openHref: standaloneHref }),
    '<details class="mermaid-summary"><summary>' + escapeHtml(copy.semanticReading) + "</summary><p>" +
      escapeHtml(diagram.summary || diagram.description) + "</p></details>",
    '<figcaption class="figure-caption"><span>' + escapeHtml(copy.declarativeSource) + ': <code>' +
      escapeHtml(mermaidSourceLabel(diagram, config)) + '</code></span><span class="diagram-actions"><button type="button" data-copy-mermaid>' +
      escapeHtml(copy.copyMermaid) + '</button><button type="button" data-copy-svg>' + escapeHtml(copy.copySvg) +
      '</button><span class="action-status" data-action-status role="status" aria-live="polite"></span></span></figcaption>',
    "</figure>",
  ].join("");
}

function renderHtmlArtifactFigure(document, diagram, config) {
  const copy = messages(config);
  const standaloneHref = outputHref(document.id, path.posix.join("diagrams", diagram.id + ".html"));
  const staticPrint = diagram._svg
    ? '<div class="html-artifact-static" aria-hidden="true">' + svgArtifactImage(diagram._svg, diagram, "artifact-image") + "</div>"
    : '<section class="html-artifact-print-text"><h3>' + escapeHtml(diagram.title) + '</h3><p>' + escapeHtml(diagram.summary) + "</p></section>";
  const svgAction = diagram._svg
    ? '<button type="button" data-copy-svg>' + escapeHtml(copy.copySvg) + "</button>"
    : "";
  return [
    '<figure class="diagram-figure html-artifact" data-html-artifact>',
    '<div class="html-artifact-stage">',
    htmlArtifactFrame(diagram),
    "</div>",
    htmlArtifactSummary(diagram, copy.semanticReading),
    staticPrint,
    '<script type="application/json" data-artifact-html>' + scriptSafeJson(diagram._html) + "</script>",
    diagram._svg ? '<script type="application/json" data-artifact-svg>' + scriptSafeJson(diagram._svg) + "</script>" : "",
    '<figcaption class="figure-caption"><span>' + escapeHtml(copy.semanticSource) + ': <code>diagrams/' +
      escapeHtml(diagram.id) + '.json</code> · ' + escapeHtml(copy.visualSource) + ': <code>' + escapeHtml(diagram.htmlSource) +
      '</code></span><span class="diagram-actions"><button type="button" data-copy-html>' +
      escapeHtml(copy.copyHtml) + "</button>" + svgAction + '<a class="diagram-link" href="' +
      escapeAttribute(standaloneHref) +
      '" aria-label="' + escapeAttribute(copy.viewFullDiagram) + ": " +
      escapeAttribute(diagram.title) + '">' + escapeHtml(copy.viewFullDiagram) + '</a><span class="action-status" data-action-status role="status" aria-live="polite"></span></span></figcaption>',
    "</figure>",
  ].join("");
}

function renderStandaloneHtmlArtifact(
  diagram,
  siteCss,
  siteJs,
  logoDataUrl,
  returnHref,
  sourceTitle,
  config,
) {
  const copy = messages(config);
  const staticPrint = diagram._svg
    ? '<div class="html-artifact-static" aria-hidden="true">' + svgArtifactImage(diagram._svg, diagram, "artifact-image") + "</div>"
    : '<section class="html-artifact-print-text"><h2>' + escapeHtml(diagram.title) + '</h2><p>' + escapeHtml(diagram.summary) + "</p></section>";
  const svgAction = diagram._svg
    ? '<button type="button" data-copy-svg>' + escapeHtml(copy.copySvg) + "</button>"
    : "";
  return [
    "<!DOCTYPE html>",
    '<html lang="' + escapeAttribute(config.language) + '">',
    "<head>", '<meta charset="UTF-8">', '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    "<title>" + escapeHtml(diagram.title) + "</title>",
    '<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@400;500;600&family=Inter:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap" rel="stylesheet">',
    "<style>", renderRootVariables(config.colors), siteCss,
    "@media print { @page { size: A4 landscape; margin: 12mm; } .standalone-page { height: auto; max-width: none; padding: 0; } .standalone-topbar, .diagram-actions, .html-artifact-summary { display: none !important; } .standalone-intro { margin-bottom: 8mm; } .standalone-intro h1 { font-size: 30pt; } .html-artifact-static .artifact-image { max-height: 145mm; object-fit: contain; } }",
    "</style>", "</head>", "<body>",
    '<main class="standalone-page html-artifact-page">',
    '<header class="standalone-topbar"><a class="standalone-back" href="' + escapeAttribute(returnHref) + '">← ' +
      escapeHtml(copy.backTo) + " " + escapeHtml(sourceTitle) + '</a><div class="standalone-identity"><img src="' +
      escapeAttribute(logoDataUrl) + '" alt="' + escapeAttribute(config.brand.logoAlt) + '">' +
      escapeHtml(config.brand.name || config.siteTitle) + "</div></header>",
    '<section class="standalone-intro"><p class="eyebrow">' + escapeHtml(diagramKindLabel(diagram.kind)) +
      ' · AUTHORED HTML</p><h1>' + escapeHtml(diagram.title) + '</h1><p class="lede">' +
      escapeHtml(diagram.description) + "</p></section>",
    '<section class="html-artifact" data-html-artifact><div class="diagram-actions"><button type="button" data-copy-html>' +
      escapeHtml(copy.copyHtml) + "</button>" + svgAction +
      '<button type="button" data-print>' + escapeHtml(copy.savePdf) + "</button>" +
      '<span class="action-status" data-action-status role="status" aria-live="polite"></span></div>' +
      '<script type="application/json" data-artifact-html>' + scriptSafeJson(diagram._html) + "</script>" +
      (diagram._svg ? '<script type="application/json" data-artifact-svg>' + scriptSafeJson(diagram._svg) + "</script>" : "") +
      '<div class="html-artifact-stage">' + htmlArtifactFrame(diagram, { eager: true }) + "</div>" +
      htmlArtifactSummary(diagram, copy.semanticReading) + staticPrint + "</section>",
    "</main>",
    "<script>window.__SEARCH_INDEX__ = []; window.__AURELIUS_MESSAGES__ = " + scriptSafeJson(copy) + ";</script>",
    "<script>" + siteJs + "</script>",
    "</body></html>",
  ].join("\n");
}

function renderCanvasFigure(diagram, colors, options = {}) {
  const config = options.config || { language: "pt-BR" };
  const copy = messages(config);
  const className =
    "canvas-shell" + (options.standalone ? " canvas-shell--standalone" : "");
  const openLink = options.openHref
    ? '<a class="canvas-open" href="' +
      escapeAttribute(options.openHref) +
      '">' + escapeHtml(copy.openFull) + '</a>'
    : "";
  const printAction = options.standalone
    ? '<button type="button" data-print>' + escapeHtml(copy.savePdf) + "</button>"
    : "";

  return [
    '<section class="' +
      className +
      '" data-canvas-shell aria-label="' + escapeAttribute(copy.interactiveCanvas) + '">',
    '<div class="canvas-toolbar">',
    "<p>" + escapeHtml(copy.canvasSource) + "</p>",
    '<div class="canvas-controls" aria-label="' + escapeAttribute(copy.canvasControls) + '">',
    '<button type="button" data-canvas-control="out" aria-label="' + escapeAttribute(copy.zoomOut) + '">−</button>',
    '<output class="canvas-zoom" data-canvas-zoom aria-label="' + escapeAttribute(copy.zoomLevel) + '" aria-live="polite">100%</output>',
    '<button type="button" data-canvas-control="in" aria-label="' + escapeAttribute(copy.zoomIn) + '">+</button>',
    '<button type="button" data-canvas-control="reset">' + escapeHtml(copy.reset) + '</button>',
    '<button type="button" data-canvas-control="full" aria-pressed="false">' + escapeHtml(copy.fullscreen) + '</button>',
    printAction,
    openLink,
    "</div>",
    "</div>",
    '<div class="canvas-scroll">',
    renderCanvasSvg(diagram, colors, config),
    "</div>",
    '<div class="canvas-detail" aria-live="polite">',
    '<p class="eyebrow">' + escapeHtml(copy.detail) + '</p>',
    '<div><h3 data-canvas-detail-title>' + escapeHtml(copy.selectPhase) + '</h3><p data-canvas-detail-summary>' + escapeHtml(copy.selectPhaseHelp) + '</p></div>',
    "</div>",
    "</section>",
  ].join("");
}

function renderStandaloneCanvas(
  diagram,
  colors,
  siteCss,
  siteJs,
  logoDataUrl,
  returnHref,
  sourceTitle,
  config,
) {
  const copy = messages(config);
  return [
    "<!DOCTYPE html>",
    '<html lang="' + escapeAttribute(config.language) + '">',
    "<head>",
    '<meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    "<title>" + escapeHtml(diagram.title) + "</title>",
    '<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@400;500;600&family=Inter:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap" rel="stylesheet">',
    "<style>",
    renderRootVariables(colors),
    siteCss,
    "@media print { @page { size: A4 landscape; margin: 12mm; } .standalone-page { height: auto; max-width: none; padding: 0; } .standalone-topbar, .canvas-toolbar, .canvas-detail { display: none !important; } .canvas-scroll svg { max-height: 175mm; } }",
    "</style>",
    "</head>",
    '<body class="canvas-standalone">',
    '<main class="standalone-page">',
    '<header class="standalone-topbar">',
    '<a class="standalone-back" href="' +
      escapeAttribute(returnHref) +
      '">← ' + escapeHtml(copy.backTo) + " " +
      escapeHtml(sourceTitle) +
      "</a>",
    '<div class="standalone-identity"><img src="' +
      escapeAttribute(logoDataUrl) +
      '" alt="' +
      escapeAttribute(config.brand.logoAlt) +
      '">' +
      escapeHtml(config.brand.name || config.siteTitle) +
      "</div>",
    "</header>",
    '<section class="standalone-intro"><p class="eyebrow">' + escapeHtml(copy.canvasMap) + '</p>',
    "<h1>" + escapeHtml(diagram.title) + "</h1>",
    '<p class="lede">' + escapeHtml(diagram.description) + "</p></section>",
    renderCanvasFigure(diagram, colors, { standalone: true, config }),
    "</main>",
    "<script>window.__SEARCH_INDEX__ = []; window.__AURELIUS_MESSAGES__ = " + scriptSafeJson(copy) + ";</script>",
    "<script>" + siteJs + "</script>",
    "</body>",
    "</html>",
  ].join("\n");
}

function contentHref(href, document) {
  const value = String(href).trim();
  if (/^asset:/i.test(value)) {
    return outputHref(
      document.id,
      path.posix.join("assets", safeAssetPath(value)),
    );
  }
  if (
    /^(?:https?:|mailto:|tel:)/i.test(value) ||
    value.startsWith("#") ||
    value.startsWith("/") ||
    /^(?:\.\.?\/)?[a-z0-9_@][^:\s]*$/i.test(value)
  ) {
    return value;
  }
  return null;
}

function linkAttributes(href) {
  return /^https?:\/\//i.test(href)
    ? ' target="_blank" rel="noopener noreferrer"'
    : "";
}

function renderInline(text, document, documentMap) {
  let result = escapeHtml(text);
  result = result.replace(
    /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
    (_, targetWithAnchor, label) => {
      const [target, anchor] = targetWithAnchor.split("#", 2);
      const match = [...documentMap.values()].find(
        (item) =>
          (target === "" && item.id === document.id) ||
          item.title === target ||
          item.id === target,
      );
      if (!match) return escapeHtml(label || targetWithAnchor);
      return (
        '<a href="' +
        escapeAttribute(
          pageHref(document.id, match.id) +
            (anchor ? "#" + slugify(anchor) : ""),
        ) +
        '">' +
        escapeHtml(label || match.title) +
        "</a>"
      );
    },
  );
  result = result.replace(
    /!\[([^\]]*)\]\(([^\s)]+)(?:\s+&quot;([^)]*)&quot;)?\)/g,
    (_, alt, href, title) => {
      const safeHref = contentHref(href, document);
      if (!safeHref) return escapeHtml(alt);
      return (
        '<img src="' +
        escapeAttribute(safeHref) +
        '" alt="' +
        escapeAttribute(alt) +
        '" loading="lazy" decoding="async"' +
        (title ? ' title="' + escapeAttribute(title) + '"' : "") +
        ">"
      );
    },
  );
  result = result.replace(
    /\[([^\]]+)\]\(([^\s)]+)(?:\s+&quot;[^)]*&quot;)?\)/g,
    (_, label, href) => {
      const docReference = href.match(/^doc:([a-z0-9-]+)(?:#(.+))?$/i);
      if (!docReference) {
        const safeHref = contentHref(href, document);
        if (!safeHref) return label;
        return (
          '<a href="' +
          escapeAttribute(safeHref) +
          '"' +
          linkAttributes(safeHref) +
          ">" +
          label +
          "</a>"
        );
      }
      const target = documentMap.get(docReference[1]);
      if (!target) return escapeHtml(label);
      return (
        '<a href="' +
        escapeAttribute(
          pageHref(document.id, target.id) +
            (docReference[2] ? "#" + slugify(docReference[2]) : ""),
        ) +
        '">' +
        label +
        "</a>"
      );
    },
  );
  result = result.replace(/`([^`]+)`/g, "<code>$1</code>");
  result = result.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  result = result.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  result = result.replace(/~~([^~]+)~~/g, "<del>$1</del>");
  return result;
}

function renderCodeBlock(language, code, config) {
  const copy = messages(config);
  const english = String(config?.language || "").toLowerCase().startsWith("en");
  const label = language
    ? language === "mermaid"
      ? english ? "MERMAID · PRESERVED TECHNICAL SOURCE" : "MERMAID · FONTE TÉCNICA PRESERVADA"
      : language.toLocaleUpperCase("pt-BR")
    : english ? "CODE" : "CÓDIGO";
  return [
    '<figure class="code-figure">',
    '<figcaption><span class="eyebrow">' +
      escapeHtml(label) +
      '</span><span class="diagram-actions"><button class="copy-code" type="button" data-copy-code>' + escapeHtml(copy.copyMarkdown.replace("Markdown", "").trim() || "Copy") + '</button><span class="action-status" data-action-status role="status" aria-live="polite"></span></span></figcaption>',
    '<pre><code class="language-' +
      escapeAttribute(language || "plain") +
      '">' +
      escapeHtml(code) +
      "</code></pre>",
    "</figure>",
  ].join("");
}

function renderTableRow(cells, document, context, tag) {
  return (
    "<tr>" +
    cells
      .map(
        (cell) =>
          "<" +
          tag +
          ">" +
          renderInline(cell.trim(), document, context.documentMap) +
          "</" +
          tag + ">",
      )
      .join("") +
    "</tr>"
  );
}

function tableCells(line) {
  return line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|");
}

function isTableSeparator(line) {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(
    line,
  );
}

function renderMarkdown(document, context) {
  const lines = document.body.split(/\r?\n/);
  const result = [];
  let paragraph = [];
  let listTag = null;
  let code = null;
  const nextHeadingSlug = createHeadingSlugger();

  const closeParagraph = () => {
    if (!paragraph.length) return;
    result.push(
      "<p>" +
        renderInline(paragraph.join(" "), document, context.documentMap) +
        "</p>",
    );
    paragraph = [];
  };

  const closeList = () => {
    if (!listTag) return;
    result.push("</" + listTag + ">");
    listTag = null;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const fence = line.match(/^```([^\s]*)\s*$/);
    if (code) {
      if (fence) {
        result.push(renderCodeBlock(code.language, code.lines.join("\n"), context.config));
        code = null;
      } else {
        code.lines.push(line);
      }
      continue;
    }

    if (fence) {
      closeParagraph();
      closeList();
      code = { language: fence[1], lines: [] };
      continue;
    }

    if (line.trim() === "{{renderer-gallery}}") {
      closeParagraph();
      closeList();
      result.push(renderRendererGallery());
      continue;
    }

    const token = line.trim().match(/^\{\{(diagram|canvas):([^}]+)\}\}$/);
    if (token) {
      closeParagraph();
      closeList();
      const diagram = context.diagramMap.get(token[2]);
      if (!diagram)
        throw new Error("Token aponta para diagrama ausente: " + token[2]);
      result.push(
        token[1] === "diagram"
          ? renderArchitectureFigure(document, diagram, context.colors, context.config)
          : renderCanvasFigure(diagram, context.colors, {
              config: context.config,
              openHref: outputHref(
                document.id,
                path.posix.join("diagrams", diagram.id + ".html"),
              ),
            }),
      );
      continue;
    }

    if (line.includes("|") && isTableSeparator(lines[index + 1] || "")) {
      closeParagraph();
      closeList();
      const header = tableCells(line);
      const rows = [];
      index += 2;
      while (
        index < lines.length &&
        lines[index].trim() &&
        lines[index].includes("|")
      ) {
        rows.push(tableCells(lines[index]));
        index += 1;
      }
      index -= 1;
      result.push(
        '<div class="table-scroll"><table><thead>' +
          renderTableRow(header, document, context, "th") +
          "</thead><tbody>" +
          rows
            .map((row) => renderTableRow(row, document, context, "td"))
            .join("") +
          "</tbody></table></div>",
      );
      continue;
    }

    const callout = line.match(/^>\s*\[!([\w-]+)\]\s*(.*)$/i);
    if (callout) {
      closeParagraph();
      closeList();
      const content = [];
      index += 1;
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        content.push(lines[index].replace(/^>\s?/, ""));
        index += 1;
      }
      index -= 1;
      result.push(
        '<aside class="callout" data-callout="' +
          escapeAttribute(callout[1].toLocaleLowerCase("pt-BR")) +
          '"><p class="eyebrow">' +
          escapeHtml(callout[2] || callout[1]) +
          "</p><p>" +
          renderInline(content.join(" "), document, context.documentMap) +
          "</p></aside>",
      );
      continue;
    }

    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      closeParagraph();
      closeList();
      result.push(
        "<blockquote><p>" +
          renderInline(quote[1], document, context.documentMap) +
          "</p></blockquote>",
      );
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      closeParagraph();
      closeList();
      const level = heading[1].length;
      const id = nextHeadingSlug(plainHeading(heading[2]));
      result.push(
        "<h" +
          level +
          ' id="' +
          escapeAttribute(id) +
          '">' +
          renderInline(heading[2], document, context.documentMap) +
          "</h" +
          level +
          ">",
      );
      continue;
    }

    const item = line.match(/^[-*]\s+(.+)$/);
    const orderedItem = line.match(/^\d+\.\s+(.+)$/);
    const listItem = item || orderedItem;
    if (listItem) {
      closeParagraph();
      const tag = orderedItem ? "ol" : "ul";
      if (listTag && listTag !== tag) closeList();
      if (!listTag) {
        result.push("<" + tag + ">");
        listTag = tag;
      }
      const task = listItem[1].match(/^\[([ xX])\]\s+(.+)$/);
      result.push(
        '<li' +
          (task ? ' class="task-item"' : "") +
          ">" +
          (task
            ? '<span class="task-box" aria-hidden="true">' +
              (task[1].toLocaleLowerCase("pt-BR") === "x" ? "✓" : "") +
              "</span>" +
              renderInline(task[2], document, context.documentMap)
            : renderInline(listItem[1], document, context.documentMap)) +
          "</li>",
      );
      continue;
    }

    if (/^---+\s*$/.test(line)) {
      closeParagraph();
      closeList();
      result.push("<hr>");
      continue;
    }

    if (!line.trim()) {
      closeParagraph();
      closeList();
      continue;
    }

    paragraph.push(line.trim());
  }

  if (code) result.push(renderCodeBlock(code.language, code.lines.join("\n"), context.config));
  closeParagraph();
  closeList();
  return result.join("\n");
}

function renderMetadata(document, context) {
  const copy = messages(context.config);
  const refs = document.sourceRefs
    .map((reference) =>
      /^https?:\/\//i.test(reference)
        ? '<a href="' +
          escapeAttribute(reference) +
          '" target="_blank" rel="noopener noreferrer">' +
          escapeHtml(reference) +
          "</a>"
        : "<code>" + escapeHtml(reference) + "</code>",
    )
    .join("<br>");
  const related = document.related
    .map((id) => {
      const relatedDocument = context.documentMap.get(id);
      return relatedDocument
        ? '<a href="' +
            escapeAttribute(pageHref(document.id, id)) +
            '">' +
            escapeHtml(relatedDocument.title) +
            "</a>"
        : "<code>" + escapeHtml(id) + "</code>";
    })
    .join("<br>");
  const tags = document.tags
    .map((tag) => '<span class="tag">' + escapeHtml(tag) + "</span>")
    .join(" ");
  const authors = document.authors.map(escapeHtml).join(", ");
  const empty = '<span class="meta-empty">—</span>';

  return [
    '<section class="meta-panel" aria-label="' + escapeAttribute(copy.metadata) + '">',
    "<h2>" + escapeHtml(copy.noteContract) + "</h2>",
    "<dl>",
    "<dt>" + escapeHtml(copy.metadataId) + "</dt><dd><code>" + escapeHtml(document.id) + "</code></dd>",
    "<dt>" + escapeHtml(copy.status) + "</dt><dd>" + escapeHtml(document.status) + "</dd>",
    "<dt>" + escapeHtml(copy.visibility) + "</dt><dd>" + escapeHtml(document.visibility) + "</dd>",
    document.updated
      ? "<dt>" + escapeHtml(copy.updated) + "</dt><dd><time datetime=\"" +
        escapeAttribute(document.updated) +
        '\">' +
        escapeHtml(document.updated) +
        "</time></dd>"
      : "",
    "<dt>" + escapeHtml(copy.tags) + "</dt><dd>" + (tags || empty) + "</dd>",
    "<dt>" + escapeHtml(copy.authors) + "</dt><dd>" + (authors || empty) + "</dd>",
    "<dt>" + escapeHtml(copy.relations) + "</dt><dd>" + (related || empty) + "</dd>",
    "<dt>" + escapeHtml(copy.sources) + "</dt><dd>" + (refs || empty) + "</dd>",
    "</dl>",
    "</section>",
  ].join("");
}

function renderTableOfContents(document, config) {
  const copy = messages(config);
  if (!document.sections.length) return "";
  return [
    '<nav class="toc" aria-label="' + escapeAttribute(copy.onThisPage) + '">',
    "<h2>" + escapeHtml(copy.onThisPage) + "</h2>",
    ...document.sections.map(
      (section) =>
        '<a class="toc-level-' +
        section.level +
        '" href="#' +
        escapeAttribute(section.id) +
        '">' +
        escapeHtml(section.title) +
        "</a>",
    ),
    "</nav>",
  ].join("");
}

function renderMachineLinks(document, config) {
  const copy = messages(config);
  return [
    '<section class="machine-links" aria-label="' + escapeAttribute(copy.pageFormats) + '">',
    "<h2>" + escapeHtml(copy.otherFormats) + "</h2>",
    '<a href="' +
      escapeAttribute(
        outputHref(
          document.id,
          path.posix.join("markdown", document.id + ".md"),
        ),
      ) +
      '">Markdown</a>',
    '<a href="' +
      escapeAttribute(
        outputHref(
          document.id,
          path.posix.join("api", "documents", document.id + ".json"),
        ),
      ) +
      '">' + escapeHtml(copy.apiJson) + '</a>',
    "</section>",
  ].join("");
}

function renderDocumentSidebar(document, context) {
  return [
    '<aside class="document-sidebar">',
    renderTableOfContents(document, context.config),
    renderMetadata(document, context),
    renderMachineLinks(document, context.config),
    "</aside>",
  ].join("");
}

function renderArticleActions(document, config) {
  const copy = messages(config);
  return [
    '<div class="article-actions" aria-label="' + escapeAttribute(copy.documentActions) + '">',
    '<button type="button" data-copy-markdown>' + escapeHtml(copy.copyMarkdown) + '</button>',
    '<button type="button" data-print>' + escapeHtml(copy.savePdf) + '</button>',
    '<button type="button" data-copy-link>' + escapeHtml(copy.copyLink) + '</button>',
    '<span class="action-status" data-action-status role="status" aria-live="polite"></span>',
    "</div>",
  ].join("");
}

function replaceTokensOutsideCode(markdown, replace) {
  let fenced = false;
  return String(markdown).split(/(\r?\n)/).map((part) => {
    if (/^```/.test(part.trim())) {
      fenced = !fenced;
      return part;
    }
    return fenced ? part : replace(part);
  }).join("");
}

function markdownForCopy(document, context) {
  const copy = messages(context.config);
  return replaceTokensOutsideCode(document.raw, (line) => {
    if (line.trim() === "{{renderer-gallery}}") return rendererGalleryMarkdown();
    const token = line.trim().match(/^\{\{(diagram|canvas):([^}]+)}}$/);
    if (!token) return line;
    const kind = token[1];
    const rawId = token[2];
    const id = String(rawId).trim();
    const diagram = context.diagramMap.get(id);
    if (!diagram) return line;
    const label = kind === "canvas" ? copy.canvas : copy.diagram;
    const source = diagram._html
      ? "> HTML visual source: `" + diagram.htmlSource + "`"
      : diagram._mermaid
        ? "> " + copy.declarativeSource + ": `" + mermaidSourceLabel(diagram, context.config) + "`"
        : "";
    return [
      "> **" + label + ": " + diagram.title + "**",
      "> " + diagram.description,
      diagram.summary && diagram.summary !== diagram.description ? "> " + copy.semanticReading + ": " + diagram.summary : "",
      "> " + copy.semanticSource + ": `diagrams/" + id + ".json`",
      diagram.data ? "> " + copy.structuredData + ": `api/diagrams/" + id + ".json`" : "",
      source,
    ].filter(Boolean).join("\n");
  });
}

function documentOrder(documents, config) {
  const byId = new Map(documents.map((document) => [document.id, document]));
  const ids = [
    ...config.navigation.sections.flatMap((section) => navigationItemIds(section.items)),
    ...config.navigation.primary,
  ];
  const ordered = [...new Set(ids)].map((id) => byId.get(id)).filter(Boolean);
  for (const document of documents) {
    if (!ordered.includes(document)) ordered.push(document);
  }
  return ordered;
}

function renderPager(document, documents, config) {
  const copy = messages(config);
  const ordered = documentOrder(documents, config);
  const index = ordered.findIndex((item) => item.id === document.id);
  const previous = ordered[index - 1];
  const next = ordered[index + 1];
  if (!previous && !next) return "";
  const item = (target, direction) =>
    target
      ? '<a class="pager-' +
        direction +
        '" href="' +
        escapeAttribute(pageHref(document.id, target.id)) +
        '"><span>' +
        (direction === "previous" ? copy.previous : copy.next) +
        "</span><strong>" +
        escapeHtml(target.title) +
        "</strong></a>"
      : "<span></span>";
  return (
    '<nav class="pager" aria-label="' + escapeAttribute(copy.pager) + '">' +
    item(previous, "previous") +
    item(next, "next") +
    "</nav>"
  );
}

function renderAgentCards(fromDocument, config) {
  const copy = messages(config);
  const apiBase = outputHref(fromDocument.id, "api");
  return [
    '<div class="api-grid">',
    '<section class="api-card"><p class="eyebrow">' + escapeHtml(copy.apiReading) + "</p><h3>" + escapeHtml(copy.documentById) + "</h3><p>" + escapeHtml(copy.htmlEditorialLayer) + "</p><code>" +
      escapeHtml(apiBase + "/documents/{id}.json") +
      "</code></section>",
    '<section class="api-card"><p class="eyebrow">' + escapeHtml(copy.indexAndGraph) + "</p><h3>" + escapeHtml(copy.predictableDiscovery) + "</h3><p>" + escapeHtml(copy.agentDiscovery) + "</p><code>" +
      escapeHtml(apiBase + "/index.json") +
      "<br>" +
      escapeHtml(apiBase + "/graph.json") +
      "</code></section>",
    "</div>",
  ].join("");
}

function renderNavigation(currentDocument, documents, config, logoDataUrl) {
  const copy = messages(config);
  const byId = new Map(documents.map((document) => [document.id, document]));
  const repositoryUrl = config.repository?.url || "";
  const repositoryLabel = escapeHtml(copy.repository);
  const repositoryLink = repositoryUrl
    ? '<a class="repo-link" href="' + escapeAttribute(repositoryUrl) + '" target="_blank" rel="noopener noreferrer" aria-label="' + escapeAttribute(copy.repository) + '" title="' + escapeAttribute(copy.repository) + '"><svg viewBox="0 0 78 78" aria-hidden="true" focusable="false"><path fill="#f03c2e" transform="translate(10 10) rotate(-45 29 29)" d="M5,58c-2.76142,0 -5,-2.23858 -5,-5v-48c0,-2.76142 2.23858,-5 5,-5h33v12.54404c-2.06553,0.94801 -3.5,3.03446 -3.5,5.45596c0,0.73514 0.13221,1.43941 0.37415,2.09031l-15.28384,15.28384c-0.6509,-0.24194 -1.35517,-0.37415 -2.09031,-0.37415c-3.31371,0 -6,2.68629 -6,6c0,3.31371 2.68629,6 6,6c3.31371,0 6,-2.68629 6,-6c0,-0.73514 -0.13221,-1.43941 -0.37415,-2.09031l14.87415,-14.87415l0,11.50851c-2.06553,0.94801 -3.5,3.03446 -3.5,5.45596c0,3.31371 2.68629,6 6,6c3.31371,0 6,-2.68629 6,-6c0,-2.42149 -1.43447,-4.50795 -3.5,-5.45596l0,-12.08808c2.06553,-0.94801 3.5,-3.03446 3.5,-5.45596c0,-2.42149 -1.43447,-4.50795 -3.5,-5.45596l0,-12.54404h10c2.76142,0 5,2.23858 5,5v48c0,2.76142 -2.23858,5 -5,5z"></path></svg></a>'
    : "";
  const visibleRepositoryLink = repositoryLink.replace("</svg></a>", "<span>" + repositoryLabel + "</span></a>");
  const navigationLabel = (document) => {
    const title = document.id === "home" ? copy.home : document.title;
    const prefix = typeof config.navigation?.labelPrefix === "string" ? config.navigation.labelPrefix : "";
    return prefix && title.startsWith(prefix) ? title.slice(prefix.length).trimStart() : title;
  };
  const links = config.navigation.primary
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((document) => {
      const current =
        document.id === currentDocument.id ? ' aria-current="page"' : "";
      return (
        '<a href="' +
        escapeAttribute(pageHref(currentDocument.id, document.id)) +
        '"' +
        current +
        ">" +
        escapeHtml(navigationLabel(document)) +
        "</a>"
      );
    })
    .join("");

  return [
    '<header class="masthead">',
    '<a class="brand" href="' +
      escapeAttribute(pageHref(currentDocument.id, "home")) +
      '"><img class="brand-logo" src="' +
      escapeAttribute(logoDataUrl) +
      '" alt="' +
      escapeAttribute(config.brand.logoAlt) +
      '"><span class="brand-title">' +
      escapeHtml(config.brand.title || "Documentação") +
      '</span><span class="brand-kicker">' +
      escapeHtml(config.brand.kicker || config.framework?.name || "aurelius") +
      "</span></a>",
    '<nav class="nav" aria-label="' + escapeAttribute(copy.primaryNavigation) + '">' + links + "</nav>",
    '<div class="masthead-tools">', visibleRepositoryLink,
    '<div class="search"><label class="sr-only" for="site-search">' + escapeHtml(copy.search) + '</label><input id="site-search" data-search-input type="search" autocomplete="off" placeholder="' + escapeAttribute(copy.searchPlaceholder) + '" aria-controls="site-search-results" aria-expanded="false"><kbd>⌘ K</kbd><div id="site-search-results" class="search-results" data-search-results role="listbox"></div></div>',
    "</div>",
    "</header>",
  ].join("");
}

function renderSiteSidebar(currentDocument, documents, config) {
  const copy = messages(config);
  const byId = new Map(documents.map((document) => [document.id, document]));
  const navigationLabel = (document) => {
    const prefix = typeof config.navigation?.labelPrefix === "string" ? config.navigation.labelPrefix : "";
    return prefix && document.title.startsWith(prefix) ? document.title.slice(prefix.length).trimStart() : document.title;
  };
  const containsCurrent = (items) => navigationItemIds(items).includes(currentDocument.id);
  const renderItems = (items, groupPath) => items.map((item, index) => {
    const itemPath = groupPath + "-" + index;
    if (typeof item === "string") {
      const document = byId.get(item);
      return document
        ? '<a href="' + escapeAttribute(pageHref(currentDocument.id, document.id)) + '"' +
          (document.id === currentDocument.id ? ' aria-current="page"' : "") + '>' +
          escapeHtml(navigationLabel(document)) + "</a>"
        : "";
    }
    const nestedItems = item.items || [];
    const nested = renderItems(nestedItems, itemPath);
    return nested
      ? '<details class="nav-folder" data-nav-group="' + escapeAttribute(itemPath) + '"' +
        (containsCurrent(nestedItems) ? " open" : "") + '><summary>' + escapeHtml(item.label) +
        '</summary><div class="nav-children">' + nested + "</div></details>"
      : "";
  }).join("");
  const sections = config.navigation.sections.map((section, index) => {
    const groupPath = "section-" + index;
    const items = section.items || [];
    const links = renderItems(items, groupPath);
    return links ? '<details class="nav-section" data-nav-group="' + groupPath + '"' +
      (containsCurrent(items) ? " open" : "") + '><summary>' + escapeHtml(section.label) +
      '</summary><div class="nav-children">' + links + "</div></details>" : "";
  }).join("");
  return '<aside class="site-sidebar"><details class="site-sidebar-drawer" data-nav-drawer open><summary>' +
    escapeHtml(copy.documentationNavigation) + '</summary><nav aria-label="' + escapeAttribute(copy.documentationNavigation) + '">' + sections + '</nav></details></aside>';
}

function renderHtmlDocument(document, documents, config, context) {
  const copy = messages(config);
  const hasMermaid = [...context.diagramMap.values()].some(
    (diagram) => diagram._mermaid && documentUsesDiagram(document, diagram.id),
  );
  const article = [
    '<main class="page">',
    '<div class="docs-layout">',
    renderSiteSidebar(document, documents, config),
    "<article>",
    '<header class="article-header">',
    '<p class="eyebrow">' +
      escapeHtml(document.type) +
      " · " +
      escapeHtml(document.status) +
      "</p>",
    "<h1>" + escapeHtml(document.title) + "</h1>",
    '<p class="lede">' + escapeHtml(document.description) + "</p>",
    renderArticleActions(document, config),
    "</header>",
    '<div class="article-grid">',
    '<div class="prose">',
    document.id === "home"
      ? '<p class="notice">' + escapeHtml(copy.siteProjection) + '</p>'
      : "",
    renderMarkdown(document, context),
    document.id === "agents" ? renderAgentCards(document, config) : "",
    "</div>",
    renderDocumentSidebar(document, context),
    "</div>",
    renderPager(document, documents, config),
    "</article>",
    "</div>",
    "</main>",
  ].join("");

  const searchIndex = documents.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    type: item.type,
    status: item.status,
    tags: item.tags,
    href: pageHref(document.id, item.id),
    search: [
      item.title,
      item.description,
      item.tags.join(" "),
      item.sections
        .map((section) => section.title + " " + section.text)
        .join(" "),
      [...context.diagramMap.values()]
        .filter((diagram) => documentUsesDiagram(item, diagram.id))
        .map((diagram) => [diagram.title, diagram.description, diagram.summary || "", JSON.stringify(diagram.data || {})].join(" "))
        .join(" "),
    ]
      .join(" ")
      .toLocaleLowerCase("pt-BR"),
  }));

  return [
    "<!DOCTYPE html>",
    '<html lang="' + escapeAttribute(config.language) + '">',
    "<head>",
    '<meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '<meta name="theme-color" content="' +
      escapeAttribute(config.colors.paper) +
      '">',
    '<meta property="og:type" content="article">',
    '<meta property="og:title" content="' +
      escapeAttribute(document.title) +
      '">',
    '<meta property="og:description" content="' +
      escapeAttribute(document.description) +
      '">',
    '<meta name="description" content="' +
      escapeAttribute(document.description) +
      '">',
    "<title>" +
      escapeHtml(document.title) +
      " · " +
    escapeHtml(config.siteTitle) +
    "</title>",
    '<link rel="icon" href="' + escapeAttribute(context.logoDataUrl) + '">',
    '<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@400;500;600&family=Inter:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap" rel="stylesheet">',
    "<style>",
    renderRootVariables(config.colors),
    awaitReadPlaceholder,
    "</style>",
    "</head>",
    "<body>",
    '<div class="reading-progress" data-reading-progress aria-hidden="true"></div>',
    '<div class="shell">',
    renderNavigation(document, documents, config, context.logoDataUrl),
    article,
    '<footer class="footer"><span>' +
      escapeHtml(config.footer?.left || copy.staticDocumentation) +
      "</span><span>" +
      escapeHtml(config.footer?.right || copy.sourceForReaders) +
      "</span></footer>",
    "</div>",
    "<script>window.__SEARCH_INDEX__ = " +
      scriptSafeJson(searchIndex) +
      ";</script>",
    "<script>window.__AURELIUS_MESSAGES__ = " + scriptSafeJson(copy) + ";</script>",
    '<script id="document-markdown" type="application/json">' +
      scriptSafeJson(markdownForCopy(document, context)) +
      "</script>",
    hasMermaid
      ? mermaidScripts(documentOutputPath(document), config, context.mermaidJs)
      : "",
    siteJsPlaceholder,
    "</body>",
    "</html>",
  ].join("\n");
}

function replacePlaceholders(html, siteCss, siteJs) {
  return html
    .replace(awaitReadPlaceholder, siteCss)
    .replace(siteJsPlaceholder, "<script>" + siteJs + "</script>");
}

function renderLlmsIndex(config, documents, diagrams) {
  const english = String(config.language || "").toLowerCase().startsWith("en");
  if (english) return [
    "# " + config.siteTitle, "", "> " + config.siteDescription, "",
    "## Reading for agents", "",
    "- [API manifest](api/manifest.json): entry points and version.",
    "- [Document index](api/index.json): structured discovery.",
    "- [Relationship graph](api/graph.json): how documents connect.",
    "- [Search](api/search.json): titles, tags, and sections.",
    "- [Full corpus](llms-full.txt): every document as Markdown.", "",
    "## Documents", "",
    ...documents.map((document) => "- [" + document.title + "](./" + documentOutputPath(document).replace(/index\.html$/, "") + ") — " + document.description + " ([Markdown](./markdown/" + document.id + ".md) · [JSON](./api/documents/" + document.id + ".json))"),
    "", "## Diagrams", "",
    ...diagrams.map((diagram) => "- [" + diagram.title + "](./diagrams/" + diagram.id + ".html) — JSON source: `api/diagrams/" + diagram.id + ".json`."), "",
  ].join("\n");
  return [
    "# " + config.siteTitle,
    "",
    "> " + config.siteDescription,
    "",
    "## Leitura por agentes",
    "",
    "- [Manifesto da API](api/manifest.json): pontos de entrada e versão.",
    "- [Índice de documentos](api/index.json): descoberta estruturada.",
    "- [Grafo de relações](api/graph.json): como os documentos se conectam.",
    "- [Busca](api/search.json): títulos, tags e seções.",
    "- [Corpus completo](llms-full.txt): todos os documentos em Markdown.",
    "",
    "## Documentos",
    "",
    ...documents.map(
      (document) =>
        "- [" +
        document.title +
        "](./" +
        documentOutputPath(document).replace(/index\.html$/, "") +
        ") — " +
        document.description +
        " ([Markdown](./markdown/" +
        document.id +
        ".md) · [JSON](./api/documents/" +
        document.id +
        ".json))",
    ),
    "",
    "## Diagramas",
    "",
    ...diagrams.map(
      (diagram) =>
        "- [" +
        diagram.title +
        "](./diagrams/" +
        diagram.id +
        ".html) — fonte JSON: `api/diagrams/" +
        diagram.id +
        ".json`.",
    ),
    "",
  ].join("\n");
}

function renderLlmsFull(config, documents, context) {
  return [
    "# " + config.siteTitle,
    "",
    "> " + config.siteDescription,
    "",
    ...documents.flatMap((document) => [
      "---",
      "",
      "<!-- aurelius:id=" + document.id + " -->",
      "",
      markdownForCopy(document, context).trim(),
      "",
    ]),
  ].join("\n");
}

const awaitReadPlaceholder = "__SITE_CSS__";
const siteJsPlaceholder = "__SITE_JS__";

async function writeOutput(relativeFile, content) {
  const file = path.join(outputDirectory, relativeFile);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content, "utf8");
}

async function copyPublicAssets() {
  try {
    await cp(path.join(siteRoot, "assets"), path.join(outputDirectory, "assets"), {
      recursive: true,
      force: true,
    });
  } catch (error) {
    if (error && error.code === "ENOENT") return;
    throw error;
  }
}

async function copyMermaidRuntime() {
  const target = path.join(outputDirectory, "assets", "aurelius", "mermaid.min.js");
  await mkdir(path.dirname(target), { recursive: true });
  await cp(mermaidBrowserBundle, target, { force: true });
}

function pathsOverlap(left, right) {
  const relative = path.relative(left, right);
  return !relative || (!relative.startsWith(".." + path.sep) && !path.isAbsolute(relative));
}

async function canonicalDestination(target) {
  const missing = [];
  let current = target;
  while (true) {
    try {
      return path.join(await realpath(current), ...missing.reverse());
    } catch (error) {
      if (!error || error.code !== "ENOENT") throw error;
      const parent = path.dirname(current);
      if (parent === current) throw error;
      missing.push(path.basename(current));
      current = parent;
    }
  }
}

async function assertSafeOutputDirectory(runtimeDirectory) {
  const relative = path.relative(siteRoot, outputDirectory);
  if (!relative || relative.startsWith(".." + path.sep) || path.isAbsolute(relative)) {
    throw new Error("outputDirectory precisa ser um subdiretório do site: " + outputDirectory);
  }
  const protectedPaths = [
    path.join(siteRoot, "site.config.json"),
    contentDirectory,
    diagramsDirectory,
    path.join(siteRoot, "assets"),
  ];
  if (pathsOverlap(siteRoot, runtimeDirectory)) protectedPaths.push(runtimeDirectory);
  const canonicalOutput = await canonicalDestination(outputDirectory);
  const canonicalSources = await Promise.all(protectedPaths.map(canonicalDestination));
  const conflictIndex = canonicalSources.findIndex((source) => pathsOverlap(canonicalOutput, source) || pathsOverlap(source, canonicalOutput));
  const conflict = conflictIndex >= 0 ? protectedPaths[conflictIndex] : null;
  if (conflict) {
    throw new Error(
      "outputDirectory não pode coincidir nem ficar dentro de uma fonte do site: " +
        path.relative(siteRoot, conflict) + ". Use uma pasta dedicada, como `dist`.",
    );
  }
}

async function build({ checkOnly = process.argv.includes("--check") } = {}) {
  if (!siteRoot) {
    throw new Error(
      "Informe o site a gerar: aurelius build --site caminho/para/o-site",
    );
  }

  const config = normalizedConfig(
    await readJson(path.join(siteRoot, "site.config.json")),
  );
  const runtimeDirectory = config.framework?.runtime
    ? path.resolve(siteRoot, config.framework.runtime)
    : path.join(frameworkRoot, "runtime");
  outputDirectory = path.resolve(siteRoot, config.outputDirectory || "dist");
  await assertSafeOutputDirectory(runtimeDirectory);

  const [documents, diagrams, siteCss, siteJs, diagramCss, mermaidJs, editorialMermaidJs] = await Promise.all([
    readDocuments(),
    readDiagrams(),
    readFile(path.join(runtimeDirectory, "site.css"), "utf8"),
    readFile(path.join(runtimeDirectory, "site.js"), "utf8"),
    readFile(path.join(runtimeDirectory, "diagram.css"), "utf8"),
    readFile(path.join(frameworkRoot, "runtime", "mermaid.js"), "utf8"),
    readFile(path.join(frameworkRoot, "runtime", "editorial-mermaid.js"), "utf8"),
  ]);

  if (!config.brand || !config.brand.logoSource) {
    throw new Error(
      "A configuração da marca precisa declarar brand.logoSource",
    );
  }

  const logoSource = resolveSiteSource(config.brand.logoSource, "brand.logoSource");
  await ensureExists(logoSource, "Logo ausente: " + config.brand.logoSource);
  const logoDataUrl =
    "data:" +
    logoMimeType(logoSource) +
    ";base64," +
    (await readFile(logoSource)).toString("base64");

  await validate(documents, diagrams, config, siteRoot);

  if (checkOnly) {
    console.log(
      "Documentação válida: " +
        documents.length +
        " documentos e " +
        diagrams.length +
        " diagramas.",
    );
    return;
  }

  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(outputDirectory, { recursive: true });
  await copyPublicAssets();
  if (diagrams.some((diagram) => diagram._mermaid)) await copyMermaidRuntime();

  const documentMap = new Map(
    documents.map((document) => [document.id, document]),
  );
  const diagramMap = new Map(diagrams.map((diagram) => [diagram.id, diagram]));
  const context = {
    documentMap,
    diagramMap,
    colors: config.colors,
    config,
    logoDataUrl,
    mermaidJs: editorialMermaidJs + "\n" + mermaidJs,
  };

  for (const document of documents) {
    const html = replacePlaceholders(
      renderHtmlDocument(document, documents, config, context),
      siteCss,
      siteJs,
    );
    await writeOutput(documentOutputPath(document), html);
  }

  for (const diagram of diagrams) {
    const sourceDocument = documents.find((document) => documentUsesDiagram(document, diagram.id));
    if (!sourceDocument) {
      throw new Error("Diagrama sem página de origem: " + diagram.id);
    }

    const diagramOutput = path.posix.join("diagrams", diagram.id + ".html");
    const returnHref = relativeOutputHref(
      diagramOutput,
      documentOutputPath(sourceDocument),
    );

    if (diagram._mermaid) {
      await writeOutput(
        diagramOutput,
        renderStandaloneMermaid(
          diagram,
          diagramCss,
          siteJs,
          context.mermaidJs,
          logoDataUrl,
          returnHref,
          sourceDocument.title,
          config,
        ),
      );
      continue;
    }

    if (diagram._html) {
      await writeOutput(
        diagramOutput,
        renderStandaloneHtmlArtifact(
          diagram,
          siteCss,
          siteJs,
          logoDataUrl,
          returnHref,
          sourceDocument.title,
          config,
        ),
      );
      continue;
    }

    if (diagram.kind !== "canvas") {
      await writeOutput(
        diagramOutput,
        renderStandaloneDiagram(
          diagram,
          config.colors,
          diagramCss,
          siteJs,
          logoDataUrl,
          returnHref,
          sourceDocument.title,
          config,
        ),
      );
      // Authored SVG is isolated as a data image and exposed through Copy SVG;
      // only SVG generated by Aurelius itself is emitted as a public file.
      if (!diagram._svg) {
        await writeOutput(
          path.posix.join("diagrams", diagram.id + ".svg"),
          renderDiagramSvg(diagram, config.colors, config),
        );
      }
      continue;
    }

    if (diagram.kind === "canvas") {
      await writeOutput(
        diagramOutput,
        renderStandaloneCanvas(
          diagram,
          config.colors,
          siteCss,
          siteJs,
          logoDataUrl,
          returnHref,
          sourceDocument.title,
          config,
        ),
      );
      continue;
    }

    throw new Error(
      "Tipo de diagrama ainda não suportado pelo tema: " + diagram.kind,
    );
  }

  const publicDocuments = documents.map(publicDocumentProjection);
  const graph = graphProjection(publicDocuments);
  const search = documents.map((document) => searchProjection(document, diagrams));

  await writeOutput(
    path.posix.join("api", "index.json"),
    JSON.stringify(
      {
        apiVersion: 1,
        framework: config.framework || { name: "Aurelius" },
        title: config.siteTitle,
        description: config.siteDescription,
        generatedAt: new Date().toISOString(),
        capabilities: [
          "human-html",
          "markdown-export",
          "structured-api",
          "knowledge-graph",
          "declarative-mermaid",
          "authored-html-visuals",
        ],
        documents: publicDocuments,
        diagrams: diagrams.map(indexDiagramProjection),
      },
      null,
      2,
    ) + "\n",
  );
  await writeOutput(
    path.posix.join("api", "manifest.json"),
    JSON.stringify(
      {
        apiVersion: 1,
        framework: config.framework || { name: "Aurelius" },
        entrypoints: {
          index: "api/index.json",
          graph: "api/graph.json",
          search: "api/search.json",
          documents: "api/documents/{id}.json",
          diagrams: "api/diagrams/{id}.json",
          humanOverview: "llms.txt",
          fullCorpus: "llms-full.txt",
          markdown: "markdown/{id}.md",
        },
        schemas: {
          document: "api/schema/document.schema.json",
          diagram: "api/schema/diagram.schema.json",
        },
        sourceOfTruth: ["content/*.md", "diagrams/*.json", "diagrams/**/*.{mmd,mermaid}", "diagrams/artifacts/*.{html,svg}"],
      },
      null,
      2,
    ) + "\n",
  );
  await writeOutput(
    path.posix.join("api", "graph.json"),
    JSON.stringify(graph, null, 2) + "\n",
  );
  await writeOutput(
    path.posix.join("api", "search.json"),
    JSON.stringify(search, null, 2) + "\n",
  );

  for (const document of documents) {
    const visualReferences = visualReferencesForDocument(document, diagrams);
    await writeOutput(
      path.posix.join("api", "documents", document.id + ".json"),
      JSON.stringify(
        {
          ...document,
          raw: undefined,
          html: undefined,
          visuals: visualReferences,
          apiVersion: 1,
        },
        null,
        2,
      ) + "\n",
    );
  }

  for (const diagram of diagrams) {
    await writeOutput(
      path.posix.join("api", "diagrams", diagram.id + ".json"),
      JSON.stringify(apiDiagramProjection(diagram), null, 2) + "\n",
    );
  }

  await writeOutput("llms.txt", renderLlmsIndex(config, documents, diagrams));
  await writeOutput("llms-full.txt", renderLlmsFull(config, documents, context));
  await writeOutput(
    path.posix.join("api", "schema", "document.schema.json"),
    JSON.stringify(documentSchema(), null, 2) + "\n",
  );
  await writeOutput(
    path.posix.join("api", "schema", "diagram.schema.json"),
    JSON.stringify(diagramSchema(), null, 2) + "\n",
  );

  for (const document of documents) {
    await writeOutput(
      path.posix.join("markdown", document.id + ".md"),
      markdownForCopy(document, context),
    );
  }

  console.log(
    "Documentação gerada em " + path.relative(process.cwd(), outputDirectory),
  );
}

export { build as buildDocumentation };

const invokedDirectly =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  build().catch((error) => {
    console.error("Falha no build da documentação:\n" + error.stack);
    process.exitCode = 1;
  });
}
