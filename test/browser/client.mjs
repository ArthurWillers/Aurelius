import { spawn, spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

// Optional browser checks use an installed Chromium via CDP and Node's built-in
// WebSocket. No browser download or application dependency is required.
export async function browserClient(endpoint = process.env.AURELIUS_BROWSER_ENDPOINT) {
  let processHandle, profile;
  if (!endpoint) {
    const executable = process.env.CHROME_BIN || ["chromium", "chromium-browser", "google-chrome", "brave"].find((name) => spawnSync("which", [name]).status === 0);
    if (!executable) throw new Error("Set CHROME_BIN to an installed Chromium executable.");
    profile = await mkdtemp(path.join(os.tmpdir(), "aurelius-browser-"));
    processHandle = spawn(executable, ["--headless", "--no-first-run", "--no-default-browser-check", "--disable-gpu", "--disable-extensions", "--disable-background-networking", "--remote-debugging-port=0", "--user-data-dir=" + profile, "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
    endpoint = await new Promise((resolve, reject) => {
      let output = "";
      const timer = setTimeout(() => { processHandle.kill(); reject(new Error("Browser startup timed out: " + output.slice(-1000))); }, 15000);
      processHandle.stderr.on("data", (chunk) => {
        output += chunk;
        const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/);
        if (match) { clearTimeout(timer); resolve(match[1]); }
      });
      processHandle.once("error", (error) => { clearTimeout(timer); reject(error); });
      processHandle.once("exit", (code) => { clearTimeout(timer); reject(new Error("Browser exited: " + code + " " + output.slice(-1000))); });
    });
  }
  if (endpoint.startsWith("http")) endpoint = (await (await fetch(endpoint + "/json/version")).json()).webSocketDebuggerUrl;
  const socket = new WebSocket(endpoint), pending = new Map();
  let sequence = 0;
  await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data), entry = pending.get(message.id);
    if (!entry) return;
    pending.delete(message.id); clearTimeout(entry.timer);
    if (message.error) entry.reject(new Error(JSON.stringify(message.error))); else entry.resolve(message.result);
  });
  function send(method, params = {}, sessionId) {
    const id = ++sequence;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { pending.delete(id); reject(new Error("CDP timeout: " + method)); }, 20000);
      pending.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  const command = (method, params) => send(method, params, sessionId);
  await command("Page.enable"); await command("Runtime.enable"); await command("Network.enable");
  // Deterministic offline screenshots; the application has local font fallbacks.
  await command("Network.setBlockedURLs", { urls: ["https://fonts.googleapis.com/*", "https://fonts.gstatic.com/*"] });
  async function evaluate(expression) {
    const result = await command("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  }
  async function waitFor(expression) {
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) { if (await evaluate(expression)) return; await new Promise((resolve) => setTimeout(resolve, 50)); }
    throw new Error("Browser condition timed out: " + expression);
  }
  return { command, evaluate, waitFor, close: async () => {
    try { await send("Target.closeTarget", { targetId }); if (processHandle) await send("Browser.close"); } finally { socket.close(); if (processHandle) { processHandle.kill(); await rm(profile, { recursive: true, force: true }); } }
  } };
}
