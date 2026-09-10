import path from "node:path";
import { listValue, slugify } from "./shared.mjs";

export function parseMarkdown(raw, file) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) throw new Error("Frontmatter ausente em " + file);
  const frontmatter = {};
  for (const line of match[1].split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    frontmatter[key] = line.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
  }
  for (const key of ["tags", "related", "source_refs"]) frontmatter[key] = listValue(frontmatter[key]);
  return { frontmatter, body: raw.slice(match[0].length).trim() };
}

export function createHeadingSlugger() {
  const seen = new Map();
  return (title) => {
    const base = slugify(title) || "secao";
    const count = seen.get(base) || 0;
    seen.set(base, count + 1);
    return count ? base + "-" + (count + 1) : base;
  };
}

export function plainHeading(value) {
  return String(value)
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
}

export function extractSections(markdown) {
  const sections = [];
  let active = null;
  const nextSlug = createHeadingSlugger();
  for (const [lineIndex, line] of markdown.split(/\r?\n/).entries()) {
    const heading = line.match(/^(#{2,3})\s+(.+)$/);
    if (heading) {
      const title = plainHeading(heading[2]);
      active = { id: nextSlug(title), level: heading[1].length, title, text: "", line: lineIndex + 1 };
      sections.push(active);
      continue;
    }
    if (active && !line.startsWith("{{")) active.text += (active.text ? " " : "") + line.trim();
  }
  return sections.map((section) => ({ ...section, text: section.text.trim() }));
}

export function safeAssetPath(reference) {
  const assetPath = reference.replace(/^asset:/i, "").replace(/\\/g, "/");
  const normalized = path.posix.normalize(assetPath).replace(/^\.\//, "");
  if (!normalized || normalized === ".." || normalized.startsWith("../") || path.posix.isAbsolute(normalized)) {
    throw new Error("Caminho de asset inválido: " + reference);
  }
  return normalized;
}

export function markdownWithoutFencedCode(markdown) {
  let fenced = false;
  return String(markdown).split(/\r?\n/).map((line) => {
    if (/^```/.test(line.trim())) {
      fenced = !fenced;
      return "";
    }
    return fenced ? "" : line;
  }).join("\n");
}

export function documentUsesDiagram(document, diagramId) {
  if (document.diagram === diagramId) return true;
  return [...markdownWithoutFencedCode(document.body).matchAll(/^\s*\{\{(?:diagram|canvas):([^}]+)\}\}\s*$/gm)]
    .some((match) => String(match[1]).trim() === diagramId);
}
