// Recette du moteur : compare chaque valeur calculée aux valeurs du classeur recalculé (tests/fixtures/*.json).
// Tolérance relative 0,1 % (cahier des charges §12). Usage : node tests/run-tests.mjs
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { compute } from "../js/engine.js";
import { defaultTables, defaultCatalogue } from "../js/tables.js";
import { defaultInputs, SOIL_NAMES } from "../js/inputs.js";

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, "fixtures");
const TOL = 1e-3;
let fails = 0, checks = 0;

for (const f of readdirSync(dir).filter(n => n.endsWith(".json")).sort()) {
  const fx = JSON.parse(readFileSync(join(dir, f), "utf8"));
  const I = { ...defaultInputs(), ...fx.inputs };
  for (const k of SOIL_NAMES) if (k in fx.expected) I[k] = fx.expected[k];
  const T = defaultTables();
  if (fx.tables?.t5) T.t5.grid = fx.tables.t5;
  const { V } = compute(I, T, defaultCatalogue());
  let local = 0;
  for (const [k, exp] of Object.entries(fx.expected)) {
    if (!(k in V)) { console.log(`  [${fx.scenario}] ${k} : absent du moteur`); local++; continue; }
    const got = V[k];
    checks++;
    let ok;
    if (typeof exp === "number") {
      ok = typeof got === "number" && Math.abs(got - exp) <= TOL * Math.max(Math.abs(exp), 1e-3);
    } else ok = String(got) === String(exp);
    if (!ok) { console.log(`  [${fx.scenario}] ${k} : attendu ${exp}, obtenu ${got}`); local++; }
  }
  fails += local;
  console.log(`${local ? "ÉCHEC" : "OK   "} ${fx.scenario} (${Object.keys(fx.expected).length} valeurs)`);
}
// Cohérence de publication : version du service worker et liste des fichiers mis en cache
import { VERSION } from "../js/version.js";
import { existsSync } from "node:fs";
const sw = readFileSync(join(here, "..", "sw.js"), "utf8");
const swv = sw.match(/const VERSION = "([^"]+)"/)?.[1];
if (swv !== VERSION) { console.log(`ÉCHEC version : sw.js ${swv} ≠ js/version.js ${VERSION}`); fails++; }
const list = [...sw.matchAll(/"([^"]+\.(?:html|webmanifest|css|js|woff2|svg|png))"/g)].map(m => m[1]);
for (const f of list) if (!existsSync(join(here, "..", f))) { console.log(`ÉCHEC cache : fichier absent ${f}`); fails++; }
console.log(`OK    service worker v${swv}, ${list.length} fichiers en cache`);

console.log(`\n${checks} comparaisons, ${fails} écart(s).`);
process.exit(fails ? 1 : 0);
