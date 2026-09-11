import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { access, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { extractSections } from "../core/content.mjs";
import { normalizedConfig } from "../core/config.mjs";
import { previewFilePath } from "../core/dev.mjs";
import { initializeVisual } from "../core/scaffold.mjs";
import { diagramSchema as createDiagramSchema, documentSchema as createDocumentSchema } from "../core/schemas.mjs";

const projectRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const lines = (...items) => items.join("\n");

function run(site, ...argumentsList) {
  return spawnSync(process.execPath, ["cli.mjs", ...argumentsList, "--site", site], {
    cwd: projectRoot,
    encoding: "utf8",
  });
}

async function createSite() {
  const site = await mkdtemp(path.join(os.tmpdir(), "aurelius-test-"));
  await Promise.all([
    mkdir(path.join(site, "assets")),
    mkdir(path.join(site, "content")),
    mkdir(path.join(site, "diagrams")),
  ]);
  await Promise.all([
    writeFile(path.join(site, "assets", "logo.svg"), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><rect width="8" height="8"/></svg>'),
    writeFile(path.join(site, "site.config.json"), JSON.stringify({
      siteTitle: "Teste Aurelius",
      siteDescription: "Site de teste.",
      repository: { url: "https://git.example.test/platform/docs" },
      navigation: { primary: ["home"], sections: [{ label: "Documentation", items: ["home", { label: "Guides", items: ["guide"] }] }] },
      brand: { logoSource: "assets/logo.svg" },
    }, null, 2)),
    writeFile(path.join(site, "content", "home.md"), lines(
      "---", "id: home", "title: Home", "description: Initial document.",
      "type: overview", "status: observed", "visibility: internal", "tags: [start, architecture]",
      "related: guide", "source_refs: assets/logo.svg", "authors: Plataforma", "updated: 2026-09-08", "diagram: system", "---", "",
      "## Visão geral", "", "![Marca](asset:logo.svg)", "", "[Ler guia](doc:guide#contrato)", "", "{{diagram:system}}", "",
    )),
    writeFile(path.join(site, "content", "guide.md"), lines(
      "---", "id: guide", "title: Guia", "description: Documento relacionado.",
      "type: guide", "status: draft", "visibility: internal", "tags: usage", "related: home", "source_refs:", "---", "",
      "## Contrato", "", "[Voltar](doc:home#visao-geral)", "", "```js", 'console.log("ok");', "```", "",
      "## Renderers", "", "{{renderer-gallery}}", "",
    )),
    writeFile(path.join(site, "content", "sequence.md"), lines(
      "---", "id: sequence", "title: Sequência", "description: Artefato SVG tipado.",
      "type: reference", "status: observed", "visibility: internal", "tags: diagrams", "related: home", "source_refs:",
      "diagram: request-sequence", "---", "", "## Fluxo", "", "{{diagram:request-sequence}}", "",
    )),
    writeFile(path.join(site, "content", "flow.md"), lines(
      "---", "id: flow", "title: Flow", "description: Authored HTML visual.",
      "type: reference", "status: observed", "visibility: internal", "tags: diagrams", "related: home", "source_refs:",
      "diagram: ci-flow", "---", "", "## Flow", "", "{{diagram:ci-flow}}", "",
    )),
    writeFile(path.join(site, "content", "decision.md"), lines(
      "---", "id: decision", "title: Decision", "description: Declarative Mermaid visual.",
      "type: reference", "status: observed", "visibility: internal", "tags: diagrams, mermaid", "related: home", "source_refs:",
      "diagram: release-decision", "---", "", "## Decision", "", "{{diagram:release-decision}}", "",
    )),
    writeFile(path.join(site, "diagrams", "system.json"), JSON.stringify({
      id: "system", kind: "architecture", title: "Sistema", description: "Diagrama de teste.", zones: [],
      nodes: [
        { id: "api", kind: "backend", tag: "API", label: "API", detail: "serviço", x: 80, y: 80, width: 180, height: 100 },
        { id: "store", kind: "store", tag: "DADOS", label: "Registro", detail: "durável", x: 400, y: 240, width: 180, height: 100 },
      ],
      edges: [{ id: "write-record", from: "api", to: "store", label: "GRAVA" }],
    }, null, 2)),
    writeFile(path.join(site, "diagrams", "request-sequence.svg"), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 320" role="img" aria-labelledby="request-sequence-title request-sequence-desc"><title id="request-sequence-title">Request sequence</title><desc id="request-sequence-desc">A client sends one request to an API.</desc><defs><marker id="request-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3"><path d="M0 0 L8 3 L0 6 Z"/></marker></defs><rect width="640" height="320" fill="#fff"/><path d="M40 80 H400" marker-end="url(#request-arrow)"/><text x="40" y="60">Client to API</text></svg>'),
    writeFile(path.join(site, "diagrams", "request-sequence.json"), JSON.stringify({
      id: "request-sequence", kind: "sequence", title: "Request sequence", description: "A typed SVG-backed sequence diagram.",
      svgSource: "diagrams/request-sequence.svg", data: { actors: ["client", "api"] },
    }, null, 2)),
    writeFile(path.join(site, "diagrams", "ci-flow.html"), lines(
      "<!doctype html>", '<html lang="en"><head><meta charset="utf-8"><title>CI flow</title><style>body{background:#fff;color:#222}</style></head>',
      '<body><svg viewBox="0 0 640 320" role="img" aria-labelledby="ci-title ci-desc" data-aurelius-print-source="true"><title id="ci-title">CI flow</title><desc id="ci-desc">Build minutes split between tests and releases.</desc><style>:root{--flow:#345}path{stroke:var(--flow)}</style><rect width="640" height="320" fill="#fff"/><path d="M80 80 C240 80 400 120 560 120" fill="none"/></svg></body></html>',
    )),
    writeFile(path.join(site, "diagrams", "ci-flow.json"), JSON.stringify({
      id: "ci-flow", kind: "sankey", title: "CI flow", description: "An authored HTML Sankey.",
      htmlSource: "diagrams/ci-flow.html", summary: "Build minutes split between verification and release outcomes.",
      presentation: { width: 1000, height: 560 }, data: { totalMinutes: 12000 }, interactive: false,
    }, null, 2)),
    writeFile(path.join(site, "diagrams", "release-decision.mmd"), lines(
      "flowchart TD", "  draft[Draft] --> valid{Valid?}", "  valid -- Yes --> publish([Publish])", "  valid -- No --> draft", "  class publish focal",
    )),
    writeFile(path.join(site, "diagrams", "release-decision.json"), JSON.stringify({
      id: "release-decision", kind: "flowchart", title: "Release decision", description: "A declarative release decision flow.",
      source: { language: "mermaid", path: "diagrams/release-decision.mmd" },
      summary: "A valid draft is published, while an invalid draft returns for another editing cycle.",
      presentation: { width: 1200, height: 520, initialZoom: 1.5, initialPosition: "start" },
      data: { outcomes: ["publish", "revise"] },
    }, null, 2)),
  ]);
  return site;
}

test("build emits human, Markdown, and agent-readable projections", async (context) => {
  const site = await createSite();
  context.after(async () => rm(site, { recursive: true, force: true }));
  const check = run(site, "check");
  assert.equal(check.status, 0, check.stderr);
  const build = run(site, "build");
  assert.equal(build.status, 0, build.stderr);
  const output = path.join(site, "dist");
  const [html, guideHtml, markdown, guideMarkdown, manifest, document, corpus, diagramSvg, sequenceApi, diagramSchema, flowHtml, flowFull, flowMarkdown, flowApi, searchApi, decisionHtml, decisionFull, decisionApi, mermaidRuntime] = await Promise.all([
    readFile(path.join(output, "index.html"), "utf8"),
    readFile(path.join(output, "guide", "index.html"), "utf8"),
    readFile(path.join(output, "markdown", "home.md"), "utf8"),
    readFile(path.join(output, "markdown", "guide.md"), "utf8"),
    readFile(path.join(output, "api", "manifest.json"), "utf8"),
    readFile(path.join(output, "api", "documents", "home.json"), "utf8"),
    readFile(path.join(output, "llms-full.txt"), "utf8"),
    readFile(path.join(output, "diagrams", "system.svg"), "utf8"),
    readFile(path.join(output, "api", "diagrams", "request-sequence.json"), "utf8"),
    readFile(path.join(output, "api", "schema", "diagram.schema.json"), "utf8"),
    readFile(path.join(output, "flow", "index.html"), "utf8"),
    readFile(path.join(output, "diagrams", "ci-flow.html"), "utf8"),
    readFile(path.join(output, "markdown", "flow.md"), "utf8"),
    readFile(path.join(output, "api", "diagrams", "ci-flow.json"), "utf8"),
    readFile(path.join(output, "api", "search.json"), "utf8"),
    readFile(path.join(output, "decision", "index.html"), "utf8"),
    readFile(path.join(output, "diagrams", "release-decision.html"), "utf8"),
    readFile(path.join(output, "api", "diagrams", "release-decision.json"), "utf8"),
    readFile(path.join(output, "assets", "aurelius", "mermaid.min.js"), "utf8"),
  ]);
  assert.match(html, /Copy Markdown/);
  assert.match(html, /Save as PDF/);
  assert.match(html, /Copy SVG/);
  assert.match(html, /View full diagram/);
  assert.doesNotMatch(html, /Baixar \.md|Baixar SVG|data-theme|theme-toggle/);
  assert.match(html, /assets\/logo\.svg/);
  assert.match(html, /Q 332,132 332,140/);
  assert.match(html, /href="guide\/index\.html#contrato"/);
  assert.match(markdown, /^---/);
  assert.equal(JSON.parse(document).raw, undefined);
  assert.equal(JSON.parse(manifest).entrypoints.fullCorpus, "llms-full.txt");
  assert.match(corpus, /aurelius:id=guide/);
  assert.match(diagramSvg, /role="img"/);
  await assert.rejects(access(path.join(output, "diagrams", "request-sequence.svg")));
  assert.equal(JSON.parse(sequenceApi).kind, "sequence");
  assert.equal(JSON.parse(sequenceApi)._svg, undefined);
  assert.equal(JSON.parse(diagramSchema).properties.kind.enum.length, 42);
  assert.ok(JSON.parse(diagramSchema).properties.kind.enum.includes("db-schema"));
  assert.ok(JSON.parse(diagramSchema).properties.kind.enum.includes("custom"));
  assert.match(diagramSvg, /var\(--paper/);
  assert.match(html, /Semantic source: `diagrams\/system\.json`/);
  assert.match(html, /@media print[\s\S]*--paper: #fff/);
  assert.match(html, /class="site-sidebar"/);
  assert.match(html, /class="site-sidebar-drawer" data-nav-drawer open/);
  assert.match(html, /class="repo-link" href="https:\/\/git\.example\.test\/platform\/docs"/);
  assert.match(html, /class="repo-link"[\s\S]*<span>Repository<\/span>/);
  assert.match(html, /class="nav-section" data-nav-group="section-0" open>/);
  assert.match(html, /class="nav-folder" data-nav-group="section-0-1"><summary>Guides<\/summary>/);
  assert.match(html, /aurelius:nav:/);
  assert.match(html, /break-inside: avoid-page !important/);
  assert.match(flowHtml, /class="html-artifact-frame"/);
  assert.match(flowHtml, /sandbox=""/);
  assert.match(flowHtml, /data-copy-html/);
  assert.ok((flowHtml.match(/data-action-status/g) || []).length >= 2);
  assert.match(flowHtml, /trigger\.closest\("\.article-actions, \.diagram-actions, \.code-figure/);
  assert.match(flowHtml, /Content-Security-Policy/);
  assert.match(flowHtml, /class="artifact-image"/);
  assert.match(flowFull, /AUTHORED HTML/);
  assert.match(flowFull, /data-copy-html/);
  assert.match(flowFull, /data-copy-svg/);
  assert.match(flowFull, /data-artifact-html/);
  assert.match(flowFull, /data-artifact-svg/);
  assert.doesNotMatch(flowMarkdown, /\{\{diagram:ci-flow}}/);
  assert.match(flowMarkdown, /HTML visual source/);
  assert.equal(JSON.parse(flowApi)._html, undefined);
  assert.equal(JSON.parse(flowApi).data.totalMinutes, 12000);
  assert.equal(JSON.parse(searchApi).find((entry) => entry.id === "flow").visuals[0].summary, "Build minutes split between verification and release outcomes.");
  assert.match(html, /data-canvas-zoom|Math\.max\(0\.4, zoom - 0\.2\)/);
  assert.match(html, /function selectNode\(node\)/);
  assert.doesNotMatch(html, /function focusNode\(node\)/);
  assert.match(html, /if \(selectedNode\) selectNode\(selectedNode\)/);
  assert.match(html, /addEventListener\("wheel"/);
  assert.match(html, /querySelectorAll\("\[data-canvas\]"\)/);
  assert.match(html, /canvases\.forEach/);
  assert.equal((guideHtml.match(/data-renderer-kind=/g) || []).length, 41);
  assert.match(guideHtml, /data-renderer-kind="sequence"/);
  assert.match(guideHtml, /data-renderer-kind="canvas"/);
  assert.doesNotMatch(guideHtml, /\{\{renderer-gallery}}/);
  assert.match(guideHtml, /data-renderer-kind="db-schema"/);
  assert.match(guideHtml, /Mermaid · SVG · HTML/);
  assert.doesNotMatch(guideMarkdown, /\{\{renderer-gallery}}/);
  assert.match(guideMarkdown, /`db-schema` — Mermaid, SVG, or authored HTML/);
  assert.match(decisionHtml, /data-mermaid-source/);
  assert.match(decisionHtml, /data-copy-mermaid/);
  assert.match(decisionHtml, /assets\/aurelius\/mermaid\.min\.js/);
  assert.match(decisionHtml, /data-mermaid-control="full"/);
  assert.match(decisionHtml, /data-mermaid-viewport/);
  assert.match(decisionHtml, /data-mermaid-initial-zoom="1\.5"/);
  assert.match(decisionHtml, /data-mermaid-initial-position="start"/);
  assert.match(decisionHtml, /var fitted = original\.slice\(\)/);
  assert.match(decisionHtml, /class="mermaid-legend"/);
  assert.match(decisionHtml, /Diagram Design · Mermaid/);
  assert.match(decisionHtml, /setupNavigation\(surface, svg\)/);
  assert.match(decisionFull, /MERMAID · DECLARATIVE/);
  assert.equal(JSON.parse(decisionApi).renderMode, "mermaid");
  assert.equal(JSON.parse(decisionApi).source.code.includes("flowchart TD"), true);
  assert.equal(JSON.parse(decisionApi).source.sourcePath, "diagrams/release-decision.mmd");
  assert.deepEqual(JSON.parse(decisionApi).declarativeAnalysis.roles, ["step", "decision", "outcome", "connection", "focal"]);
  assert.ok(mermaidRuntime.length > 1_000_000);
  assert.equal(await readFile(path.join(output, "assets", "logo.svg"), "utf8"), await readFile(path.join(site, "assets", "logo.svg"), "utf8"));
});

test("check rejects an unknown Aurelius anchor", async (context) => {
  const site = await createSite();
  context.after(async () => rm(site, { recursive: true, force: true }));
  const guidePath = path.join(site, "content", "guide.md");
  const guide = await readFile(guidePath, "utf8");
  await writeFile(guidePath, guide.replace("#visao-geral", "#nao-existe"));
  const result = run(site, "check");
  assert.notEqual(result.status, 0);
});

test("check rejects active content in an SVG-backed visual", async (context) => {
  const site = await createSite();
  context.after(async () => rm(site, { recursive: true, force: true }));
  const svgPath = path.join(site, "diagrams", "request-sequence.svg");
  await writeFile(svgPath, '<svg viewBox="0 0 10 10" role="img" aria-labelledby="x-title x-desc"><title id="x-title">Unsafe</title><desc id="x-desc">Unsafe SVG.</desc><script>alert(1)</script></svg>');
  const result = run(site, "check");
  assert.notEqual(result.status, 0);
});

test("check rejects external, ambiguous, and inaccessible SVG references", async (context) => {
  const variants = [
    '<svg viewBox="0 0 10 10" role="img" aria-labelledby="x-title x-desc"><title id="x-title">Unsafe</title><desc id="x-desc">External link.</desc><image href="//example.invalid/pixel"/></svg>',
    '<svg viewBox="0 0 10 10" role="img" aria-labelledby="x-title x-desc"><title id="x-title">Unsafe</title><desc id="x-desc">Encoded link.</desc><image href="&#x68;ttps://example.invalid/pixel"/></svg>',
    '<svg viewBox="0 0 10 10" role="img" aria-labelledby="missing-title missing-desc"><title id="x-title">Unsafe</title><desc id="x-desc">Broken label.</desc></svg>',
    '<svg viewBox="0 0 10 10" role="img" aria-labelledby="x-title x-desc"><title id="x-title">Unsafe</title><desc id="x-desc">Duplicate identifiers.</desc><g id="x-title"/></svg>',
  ];
  for (const variant of variants) {
    const site = await createSite();
    try {
      await writeFile(path.join(site, "diagrams", "request-sequence.svg"), variant);
      const result = run(site, "check");
      assert.notEqual(result.status, 0, variant);
    } finally {
      await rm(site, { recursive: true, force: true });
    }
  }
});

test("check validates accessibility of inline SVG in authored HTML", async (context) => {
  const site = await createSite();
  context.after(async () => rm(site, { recursive: true, force: true }));
  const htmlPath = path.join(site, "diagrams", "ci-flow.html");
  const html = await readFile(htmlPath, "utf8");
  await writeFile(htmlPath, html.replace(/ role="img" aria-labelledby="ci-title ci-desc"/, ""));
  const result = run(site, "check");
  assert.notEqual(result.status, 0);
});

test("HTML visual only auto-extracts an explicitly self-contained print SVG", async (context) => {
  const site = await createSite();
  context.after(async () => rm(site, { recursive: true, force: true }));
  const htmlPath = path.join(site, "diagrams", "ci-flow.html");
  const html = await readFile(htmlPath, "utf8");
  await writeFile(htmlPath, html.replace(' data-aurelius-print-source="true"', ""));
  const result = run(site, "build");
  assert.equal(result.status, 0, result.stderr);
  const page = await readFile(path.join(site, "dist", "flow", "index.html"), "utf8");
  assert.doesNotMatch(page, /<button[^>]+data-copy-svg/);
  assert.match(page, /html-artifact-print-text/);
});

test("check rejects scripts in a static authored HTML visual", async (context) => {
  const site = await createSite();
  context.after(async () => rm(site, { recursive: true, force: true }));
  const htmlPath = path.join(site, "diagrams", "ci-flow.html");
  const html = await readFile(htmlPath, "utf8");
  await writeFile(htmlPath, html.replace("</body>", "<script>document.body.dataset.changed='yes'</script></body>"));
  const result = run(site, "check");
  assert.notEqual(result.status, 0);
});

test("check rejects invalid or executable Mermaid sources", async () => {
  for (const source of [
    "flowchart TD\n  A -->",
    "flowchart TD\n  A --> B\n  click B call dangerous()",
    "%%{init: { 'securityLevel': 'loose' }}%%\nflowchart TD\n  A --> B",
  ]) {
    const site = await createSite();
    try {
      await writeFile(path.join(site, "diagrams", "release-decision.mmd"), source);
      const result = run(site, "check");
      assert.notEqual(result.status, 0, source);
    } finally {
      await rm(site, { recursive: true, force: true });
    }
  }
});

test("interactive authored HTML remains sandboxed without same-origin access", async (context) => {
  const site = await createSite();
  context.after(async () => rm(site, { recursive: true, force: true }));
  const htmlPath = path.join(site, "diagrams", "ci-flow.html");
  const jsonPath = path.join(site, "diagrams", "ci-flow.json");
  const html = await readFile(htmlPath, "utf8");
  const diagram = JSON.parse(await readFile(jsonPath, "utf8"));
  diagram.interactive = true;
  await Promise.all([
    writeFile(htmlPath, html.replace("</body>", "<script>document.body.dataset.changed='yes'</script></body>")),
    writeFile(jsonPath, JSON.stringify(diagram, null, 2)),
  ]);
  const result = run(site, "build");
  assert.equal(result.status, 0, result.stderr);
  const page = await readFile(path.join(site, "dist", "flow", "index.html"), "utf8");
  assert.match(page, /sandbox="allow-scripts"/);
  assert.doesNotMatch(page, /sandbox="[^"]*allow-same-origin/);
  assert.match(page, /script-src &#39;unsafe-inline&#39;/);
});

test("init creates a reviewable starter site with an architecture example", async (context) => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "aurelius-init-"));
  const site = path.join(parent, "docs");
  context.after(async () => rm(parent, { recursive: true, force: true }));
  const init = spawnSync(process.execPath, ["cli.mjs", "init", site, "--title", "Base inicial"], {
    cwd: projectRoot,
    encoding: "utf8",
  });
  assert.equal(init.status, 0, init.stderr);
  const check = run(site, "check");
  assert.equal(check.status, 0, check.stderr);
  const [home, guide, diagram, authoringSkill, migrationSkill] = await Promise.all([
    readFile(path.join(site, "content", "home.md"), "utf8"),
    readFile(path.join(site, "content", "getting-started.md"), "utf8"),
    readFile(path.join(site, "diagrams", "starter-overview.json"), "utf8"),
    readFile(path.join(parent, ".agents", "skills", "aurelius-documentation", "SKILL.md"), "utf8"),
    readFile(path.join(parent, ".agents", "skills", "documentation-migration", "SKILL.md"), "utf8"),
  ]);
  assert.match(home, /\{\{diagram:starter-overview\}\}/);
  assert.match(home, /visibility: public/);
  assert.match(guide, /aurelius check --site/);
  assert.match(guide, /\.agents\/skills/);
  assert.match(guide, /one level above/);
  assert.match(guide, /visibility: public/);
  assert.match(authoringSkill, /Aurelius documentation/);
  assert.match(migrationSkill, /documentation migration/);
  assert.equal(JSON.parse(diagram).kind, "architecture");
  await assert.rejects(access(path.join(site, ".agents")), { code: "ENOENT" });
});

test("init accepts a custom PNG logo and records it in site configuration", async (context) => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "aurelius-logo-"));
  const site = path.join(parent, "docs");
  const logo = path.join(parent, "brand.png");
  const logoBytes = Buffer.from("89504e470d0a1a0a", "hex");
  context.after(async () => rm(parent, { recursive: true, force: true }));
  await writeFile(logo, logoBytes);
  const init = spawnSync(process.execPath, ["cli.mjs", "init", site, "--title", "Branded docs", "--logo", logo], {
    cwd: projectRoot,
    encoding: "utf8",
  });
  assert.equal(init.status, 0, init.stderr);
  const config = JSON.parse(await readFile(path.join(site, "site.config.json"), "utf8"));
  assert.equal(config.brand.logoSource, "assets/logo.png");
  assert.deepEqual(await readFile(path.join(site, "assets", "logo.png")), logoBytes);
  assert.equal(run(site, "check").status, 0);
});

test("init detects a conventional JPEG logo when no --logo is supplied", async (context) => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "aurelius-auto-logo-"));
  const site = path.join(parent, "docs");
  const logo = path.join(parent, "LoGo.JPEG");
  const logoBytes = Buffer.from("ffd8ffe000104a4649460001", "hex");
  context.after(async () => rm(parent, { recursive: true, force: true }));
  await writeFile(logo, logoBytes);
  const init = spawnSync(process.execPath, [path.join(projectRoot, "cli.mjs"), "init", "docs"], {
    cwd: parent,
    encoding: "utf8",
  });
  assert.equal(init.status, 0, init.stderr);
  const config = JSON.parse(await readFile(path.join(site, "site.config.json"), "utf8"));
  assert.equal(config.brand.logoSource, "assets/logo.jpeg");
  assert.deepEqual(await readFile(path.join(site, "assets", "logo.jpeg")), logoBytes);
  assert.equal(run(site, "check").status, 0);
});

test("language changes built-in interface copy without translating Markdown", async (context) => {
  const site = await createSite();
  context.after(async () => rm(site, { recursive: true, force: true }));
  const configPath = path.join(site, "site.config.json");
  const config = JSON.parse(await readFile(configPath, "utf8"));
  config.language = "en";
  await writeFile(configPath, JSON.stringify(config, null, 2));
  const build = run(site, "build");
  assert.equal(build.status, 0, build.stderr);
  const [home, mermaid] = await Promise.all([
    readFile(path.join(site, "dist", "index.html"), "utf8"),
    readFile(path.join(site, "dist", "decision", "index.html"), "utf8"),
  ]);
  assert.match(home, /aria-label="Metadata"/);
  assert.match(home, />Visibility</);
  assert.match(mermaid, /Rendering declarative diagram…/);
  assert.match(home, /<h1>Home<\/h1>/);
});

test("visual init scaffolds declarative Mermaid, HTML, and SVG sources without overwriting", async (context) => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "aurelius-visual-"));
  const site = path.join(parent, "docs");
  context.after(async () => rm(parent, { recursive: true, force: true }));
  const init = spawnSync(process.execPath, ["cli.mjs", "init", site], { cwd: projectRoot, encoding: "utf8" });
  assert.equal(init.status, 0, init.stderr);

  const htmlVisual = spawnSync(process.execPath, ["cli.mjs", "visual", "init", "release-flow", "--site", site, "--kind", "sankey", "--format", "html"], {
    cwd: projectRoot,
    encoding: "utf8",
  });
  assert.equal(htmlVisual.status, 0, htmlVisual.stderr);
  const [definition, artifact] = await Promise.all([
    readFile(path.join(site, "diagrams", "release-flow.json"), "utf8"),
    readFile(path.join(site, "diagrams", "artifacts", "release-flow.html"), "utf8"),
  ]);
  assert.equal(JSON.parse(definition).htmlSource, "diagrams/artifacts/release-flow.html");
  assert.match(artifact, /data-aurelius-print-source="true"/);
  assert.match(artifact, /aria-labelledby="release-flow-title release-flow-desc"/);
  assert.notEqual(spawnSync(process.execPath, ["cli.mjs", "visual", "init", "release-flow", "--site", site, "--kind", "sankey", "--format", "html"], {
    cwd: projectRoot,
    encoding: "utf8",
  }).status, 0);

  const mermaidVisual = spawnSync(process.execPath, ["cli.mjs", "visual", "init", "approval-flow", "--site", site, "--kind", "flowchart"], {
    cwd: projectRoot,
    encoding: "utf8",
  });
  assert.equal(mermaidVisual.status, 0, mermaidVisual.stderr);
  const mermaidDefinition = JSON.parse(await readFile(path.join(site, "diagrams", "approval-flow.json"), "utf8"));
  const mermaidSource = await readFile(path.join(site, "diagrams", "artifacts", "approval-flow.mmd"), "utf8");
  assert.deepEqual(mermaidDefinition.source, { language: "mermaid", path: "diagrams/artifacts/approval-flow.mmd" });
  assert.match(mermaidSource, /^flowchart TD/);

  await initializeVisual({ id: "access-flow", site, kind: "sankey" });
  assert.match(await readFile(path.join(site, "diagrams", "artifacts", "access-flow.mmd"), "utf8"), /^sankey-beta/);

  await assert.rejects(initializeVisual({ id: "risk-radar", site, kind: "radar" }), /não possui um scaffold Mermaid equivalente/);
  await assert.rejects(access(path.join(site, "diagrams", "risk-radar.json")));

  const types = spawnSync(process.execPath, ["cli.mjs", "visual", "types"], { cwd: projectRoot, encoding: "utf8" });
  assert.equal(types.status, 0, types.stderr);
  assert.match(types.stdout, /sankey/);
  assert.match(types.stdout, /custom/);
  assert.match(types.stdout, /canvas/);
});

test("output safety and raw configuration validation fail before sources can be removed", async (context) => {
  const site = await createSite();
  context.after(async () => rm(site, { recursive: true, force: true }));
  const configPath = path.join(site, "site.config.json");
  const original = JSON.parse(await readFile(configPath, "utf8"));

  await writeFile(configPath, JSON.stringify({ ...original, outputDirectory: "content" }, null, 2));
  const unsafe = run(site, "build");
  assert.notEqual(unsafe.status, 0);
  assert.match(await readFile(path.join(site, "content", "home.md"), "utf8"), /id: home/);

  assert.throws(() => normalizedConfig({ ...original, repository: "https://example.test/repo" }), /`repository` precisa ser `null` ou um objeto/);

  assert.throws(() => normalizedConfig({ ...original, navigation: { primary: "home" } }), /`navigation\.primary` precisa ser uma lista/);
});

test("section extraction, clean preview routes, and generated schemas share the public contract", async (context) => {
  const sections = extractSections(lines(
    "## Real section", "Visible text", "```markdown", "### Not a section", "```", "#### Deep contract", "Details",
  ));
  assert.deepEqual(sections.map(({ id, level }) => ({ id, level })), [
    { id: "real-section", level: 2 },
    { id: "deep-contract", level: 4 },
  ]);
  assert.doesNotMatch(sections[0].text, /Not a section/);

  const output = path.resolve("/tmp/aurelius-preview-contract");
  assert.equal(previewFilePath(output, "/guide"), path.join(output, "guide", "index.html"));
  assert.equal(previewFilePath(output, "/guide/"), path.join(output, "guide", "index.html"));
  assert.equal(previewFilePath(output, "/api/index.json"), path.join(output, "api", "index.json"));
  assert.equal(previewFilePath(output, "/../secret"), null);

  const documentSchema = createDocumentSchema();
  const diagramSchema = createDiagramSchema();
  assert.equal(documentSchema.properties.sections.items.$ref, "#/$defs/section");
  assert.equal(documentSchema.$defs.section.properties.level.maximum, 4);
  assert.equal(documentSchema.properties.visuals.items.$ref, "#/$defs/visualReference");
  assert.equal(diagramSchema.properties.nodes.items.$ref, "#/$defs/node");
  assert.equal(diagramSchema.properties.edges.items.$ref, "#/$defs/edge");
  assert.equal(diagramSchema.$defs.presentation.required.includes("width"), true);

  const site = await createSite();
  context.after(async () => rm(site, { recursive: true, force: true }));
  const homePath = path.join(site, "content", "home.md");
  const guidePath = path.join(site, "content", "guide.md");
  await writeFile(homePath, (await readFile(homePath, "utf8")).replace("doc:guide#contrato", "doc:guide#deep-contract"));
  await writeFile(guidePath, (await readFile(guidePath, "utf8")).replace("## Contrato", "#### Deep contract"));
  const check = run(site, "check");
  assert.equal(check.status, 0, check.stderr);
});
