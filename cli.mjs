#!/usr/bin/env node

import { writeSync } from "node:fs";
import { buildDocumentation, initializeDocumentation } from "./core/build.mjs";
import { developDocumentation } from "./core/dev.mjs";
import { initializeVisual, listVisualTypes } from "./core/scaffold.mjs";

const optionValue = (name) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};

function usage() {
  console.log(
    [
      "Aurelius — static documentation for people and agents.",
      "",
      "Comandos:",
      "  aurelius init <pasta> [--title <titulo>] [--logo <marca.svg|marca.png|marca.jpeg|marca.jpg>]",
      "  aurelius check --site <pasta>",
      "  aurelius build --site <pasta>",
      "  aurelius dev --site <pasta> [--port 4173]",
      "  aurelius visual init <id> --site <pasta> --kind <tipo> [--format mermaid|html|svg]",
      "  aurelius visual types",
      "  aurelius help",
      "",
      "Inside the Aurelius repository, use: npm run aurelius -- <command>.",
    ].join("\n"),
  );
}

const command = process.argv[2];
const legacyBuild = command === "--site" || command === "--check";
const visualCommand = process.argv[3];

function runVisualCommand() {
  if (visualCommand === "init") {
    return initializeVisual({
      id: process.argv[4],
      site: optionValue("--site"),
      kind: optionValue("--kind"),
      format: optionValue("--format"),
    });
  }
  if (visualCommand === "types") {
    // `visual types` is commonly consumed by agents through a piped child
    // process; write synchronously so a zero-work Promise cannot end before
    // the pipe is flushed.
    writeSync(1, listVisualTypes() + "\n");
    return Promise.resolve();
  }
  if (visualCommand === "help" || visualCommand === "--help" || !visualCommand) return Promise.resolve(usage());
  return Promise.reject(new Error("Unknown visual subcommand: " + visualCommand + "\n\nUse `aurelius visual types` to list types."));
}

const action =
  command === "init"
    ? initializeDocumentation(process.argv[3])
    : command === "visual"
      ? runVisualCommand()
      : command === "check"
        ? buildDocumentation({ checkOnly: true })
        : command === "build"
          ? buildDocumentation()
          : command === "dev"
            ? developDocumentation()
            : command === "help" || command === "--help" || !command
              ? Promise.resolve(usage())
              : legacyBuild
                ? buildDocumentation({ checkOnly: process.argv.includes("--check") })
                : Promise.reject(new Error("Unknown command: " + command + "\n\nUse `aurelius help` to list commands."));

action.catch((error) => {
  console.error("Aurelius failed:\n" + error.stack);
  process.exitCode = 1;
});
