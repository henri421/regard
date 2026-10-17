// Génère schema/projet.schema.json (schéma JSON du fichier projet) à partir de js/inputs.js.
// Usage : node tools/gen-schema.mjs
import { writeFileSync } from "node:fs";
import { GROUPS } from "../js/inputs.js";
const props = {};
for (const g of GROUPS) for (const f of g.fields) {
  const p = { title: f.label, description: [g.title, f.sym && `symbole ${f.sym}`, f.unit && `unité ${f.unit}`, f.note, f.ref].filter(Boolean).join(" ; "), default: f.def };
  if (f.type === "num") p.type = "number";
  else if (f.type === "date") { p.type = "string"; p.format = "date"; }
  else if (f.type === "select" && Array.isArray(f.opts)) p.enum = f.opts;
  else p.type = typeof f.def === "number" ? "number" : "string";
  props[f.name] = p;
}
const schema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "projet.schema.json",
  title: "Projet de vérification d'un regard en maçonnerie enterrée",
  description: "Fichier projet de l'application webaedificium / regard-maconnerie. Les noms des saisies sont ceux du classeur sans le préfixe in_.",
  type: "object",
  required: ["format", "inputs"],
  properties: {
    format: { const: "webaedificium/regard-maconnerie" },
    formatVersion: { type: "integer" },
    app: { type: "string", description: "Version de l'application qui a enregistré le fichier" },
    saved: { type: "string", format: "date-time" },
    inputs: { type: "object", properties: props, additionalProperties: false },
    tables: { type: "object", description: "Tables T1 à T10 (voir js/tables.js)" },
    catalogue: { type: "object", description: "Éléments, mortiers et ciments (voir js/tables.js)" },
  },
};
writeFileSync(new URL("../schema/projet.schema.json", import.meta.url), JSON.stringify(schema, null, 2) + "\n");
console.log(`schéma écrit : ${Object.keys(props).length} saisies`);
