import { access, mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { diagramDesignKinds, supportedDiagramKinds } from "./diagrams/registry.mjs";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const supportedFormats = new Set(["mermaid", "html", "svg"]);

function titleFromId(id) {
  return id
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function htmlEscape(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function starterSvg(id, title, description, options = {}) {
  const includeXmlns = options.includeXmlns ? ' xmlns="http://www.w3.org/2000/svg"' : "";
  const safeId = htmlEscape(id);
  const safeTitle = htmlEscape(title);
  const safeDescription = htmlEscape(description);
  const embeddedStyles = options.includeStyles ? `\n  <style>${starterSvgStyles()}</style>` : "";
  return `<svg${includeXmlns} viewBox="0 0 1200 680" role="img" aria-labelledby="${safeId}-title ${safeId}-desc"${options.printSource ? ' data-aurelius-print-source="true"' : ""}>
  <title id="${safeId}-title">${safeTitle}</title>
  <desc id="${safeId}-desc">${safeDescription}</desc>${embeddedStyles}
  <rect width="1200" height="680" fill="#faf8f8"/>
  <text x="72" y="74" class="eyebrow">AURELIUS · EDITABLE VISUAL</text>
  <text x="72" y="126" class="heading">${safeTitle}</text>
  <text x="72" y="162" class="intro">Replace this starter with the diagram or chart required by the reader.</text>

  <rect x="72" y="248" width="272" height="208" rx="8" class="card"/>
  <text x="100" y="286" class="label">01 · CONTEXT</text>
  <text x="100" y="340" class="card-title">Source</text>
  <text x="100" y="374" class="copy">State the starting point</text>
  <text x="100" y="400" class="copy">and name the evidence.</text>

  <line x1="344" y1="352" x2="452" y2="352" class="connector"/>
  <polygon points="452,352 436,344 436,360" class="arrow"/>

  <rect x="464" y="224" width="272" height="256" rx="8" class="card card--focus"/>
  <text x="492" y="262" class="label label--accent">02 · SYSTEM</text>
  <text x="492" y="324" class="card-title">Core idea</text>
  <text x="492" y="358" class="copy">Show the important structure,</text>
  <text x="492" y="384" class="copy">relationship, or comparison.</text>

  <line x1="736" y1="352" x2="844" y2="352" class="connector"/>
  <polygon points="844,352 828,344 828,360" class="arrow"/>

  <rect x="856" y="248" width="272" height="208" rx="8" class="card"/>
  <text x="884" y="286" class="label">03 · OUTCOME</text>
  <text x="884" y="340" class="card-title">Result</text>
  <text x="884" y="374" class="copy">End with the decision</text>
  <text x="884" y="400" class="copy">or reader outcome.</text>

  <line x1="72" y1="568" x2="1128" y2="568" class="rule"/>
  <text x="72" y="610" class="footnote">Keep labels concise · preserve reading order · encode the same facts in diagram JSON</text>
</svg>`;
}

function starterStyles() {
  return `
    :root {
      color-scheme: light;
      --paper: #faf8f8;
      --ink: #2b2b2b;
      --muted: #5e6262;
      --rule: #d8d5d2;
      --accent: #365f58;
      --accent-soft: #e3ece9;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; min-height: 100%; background: var(--paper); color: var(--ink); }
    body { font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    main { min-width: 760px; }
    svg { display: block; width: 100%; height: auto; }
    .eyebrow, .label, .footnote { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; letter-spacing: .12em; }
    .eyebrow { fill: var(--muted); font-size: 13px; }
    .heading { fill: var(--ink); font-family: Georgia, "Times New Roman", serif; font-size: 42px; }
    .intro, .copy { fill: var(--muted); font-size: 16px; }
    .card { fill: #fff; stroke: #777b79; stroke-width: 1.5; }
    .card--focus { fill: var(--accent-soft); stroke: var(--accent); stroke-width: 2; }
    .label { fill: var(--muted); font-size: 12px; }
    .label--accent { fill: var(--accent); }
    .card-title { fill: var(--ink); font-size: 24px; font-weight: 650; }
    .connector { stroke: #777b79; stroke-width: 2; }
    .arrow { fill: #777b79; }
    .rule { stroke: var(--rule); }
    .footnote { fill: var(--muted); font-size: 11px; }
    @media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; } }
    @media print { body { background: #fff; } svg { break-inside: avoid; } }
  `;
}

function starterSvgStyles() {
  return `
    :root {
      color-scheme: light;
      --paper: #faf8f8;
      --ink: #2b2b2b;
      --muted: #5e6262;
      --rule: #d8d5d2;
      --accent: #365f58;
      --accent-soft: #e3ece9;
    }
    .eyebrow, .label, .footnote { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; letter-spacing: .12em; }
    .eyebrow { fill: var(--muted); font-size: 13px; }
    .heading { fill: var(--ink); font-family: Georgia, "Times New Roman", serif; font-size: 42px; }
    .intro, .copy { fill: var(--muted); font-family: Inter, Arial, sans-serif; font-size: 16px; }
    .card { fill: #fff; stroke: #777b79; stroke-width: 1.5; }
    .card--focus { fill: var(--accent-soft); stroke: var(--accent); stroke-width: 2; }
    .label { fill: var(--muted); font-size: 12px; }
    .label--accent { fill: var(--accent); }
    .card-title { fill: var(--ink); font-family: Inter, Arial, sans-serif; font-size: 24px; font-weight: 650; }
    .connector { stroke: #777b79; stroke-width: 2; }
    .arrow { fill: #777b79; }
    .rule { stroke: var(--rule); }
    .footnote { fill: var(--muted); font-size: 11px; }
  `;
}

function starterHtml(id, title, description) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${htmlEscape(title)}</title>
  <!-- Keep this file self-contained. Aurelius embeds it in an isolated frame. -->
  <style>${starterStyles()}</style>
</head>
<body>
  <main aria-label="${htmlEscape(title)}">
${starterSvg(id, title, description, { includeStyles: true, printSource: true }).split("\n").map((line) => "    " + line).join("\n")}
  </main>
</body>
</html>
`;
}

function starterSvgDocument(id, title, description) {
  const style = `<style>${starterSvgStyles()}</style>`;
  return starterSvg(id, title, description, { includeXmlns: true })
    .replace(/(<desc\b[^>]*>[^<]+<\/desc>)/, `$1\n  ${style}`) + "\n";
}

function starterMermaid(kind) {
  if (kind === "sequence") return `sequenceDiagram
  actor Reader
  participant Aurelius
  participant API
  Reader->>Aurelius: Open documentation
  activate Aurelius
  Aurelius->>API: Read structured contract
  API-->>Aurelius: Return document data
  Aurelius-->>Reader: Present one coherent view
  deactivate Aurelius
`;
  if (kind === "state") return `stateDiagram-v2
  [*] --> Draft
  Draft --> Review: submit
  Review --> Published: approve
  Review --> Draft: request changes
  Published --> [*]
`;
  if (kind === "er" || kind === "db-schema") return `erDiagram
  DOCUMENT ||--o{ SECTION : contains
  DOCUMENT ||--o{ SOURCE_REF : cites
  DOCUMENT {
    string id PK
    string title
    string status
  }
  SECTION {
    string id PK
    string document_id FK
    string heading
  }
  SOURCE_REF {
    string id PK
    string document_id FK
    string path
  }
`;
  if (kind === "uml-class") return `classDiagram
  class Document {
    +String id
    +String title
    +validate() Result
  }
  class Diagram {
    +String kind
    +render() SVG
  }
  Document "1" *-- "0..*" Diagram : contains
`;
  if (kind === "gantt") return `gantt
  dateFormat YYYY-MM-DD
  axisFormat %d/%m
  section Delivery
  Model the source :done, model, 2026-01-05, 2d
  Validate contracts :active, validate, after model, 2d
  Publish the site :publish, after validate, 1d
`;
  if (kind === "journey") return `journey
  title Documentation journey
  section Discover
    Find the right page: 4: Reader
    Read the overview: 5: Reader
  section Verify
    Follow source references: 5: Reader, Agent
`;
  if (kind === "bar" || kind === "line") return `xychart-beta
  x-axis [Draft, Review, Published]
  y-axis "Documents" 0 --> 12
  ${kind === "line" ? "line" : "bar"} [4, 8, 11]
`;
  if (kind === "sankey") return `sankey-beta
Documentation,Markdown,12
Markdown,Validation,12
Validation,HTML,8
Validation,API JSON,4
`;
  if (kind === "timeline") return `timeline
  title Documentation release
  Draft : Model the source
  Review : Validate contracts
  Publish : Release HTML and API JSON
`;
  if (kind === "quadrant") return `quadrantChart
  title Documentation priorities
  x-axis Low effort --> High effort
  y-axis Low impact --> High impact
  quadrant-1 Plan carefully
  quadrant-2 Do next
  quadrant-3 Reconsider
  quadrant-4 Quick wins
  API contract: [0.35, 0.82]
  Search polish: [0.24, 0.58]
`;
  if (kind === "flowchart") return `flowchart TD
  start([Start]) --> understand[Describe the reader question]
  understand --> enough{Is the source complete?}
  enough -- Yes --> publish[Validate and publish]
  enough -- No --> refine[Add evidence and context]
  refine --> understand
  publish --> done([Done])
  class publish focal
`;
  return null;
}

const mermaidScaffoldKinds = new Set([
  "bar", "db-schema", "er", "flowchart", "gantt", "journey", "line", "quadrant", "sankey", "sequence", "state", "timeline", "uml-class",
]);

function visualDefinition({ id, kind, format, title, description, artifactPath }) {
  return {
    id,
    kind,
    title,
    description,
    ...(format === "html"
      ? { htmlSource: artifactPath }
      : format === "svg"
        ? { svgSource: artifactPath }
        : { source: { language: "mermaid", path: artifactPath } }),
    interactive: false,
    summary: `${title} is an editable ${kind} visual with a clear left-to-right reading order from context through the core idea to the reader outcome.`,
    presentation: { width: 1200, height: 680 },
    data: {
      readingOrder: ["Context", "Core idea", "Outcome"],
      authoringNote: "Replace the starter content and keep this semantic representation synchronized with the visual.",
    },
    sourceRefs: [],
    nodes: [],
    edges: [],
  };
}

async function ensureSite(siteRoot) {
  let info;
  try {
    info = await stat(siteRoot);
  } catch {
    throw new Error("Site Aurelius não encontrado: " + siteRoot);
  }
  if (!info.isDirectory()) throw new Error("O caminho do site não é uma pasta: " + siteRoot);
  try {
    await access(path.join(siteRoot, "site.config.json"));
  } catch {
    throw new Error("site.config.json não encontrado em " + siteRoot + ". Execute `aurelius init` primeiro.");
  }
}

async function assertAvailable(files) {
  for (const file of files) {
    try {
      await access(file);
    } catch {
      continue;
    }
    throw new Error("Arquivo já existe; nada foi sobrescrito: " + file);
  }
}

export async function initializeVisual({ id, site, kind, format } = {}) {
  if (!site) throw new Error("Informe o site com `--site <pasta>`.");
  if (!id || !slugPattern.test(id)) {
    throw new Error("ID visual inválido. Use letras minúsculas, números e hífens, por exemplo `release-flow`.");
  }
  if (!kind || !supportedDiagramKinds.has(kind)) {
    throw new Error("Tipo visual inválido: " + (kind || "(ausente)") + ". Execute `aurelius visual types` para ver os tipos.");
  }
  if (kind === "canvas") {
    throw new Error("Canvas usa JSON semântico e o token `{{canvas:id}}`; ele não é criado como HTML/SVG. Escolha outro tipo ou use o exemplo Canvas como base.");
  }
  if (!format) {
    if (kind === "custom") format = "html";
    else if (mermaidScaffoldKinds.has(kind)) format = "mermaid";
    else throw new Error("O tipo `" + kind + "` não possui um scaffold Mermaid equivalente. Escolha explicitamente `--format html` ou `--format svg`, ou use JSON nativo quando o tipo permitir.");
  }
  if (!supportedFormats.has(format)) throw new Error("Formato inválido: " + format + ". Use `mermaid`, `html` ou `svg`.");
  if (format === "mermaid" && !mermaidScaffoldKinds.has(kind)) {
    throw new Error("O tipo `" + kind + "` não possui um scaffold Mermaid equivalente. Use `--format html` ou `--format svg`.");
  }
  if (kind === "custom" && format !== "html") {
    throw new Error("O tipo `custom` exige `--format html`.");
  }

  const siteRoot = path.resolve(process.cwd(), site);
  await ensureSite(siteRoot);
  const diagramsDirectory = path.join(siteRoot, "diagrams");
  const artifactsDirectory = path.join(diagramsDirectory, "artifacts");
  const extension = format === "html" ? ".html" : format === "svg" ? ".svg" : ".mmd";
  const definitionFile = path.join(diagramsDirectory, id + ".json");
  const artifactFile = path.join(artifactsDirectory, id + extension);
  await assertAvailable([definitionFile, artifactFile]);
  await mkdir(artifactsDirectory, { recursive: true });

  const title = titleFromId(id);
  const description = `An editable ${kind} visual authored for clear human reading and an equivalent semantic agent representation.`;
  const artifactPath = path.posix.join("diagrams", "artifacts", id + extension);
  const definition = visualDefinition({ id, kind, format, title, description, artifactPath });
  const artifact = format === "html"
    ? starterHtml(id, title, description)
    : format === "svg"
      ? starterSvgDocument(id, title, description)
      : starterMermaid(kind);

  await writeFile(artifactFile, artifact, { encoding: "utf8", flag: "wx" });
  await writeFile(definitionFile, JSON.stringify(definition, null, 2) + "\n", { encoding: "utf8", flag: "wx" });

  const displayPath = (file) => {
    const relative = path.relative(process.cwd(), file);
    return relative.startsWith(".." + path.sep) ? file : relative;
  };

  console.log([
    "Visual criado:",
    "  " + displayPath(definitionFile),
    "  " + displayPath(artifactFile),
    "",
    "Inclua-o em uma página Markdown com:",
    "  {{diagram:" + id + "}}",
    "",
    format === "mermaid"
      ? "Edite a fonte Mermaid; o Aurelius valida, estiliza e renderiza sem SVG/HTML autoral."
      : "Edite o artefato e mantenha `summary` e `data` sincronizados para leitores e agentes.",
  ].join("\n"));
}

export function listVisualTypes() {
  const lines = [
    "Tipos visuais disponíveis (Mermaid é o padrão somente quando existe um scaffold equivalente):",
    "",
    ...diagramDesignKinds.map((kind) => "  " + kind),
    "  custom       HTML autoral (somente HTML) para uma composição sem gramática nomeada",
    "  canvas       Canvas semântico navegável; criado manualmente em JSON",
    "",
    "Scaffolds Mermaid: " + [...mermaidScaffoldKinds].join(", "),
    "Os demais tipos exigem `--format html` ou `--format svg`, ou uma definição JSON nativa quando suportada.",
    "",
    "Use: aurelius visual init <id> --site <pasta> --kind <tipo> [--format mermaid|html|svg]",
  ];
  return lines.join("\n");
}
