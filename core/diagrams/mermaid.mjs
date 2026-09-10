import { compileMermaidDesign } from "./mermaid-design.mjs";

const maximumSourceLength = 100_000;
let mermaidPromise;

async function mermaidEngine() {
  if (!mermaidPromise) {
    mermaidPromise = Promise.all([import("dompurify"), import("mermaid")]).then(([purifyModule, module]) => {
      // Mermaid's parsers sanitize labels even when they only validate syntax.
      // In Node there is no Window, so DOMPurify exports its factory without the
      // browser methods Mermaid calls. Sources have already passed the strict
      // executable-markup gate below; this identity shim is validation-only.
      const purifier = purifyModule.default;
      if (typeof purifier.addHook !== "function") purifier.addHook = () => {};
      if (typeof purifier.removeHook !== "function") purifier.removeHook = () => {};
      if (typeof purifier.sanitize !== "function") purifier.sanitize = (value) => value;
      const engine = module.default;
      engine.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        htmlLabels: false,
        suppressErrorRendering: true,
      });
      return engine;
    });
  }
  return mermaidPromise;
}

export async function validateMermaidSource(raw, diagram) {
  const source = String(raw || "").trim();
  const location = diagram.source?.path || diagram.sourcePath || diagram.id;

  if (!source) {
    throw new Error("Fonte Mermaid vazia em " + location);
  }
  if (source.length > maximumSourceLength) {
    throw new Error("Fonte Mermaid excede 100 KB em " + location);
  }
  if (/%%\s*\{|^\s*---\s*$[\s\S]*?^\s*---\s*$/m.test(source)) {
    throw new Error("Fonte Mermaid não pode sobrescrever a configuração do renderer: " + location);
  }
  if (/<\s*script\b|javascript\s*:|\bon[a-z]+\s*=|^\s*click\s+/im.test(source)) {
    throw new Error("Fonte Mermaid contém navegação ou conteúdo executável não permitido: " + location);
  }

  try {
    const mermaid = await mermaidEngine();
    // Compile the safe Aurelius ER cardinality shorthand before Mermaid sees
    // it; all other grammars pass through unchanged.
    const preliminary = compileMermaidDesign(source);
    const parsed = await mermaid.parse(preliminary.renderSource, { suppressErrors: true });
    if (!parsed || !parsed.diagramType) {
      throw new Error("o parser não reconheceu uma definição completa");
    }
    const compiled = compileMermaidDesign(source, parsed.diagramType);
    return { code: source, renderCode: compiled.renderSource, diagramType: parsed.diagramType, analysis: compiled.analysis };
  } catch (error) {
    const detail = String(error?.message || error).split("\n").slice(0, 4).join(" ");
    throw new Error("Sintaxe Mermaid inválida em " + location + ": " + detail);
  }
}
