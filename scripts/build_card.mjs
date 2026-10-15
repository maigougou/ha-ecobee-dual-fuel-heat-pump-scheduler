// Builds the minified card that Home Assistant loads. `--check` fails when dist/ is out of date.
import { build } from "esbuild";
import { readFile } from "node:fs/promises";

const outfile = "dist/ecobee-dual-fuel-card.js";
const check = process.argv.includes("--check");
const result = await build({
  entryPoints: ["ecobee-dual-fuel-card.js"], bundle: true, format: "esm", target: "es2022",
  minify: true, legalComments: "none", charset: "utf8", outfile, write: !check,
});
if (check) {
  const current = await readFile(outfile, "utf8").catch(() => "");
  if (current !== result.outputFiles[0].text) {
    console.error(`${outfile} is out of date; run npm run build`);
    process.exit(1);
  }
}
