// Interface : saisie, rendu des feuilles, fichiers projet, import xlsx, impression.
import { compute, InputError } from "./engine.js";
import { defaultTables, defaultCatalogue, T6, T7, TYPES } from "./tables.js";
import { GROUPS, FIELDS, defaultInputs, SOIL_NAMES } from "./inputs.js";
import { SAISIE_DERIVED, PREDIM, CLASSIQUE, COMPLETE, syntheseRows, hypotheses, fmt, resolve, verdictClass } from "./report.js";
import { importWorkbook } from "./xlsx-import.js";
import { VERSION, VERSION_DATE, WORKBOOK } from "./version.js";

const KEY = "webaedificium.regard-maconnerie.v1";
const FORMAT = "webaedificium/regard-maconnerie";
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const LABEL = Object.fromEntries(FIELDS.map(f => [f.name, f.label]));

// ---------------------------------------------------------------- état
const fresh = () => ({ inputs: defaultInputs(), tables: defaultTables(), catalogue: defaultCatalogue() });
function deepMerge(base, over) {
  if (Array.isArray(base) || Array.isArray(over) || typeof base !== "object" || base === null) return over ?? base;
  const o = { ...base };
  for (const k of Object.keys(over || {})) o[k] = k in base ? deepMerge(base[k], over[k]) : over[k];
  return o;
}
function normalize(p) {
  const f = fresh();
  return {
    inputs: { ...f.inputs, ...(p.inputs || {}) },
    tables: deepMerge(f.tables, p.tables || {}),
    catalogue: { ...f.catalogue, ...(p.catalogue || {}) },
  };
}
function loadState() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.inputs) return normalize(s); } catch { /* stockage indisponible */ }
  return fresh();
}
let state = loadState();
let R = null;
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* stockage indisponible */ } };

// ---------------------------------------------------------------- utilitaires
const toStr = v => (v === null || v === undefined) ? "" : (typeof v === "number" ? String(v).replace(".", ",") : String(v));
const parseNum = s => { const t = String(s).trim().replace(/\s/g, "").replace(",", "."); return t === "" ? NaN : Number(t); };
let toastTimer;
function toast(msg) { const el = $("#toast"); el.textContent = msg; clearTimeout(toastTimer); toastTimer = setTimeout(() => (el.textContent = ""), 4000); }
function cellVal(v, line) {
  if (line.f === "t" || typeof v === "string") {
    if (line.v) return `<td class="c-val txt"><span class="pill ${verdictClass(v)}">${esc(v)}</span></td>`;
    return `<td class="c-val txt">${esc(v)}</td>`;
  }
  return `<td class="c-val">${esc(fmt(v, line.f))}</td>`;
}

// ---------------------------------------------------------------- rendu d'une feuille
function sheet(sections, two) {
  const V = R.V, I = state.inputs, n = two ? 7 : 6;
  let h = `<thead><tr><th>Désignation</th><th>Symbole</th>${two ? '<th class="c-val">Grand mur</th><th class="c-val">Petit mur</th>' : '<th class="c-val">Valeur</th>'}<th>Unité</th><th class="c-fx">Formule</th><th class="c-ref">Référence</th></tr></thead><tbody>`;
  for (const s of sections) {
    h += `<tr class="sec"><td colspan="${n}">${esc(s.title)}</td></tr>`;
    if (s.extra) h += `<tr class="note"><td colspan="${n}">${esc(s.extra)}</td></tr>`;
    for (const line of s.lines) {
      const v = resolve(line, V, I);
      let vals;
      if (two) {
        if (Array.isArray(v)) vals = cellVal(v[0], line) + cellVal(v[1], line);
        else vals = cellVal(v, line).replace("<td ", '<td colspan="2" style="text-align:center" ');
      } else vals = Array.isArray(v) ? `<td class="c-val">${esc(fmt(v[0], line.f))} / ${esc(fmt(v[1], line.f))}</td>` : cellVal(v, line);
      h += `<tr><td>${esc(line.d)}</td><td class="c-sym">${esc(line.s)}</td>${vals}<td class="c-unit">${esc(line.u)}</td><td class="c-fx">${esc(line.fx)}</td><td class="c-ref">${esc(line.ref)}</td></tr>`;
    }
  }
  return `<div class="scroll"><table class="calc">${h}</tbody></table></div>`;
}

// ---------------------------------------------------------------- page Saisie (formulaire)
function optionsFor(f) {
  if (f.opts === "elements") return state.catalogue.elements.map(e => e[0]);
  if (f.opts === "mortiers") return state.catalogue.mortiers.map(e => e[0]);
  return f.opts;
}
function control(f) {
  const v = state.inputs[f.name], id = `in-${f.name}`;
  if (f.type === "select") {
    const opts = optionsFor(f);
    return `<select class="inp" id="${id}" data-in="${f.name}">${opts.map(o => `<option value="${esc(o)}"${String(o) === String(v) ? " selected" : ""}>${esc(o)}</option>`).join("")}</select>`;
  }
  if (f.type === "date") return `<input class="inp wide" type="date" id="${id}" data-in="${f.name}" value="${esc(v)}">`;
  if (f.type === "text") return `<input class="inp wide" type="text" id="${id}" data-in="${f.name}" value="${esc(v)}" autocomplete="off">`;
  return `<input class="inp" type="text" inputmode="decimal" id="${id}" data-in="${f.name}" value="${esc(toStr(v))}" autocomplete="off" spellcheck="false">`;
}
function buildSaisie() {
  let h = `<thead><tr><th>Désignation</th><th>Symbole</th><th class="c-val">Valeur</th><th>Unité</th><th class="c-fx">Formule / note</th><th class="c-ref">Référence</th></tr></thead><tbody>`;
  for (const g of GROUPS) {
    h += `<tr class="sec"><td colspan="6">${esc(g.title)}</td></tr>`;
    for (const f of g.fields)
      h += `<tr data-row="${f.name}"><td><label for="in-${f.name}">${esc(f.label)}</label></td><td class="c-sym">${esc(f.sym || "")}</td><td class="inpcell">${control(f)}</td><td class="c-unit">${esc(f.unit || "")}</td><td class="c-fx">${esc(f.note || "")}</td><td class="c-ref">${esc(f.ref || "")}</td></tr>`;
  }
  $("#t-saisie").innerHTML = h + "</tbody>";
  visibility();
}
function visibility() {
  for (const f of FIELDS) if (f.show) document.querySelector(`tr[data-row="${f.name}"]`).hidden = !f.show(state.inputs);
}
function refreshCatalogueSelects() {
  for (const name of ["elem", "mort"]) {
    const f = FIELDS.find(x => x.name === name), el = $(`#in-${name}`);
    const opts = optionsFor(f);
    el.innerHTML = opts.map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join("");
    if (opts.includes(state.inputs[name])) el.value = state.inputs[name];
    else { state.inputs[name] = opts[0]; el.value = opts[0]; }
  }
}
$("#t-saisie").addEventListener("input", e => {
  const el = e.target, name = el.dataset.in;
  if (!name) return;
  const f = FIELDS.find(x => x.name === name);
  let v = el.value;
  if (f.type === "num") { v = parseNum(v); el.classList.toggle("invalid", !Number.isFinite(v)); }
  else if (f.type === "select" && typeof f.opts?.[0] === "number") v = Number(v);
  state.inputs[name] = v;
  visibility();
  schedule();
});

// ---------------------------------------------------------------- tables éditables
function inpCell(path, v, kind = "num", opts) {
  if (kind === "select") return `<td><select class="inp t" data-p="${path}" data-k="text">${opts.map(o => `<option${String(o) === String(v) ? " selected" : ""}>${esc(o)}</option>`).join("")}</select></td>`;
  return `<td><input class="inp${kind === "text" ? " t" : ""}" data-p="${path}" data-k="${kind}" value="${esc(kind === "num" ? toStr(v) : v)}" ${kind === "num" ? 'inputmode="decimal"' : ""} autocomplete="off" spellcheck="false"></td>`;
}
function setPath(path, raw, kind) {
  const keys = path.split(".");
  let o = state;
  for (const k of keys.slice(0, -1)) o = o[k];
  const last = keys.at(-1);
  if (kind === "num") { const v = parseNum(raw); o[last] = raw.trim() === "" ? null : v; return Number.isFinite(v) || raw.trim() === ""; }
  o[last] = raw; return true;
}
function onGridInput(e) {
  const el = e.target, p = el.dataset.p;
  if (!p) return;
  const ok = setPath(p, el.value, el.dataset.k);
  el.classList.toggle("invalid", !ok);
  if (p.startsWith("catalogue.")) { refreshCatalogueSelects(); updateFb(); }
  schedule();
}
function onGridClick(e) {
  const b = e.target.closest("button[data-act]");
  if (!b) return;
  const act = b.dataset.act;
  if (act === "reset-tables") { state.tables = defaultTables(); buildCoef(); toast("Tables rétablies aux valeurs par défaut"); }
  if (act === "reset-cat") { state.catalogue = defaultCatalogue(); buildCat(); refreshCatalogueSelects(); toast("Catalogue rétabli"); }
  if (act === "del") {
    const [a, b2, i] = b.dataset.p.split(".");
    const list = state[a][b2];
    if ((b2 === "elements" || b2 === "mortiers") && list.length <= 1) { toast("Le catalogue doit garder au moins une ligne."); return; }
    list.splice(Number(i), 1);
    a === "catalogue" ? (buildCat(), refreshCatalogueSelects()) : buildCoef();
  }
  if (act === "add") {
    const [a, b2] = b.dataset.p.split(".");
    const list = state[a][b2];
    list.push(JSON.parse(JSON.stringify(list.at(-1))).map((x, j) => j === 0 && typeof x === "string" && a === "catalogue" ? x + "-copie" : x));
    a === "catalogue" ? (buildCat(), refreshCatalogueSelects()) : buildCoef();
  }
  schedule();
}

function buildCoef() {
  const T = state.tables;
  const blk = (title, note, body) => `<div class="tblock"><h3>${title}</h3>${note ? `<p>${note}</p>` : ""}<div class="scroll">${body}</div></div>`;
  let h = `<div class="page-head" data-head="1_Coefficients"></div><h2>Coefficients et tables normatives</h2>
  <div class="banner">Valeurs pré-remplies à vérifier sur vos exemplaires des normes et de l'annexe nationale luxembourgeoise avant tout usage. Elles sont enregistrées avec le projet.</div>
  <div class="toolbar"><button class="btn danger" type="button" data-act="reset-tables">Rétablir les valeurs par défaut</button></div>`;
  h += blk("T1  Coefficient partiel γM", "EN 1996-1-1 Tab. 2.3, valeurs recommandées, ANL à confirmer",
    `<table class="grid"><tr><th>Classe d'exécution</th><th>Cat. I, mortier performanciel</th><th>Cat. I recette ou cat. II</th></tr>${T.t1.map((r, i) => `<tr><td class="ro">${i + 1}</td>${inpCell(`tables.t1.${i}.0`, r[0])}${inpCell(`tables.t1.${i}.1`, r[1])}</tr>`).join("")}</table>`);
  h += blk("T2  fk = K·fb^α·fm^β", "EN 1996-1-1 Tab. 3.3 ; mortier G usage courant, T joint mince",
    `<table class="grid"><tr><th>Type</th><th>Groupe</th><th>Mortier</th><th>K</th><th>α</th><th>β</th><th></th></tr>${T.t2.map((r, i) => `<tr>${inpCell(`tables.t2.${i}.0`, r[0], "select", TYPES)}${inpCell(`tables.t2.${i}.1`, r[1])}${inpCell(`tables.t2.${i}.2`, r[2], "select", ["G", "T"])}${inpCell(`tables.t2.${i}.3`, r[3])}${inpCell(`tables.t2.${i}.4`, r[4])}${inpCell(`tables.t2.${i}.5`, r[5])}<td><button class="btn quiet" type="button" data-act="del" data-p="tables.t2.${i}" aria-label="Supprimer la ligne">×</button></td></tr>`).join("")}</table>
    <button class="btn quiet" type="button" data-act="add" data-p="tables.t2">+ Ajouter une ligne</button>`);
  h += blk("T3  Résistance initiale au cisaillement fvk0 (N/mm²)", "EN 1996-1-1 Tab. 3.4 ; fvlt = 0,065·fb (§3.6.2)",
    `<table class="grid"><tr><th>Type</th><th>M10 à M20</th><th>M2,5 à M9</th><th>M1 à M2</th><th>Joint mince</th></tr>${T.t3.map((r, i) => `<tr><td class="ro">${esc(r[0])}</td>${[1, 2, 3, 4].map(j => inpCell(`tables.t3.${i}.${j}`, r[j])).join("")}</tr>`).join("")}</table>`);
  h += blk("T4  Résistances en flexion fxk1, fxk2 (N/mm²)", "EN 1996-1-1 Tab. 3.6 et 3.7",
    `<table class="grid"><tr><th>Type</th><th>fxk1, fm &lt; 5</th><th>fxk2, fm &lt; 5</th><th>fxk1, fm ≥ 5</th><th>fxk2, fm ≥ 5</th></tr>${T.t4.map((r, i) => `<tr><td class="ro">${esc(r[0])}</td>${[1, 2, 3, 4].map(j => inpCell(`tables.t4.${i}.${j}`, r[j])).join("")}</tr>`).join("")}</table>`);
  h += blk("T5  Coefficient de moment α2, panneau sur quatre bords simplement appuyés", "EN 1996-1-1 annexe E : à transcrire. Une grille incomplète désactive la vérification en plaque.",
    `<table class="grid"><tr><th>μ \\ h/L</th>${T.t5.x.map(x => `<th>${fmt(x, 2)}</th>`).join("")}</tr>${T.t5.y.map((y, i) => `<tr><td class="ro">${fmt(y, 2)}</td>${T.t5.x.map((_, j) => inpCell(`tables.t5.grid.${i}.${j}`, T.t5.grid[i][j])).join("")}</tr>`).join("")}</table>`);
  h += blk("T6  Facteur de forme δ (pour mémoire)", "EN 772-1 annexe A ; δ est saisi dans le catalogue",
    `<table class="grid"><tr><th>Hauteur \\ largeur (mm)</th>${T6.cols.map(c => `<th>${c}</th>`).join("")}</tr>${T6.rows.map(r => `<tr><td class="ro">${r[0]}</td>${r.slice(1).map(v => `<td class="ro">${v === null ? "" : fmt(v, 2)}</td>`).join("")}</tr>`).join("")}</table>`);
  h += blk("T7  Classes d'exposition", "EN 1996-2 annexe A",
    `<table class="grid"><tr><th>Classe</th><th>Environnement</th><th>Exemple pour un regard</th></tr>${T7.map(r => `<tr><td class="ro">${r[0]}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join("")}</table>`);
  const t8 = T.t8, P = ["Pw", "nw", "na", "s", "v", "a0", "b0"];
  const PL = { Pw: "Charge par roue Pw (kN)", nw: "Roues par essieu", na: "Nombre d'essieux", s: "Espacement des essieux (m)", v: "Voie (m)", a0: "Empreinte transversale a0 (m)", b0: "Empreinte longitudinale b0 (m)" };
  h += blk("T8  Modèles de charge de trafic", "SLW 60 : DIN 1072, sans coefficient dynamique. LM1 : EN 1991-2 §4.3.2 ; charge par roue LM1 = Pw·αQ1 ; surcharge sur remblai = αQ1·TS/(L·B) + αq1·UDL (§4.9.1, à vérifier).",
    `<table class="grid"><tr><th>Paramètre</th><th>SLW 60</th><th>LM1</th></tr>${P.map(k => `<tr><td>${PL[k]}</td>${inpCell(`tables.t8.slw.${k}`, t8.slw[k])}${inpCell(`tables.t8.lm1.${k}`, t8.lm1[k])}</tr>`).join("")}
     <tr><td>Surcharge équivalente sur remblai (kPa)</td>${inpCell("tables.t8.slw.q", t8.slw.q)}<td class="ro">${fmt(t8.alpha_Q * t8.lm1.ts / (t8.lm1.Ls * t8.lm1.Bs) + t8.alpha_udl * t8.lm1.udl, 1)}</td></tr>
     <tr><td>LM1 : charge du tandem TS (kN) / emprise L × B (m)</td><td></td><td><div style="display:flex;gap:4px">${["ts", "Ls", "Bs"].map(k => `<input class="inp" data-p="tables.t8.lm1.${k}" data-k="num" value="${toStr(t8.lm1[k])}" inputmode="decimal" style="min-width:5ch">`).join("")}</div></td></tr>
     <tr><td>LM1 : charge répartie UDL (kPa)</td><td></td>${inpCell("tables.t8.lm1.udl", t8.lm1.udl)}</tr>
     <tr><td>Coefficients d'ajustement αQ1 / αq1</td><td></td><td><div style="display:flex;gap:4px">${inpCell("tables.t8.alpha_Q", t8.alpha_Q).replace(/<\/?td>/g, "")}${inpCell("tables.t8.alpha_udl", t8.alpha_udl).replace(/<\/?td>/g, "")}</div></td></tr>
     <tr><td>Coefficient partiel γQ</td>${inpCell("tables.t8.slw.gQ", t8.slw.gQ)}${inpCell("tables.t8.lm1.gQ", t8.lm1.gQ)}</tr>
     <tr><td>Coefficient partiel γQ, charge utilisateur</td>${inpCell("tables.t8.usr.gQ", t8.usr.gQ)}<td></td></tr></table>`);
  const T9L = { gG_sup: ["γG,sup (défavorable)", "EN 1990 Tab. A1.2(B)"], gG_inf: ["γG,inf (favorable)", "EN 1990 Tab. A1.2(B)"], gG_upl_stb: ["γG,stb (soulèvement UPL)", "EN 1997-1 Tab. A.15"], gG_upl_dst: ["γG,dst (soulèvement UPL)", "EN 1997-1 Tab. A.15"] };
  h += blk("T9  Coefficients partiels sur les actions", "EN 1990, EN 1997-1, ANL à confirmer",
    `<table class="grid">${Object.entries(T9L).map(([k, [lab, ref]]) => `<tr><td>${lab}</td>${inpCell(`tables.t9.${k}`, T.t9[k])}<td class="c-ref">${ref}</td></tr>`).join("")}</table>`);
  const T10L = { K_E: ["KE (E = KE·fk)", "EN 1996-1-1 §3.7.2"], gam_w: ["Poids volumique de l'eau γw (kN/m³)", ""], gam_beton: ["Poids volumique du béton armé (kN/m³)", "EN 1991-1-1"], lam_c: ["Élancement limite λc pour ek = 0", "EN 1996-1-1 §6.1.2.2(2)"], rho_2: ["Facteur ρ2 (mur tenu en tête et en pied)", "EN 1996-1-1 §5.5.1.2"], e0_rel: ["Excentricité d'appui de la dalle e0/t", "hypothèse : résultante au tiers intérieur"], e_lim: ["Limite d'excentricité de stabilité e/t", "hypothèse de l'outil"] };
  h += blk("T10  Constantes et hypothèses de calcul", "",
    `<table class="grid">${Object.entries(T10L).map(([k, [lab, ref]]) => `<tr><td>${lab}</td>${inpCell(`tables.t10.${k}`, T.t10[k])}<td class="c-ref">${ref}</td></tr>`).join("")}
     ${TYPES.map(ty => `<tr><td>Coefficient de fluage final φ∞, ${ty.toLowerCase()}</td>${inpCell(`tables.phi.${ty}`, T.phi[ty])}<td class="c-ref">EN 1996-1-1 Tab. 3.8</td></tr>`).join("")}</table>`);
  $("#p-coef").innerHTML = h;
}

function buildCat() {
  const C = state.catalogue;
  const el = C.elements.map((r, i) => `<tr>${inpCell(`catalogue.elements.${i}.0`, r[0], "text")}${inpCell(`catalogue.elements.${i}.1`, r[1], "text")}${inpCell(`catalogue.elements.${i}.2`, r[2], "text")}${inpCell(`catalogue.elements.${i}.3`, r[3])}${inpCell(`catalogue.elements.${i}.4`, r[4], "select", ["I", "II"])}${inpCell(`catalogue.elements.${i}.5`, r[5], "select", TYPES)}${inpCell(`catalogue.elements.${i}.6`, r[6], "text")}${inpCell(`catalogue.elements.${i}.7`, r[7], "select", ["Normalisée", "Moyenne"])}${inpCell(`catalogue.elements.${i}.8`, r[8])}${inpCell(`catalogue.elements.${i}.9`, r[9])}<td class="ro" data-fb="${i}"></td>${inpCell(`catalogue.elements.${i}.10`, r[10], "select", ["Admis", "Déconseillé", "Exclu"])}${inpCell(`catalogue.elements.${i}.11`, r[11])}${inpCell(`catalogue.elements.${i}.12`, r[12], "text")}<td><button class="btn quiet" type="button" data-act="del" data-p="catalogue.elements.${i}" aria-label="Supprimer la ligne">×</button></td></tr>`).join("");
  const mo = C.mortiers.map((r, i) => `<tr>${inpCell(`catalogue.mortiers.${i}.0`, r[0], "text")}${inpCell(`catalogue.mortiers.${i}.1`, r[1], "text")}${inpCell(`catalogue.mortiers.${i}.2`, r[2], "text")}${inpCell(`catalogue.mortiers.${i}.3`, r[3], "select", ["G", "T"])}${inpCell(`catalogue.mortiers.${i}.4`, r[4])}${inpCell(`catalogue.mortiers.${i}.5`, r[5], "select", ["Performanciel", "Recette"])}${inpCell(`catalogue.mortiers.${i}.6`, r[6])}${inpCell(`catalogue.mortiers.${i}.7`, r[7], "text")}<td><button class="btn quiet" type="button" data-act="del" data-p="catalogue.mortiers.${i}" aria-label="Supprimer la ligne">×</button></td></tr>`).join("");
  const ci = C.ciments.map((r, i) => `<tr>${r.map((v, j) => inpCell(`catalogue.ciments.${i}.${j}`, v, "text")).join("")}</tr>`).join("");
  $("#p-cat").innerHTML = `<div class="page-head" data-head="2_Catalogue"></div><h2>Catalogue des matériaux</h2>
  <div class="banner">Valeurs génériques à remplacer par les fiches techniques des fabricants retenus. Le code sert de clé dans la page Saisie.</div>
  <div class="toolbar"><button class="btn danger" type="button" data-act="reset-cat">Rétablir le catalogue par défaut</button></div>
  <div class="tblock"><h3>Éléments de maçonnerie (EN 771)</h3><p>Déclaration « Moyenne » : fb = δ·f. Béton cellulaire et groupes 3 et 4 : déconseillés en enterré.</p>
  <div class="scroll"><table class="grid"><tr><th>Code</th><th>Désignation</th><th>Norme</th><th>Groupe</th><th>Cat.</th><th>Type pour tables</th><th>l×t×h (mm)</th><th>Déclaration</th><th>f (N/mm²)</th><th>δ</th><th>fb (N/mm²)</th><th>Usage enterré</th><th>MX max</th><th>Source</th><th></th></tr>${el}</table></div>
  <button class="btn quiet" type="button" data-act="add" data-p="catalogue.elements">+ Ajouter un élément</button></div>
  <div class="tblock"><h3>Mortiers de montage (EN 998-2)</h3>
  <div class="scroll"><table class="grid"><tr><th>Code</th><th>Désignation</th><th>Classe</th><th>Type</th><th>fm (N/mm²)</th><th>Conception</th><th>MX max</th><th>Source</th><th></th></tr>${mo}</table></div>
  <button class="btn quiet" type="button" data-act="add" data-p="catalogue.mortiers">+ Ajouter un mortier</button></div>
  <div class="tblock"><h3>Ciments (EN 197-1)</h3><p>Regard d'eaux usées : prévoir un revêtement intérieur contre la corrosion biogène, quel que soit le ciment.</p>
  <div class="scroll"><table class="grid"><tr><th>Code</th><th>Désignation</th><th>SR</th><th>Tenue chimique</th><th>Usage recommandé</th></tr>${ci}</table></div></div>`;
  updateFb();
}
function updateFb() {
  document.querySelectorAll("[data-fb]").forEach(td => {
    const r = state.catalogue.elements[Number(td.dataset.fb)];
    if (r) td.textContent = fmt(r[7] === "Normalisée" ? Number(r[8]) : Number(r[8]) * Number(r[9]), 1);
  });
}
for (const id of ["#p-coef", "#p-cat"]) { $(id).addEventListener("input", onGridInput); $(id).addEventListener("change", onGridInput); $(id).addEventListener("click", onGridClick); }

// ---------------------------------------------------------------- diagrammes (page Classique)
function plot(pts, key, title, unit, d) {
  const W = 340, H = 262, l = 52, r = 14, t = 26, b = 30, iw = W - l - r, ih = H - t - b;
  const h = pts.at(-1).x, vals = pts.map(p => p[key]), vmax = Math.max(...vals, 1e-9);
  const step = [1, 2, 2.5, 5, 10].map(m => m * 10 ** Math.floor(Math.log10(vmax / 4))).find(s => vmax / s <= 5);
  const top = Math.ceil(vmax / step) * step;
  const X = v => l + v / top * iw, Y = x => t + x / h * ih;
  const ticks = []; for (let v = 0; v <= top + 1e-9; v += step) ticks.push(v);
  const zt = []; for (let x = 0; x <= h + 1e-9; x += 0.5) zt.push(x);
  const poly = [`${X(0)},${Y(0)}`, ...pts.map(p => `${X(p[key]).toFixed(1)},${Y(p.x).toFixed(1)}`), `${X(0)},${Y(h)}`].join(" ");
  const pm = pts[vals.indexOf(vmax)], lab = `${fmt(vmax, d)} ${unit}`;
  const right = X(vmax) + 8 + lab.length * 6.4 > W;
  return `<figure class="plot"><figcaption>${title}</figcaption><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)} : maximum ${esc(lab)}">
    ${ticks.map(v => `<line class="gr" x1="${X(v)}" x2="${X(v)}" y1="${t}" y2="${t + ih}"/><text x="${X(v)}" y="${H - 10}" text-anchor="middle">${fmt(v, step < 1 ? 1 : 0)}</text>`).join("")}
    ${zt.map(x => `<text x="${l - 16}" y="${Y(x) + 3.5}" text-anchor="end">${fmt(x, 1)}</text>`).join("")}
    <rect class="wall" x="${l - 10}" y="${t}" width="10" height="${ih}"/>
    <polygon class="ar" points="${poly}"/>
    <line class="ax" x1="${l}" x2="${l}" y1="${t}" y2="${t + ih}"/>
    <circle cx="${X(vmax)}" cy="${Y(pm.x)}" r="3"/>
    <text class="em" x="${right ? X(vmax) - 8 : X(vmax) + 8}" y="${Y(pm.x) + (right ? -8 : 4)}" text-anchor="${right ? "end" : "start"}">${esc(lab)}</text>
    <text x="4" y="12">x (m) depuis la dalle</text>
  </svg></figure>`;
}

// ---------------------------------------------------------------- rendu complet
function render() {
  const { V, wheels, slices, pts, alerts } = R, I = state.inputs;
  // Saisie : valeurs dérivées et tableaux
  const n2 = x => fmt(x, 2);
  const th = c => `<tr>${c.map(x => `<th>${x}</th>`).join("")}</tr>`;
  $("#saisie-derived").innerHTML = sheet(SAISIE_DERIVED, false) +
    `<div class="tblock"><h3>Tableau T-H1 : roues pour la méthode de Boussinesq</h3><p>x : distance au parement ; y : décalage le long du mur ; σh = Boussinesq modifiée × cos²(1,1·θ), θ = atan(y/x).</p>
     <div class="scroll"><table class="grid">${th(["Roue", "Essieu k", "Côté j", "x (m)", "y (m)", "Q (kN)"])}${wheels.map((w, i) => `<tr><td class="ro">R${i + 1}</td><td class="ro">${w.k}</td><td class="ro">${w.j}</td><td class="ro">${n2(w.x)}</td><td class="ro">${n2(w.y)}</td><td class="ro">${fmt(w.Q, 1)}</td></tr>`).join("")}</table></div></div>
     <div class="tblock"><h3>Tableau T-H2 : poussée par niveau (tranches de la voûte)</h3><p>pEd = γG·(σs,k + σc) + γQ·pQ,k ; σs,k = K·γ·z au-dessus de la nappe, K·(γ·zw + γ'·(z − zw)) + γw·(z − zw) au-dessous.</p>
     <div class="scroll"><table class="grid">${th(["Niveau", "z (m)", "σs,k (kPa)", "pQ,k (kPa)", "pEd (kPa)", "Tranche exclue"])}${slices.map(s => `<tr><td class="ro">${s.j}</td><td class="ro">${n2(s.z)}</td><td class="ro">${n2(s.sk)}</td><td class="ro">${n2(s.pQ)}</td><td class="ro">${n2(s.pEd)}</td><td class="ro">${s.excl}</td></tr>`).join("")}</table></div></div>
     <details class="more"><summary>Tableau T-H3 : poussée de calcul le long de la bande verticale (41 points)</summary>
     <div class="scroll"><table class="grid">${th(["Point", "x (m)", "z (m)", "pQ,k (kPa)", "pEd (kPa)", "Contact"])}${pts.map(p => `<tr><td class="ro">${p.i}</td><td class="ro">${fmt(p.x, 3)}</td><td class="ro">${fmt(p.z, 3)}</td><td class="ro">${n2(p.pQ)}</td><td class="ro">${n2(p.pEd)}</td><td class="ro">${p.c}</td></tr>`).join("")}</table></div></details>`;

  $("#p-predim").innerHTML = `<div class="page-head" data-head="3_Predim : méthode simplifiée EN 1996-3 §4.5"></div><h2>Prédimensionnement EN 1996-3 §4.5</h2>
    <p class="lede">Contrôle du domaine d'application puis encadrement de l'effort normal. Hors domaine, les valeurs restent affichées à titre indicatif.</p>${sheet(PREDIM, true)}`;

  $("#p-classique").innerHTML = `<div class="page-head" data-head="4_Classique : bande verticale isostatique"></div><h2>Bande verticale isostatique</h2>
    <div class="plots">${plot(pts, "pEd", "Poussée de calcul pEd le long du mur", "kPa", 1)}${plot(pts, "M", "Moment isostatique M le long du mur", "kNm/m", 2)}</div>${sheet(CLASSIQUE, true)}`;

  $("#p-complete").innerHTML = `<div class="page-head" data-head="5_Complete : méthode complète EN 1996-1-1"></div><h2>Méthode complète EN 1996-1-1</h2>${sheet(COMPLETE, true)}
    <details class="more"><summary>Annexe : statique de la bande verticale (intégration du tableau T-H3)</summary>
    <div class="scroll"><table class="grid">${th(["Point", "x (m)", "pEd (kPa)", "F (kN/m)", "G (kN)", "M (kNm/m)"])}${pts.map(p => `<tr><td class="ro">${p.i}</td><td class="ro">${fmt(p.x, 3)}</td><td class="ro">${fmt(p.pEd, 3)}</td><td class="ro">${fmt(p.F, 3)}</td><td class="ro">${fmt(p.G, 3)}</td><td class="ro">${fmt(p.M, 3)}</td></tr>`).join("")}</table></div>
    <p class="lede">R1 = ${fmt(V.st_R1, 1)} kN/m ; R2 = ${fmt(V.st_R2, 1)} kN/m ; M0 = ${fmt(V.st_Mmax, 2)} kNm/m en x0 = ${fmt(V.st_x0, 3)} m. F(x) = ∫p, G(x) = ∫s·p (trapèzes) ; M(x) = R1·x − (x·F(x) − G(x)).</p></details>`;

  // Synthèse
  const rows = syntheseRows(V, I);
  const pill = s => `<span class="pill ${verdictClass(s)}">${esc(s)}</span>`;
  const rate = r => `<td class="c-val">${fmt(r, 2)}</td>`;
  $("#p-synthese").innerHTML = `<div class="page-head" data-head="6_Synthese : taux de travail et verdicts"></div><h2>Taux de travail et verdicts</h2>
    <div class="scroll"><table class="calc"><thead><tr><th>Vérification</th><th>Référence</th><th class="c-val">Taux GM</th><th class="c-val">Taux PM</th><th>Verdict GM</th><th>Verdict PM</th></tr></thead><tbody>
    <tr class="sec"><td colspan="6">Méthode complète EN 1996-1-1</td></tr>
    ${rows.map(r => `<tr><td>${esc(r[0])}</td><td class="c-ref">${esc(r[1])}</td>${rate(r[2])}${rate(r[3])}<td>${pill(r[4])}</td><td>${pill(r[5])}</td></tr>`).join("")}
    <tr><td><b>Verdict de la méthode complète</b></td><td class="c-ref">chemin retenu</td><td class="c-val"><b>${fmt(V.cp_rmax_gm, 2)}</b></td><td class="c-val"><b>${fmt(V.cp_rmax_pm, 2)}</b></td><td>${pill(V.cp_v_gm)}</td><td>${pill(V.cp_v_pm)}</td></tr>
    <tr><td>Mécanisme gouvernant</td><td></td><td></td><td></td><td>${esc(V.cp_mech_gm)}</td><td>${esc(V.cp_mech_pm)}</td></tr>
    <tr class="note"><td colspan="6">Taux 99 : mécanisme instable ou conditions d'application non remplies. Taux 0 : vérification sans objet.</td></tr>
    <tr class="sec"><td colspan="6">Autres méthodes</td></tr>
    <tr><td>Prédimensionnement EN 1996-3 §4.5</td><td class="c-ref">page 3</td>${rate(Math.max(V.pre_r1_gm, V.pre_r2_gm))}${rate(Math.max(V.pre_r1_pm, V.pre_r2_pm))}<td>${pill(V.pre_v_gm)}</td><td>${pill(V.pre_v_pm)}</td></tr>
    <tr><td>Bande verticale classique</td><td class="c-ref">page 4</td>${rate(V.cl_rmax_gm)}${rate(V.cl_rmax_pm)}<td>${pill(V.cl_v_gm)}</td><td>${pill(V.cl_v_pm)}</td></tr>
    </tbody></table></div>
    <div class="tblock"><h3>Hypothèses actives</h3><dl class="hyp">${hypotheses(V, I).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl></div>
    <div class="tblock"><h3>Alertes</h3><ul class="alerts">${alerts.map(a => `<li>${esc(a)}</li>`).join("")}</ul></div>`;

  // Bandeau de verdict et cartouche
  for (const w of ["gm", "pm"]) {
    const r = V["cp_rmax_" + w], v = V["cp_v_" + w];
    const name = w === "gm" ? `Grand mur · L1 = ${fmt(V.L_gm, 2)} m · t1 = ${fmt(+I.tgm, 2)} m` : `Petit mur · L2 = ${fmt(V.L_pm, 2)} m · t2 = ${fmt(+I.tpm, 2)} m`;
    $("#vc-" + w).innerHTML = `<div class="wn"><span>${esc(name)}</span><span>méthode complète</span></div>
      <span class="pill ${verdictClass(v)}">${esc(v)}</span>
      <span class="mech">${esc(V["cp_mech_" + w])}</span>
      <span class="rate" title="Taux de travail déterminant">${r >= 99 ? "&gt; 1" : fmt(r, 2)}</span>
      <div class="meter ${r > 1 ? "bad" : ""}" aria-hidden="true"><i style="width:${Math.min(r, 1.5) / 1.5 * 100}%"></i><b></b></div>
      <div class="others"><span>Prédim. EN 1996-3 : ${esc(V["pre_v_" + w])}</span><span>Bande verticale : ${esc(V["cl_v_" + w])}</span><span>Phase C3 : ${esc(V["cp_v3_" + w])}</span></div>`;
  }
  for (const k of ["projet", "ref", "ind", "auteur"]) $("#tb-" + k).textContent = I[k] || "·";
  $("#tb-date").textContent = I.date ? new Date(I.date + "T12:00:00").toLocaleDateString("fr-FR") : "·";
  $("#tb-mod").textContent = `${I.mod}, ${I.pos.toLowerCase()}`;
  document.title = `${I.projet ? I.projet + " · " : ""}Regards en maçonnerie`;
}

let timer;
function schedule() { clearTimeout(timer); timer = setTimeout(run, 60); }
function run() {
  persist();
  try {
    R = compute(state.inputs, state.tables, state.catalogue);
    $("#err").hidden = true;
    render();
  } catch (e) {
    let msg = e instanceof InputError ? e.message : `Erreur de calcul : ${e.message}`;
    msg = msg.replace(/« (\w+) »/, (m, k) => `« ${LABEL[k] || k} »`);
    $("#err").textContent = msg + " Les résultats affichés correspondent à la dernière saisie valide.";
    $("#err").hidden = false;
    if (!(e instanceof InputError)) console.error(e);
  }
}

// ---------------------------------------------------------------- onglets
function showTab(id) {
  document.querySelectorAll(".tab").forEach(b => b.setAttribute("aria-selected", String(b.dataset.tab === id)));
  document.querySelectorAll(".page").forEach(p => (p.hidden = p.dataset.tab !== id));
  try { localStorage.setItem(KEY + ".tab", id); } catch { /* */ }
  if (location.hash !== "#" + id) history.replaceState(null, "", "#" + id);
}
document.querySelector(".tabs").addEventListener("click", e => { const b = e.target.closest(".tab"); if (b) showTab(b.dataset.tab); });

// ---------------------------------------------------------------- fichiers
function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
const slug = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^_+|_+$/g, "");
$("#b-save").addEventListener("click", () => {
  const I = state.inputs;
  const doc = { format: FORMAT, formatVersion: 1, app: VERSION, saved: new Date().toISOString(), ...state };
  download(`${slug(I.ref) || "regard"}_${slug(I.ind) || "A"}.json`, JSON.stringify(doc, null, 1), "application/json");
  toast("Projet enregistré dans vos téléchargements");
});
$("#b-open").addEventListener("click", () => $("#f-open").click());
$("#f-open").addEventListener("change", async e => {
  const file = e.target.files[0]; e.target.value = "";
  if (!file) return;
  try {
    const doc = JSON.parse(await file.text());
    if (doc.format !== FORMAT || !doc.inputs) throw new Error("ce fichier n'est pas un projet de cette application");
    state = normalize(doc); rebuild(); toast(`Projet « ${file.name} » ouvert`);
  } catch (err) { toast(`Ouverture impossible : ${err.message}.`); }
});
$("#b-new").addEventListener("click", () => {
  const b = $("#b-new");
  if (b.dataset.armed) { delete b.dataset.armed; b.textContent = "Nouveau"; state = { ...fresh(), tables: state.tables, catalogue: state.catalogue }; rebuild(); toast("Nouveau projet : saisie par défaut, tables et catalogue conservés"); return; }
  b.dataset.armed = "1"; b.textContent = "Confirmer : effacer la saisie";
  setTimeout(() => { if (b.dataset.armed) { delete b.dataset.armed; b.textContent = "Nouveau"; } }, 5000);
});
$("#b-xlsx").addEventListener("click", () => $("#f-xlsx").click());
$("#f-xlsx").addEventListener("change", async e => {
  const file = e.target.files[0]; e.target.value = "";
  if (!file) return;
  toast("Lecture du classeur…");
  try {
    const res = await importWorkbook(await file.arrayBuffer(), state, FIELDS, SOIL_NAMES);
    state = normalize(res.state); rebuild();
    toast(`Classeur importé : ${res.inputs} saisies, ${res.tables} paramètres de tables${res.skipped.length ? `, ${res.skipped.length} ignorées (${res.skipped.slice(0, 3).join(", ")})` : ""}`);
  } catch (err) { toast(`Import impossible : ${err.message}`); }
});

// ---------------------------------------------------------------- impression
$("#b-print").addEventListener("click", () => window.print());
window.addEventListener("beforeprint", () => {
  const I = state.inputs;
  const date = I.date ? new Date(I.date + "T12:00:00").toLocaleDateString("fr-FR") : "";
  document.querySelectorAll("[data-head]").forEach(el => {
    el.innerHTML = `<b>${esc(el.dataset.head)}</b> Projet : ${esc(I.projet)} · Réf. : ${esc(I.ref)} · Indice : ${esc(I.ind)} · ${esc(date)} · ${esc(I.auteur)}`;
  });
  let st = document.getElementById("print-page-style");
  if (!st) { st = document.createElement("style"); st.id = "print-page-style"; document.head.appendChild(st); }
  const left = `Regards en maçonnerie v${VERSION} · ${I.ref || ""} ind. ${I.ind || ""}`.replace(/"/g, "'");
  st.textContent = `@page { @bottom-left { content: "${left}"; font: 7pt Arial, sans-serif; color: #555; } @bottom-right { content: "${date}"; font: 7pt Arial, sans-serif; color: #555; } }`;
  document.querySelectorAll("details.more").forEach(d => { d.dataset.wasOpen = d.open ? "1" : ""; d.open = true; });
});
window.addEventListener("afterprint", () => document.querySelectorAll("details.more").forEach(d => { d.open = d.dataset.wasOpen === "1"; }));

// ---------------------------------------------------------------- démarrage
function rebuild() { buildSaisie(); buildCoef(); buildCat(); run(); }
$("#ver").textContent = `v${VERSION}`;
$("#foot-ver").textContent = `Version ${VERSION} du ${VERSION_DATE} · validée contre ${WORKBOOK}`;
rebuild();
let tab = location.hash.slice(1);
if (!document.querySelector(`.tab[data-tab="${tab}"]`)) { try { tab = localStorage.getItem(KEY + ".tab") || "saisie"; } catch { tab = "saisie"; } }
showTab(document.querySelector(`.tab[data-tab="${tab}"]`) ? tab : "saisie");

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("./sw.js").then(reg => {
    reg.addEventListener("updatefound", () => {
      const nw = reg.installing;
      nw?.addEventListener("statechange", () => { if (nw.state === "installed" && navigator.serviceWorker.controller) toast("Nouvelle version installée : rechargez la page pour l'utiliser."); });
    });
  }).catch(() => { /* hors ligne indisponible, l'application fonctionne quand même */ });
}
