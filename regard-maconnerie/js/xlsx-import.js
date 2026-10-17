// Import local d'un classeur Verification_regard_maconnerie.xlsx (aucun envoi réseau).
// Lit les noms définis : saisies « in_* », données de sol, paramètres des tables T1 à T10 et le catalogue.
// La bibliothèque SheetJS (lib/xlsx.full.min.js, licence Apache 2.0) est chargée seulement au premier import.

function loadLib() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  return new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "lib/xlsx.full.min.js";
    s.onload = () => res(window.XLSX);
    s.onerror = () => rej(new Error("bibliothèque de lecture xlsx indisponible"));
    document.head.appendChild(s);
  });
}

const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export async function importWorkbook(buf, current, FIELDS, SOIL_NAMES) {
  const X = await loadLib();
  const wb = X.read(buf, { type: "array", cellDates: true });
  const names = {};
  for (const n of wb.Workbook?.Names || []) if (!n.Sheet && n.Ref) names[n.Name] = n.Ref;
  if (!names.in_mode && !names.in_a) throw new Error("ce classeur ne contient pas les noms de la feuille 0_Saisie");

  const parse = ref => {
    const m = ref.match(/^'?(.+?)'?!\$?([A-Z]+)\$?(\d+)(?::\$?([A-Z]+)\$?(\d+))?$/);
    if (!m) return null;
    return { sheet: m[1].replace(/''/g, "'"), a: m[2] + m[3], b: m[4] ? m[4] + m[5] : null };
  };
  const cell = name => {
    const r = names[name] && parse(names[name]);
    if (!r) return undefined;
    const c = wb.Sheets[r.sheet]?.[r.a];
    return c ? c.v : undefined;
  };
  const range = name => {
    const r = names[name] && parse(names[name]);
    if (!r || !r.b) return null;
    const ws = wb.Sheets[r.sheet], R = X.utils.decode_range(`${r.a}:${r.b}`), out = [];
    for (let i = R.s.r; i <= R.e.r; i++) {
      const row = [];
      for (let j = R.s.c; j <= R.e.c; j++) { const c = ws?.[X.utils.encode_cell({ r: i, c: j })]; row.push(c ? c.v : null); }
      out.push(row);
    }
    return out;
  };

  const st = JSON.parse(JSON.stringify(current));
  const skipped = [];
  let nIn = 0, nT = 0;

  // Saisies
  const alias = { Zw: "Zn" };              // classeur v1.0
  for (const f of FIELDS) {
    const src = SOIL_NAMES.includes(f.name) ? f.name : "in_" + f.name;
    let v = cell(src);
    if (v === undefined) { const old = Object.keys(alias).find(k => alias[k] === f.name); if (old) v = cell("in_" + old); }
    if (v === undefined || v === null) continue;
    if (f.type === "date") v = v instanceof Date ? iso(v) : String(v);
    else if (f.type === "num") { v = Number(v); if (!Number.isFinite(v)) { skipped.push(f.name); continue; } }
    else if (f.type === "select" && Array.isArray(f.opts)) {
      const o = f.opts.find(o => String(o) === String(v));
      if (o === undefined) { skipped.push(f.name); continue; }
      v = o;
    } else v = String(v);
    st.inputs[f.name] = v; nIn++;
  }

  // Tables : paramètres nommés
  const single = (name, set) => { const v = cell(name); if (typeof v === "number") { set(v); nT++; } };
  for (const k of ["gG_sup", "gG_inf", "gG_upl_stb", "gG_upl_dst"]) single(k, v => (st.tables.t9[k] = v));
  for (const k of ["K_E", "gam_w", "gam_beton", "lam_c", "rho_2", "e0_rel", "e_lim"]) single(k, v => (st.tables.t10[k] = v));
  single("alpha_Q", v => (st.tables.t8.alpha_Q = v));
  if (names.alpha_udl) single("alpha_udl", v => (st.tables.t8.alpha_udl = v));
  else if (names.alpha_q) single("alpha_q", v => (st.tables.t8.alpha_udl = v)); // classeur v1.0

  const t1 = range("t1_tab");
  if (t1 && t1.every(r => r.every(v => typeof v === "number"))) { st.tables.t1 = t1; nT += 10; }
  const k2 = range("t2_key"), K2 = range("t2_K"), a2 = range("t2_alpha"), b2 = range("t2_beta");
  if (k2 && K2 && a2 && b2) {
    st.tables.t2 = k2.map((r, i) => { const [ty, g, m] = String(r[0]).split("|"); return [ty, Number(g), m, K2[i][0], a2[i][0], b2[i][0]]; })
      .filter(r => r[0] && Number.isFinite(r[1]));
    nT += st.tables.t2.length * 3;
  }
  const k3 = range("t3_key"), v3 = range("t3_val");
  if (k3 && v3) {
    const band = { "M10-M20": 1, "M2,5-M9": 2, "M1-M2": 3, "Joint mince": 4 };
    for (let i = 0; i < k3.length; i++) {
      const [ty, b] = String(k3[i][0]).split("|"), row = st.tables.t3.find(r => r[0] === ty);
      if (row && band[b] && typeof v3[i][0] === "number") { row[band[b]] = v3[i][0]; nT++; }
    }
  }
  const k4 = range("t4_key"), x1 = range("t4_x1"), x2 = range("t4_x2");
  if (k4 && x1 && x2) {
    for (let i = 0; i < k4.length; i++) {
      const [ty, b] = String(k4[i][0]).split("|"), row = st.tables.t4.find(r => r[0] === ty);
      if (!row) continue;
      const o = b === "fm<5" ? 1 : 3;
      if (typeof x1[i][0] === "number") { row[o] = x1[i][0]; nT++; }
      if (typeof x2[i][0] === "number") { row[o + 1] = x2[i][0]; nT++; }
    }
  }
  const g5 = range("t5_grid");
  if (g5 && g5.length === st.tables.t5.grid.length && g5[0].length === st.tables.t5.grid[0].length) {
    st.tables.t5.grid = g5.map(r => r.map(v => (typeof v === "number" ? v : null)));
    nT += g5.flat().filter(v => typeof v === "number").length;
  }
  const ty10 = range("t10_type"), ph = range("t10_phi");
  if (ty10 && ph) ty10.forEach((r, i) => { if (typeof ph[i][0] === "number") { st.tables.phi[r[0]] = ph[i][0]; nT++; } });
  // T8 : colonne SLW 60 et coefficients γQ (les valeurs LM1 et utilisateur sont des formules)
  const t8 = { Pw: "t8_Pw", nw: "t8_nw", na: "t8_na", s: "t8_s", v: "t8_v", a0: "t8_a0", b0: "t8_b0", q: "t8_q", gQ: "t8_gQ" };
  for (const [k, n] of Object.entries(t8)) {
    const r = range(n);
    if (r && typeof r[0][0] === "number") { st.tables.t8.slw[k] = r[0][0]; nT++; }
    if (k === "gQ" && r) { if (typeof r[0][1] === "number") st.tables.t8.lm1.gQ = r[0][1]; if (typeof r[0][2] === "number") st.tables.t8.usr.gQ = r[0][2]; }
  }

  // Catalogue : lignes complètes lues sur la feuille 2_Catalogue
  const rows = (name, ncol, skip) => {
    const r = names[name] && parse(names[name]);
    if (!r || !r.b) return null;
    const ws = wb.Sheets[r.sheet], R = X.utils.decode_range(`${r.a}:${r.b}`), out = [];
    for (let i = R.s.r; i <= R.e.r; i++) {
      const row = [];
      for (let j = 0; j < ncol; j++) { if (j === skip) continue; const c = ws?.[X.utils.encode_cell({ r: i, c: j })]; row.push(c ? c.v : ""); }
      if (row[0]) out.push(row);
    }
    return out;
  };
  const el = rows("cat_code", 14, 10);     // colonne K (fb) recalculée par l'application
  if (el?.length) st.catalogue.elements = el;
  const mo = rows("mo_code_l", 8, -1);
  if (mo?.length) st.catalogue.mortiers = mo;

  return { state: st, inputs: nIn, tables: nT, skipped };
}
