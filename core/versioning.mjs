import { access, cp, mkdir, readFile, readdir, realpath, rm } from "node:fs/promises";
import path from "node:path";
import { normalizedConfig } from "./config.mjs";
import { buildSiteDocumentation } from "./build.mjs";

const optionValue = (name) => {
  const position = process.argv.indexOf(name);
  return position >= 0 ? process.argv[position + 1] : null;
};

async function readSiteConfig(siteRoot) {
  const configPath = path.join(siteRoot, "site.config.json");
  try {
    return normalizedConfig(JSON.parse(await readFile(configPath, "utf8")));
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error("Configuração ausente: " + configPath);
    }
    throw error;
  }
}
function isWithin(parent, child) {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith(".." + path.sep) && !path.isAbsolute(relative));
}

function pathsOverlap(left, right) {
  return isWithin(left, right) || isWithin(right, left);
}

async function canonicalDestination(target) {
  const missing = [];
  let current = target;
  while (true) {
    try {
      return path.join(await realpath(current), ...missing.reverse());
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      const parent = path.dirname(current);
      if (parent === current) throw error;
      missing.push(path.basename(current));
      current = parent;
    }
  }
}

async function assertExists(file, label) {
  try {
    await access(file);
  } catch {
    throw new Error("" + label + " não encontrado: " + file);
  }
}

export async function loadVersionedSite(siteArgument) {
  const siteRoot = path.resolve(siteArgument || optionValue("--site") || "");
  const config = await readSiteConfig(siteRoot);
  if (!config.versioning) return { siteRoot, config, versions: [] };
  const canonicalRoot = await realpath(siteRoot);

  const versions = [];
  for (const version of config.versioning.versions) {
    const versionSiteRoot = path.resolve(siteRoot, version.site);
    if (!isWithin(siteRoot, versionSiteRoot) || versionSiteRoot === siteRoot) {
      throw new Error("O site da versão precisa ficar dentro da raiz e em uma pasta própria: " + version.site);
    }
    await assertExists(path.join(versionSiteRoot, "site.config.json"), "site.config.json da versão " + version.id);
    const canonicalVersionRoot = await realpath(versionSiteRoot);
    if (!isWithin(canonicalRoot, canonicalVersionRoot)) {
      throw new Error("O site da versão não pode sair da raiz do catálogo por meio de links simbólicos: " + version.site);
    }
    const siteConfig = await readSiteConfig(versionSiteRoot);
    if (siteConfig.versioning) {
      throw new Error("Catálogos de versão aninhados não são suportados: " + version.site);
    }
    const outputDirectory = path.resolve(versionSiteRoot, siteConfig.outputDirectory);
    if (!isWithin(versionSiteRoot, outputDirectory) || outputDirectory === versionSiteRoot) {
      throw new Error("outputDirectory da versão precisa ser uma pasta dedicada dentro do site: " + version.id);
    }
    versions.push({ ...version, siteRoot: versionSiteRoot, canonicalSiteRoot: canonicalVersionRoot, siteConfig, outputDirectory });
  }

  for (let index = 0; index < versions.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < versions.length; otherIndex += 1) {
      if (pathsOverlap(versions[index].canonicalSiteRoot, versions[otherIndex].canonicalSiteRoot)) {
        throw new Error("Os sites-fonte das versões não podem se sobrepor: " + versions[index].id + " e " + versions[otherIndex].id);
      }
    }
  }

  const rootOutputDirectory = path.resolve(siteRoot, config.outputDirectory);
  if (!isWithin(siteRoot, rootOutputDirectory) || rootOutputDirectory === siteRoot) {
    throw new Error("outputDirectory do catálogo precisa ser uma pasta dedicada dentro da raiz.");
  }
  const canonicalOutputDirectory = await canonicalDestination(rootOutputDirectory);
  if (!isWithin(canonicalRoot, canonicalOutputDirectory) || canonicalOutputDirectory === canonicalRoot) {
    throw new Error("outputDirectory do catálogo não pode escapar da raiz do site por meio de links simbólicos.");
  }
  for (const version of versions) {
    if (pathsOverlap(canonicalOutputDirectory, version.canonicalSiteRoot)) {
      throw new Error("outputDirectory do catálogo não pode sobrepor os sites-fonte: " + version.id);
    }
  }

  return { siteRoot, config, versions, rootOutputDirectory };
}

export async function resolveCurrentVersionSite(siteArgument) {
  const site = await loadVersionedSite(siteArgument);
  if (!site.config.versioning) return site.siteRoot;
  return site.versions.find((version) => version.id === site.config.versioning.current).siteRoot;
}

async function copyDirectoryContents(source, destination) {
  await mkdir(destination, { recursive: true });
  for (const entry of await readdir(source, { withFileTypes: true })) {
    await cp(path.join(source, entry.name), path.join(destination, entry.name), { recursive: true });
  }
}

export async function buildDocumentation({ site: siteArgument, checkOnly = process.argv.includes("--check") } = {}) {
  const site = await loadVersionedSite(siteArgument);
  if (!site.config.versioning) {
    return buildSiteDocumentation({ siteRoot: site.siteRoot, checkOnly });
  }

  for (const version of site.versions) {
    await buildSiteDocumentation({
      siteRoot: version.siteRoot,
      checkOnly,
      versionNavigation: {
        current: version,
        language: site.config.language,
        versions: site.versions,
      },
    });
  }

  if (checkOnly) {
    console.log("Catálogo de versões válido: " + site.versions.length + " sites completos.");
    return;
  }

  await rm(site.rootOutputDirectory, { recursive: true, force: true });
  for (const version of site.versions) {
    const destination = version.path
      ? path.join(site.rootOutputDirectory, ...version.path.split("/"))
      : site.rootOutputDirectory;
    await copyDirectoryContents(version.outputDirectory, destination);
  }
  console.log("Catálogo de versões gerado em " + path.relative(process.cwd(), site.rootOutputDirectory));
}
