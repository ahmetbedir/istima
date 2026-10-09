// Screenshots of the real extension UI (light and dark) and the demo recording for the website.
//   node screenshots.mjs            -> tools/out/shots/*.png, site/assets/img/*.webp, site/assets/audio/ornek-haber.{m4a,mp3}
// Needs cwebp and ffmpeg on PATH for the website copies.
import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { launch, controller, serve, sleep, ROOT } from "./lib.mjs";

const OUT = join(ROOT, "tools", "out", "shots");
const IMG = join(ROOT, "site", "assets", "img");
const AUDIO = join(ROOT, "site", "assets", "audio");
await mkdir(OUT, { recursive: true });
const DEMO_TEXT = "Kapadokya'da balon turizmi rekor kırdı. Kapadokya'da sıcak hava balonu turları, 2026 yılının ilk 9 ayında tüm zamanların rekorunu kırdı. Ocak ile eylül arasında 752 bin 400 kişi balonla uçtu; bu sayı geçen yılın aynı dönemine göre yüzde 18 daha fazla.";

const server = await serve();
for (const scheme of ["light", "dark"]) {
  const { browser, extId } = await launch();
  const media = [{ name: "prefers-color-scheme", value: scheme }];
  const page = await browser.newPage();
  await page.emulateMediaFeatures(media);
  const url = `${server.url}/tools/fixtures/gazete.html`;
  await page.goto(url);
  await sleep(2500);
  await page.screenshot({ path: join(OUT, `pill-${scheme}.png`) });

  const ctl = await controller(browser, extId);
  await ctl.send({ type: "start-tab", tabId: await ctl.tabOf(url) });
  await page.bringToFront();
  for (let i = 0; i < 80; i++) {
    await sleep(500);
    const s = (await ctl.state())?.session;
    if (s?.index >= 2 && s.state === "playing") break;
  }
  await sleep(1200);
  await page.screenshot({ path: join(OUT, `reading-${scheme}.png`) });

  const pop = await browser.newPage();
  await pop.emulateMediaFeatures(media);
  await pop.setViewport({ width: 360, height: 520, deviceScaleFactor: 2 });
  await pop.goto(`chrome-extension://${extId}/popup/popup.html`);
  await sleep(1200);
  await pop.setViewport({ width: 360, height: await pop.evaluate(() => document.body.scrollHeight), deviceScaleFactor: 2 });
  await pop.screenshot({ path: join(OUT, `popup-${scheme}.png`) });
  await ctl.send({ type: "control", action: "stop" });

  for (const [name, path] of [["options", "options/options.html"], ["welcome", "welcome/welcome.html"]]) {
    const p = await browser.newPage();
    await p.emulateMediaFeatures(media);
    await p.goto(`chrome-extension://${extId}/${path}`);
    await sleep(800);
    await p.screenshot({ path: join(OUT, `${name}-${scheme}.png`) });
  }

  if (scheme === "light") {
    const p = await browser.newPage();
    await p.goto(`chrome-extension://${extId}/options/options.html`);
    const b64 = await p.evaluate(async (text) => {
      const w = new Worker(chrome.runtime.getURL("engine/worker.js"), { type: "module" });
      const chunks = [];
      await new Promise((res, rej) => {
        w.onmessage = ({ data }) => {
          if (data.type === "ready") w.postMessage({ type: "synth", id: "demo", text, speed: 0.95, seed: 0 });
          if (data.type === "chunk") chunks.push(data.audio);
          if (data.type === "done") res();
          if (data.type === "error") rej(new Error(data.message));
        };
        w.postMessage({ type: "init" });
      });
      const n = chunks.reduce((a, c) => a + c.length, 0);
      const buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
      const str = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
      str(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); str(8, "WAVE"); str(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
      v.setUint32(24, 48000, true); v.setUint32(28, 96000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, "data"); v.setUint32(40, n * 2, true);
      let o = 44;
      for (const c of chunks) for (const x of c) { v.setInt16(o, Math.max(-1, Math.min(1, x)) * 32767, true); o += 2; }
      let s = "";
      const u8 = new Uint8Array(buf);
      for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
      return btoa(s);
    }, DEMO_TEXT);
    await writeFile(join(OUT, "demo.wav"), Buffer.from(b64, "base64"));
  }
  await browser.close();
  console.log(`captured ${scheme}`);
}
server.close();

// website copies
for (const name of ["reading", "pill", "options", "welcome", "popup"]) {
  for (const scheme of ["light", "dark"]) {
    const resize = name === "popup" ? [] : ["-resize", "1600", "0"];
    execFileSync("cwebp", ["-quiet", "-q", "82", ...resize, join(OUT, `${name}-${scheme}.png`), "-o", join(IMG, `${name}-${scheme}.webp`)]);
  }
}
execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", join(OUT, "demo.wav"), "-c:a", "aac", "-b:a", "96k", join(AUDIO, "ornek-haber.m4a")]);
execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", join(OUT, "demo.wav"), "-c:a", "libmp3lame", "-b:a", "96k", join(AUDIO, "ornek-haber.mp3")]);
console.log("website images and audio updated");
