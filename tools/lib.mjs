// Shared helpers: a tiny static server and Chrome for Testing with the extension loaded.
// Branded Chrome no longer honours --load-extension, so run `npm run setup` once to fetch Chrome for Testing.
import http from "node:http";
import { readFile, readdir, writeFile, cp, rm } from "node:fs/promises";
import { extname, join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const EXTENSION = join(ROOT, "extension");
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".woff2": "font/woff2", ".json": "application/json", ".m4a": "audio/mp4", ".mp3": "audio/mpeg" };

/** Serve the repository root on 127.0.0.1:<port>. */
export function serve(port = 8765) {
  const server = http.createServer(async (req, res) => {
    try {
      const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
      const file = join(ROOT, path.endsWith("/") ? path + "index.html" : path);
      if (!file.startsWith(ROOT)) throw new Error("outside root");
      const body = await readFile(file);
      res.writeHead(200, { "Content-Type": TYPES[extname(file)] || "application/octet-stream" });
      res.end(body);
    } catch {
      res.writeHead(404).end("not found");
    }
  });
  return new Promise((ok) => server.listen(port, "127.0.0.1", () => ok({ url: `http://127.0.0.1:${port}`, close: () => server.close() })));
}

async function chromePath() {
  const base = join(ROOT, "tools", ".cache", "chrome");
  const versions = (await readdir(base).catch(() => [])).sort();
  if (!versions.length) throw new Error("Chrome for Testing not found: run `npm run setup` in tools/");
  const dir = join(base, versions.at(-1));
  const platform = (await readdir(dir))[0];
  if (process.platform === "darwin") return join(dir, platform, "Google Chrome for Testing.app", "Contents", "MacOS", "Google Chrome for Testing");
  if (process.platform === "win32") return join(dir, platform, "chrome.exe");
  return join(dir, platform, "chrome");
}

/** A copy of the extension with the optional host permission already granted (as if the user had turned on
 * "find articles automatically"), since a test cannot click Chrome's permission prompt. */
async function testBuild() {
  const dir = join(ROOT, "tools", ".cache", "extension-test");
  await rm(dir, { recursive: true, force: true });
  await cp(EXTENSION, dir, { recursive: true });
  const manifest = JSON.parse(await readFile(join(dir, "manifest.json"), "utf8"));
  manifest.host_permissions = manifest.optional_host_permissions;
  await writeFile(join(dir, "manifest.json"), JSON.stringify(manifest, null, 2));
  return dir;
}

/** Launch Chrome for Testing with İstima loaded. Returns {browser, extId}. */
export async function launch({ headless = true, viewport = { width: 1280, height: 800, deviceScaleFactor: 2 } } = {}) {
  const browser = await puppeteer.launch({
    executablePath: await chromePath(), headless, pipe: true, enableExtensions: [await testBuild()], defaultViewport: viewport,
    args: ["--autoplay-policy=no-user-gesture-required", "--lang=tr", "--hide-scrollbars"],
  });
  const sw = await browser.waitForTarget((t) => t.type() === "service_worker" && t.url().endsWith("background.js"));
  return { browser, extId: new URL(sw.url()).host };
}

/** An extension page to drive the extension from (chrome.* APIs available). */
export async function controller(browser, extId) {
  const page = await browser.newPage();
  await page.goto(`chrome-extension://${extId}/options/options.html`);
  await page.evaluate(() => {
    window.__state = null;
    chrome.runtime.onMessage.addListener((m) => { if (m.target === "ui") window.__state = { session: m.session, engine: m.engine }; });
  });
  return {
    page,
    state: () => page.evaluate(() => window.__state),
    /** tab id of the page showing `url` (asks every tab's content script) */
    tabOf: (url) => page.evaluate(async (u) => {
      for (const t of await chrome.tabs.query({})) {
        try { const d = await chrome.tabs.sendMessage(t.id, { type: "istima-detect" }); if (d?.url === u) return t.id; } catch {}
      }
      return null;
    }, url),
    send: (msg) => page.evaluate((m) => chrome.runtime.sendMessage(m), msg),
    tabMessage: (tabId, msg) => page.evaluate((id, m) => chrome.tabs.sendMessage(id, m), tabId, msg),
  };
}
