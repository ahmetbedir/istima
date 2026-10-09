// Build the Chrome Web Store upload: dist/istima-<version>.zip. The same file is attached to the GitHub
// release, which the website's download button links to.
import { execFileSync } from "node:child_process";
import { mkdir, readFile, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { ROOT, EXTENSION } from "./lib.mjs";

const { version } = JSON.parse(await readFile(join(EXTENSION, "manifest.json"), "utf8"));
const dist = join(ROOT, "dist");
const zip = join(dist, `istima-${version}.zip`);
await mkdir(dist, { recursive: true });
await rm(zip, { force: true });
execFileSync("zip", ["-r", "-X", "-q", zip, ".", "-x", "*.DS_Store", "-x", "__MACOSX/*"], { cwd: EXTENSION });
console.log(`${zip} (${((await stat(zip)).size / 1e6).toFixed(1)} MB)`);
