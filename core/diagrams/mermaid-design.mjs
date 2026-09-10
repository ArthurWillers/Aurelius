const styleDirective = /^\s*(?:classDef|style|linkStyle)\b/i;

function normalizedGrammar(diagramType, source) {
  const first = String(source).trimStart().match(/^([\w-]+)/)?.[1]?.toLowerCase() || "diagram";
  const detected = String(diagramType || "").toLowerCase();
  if (detected.startsWith("flowchart") || first === "graph" || first === "flowchart") return "flowchart";
  if (detected.includes("sequence") || first === "sequencediagram") return "sequence";
  if (detected.includes("state") || first.startsWith("statediagram")) return "state";
  if (detected === "er" || first === "erdiagram") return "er";
  if (detected.includes("class") || first === "classdiagram") return "uml-class";
  if (detected.includes("xychart") || first.startsWith("xychart")) return "xychart";
  if (detected.includes("quadrant") || first === "quadrantchart") return "quadrant";
  if (detected.includes("gantt") || first === "gantt") return "gantt";
  if (detected.includes("journey") || first === "journey") return "journey";
  return first;
}

function declaredDirection(lines) {
  const header = lines[0]?.match(/^\s*(?:flowchart|graph)\s+(TD|TB|BT|LR|RL)\b/i);
  if (header) return header[1].toUpperCase();
  const directive = lines.find((line) => /^\s*direction\s+(TD|TB|BT|LR|RL)\b/i.test(line));
  return directive?.match(/^\s*direction\s+(TD|TB|BT|LR|RL)\b/i)?.[1]?.toUpperCase() || null;
}

function focalIds(lines) {
  const ids = new Set();
  for (const line of lines) {
    const classMatch = line.match(/^\s*class\s+([^\s]+)\s+([^\s]+)\s*$/i);
    if (classMatch && classMatch[2].split(",").includes("focal")) {
      classMatch[1].split(",").map((id) => id.trim()).filter(Boolean).forEach((id) => ids.add(id));
    }
    for (const match of line.matchAll(/\b([A-Za-z_][\w-]*)[^\n]*?:::focal\b/g)) ids.add(match[1]);
  }
  return [...ids];
}

const cardinalityToken = "(?:0\\.\\.1|0\\.\\.(?:N|\\*)|1\\.\\.(?:N|\\*)|1|N|\\*)";

function normalizedCardinality(token) {
  const value = String(token || "").toUpperCase();
  if (value === "1") return "||";
  if (value === "0..1") return "o|";
  if (value === "0..N" || value === "0..*") return "o{";
  return "|{";
}

function readableCardinality(token) {
  const value = String(token || "").toUpperCase();
  if (value === "*") return "N";
  if (value === "1..*" || value === "1..N") return "N";
  if (value === "0..*") return "0..N";
  return value;
}

function nativeCardinality(token) {
  if (token.includes("o") && token.includes("{")) return "0..N";
  if (token.includes("{")) return "N";
  if (token.includes("o")) return "0..1";
  return "1";
}

/**
 * A small Mermaid-compatible authoring extension for ER diagrams. It lets a
 * source say `DOCUMENT 1 -- N SECTION : contains`, then lowers it to Mermaid's
 * crow-foot grammar before validation/rendering. The original source is kept
 * as the API contract, including the cardinality labels.
 */
function normalizeErCardinalities(lines) {
  const relationships = [];
  const explicit = new RegExp("^(\\s*)([A-Za-z_][\\w]*)\\s+(" + cardinalityToken + ")\\s*--\\s*(" + cardinalityToken + ")\\s+([A-Za-z_][\\w]*)\\s*:\\s*(.+?)\\s*$", "i");
  const native = /^\s*([A-Za-z_][\w]*)\s+([|o}{]+)--([|o}{]+)\s+([A-Za-z_][\w]*)\s*:\s*(.+?)\s*$/i;
  const renderLines = lines.map((line) => {
    const match = line.match(explicit);
    if (match) {
      const relationship = {
        from: match[2], left: readableCardinality(match[3]), right: readableCardinality(match[4]), to: match[5], label: match[6],
      };
      relationships.push(relationship);
      return match[1] + relationship.from + " " + normalizedCardinality(match[3]) + "--" + normalizedCardinality(match[4]) + " " + relationship.to + " : " + relationship.label;
    }
    const standard = line.match(native);
    if (standard) relationships.push({ from: standard[1], left: nativeCardinality(standard[2]), right: nativeCardinality(standard[3]), to: standard[4], label: standard[5] });
    return line;
  });
  return { renderLines, relationships };
}

function semanticRoles(grammar, source, focus) {
  const roles = new Set();
  if (grammar === "flowchart") {
    if (/\b(?:flowchart|graph)\b[\s\S]*?(?:\[[^\]]+\]|\([^\)]+\)|\{[^}]+\})/i.test(source)) roles.add("step");
    if (/\{[^}\n]+\}/.test(source)) roles.add("decision");
    if (/\(\[[^\]\n]+\]\)|\[\([^\)\n]+\)\]/.test(source)) roles.add("outcome");
    if (/\bsubgraph\b/i.test(source)) roles.add("group");
    if (/-{1,3}>|={1,3}>|-.->/.test(source)) roles.add("connection");
  } else if (grammar === "sequence") {
    roles.add("actor");
    if (/[-=]+>>|[-=]+>/.test(source)) roles.add("request");
    if (/-->>|-->/.test(source)) roles.add("response");
    if (/^\s*(?:alt|else|opt|loop|par|critical|break)\b/im.test(source)) roles.add("alternative");
  } else if (grammar === "state") {
    roles.add("state");
    if (/-->/.test(source)) roles.add("transition");
    if (/\[\*\]/.test(source)) roles.add("terminal");
    if (/^\s*state\s+[^\n]+\{/im.test(source)) roles.add("group");
  } else if (grammar === "er") {
    roles.add("entity");
    if (/\bPK\b/.test(source)) roles.add("primary-key");
    if (/\bFK\b/.test(source)) roles.add("foreign-key");
    if (/[|o}{]{1,2}--[|o}{]{1,2}/.test(source)) roles.add("relationship");
  } else if (grammar === "uml-class") {
    roles.add("class");
    if (/<<\s*interface\s*>>/i.test(source)) roles.add("interface");
    if (/<\|[-.]+/.test(source)) roles.add("inheritance");
    if (/\*--|--\*/.test(source)) roles.add("composition");
    if (/o--|--o/.test(source)) roles.add("aggregation");
  } else if (grammar === "xychart") {
    roles.add("series");
    roles.add("axis");
  } else if (grammar === "quadrant") {
    roles.add("group");
    roles.add("item");
    roles.add("axis");
  } else if (grammar === "gantt") {
    roles.add("task");
    if (/:\s*[^\n]*\bmilestone\b/i.test(source)) roles.add("milestone");
    if (/:\s*[^\n]*\bdone\b/i.test(source)) roles.add("completed");
    if (/:\s*[^\n]*\bactive\b/i.test(source)) roles.add("active");
  } else if (grammar === "journey") {
    roles.add("stage");
    roles.add("item");
    roles.add("score");
  } else {
    roles.add("node");
    if (/-->|==>|-.->/.test(source)) roles.add("connection");
  }
  if (focus.length) roles.add("focal");
  return [...roles];
}

/**
 * Compile Mermaid into an inert editorial profile.
 *
 * This mirrors Diagram Design's Mermaid importer boundary: source layout and
 * meaning are retained, while source-owned paint directives are counted and
 * removed before the browser renderer receives the diagram.
 */
export function compileMermaidDesign(source, diagramType) {
  const lines = String(source).replace(/\r\n?/g, "\n").split("\n");
  const paintDirectives = lines.filter((line) => styleDirective.test(line));
  const withoutPaint = lines.filter((line) => !styleDirective.test(line));
  const grammarHint = normalizedGrammar(diagramType, withoutPaint.join("\n"));
  const er = grammarHint === "er" ? normalizeErCardinalities(withoutPaint) : { renderLines: withoutPaint, relationships: [] };
  const renderLines = er.renderLines;
  const renderSource = renderLines.join("\n").trim();
  const grammar = normalizedGrammar(diagramType, renderSource);
  const focus = focalIds(renderLines);
  return {
    renderSource,
    analysis: {
      grammar,
      direction: declaredDirection(renderLines),
      roles: semanticRoles(grammar, renderSource, focus),
      focus,
      relationships: er.relationships,
      discarded: { paintDirectives: paintDirectives.length },
    },
  };
}
