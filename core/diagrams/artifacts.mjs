import { escapeAttribute, escapeHtml } from "../shared.mjs";
import { validateAccessibleSvg } from "./registry.mjs";

const htmlExtensions = new Set([".html", ".htm"]);

export function isHtmlArtifactSource(file) {
  return htmlExtensions.has(String(file || "").slice(String(file || "").lastIndexOf(".")).toLowerCase());
}

export function artifactCsp(interactive) {
  return [
    "default-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-src 'none'",
    "object-src 'none'",
    "img-src data:",
    "style-src 'unsafe-inline' https://fonts.googleapis.com",
    "font-src https://fonts.gstatic.com data:",
    "connect-src 'none'",
    "media-src 'none'",
    "script-src " + (interactive ? "'unsafe-inline'" : "'none'"),
  ].join("; ");
}

function extractInlineSvg(html, diagram) {
  const match = String(html).match(/<svg\b[\s\S]*?<\/svg\s*>/i);
  if (!match) return null;
  // A copied/printed SVG does not inherit CSS from the authored HTML head.
  // The author must explicitly nominate a self-contained SVG and keep every
  // required style/variable inside it. Otherwise Aurelius uses semantic text
  // in print and the author can provide an explicit svgSource if desired.
  if (!/\bdata-aurelius-print-source\s*=\s*["']true["']/i.test(match[0])) return null;
  const internalStyle = match[0].match(/<style\b[^>]*>([\s\S]*?)<\/style>/i)?.[1];
  if (!internalStyle) return null;
  const declaredVariables = new Set([...internalStyle.matchAll(/(--[A-Za-z0-9_-]+)\s*:/g)].map((entry) => entry[1]));
  for (const variable of match[0].matchAll(/var\(\s*(--[A-Za-z0-9_-]+)/g)) {
    if (!declaredVariables.has(variable[1])) return null;
  }
  try {
    return validateAccessibleSvg(match[0], { ...diagram, svgSource: diagram.htmlSource });
  } catch {
    return null;
  }
}

export function validateHtmlArtifact(raw, diagram) {
  const html = String(raw || "").trim();
  const source = diagram.htmlSource || diagram.sourcePath;
  const canonicalPrelude = /^<!doctype html>\s*<html\b(?=[^>]*\blang\s*=\s*["'][^"']+["'])[^>]*>\s*<head>/i;
  if (!canonicalPrelude.test(html) || !/<\/head>\s*<body\b[^>]*>/i.test(html) || !/<\/body>\s*<\/html>\s*$/i.test(html)) {
    throw new Error("Artefato HTML precisa usar a estrutura canônica <!doctype html>, <html lang>, <head> e <body>: " + source);
  }
  if (!/<title\b[^>]*>[^<]+<\/title>/i.test(html)) {
    throw new Error("Artefato HTML precisa declarar um título: " + source);
  }
  if (typeof diagram.summary !== "string" || diagram.summary.trim().length < 24) {
    throw new Error("Artefato HTML precisa de summary com pelo menos 24 caracteres: " + source);
  }
  if (diagram.interactive !== undefined && typeof diagram.interactive !== "boolean") {
    throw new Error("interactive precisa ser booleano no artefato HTML: " + source);
  }
  if (/<\s*(base|iframe|frame|object|embed|applet|form)\b|\bhttp-equiv\s*=|\b(?:href|src)\s*=\s*["']?\s*(?:javascript:|data:text\/html|https?:)(?!\/\/fonts\.(?:googleapis|gstatic)\.com)/i.test(html)) {
    throw new Error("Artefato HTML contém navegação, incorporação ou recurso remoto não permitido: " + source);
  }
  for (const reference of html.matchAll(/\b(?:href|src)\s*=\s*(["'])([\s\S]*?)\1/gi)) {
    const value = reference[2].trim();
    const allowed = /^#[A-Za-z_][\w:.-]*$/.test(value) ||
      /^data:image\/(?:png|jpe?g|gif|webp|svg\+xml);base64,[A-Za-z0-9+/=\s]+$/i.test(value) ||
      /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\//i.test(value);
    if (!allowed) {
      throw new Error("Artefato HTML contém href/src não permitido: " + source);
    }
  }
  if (!diagram.interactive && (/<\s*script\b|\son[a-z]+\s*=/i.test(html))) {
    throw new Error("Artefato HTML estático não pode conter scripts ou handlers: " + source + ". Defina interactive: true apenas quando necessário.");
  }
  if (/prefers-color-scheme\s*:\s*dark|color-scheme\s*:\s*dark/i.test(html)) {
    throw new Error("Artefato HTML deve usar somente tema claro: " + source);
  }
  if (diagram.interactive && /<\s*script\b[^>]*\bsrc\s*=/i.test(html)) {
    throw new Error("Artefato HTML interativo só pode usar scripts inline: " + source);
  }
  for (const inlineSvg of html.matchAll(/<svg\b[\s\S]*?<\/svg\s*>/gi)) {
    validateAccessibleSvg(inlineSvg[0], { ...diagram, svgSource: source + " (SVG inline)" });
  }
  return html;
}

export function secureHtmlArtifact(html, interactive) {
  const policy = '<meta http-equiv="Content-Security-Policy" content="' + artifactCsp(interactive) + '">';
  return String(html).replace(/<head>/i, "<head>" + policy);
}

export function htmlArtifactFrame(diagram, options = {}) {
  const height = Math.max(280, Math.min(1600, Number(diagram.presentation?.height) || 620));
  const width = Math.max(640, Math.min(2200, Number(diagram.presentation?.width) || 1000));
  const sandbox = diagram.interactive ? "allow-scripts" : "";
  const source = secureHtmlArtifact(diagram._html, Boolean(diagram.interactive));
  return '<iframe class="html-artifact-frame" title="' +
    escapeAttribute(diagram.title) +
    '" sandbox="' + sandbox +
    '" loading="' + (options.eager ? "eager" : "lazy") +
    '" referrerpolicy="no-referrer" style="--artifact-width:' + width + "px;--artifact-height:" + height +
    'px" srcdoc="' + escapeAttribute(source) + '"></iframe>';
}

export function svgArtifactImage(svg, diagram, className = "artifact-image") {
  const source = "data:image/svg+xml;base64," + Buffer.from(String(svg), "utf8").toString("base64");
  return '<img class="' + escapeAttribute(className) + '" src="' + source + '" alt="' +
    escapeAttribute(diagram.description || diagram.title) + '">';
}

export function htmlArtifactSummary(diagram, label = "Semantic reading") {
  const data = diagram.data && (Array.isArray(diagram.data) ? diagram.data.length : Object.keys(diagram.data).length)
    ? '<pre>' + escapeHtml(JSON.stringify(diagram.data, null, 2)) + "</pre>"
    : "";
  return '<details class="html-artifact-summary"><summary>' + escapeHtml(label) + "</summary><p>" +
    escapeHtml(diagram.summary) + "</p>" + data + "</details>";
}

export function inlineSvgFromHtmlArtifact(diagram) {
  return diagram._svg || extractInlineSvg(diagram._html, diagram);
}
