import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

test("npm package manifest includes the portable Aurelius skills", async () => {
  const manifest = JSON.parse(await readFile(path.join(projectRoot, "package.json"), "utf8"));
  assert.ok(manifest.files.includes(".agents/skills/"));

  const expected = [
    ".agents/skills/aurelius-documentation/SKILL.md",
    ".agents/skills/aurelius-documentation/references/content-contract.md",
    ".agents/skills/aurelius-documentation/references/html-visuals.md",
    ".agents/skills/documentation-migration/SKILL.md",
    ".agents/skills/documentation-migration/agents/openai.yaml",
    ".agents/skills/documentation-migration/references/obsidian.md",
  ];

  for (const file of expected) await access(path.join(projectRoot, file));
});
