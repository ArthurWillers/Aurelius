import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { browserClient } from "./browser/client.mjs";
import { mermaidCases, nativeCases } from "./browser/cases.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const site = await mkdtemp(path.join(os.tmpdir(), "aurelius-visual-"));
await Promise.all([mkdir(path.join(site, "content")), mkdir(path.join(site, "diagrams")), mkdir(path.join(site, "assets"))]);
await writeFile(path.join(site, "assets", "logo.svg"), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10"/></svg>');
await writeFile(path.join(site, "site.config.json"), JSON.stringify({ siteTitle: "Diagram regressions", siteDescription: "Visual regression fixtures.", brand: { logoSource: "assets/logo.svg" }, navigation: { primary: ["home"], sections: [] } }));
const cases = [...mermaidCases, ...nativeCases];
await writeFile(path.join(site, "content", "home.md"), ["---", "id: home", "title: Diagram regressions", "description: Diagram regression cases.", "type: reference", "status: observed", "visibility: public", "tags: diagrams", "related:", "source_refs:", "---", "", ...cases.flatMap((item) => [`## ${item.id}`, `{{${item.kind === "canvas" ? "canvas" : "diagram"}:${item.id}}}`, ""]), "## Repeated native diagram", "{{diagram:native-compact}}", "{{canvas:canvas-compact}}"].join("\n"));
for (const item of cases) await writeFile(path.join(site, "diagrams", item.id + ".json"), JSON.stringify({ ...item, title: item.id, description: "Layout and navigation regression for " + item.id, summary: "All nodes, routes, labels and semantics of this example must survive rendering and export.", ...(item.code ? { nodes: [], edges: [], source: { language: "mermaid", code: item.code } } : {}) }));
const build = (target) => {
  const result = spawnSync(process.execPath, ["cli.mjs", "build", "--site", target], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
};
build(site); build(path.join(root, "examples/product-docs"));
const endpointIndex = process.argv.indexOf("--endpoint");
const client = await browserClient(endpointIndex >= 0 ? process.argv[endpointIndex + 1] : undefined);
const outputIndex = process.argv.indexOf("--output");
const output = outputIndex >= 0 ? process.argv[outputIndex + 1] : process.env.AURELIUS_VISUAL_OUTPUT || site;
await mkdir(output, { recursive: true });
let checked = 0;
try {
  await client.command("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  async function open(file) {
    await client.command("Page.navigate", { url: pathToFileURL(file).href });
    await client.waitFor('document.readyState === "complete" && !document.querySelector("[aria-busy=true]") && [...document.querySelectorAll(".mermaid-target svg, [data-canvas]")].every(svg => svg.dataset.diagramViewBox)');
    await client.evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
    assert.equal(await client.evaluate('document.querySelector(".mermaid-error")?.textContent || null'), null, file);
  }
  const metricsExpression = `(() => {
    const svg = document.querySelector(".mermaid-target svg, [data-canvas], .architecture-diagram");
    const source = (svg.dataset.diagramViewBox || svg.getAttribute("viewBox")).split(/\\s+/).map(Number);
    const measured = AureliusDiagramViewport.contentBounds(svg);
    const viewport = svg.closest(".mermaid-surface, .canvas-scroll, .diagram-scroll");
    return { source, measured, fitted: svg.getAttribute("viewBox").split(/\\s+/).map(Number), viewport: viewport.getBoundingClientRect().toJSON(), nodes: svg.querySelectorAll(".node").length,
      edges: svg.querySelectorAll(".flowchart-link").length, text: svg.textContent, overflow: document.documentElement.scrollWidth > innerWidth,
      role: svg.getAttribute("role"), accessible: svg.getAttribute("aria-labelledby"), zoom: document.querySelector("[data-mermaid-zoom], [data-canvas-zoom], [data-native-zoom]")?.textContent };
  })()`;
  for (const item of cases) {
    await open(path.join(site, "dist", "diagrams", item.id + ".html"));
    const metrics = await client.evaluate(metricsExpression);
    assert.ok(metrics.source.every(Number.isFinite), item.id);
    assert.ok(metrics.source[2] > 0 && metrics.source[3] > 0, item.id);
    assert.equal(metrics.role, "img"); assert.ok(metrics.accessible);
    assert.ok(!metrics.overflow, item.id + " causes horizontal page overflow");
    const [x, y, width, height] = metrics.source, measured = metrics.measured;
    const [fx, fy, fw, fh] = metrics.fitted;
    assert.ok(fx <= x + 1 && fy <= y + 1 && fx + fw >= x + width - 1 && fy + fh >= y + height - 1, item.id + " does not initially fit all content");
    assert.ok(x <= measured.x + 1 && y <= measured.y + 1 && x + width >= measured.x + measured.width - 1 && y + height >= measured.y + measured.height - 1, item.id + " clips content");
    assert.ok(width <= measured.width + 1 && height <= measured.height + 1, item.id + " contains arbitrary whitespace");
    if (typeof item.nodes === "number") assert.equal(metrics.nodes, item.nodes, item.id + " dropped nodes");
    if (typeof item.edges === "number") assert.equal(metrics.edges, item.edges, item.id + " dropped connections");
    if (item.id === "small-flow") assert.ok(metrics.viewport.height <= 180, "small diagrams stay compact");
    if (item.id === "long-journey") assert.match(metrics.text, /Task 8/, "journeys keep stages after the sixth");
    if (item.id === "multiple-series") {
      const plots = await client.evaluate('({bars:document.querySelectorAll(".bar-plot-0 rect").length,lines:[1,2].map(index=>document.querySelectorAll(".line-plot-"+index+" path").length)})');
      assert.equal(plots.bars, 3, "XY charts retain bars, including negative values");
      assert.deepEqual(plots.lines, [1, 1], "XY charts retain every line series");
    }
    if (["return-flow", "canvas-compact", "canvas-path", "manual-state", "manual-er", "parallel-loops"].includes(item.id)) {
      await writeFile(path.join(output, item.id + "-desktop.png"), Buffer.from((await client.command("Page.captureScreenshot")).data, "base64"));
    }
    checked++;
  }
  // The original gallery examples exercise all existing authoring paths.
  const index = JSON.parse(await readFile(path.join(root, "examples/product-docs/dist/api/index.json"), "utf8"));
  for (const item of index.diagrams) {
    await open(path.join(root, "examples/product-docs/dist/diagrams", item.id + ".html"));
    checked++;
  }
  await open(path.join(site, "dist", "index.html"));
  const uniqueIds = await client.evaluate('(()=>{ const ids=[...document.querySelectorAll("svg [id]")].map(e=>e.id); return ids.length === new Set(ids).size; })()');
  assert.ok(uniqueIds, "multiple inline diagrams have unique IDs");
  assert.ok(!(await client.evaluate('document.documentElement.scrollWidth > innerWidth')), "inline page overflows");
  for (const item of ["return-flow", "native-compact", "canvas-compact", "large-flow", "tall-flow"]) {
    await open(path.join(site, "dist", "diagrams", item + ".html"));
    const prefix = item.startsWith("canvas") ? "canvas" : item.startsWith("native") ? "native" : "mermaid";
    const click = async (action) => client.evaluate(`document.querySelector('[data-${prefix}-control="${action}"]').click()`);
    const state = () => client.evaluate(`(()=>{ const svg=document.querySelector(".mermaid-target svg, [data-canvas]"); return {box:svg.getAttribute("viewBox"),original:svg.dataset.diagramViewBox,zoom:document.querySelector('[data-${prefix}-zoom]').textContent} })()`);
    const initial = await state();
    await click("in"); const zoomed = await state(); assert.notEqual(zoomed.box, initial.box);
    const viewportSelector = prefix === "canvas" ? ".canvas-scroll" : ".mermaid-surface";
    const origin = await client.evaluate(`(()=>{const b=document.querySelector('${viewportSelector}').getBoundingClientRect(); return {x:b.x+b.width/2,y:b.y+b.height/2}})()`);
    await client.command("Input.dispatchMouseEvent", { type: "mousePressed", button: "left", clickCount: 1, ...origin });
    await client.command("Input.dispatchMouseEvent", { type: "mouseMoved", button: "left", buttons: 1, x: origin.x + 50, y: origin.y + 30 });
    await client.command("Input.dispatchMouseEvent", { type: "mouseReleased", button: "left", clickCount: 1, x: origin.x + 50, y: origin.y + 30 });
    assert.notEqual((await state()).box, zoomed.box, "drag pans a zoomed diagram");
    assert.equal(await client.evaluate(`document.querySelector('${viewportSelector}').classList.contains("is-panning")`), false);
    await client.evaluate(`document.querySelector('${viewportSelector}').dispatchEvent(new KeyboardEvent("keydown",{key:"Home",bubbles:true}))`);
    assert.equal((await state()).zoom, "100%", "keyboard resets the viewport");
    await click("in");
    await client.command("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
    await client.evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
    assert.equal((await state()).zoom, zoomed.zoom, "resize preserves zoom");
    assert.ok(!(await client.evaluate('document.documentElement.scrollWidth > innerWidth')), item + " overflows on a small screen");
    await click("reset"); assert.equal((await state()).zoom, "100%");
    await writeFile(path.join(output, item + "-mobile.png"), Buffer.from((await client.command("Page.captureScreenshot")).data, "base64"));
    await click("in");
    await client.command("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await client.evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
    // Exercise the fullscreen fallback as well as native fullscreen. Headless
    // browsers require a trusted mouse click for the native request.
    const fullButton = await client.evaluate(`(()=>{const b=document.querySelector('[data-${prefix}-control="full"]').getBoundingClientRect(); return {x:b.x+b.width/2,y:b.y+b.height/2}})()`);
    await client.command("Input.dispatchMouseEvent", { type: "mousePressed", button: "left", clickCount: 1, ...fullButton });
    await client.command("Input.dispatchMouseEvent", { type: "mouseReleased", button: "left", clickCount: 1, ...fullButton });
    await client.waitFor(`document.querySelector('[data-${prefix}-control="full"]').getAttribute("aria-pressed") === "true"`);
    await client.waitFor(`document.querySelector('[data-${prefix}-zoom]').textContent === "100%"`);
    assert.equal((await state()).zoom, "100%", "fullscreen refits content");
    await click("full"); await client.waitFor(`document.querySelector('[data-${prefix}-control="full"]').getAttribute("aria-pressed") === "false"`);
    await client.waitFor(`document.querySelector('[data-${prefix}-zoom]').textContent === "125%"`);
    assert.equal((await state()).zoom, "125%", "leaving fullscreen restores the inline zoom");
    if (item === "return-flow") {
      await client.evaluate(`document.querySelector(".mermaid-shell").requestFullscreen = undefined`);
      await click("full"); await client.waitFor('document.querySelector(".mermaid-shell").classList.contains("is-expanded")');
      await client.waitFor('document.querySelector("[data-mermaid-zoom]").textContent === "100%"');
      assert.equal((await state()).zoom, "100%", "fullscreen fallback refits");
      await client.evaluate('document.dispatchEvent(new KeyboardEvent("keydown", {key:"Escape",bubbles:true}))');
      await client.waitFor('!document.querySelector(".mermaid-shell").classList.contains("is-expanded")');
      await client.waitFor('document.querySelector("[data-mermaid-zoom]").textContent === "125%"');
      assert.equal((await state()).zoom, "125%", "Escape restores the inline view");
    }
    const exported = await client.evaluate('AureliusDiagramViewport.exportSvg(document.querySelector(".mermaid-target svg, [data-canvas]"))');
    assert.equal(exported.match(/viewBox="([^"]+)"/)[1], (await state()).original, "export includes all content after zooming");
    assert.match(exported, /xmlns="http:\/\/www.w3.org\/2000\/svg"/); assert.match(exported, /<title/); assert.match(exported, /<desc/);
    assert.doesNotMatch(exported, /data-diagram-view-box/);
    await writeFile(path.join(output, item + ".svg"), exported);
    const view = (await state()).box;
    await client.evaluate('dispatchEvent(new Event("beforeprint")); dispatchEvent(new Event("beforeprint")); AureliusDiagramViewport.mount({svg:document.querySelector(".mermaid-target svg, [data-canvas]")}).resize()');
    await client.evaluate('new Promise(resolve => requestAnimationFrame(resolve))');
    assert.equal((await state()).box, (await state()).original, "resize cannot replace print bounds");
    assert.equal(await client.evaluate('!!document.querySelector("details.mermaid-summary:not([open])")'), false, "print exposes semantic reading");
    await client.evaluate('dispatchEvent(new Event("afterprint"))'); assert.equal((await state()).box, view);
    if (item === "return-flow") await writeFile(path.join(output, "return-flow.pdf"), Buffer.from((await client.command("Page.printToPDF", { landscape: true, printBackground: true })).data, "base64"));
    if (prefix === "canvas") {
      await click("reset");
      await client.command("Emulation.setTouchEmulationEnabled", { enabled: true });
      const touch = await client.evaluate('(()=>{const b=document.querySelector(".canvas-node").getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2}})()');
      await client.command("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [touch] });
      await client.command("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      assert.equal(await client.evaluate('document.querySelectorAll(".canvas-node.is-active").length'), 1, "Canvas taps select nodes at fit zoom");
      await client.command("Emulation.setTouchEmulationEnabled", { enabled: false });
    }
    await open(path.join(output, item + ".svg"));
    assert.equal(await client.evaluate('document.querySelector("parsererror")?.textContent || null'), null, "exported SVG parses independently");
    assert.equal(await client.evaluate('document.documentElement.getAttribute("viewBox")'), initial.original, "standalone export retains content bounds");
  }
  console.log(`Visual checks passed: ${checked} diagrams; desktop/mobile, pan, keyboard, touch, resize, fullscreen, standalone export and print. Artifacts: ${output}`);
} finally {
  await client.close();
}
