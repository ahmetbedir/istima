// Chrome Web Store images and the website's social card, rendered from templates/store.html.
// Run screenshots.mjs first (the templates use tools/out/shots/*.png).
//   node store-assets.mjs -> store/images/*.png, site/assets/og-image.png
import puppeteer from "puppeteer-core";
import { mkdir, copyFile } from "node:fs/promises";
import { join } from "node:path";
import { launch, serve, sleep, ROOT } from "./lib.mjs";

const OUT = join(ROOT, "store", "images");
await mkdir(OUT, { recursive: true });
const ASSETS = [
  ["s1", 1280, 800, "screenshot-1-dinle.png"],
  ["s2", 1280, 800, "screenshot-2-tek-tik.png"],
  ["s3", 1280, 800, "screenshot-3-kontrol.png"],
  ["s4", 1280, 800, "screenshot-4-gizlilik.png"],
  ["s5", 1280, 800, "screenshot-5-dogru-okuma.png"],
  ["small", 440, 280, "promo-small-440x280.png"],
  ["marquee", 1400, 560, "promo-marquee-1400x560.png"],
  ["og", 1200, 630, "og-image-1200x630.png"],
];

const server = await serve(8766);
const { browser } = await launch({ viewport: { width: 1280, height: 800, deviceScaleFactor: 1 } });
const page = await browser.newPage();
for (const [id, width, height, file] of ASSETS) {
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.goto(`${server.url}/tools/templates/store.html?v=${id}`, { waitUntil: "networkidle0" });
  await page.evaluate(() => document.fonts.ready);
  await sleep(300);
  // the store wants 24-bit PNGs without alpha: screenshot with an opaque background
  await page.screenshot({ path: join(OUT, file), omitBackground: false });
  console.log(file);
}
await copyFile(join(OUT, "og-image-1200x630.png"), join(ROOT, "site", "assets", "og-image.png"));
await browser.close();
server.close();
