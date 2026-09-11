import { createServer } from "node:http";
import { watch } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { buildDocumentation } from "./build.mjs";
import { normalizedConfig } from "./config.mjs";

const optionValue = (name) => {
  const position = process.argv.indexOf(name);
  return position >= 0 ? process.argv[position + 1] : null;
};

const mimeType = (file) =>
  ({
    ".css": "text/css; charset=utf-8",
    ".gif": "image/gif",
    ".html": "text/html; charset=utf-8",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".json": "application/json; charset=utf-8",
    ".md": "text/markdown; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".txt": "text/plain; charset=utf-8",
    ".webp": "image/webp",
  })[path.extname(file).toLocaleLowerCase("en-US")] ||
  "application/octet-stream";

const reloadClient =
  '<script>(function(){var e=new EventSource("/__aurelius/events");e.addEventListener("reload",function(){location.reload()})})();</script>';

async function configuredOutputDirectory(siteRoot) {
  const config = normalizedConfig(JSON.parse(await readFile(path.join(siteRoot, "site.config.json"), "utf8")));
  return { config, outputDirectory: path.resolve(siteRoot, config.outputDirectory) };
}

export function previewFilePath(outputDirectory, pathname) {
  const requested = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const cleanRequested = pathname !== "/" && (pathname.endsWith("/") || !path.posix.extname(requested))
    ? path.posix.join(requested, "index.html")
    : requested;
  const file = path.resolve(outputDirectory, cleanRequested);
  const relative = path.relative(outputDirectory, file);
  if (!relative || relative.startsWith(".." + path.sep) || path.isAbsolute(relative)) return null;
  return file;
}

export async function developDocumentation() {
  const siteArgument = optionValue("--site");
  if (!siteArgument) {
    throw new Error("Informe o site: aurelius dev --site caminho/para/o-site");
  }

  const siteRoot = path.resolve(process.cwd(), siteArgument);
  let { config, outputDirectory } = await configuredOutputDirectory(siteRoot);
  const port = Number(optionValue("--port") || 4173);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("--port precisa estar entre 1 e 65535.");
  }

  await buildDocumentation();

  const clients = new Set();
  const server = createServer(async (request, response) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url || "/", "http://localhost").pathname);
    } catch {
      response.writeHead(400).end("Bad request");
      return;
    }
    if (pathname === "/__aurelius/events") {
      response.writeHead(200, {
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Content-Type": "text/event-stream",
      });
      response.write("event: ready\ndata: connected\n\n");
      clients.add(response);
      request.on("close", () => clients.delete(response));
      return;
    }

    const file = previewFilePath(outputDirectory, pathname);
    if (!file) {
      response.writeHead(403).end("Forbidden");
      return;
    }

    try {
      let content = await readFile(file);
      if (path.extname(file) === ".html") {
        content = Buffer.from(
          content.toString("utf8").replace("</body>", reloadClient + "</body>"),
        );
      }
      response.writeHead(200, {
        "Cache-Control": "no-store",
        "Content-Type": mimeType(file),
      });
      response.end(content);
    } catch {
      response.writeHead(404).end("Not found");
    }
  });

  const publishReload = () => {
    for (const client of clients) client.write("event: reload\ndata: changed\n\n");
  };
  let timer;
  let rebuilding = false;
  const rebuild = () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      if (rebuilding) return;
      rebuilding = true;
      try {
        await buildDocumentation();
        ({ config, outputDirectory } = await configuredOutputDirectory(siteRoot));
        publishReload();
        console.log("Documentação atualizada.");
      } catch (error) {
        console.error("Falha ao atualizar:\n" + error.message);
      } finally {
        rebuilding = false;
      }
    }, 120);
  };

  const paths = [
    path.join(siteRoot, "site.config.json"),
    path.join(siteRoot, "content"),
    path.join(siteRoot, "diagrams"),
    path.join(siteRoot, "assets"),
  ];
  if (config.framework?.runtime) {
    paths.push(path.resolve(siteRoot, config.framework.runtime));
  }
  const watchers = [];
  for (const watchPath of paths) {
    try {
      watchers.push(
        watch(
          watchPath,
          { recursive: watchPath !== path.join(siteRoot, "site.config.json") },
          rebuild,
        ),
      );
    } catch (error) {
      if (!error || error.code !== "ENOENT") throw error;
    }
  }

  await new Promise((resolve, reject) => {
    const onError = (error) => reject(error);
    server.once("error", onError);
    server.listen(port, "127.0.0.1", () => {
      server.off("error", onError);
      resolve();
    });
  });
  console.log("Aurelius em http://127.0.0.1:" + port + " (Ctrl+C para encerrar)");

  const close = () => {
    watchers.forEach((watcher) => watcher.close());
    clients.forEach((client) => client.end());
    server.close();
  };
  process.once("SIGINT", close);
  process.once("SIGTERM", close);
}
