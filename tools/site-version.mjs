// Cache busting for the website: every /assets/ reference (css, js, images, audio) in site/**/*.html gets ?v=<content hash>,
// so browsers holding an older copy (assets are cached for a week, see site/_headers) fetch the new one.
// Run before deploying: node tools/site-version.mjs
import { readFile, writeFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { ROOT } from "./lib.mjs";

const SITE = join(ROOT, "site");
const hash = async (file) => createHash("sha256").update(await readFile(join(SITE, file))).digest("hex").slice(0, 10);

async function* htmlFiles(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* htmlFiles(p);
    else if (e.name.endsWith(".html")) yield p;
  }
}

for await (const file of htmlFiles(SITE)) {
  let html = await readFile(file, "utf8");
  const refs = [...new Set([...html.matchAll(/"(\/assets\/[\w./-]+\.(?:css|js|webp|png|svg|m4a|mp3))(?:\?v=\w+)?"/g)].map((m) => m[1]))];
  for (const ref of refs) {
    const v = await hash(ref.slice(1));
    html = html.replace(new RegExp(`"${ref.replace(/[.]/g, "\\.")}(\\?v=\\w+)?"`, "g"), `"${ref}?v=${v}"`);
  }
  await writeFile(file, html);
  console.log(file.replace(ROOT + "/", ""), refs.length, "assets versioned");
}
