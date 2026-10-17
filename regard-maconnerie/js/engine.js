// Moteur de calcul : traduction fidèle des formules du classeur Verification_regard_maconnerie.xlsx.
// Les clés de l'objet V reprennent les noms définis du classeur ; le suffixe _gm / _pm désigne le grand / petit mur.
// EN 1996-1-1:2005+A1:2012, EN 1996-3:2006, EN 1997-1:2004, EN 1990:2002, EN 1991-2:2003, DIN 1072.

export class InputError extends Error {}

const rad = d => d * Math.PI / 180;
const WALLS = ["gm", "pm"];
const OTHER = { gm: "pm", pm: "gm" };

function lookupElement(cat, code) {
  const r = cat.elements.find(e => e[0] === code);
  if (!r) throw new InputError(`Élément « ${code} » absent du catalogue.`);
  const [, , , grp, cls, type, , decl, f, delta, usage, mx] = r;
  return { grp: Number(grp), cat: cls, type, fb: decl === "Normalisée" ? Number(f) : Number(f) * Number(delta), usage, mx: Number(mx) };
}
function lookupMortar(cat, code) {
  const r = cat.mortiers.find(e => e[0] === code);
  if (!r) throw new InputError(`Mortier « ${code} » absent du catalogue.`);
  return { type: r[3], fm: Number(r[4]), conc: r[5], mx: Number(r[6]) };
}

// MATCH(x, v, 1) d'Excel, indice base 1
function matchLE(x, v) {
  let k = 0;
  for (let i = 0; i < v.length; i++) if (v[i] <= x) k = i + 1;
  return k;
}

// Poussée de Boussinesq modifiée (NAVFAC DM 7.02) d'une roue Q à (x, y) au niveau z, profondeur de référence H
function bouss(x, y, q, z, H) {
  if (q === 0) return 0;
  const xx = Math.max(x, 0.01), m = xx / H, n = z / H;
  const s = m <= 0.4 ? 0.28 * q / H ** 2 * n ** 2 / (0.16 + n ** 2) ** 3
                     : 1.77 * q / H ** 2 * m ** 2 * n ** 2 / (m ** 2 + n ** 2) ** 3;
  return s * Math.cos(1.1 * Math.atan(y / xx)) ** 2;
}

export function compute(I, T, CAT) {
  const V = {};
  const t = { gm: Number(I.tgm), pm: Number(I.tpm) };
  const num = k => { const v = Number(I[k]); if (!Number.isFinite(v)) throw new InputError(`Valeur numérique attendue pour « ${k} ».`); return v; };
  ["a", "b", "tgm", "tpm", "td", "tr", "at", "bt", "hl", "ec", "ZTN", "Zd", "Zr", "gam_sol", "gam_dej", "phi_sol", "c_sol", "beta_sol",
   "sigc", "zw", "Zn", "gmac", "ech", "gch", "kpar", "zp1", "zp2", "d", "theta", "nroues", "qu", "P", "a0", "b0", "qd", "nugm", "nupm", "eu", "cls"].forEach(num);
  const { gG_sup, gG_inf, gG_upl_stb, gG_upl_dst } = T.t9;
  const { K_E, gam_w, gam_beton, lam_c, rho_2, e0_rel, e_lim } = T.t10;
  Object.assign(V, T.t9, T.t10, { alpha_Q: T.t8.alpha_Q, alpha_udl: T.t8.alpha_udl });
  const gam_sol = +I.gam_sol, gam_dej = +I.gam_dej;
  Object.assign(V, { gam_sol, gam_dej, phi_sol: +I.phi_sol, c_sol: +I.c_sol, beta_sol: +I.beta_sol });

  // ---- B. Géométrie
  const cotes = I.mode === "Cotes";
  const ec = V.ec = cotes ? I.ZTN - I.Zd : +I.ec;
  const hl = V.hl = cotes ? I.Zd - I.td - I.Zr : +I.hl;
  if (!(hl > 0)) throw new InputError("Hauteur libre nulle ou négative : vérifier la géométrie.");
  const L = { gm: V.L_gm = +I.a + t.pm, pm: V.L_pm = +I.b + t.gm };
  const h = V.h_ax = hl + I.td / 2 + I.tr / 2;
  const z1 = V.z_tete = ec + +I.td;
  const z2 = V.z_pied = z1 + hl;
  V.A_ext = +I.a + 2 * t.pm; V.B_ext = +I.b + 2 * t.gm;
  V.A_dalle = V.A_ext * V.B_ext - I.at * I.bt;
  V.chk_ab = +I.a >= +I.b ? "OK" : "a doit être ≥ b";

  // ---- C. Sol, D. Nappe
  V.K_repos = (1 - Math.sin(rad(I.phi_sol))) * (1 + Math.sin(rad(I.beta_sol)));
  V.K_act = Math.tan(rad(45 - I.phi_sol / 2)) ** 2;
  const K = V.K_pou = I.Kchoix === "K0" ? V.K_repos : V.K_act;
  const sig_c = V.sig_c = I.comp === "Oui" ? +I.sigc : 0;
  const zn = V.z_nap = I.nappe === "Non" ? 999 : (cotes ? I.ZTN - I.Zn : +I.zw);
  const soil = z => z <= zn ? K * gam_sol * z : K * (gam_sol * zn + gam_dej * (z - zn)) + gam_w * (z - zn);

  // ---- E. Matériaux
  const el = lookupElement(CAT, I.elem), mo = lookupMortar(CAT, I.mort);
  Object.assign(V, { el_type: el.type, el_grp: el.grp, el_cat: el.cat, el_fb: el.fb, mo_type: mo.type, mo_fm: mo.fm, mo_conc: mo.conc });
  const t2 = T.t2.find(r => r[0] === el.type && Number(r[1]) === el.grp && r[2] === mo.type);
  if (!t2) throw new InputError(`Pas de coefficient K (T2) pour ${el.type}, groupe ${el.grp}, mortier ${mo.type}.`);
  V.K_mac = +t2[3]; V.alpha_mac = +t2[4]; V.beta_mac = +t2[5];
  const fk = V.fk = V.K_mac * el.fb ** V.alpha_mac * mo.fm ** V.beta_mac;
  const cls = Number(I.cls);
  const t1row = T.t1[cls - 1];
  if (!t1row) throw new InputError("Classe d'exécution hors de la table T1.");
  const gam_M = V.gam_M = +t1row[el.cat === "I" && mo.conc === "Performanciel" ? 0 : 1];
  const fd = V.fd = fk / gam_M;
  const t3 = T.t3.find(r => r[0] === el.type);
  if (!t3) throw new InputError(`Pas de fvk0 (T3) pour ${el.type}.`);
  V.fvk_0 = +(mo.type === "T" ? t3[4] : mo.fm >= 10 ? t3[1] : mo.fm >= 2.5 ? t3[2] : t3[3]);
  V.fvlt = 0.065 * el.fb;
  const t4 = T.t4.find(r => r[0] === el.type);
  if (!t4) throw new InputError(`Pas de fxk (T4) pour ${el.type}.`);
  V.fxk_1 = +(mo.fm < 5 ? t4[1] : t4[3]); V.fxk_2 = +(mo.fm < 5 ? t4[2] : t4[4]);
  V.phi_inf = +T.phi[el.type];
  const mx = Number(String(I.MX).slice(-1));
  V.chk_mx = mx <= el.mx && mx <= mo.mx ? "OK" : "INCOMPATIBLE MX";
  V.chk_usage = el.usage === "Admis" ? "OK" : "DÉCONSEILLÉ";

  // ---- H. Actions dérivées
  const T8 = T.t8, aQ = T8.alpha_Q, aq = T8.alpha_udl;
  const models = {
    "SLW 60": { ...T8.slw },
    "LM1": { Pw: T8.lm1.Pw * aQ, nw: T8.lm1.nw, na: T8.lm1.na, s: T8.lm1.s, v: T8.lm1.v, a0: T8.lm1.a0, b0: T8.lm1.b0,
             q: aQ * T8.lm1.ts / (T8.lm1.Ls * T8.lm1.Bs) + aq * T8.lm1.udl, gQ: T8.lm1.gQ },
    "Utilisateur": { Pw: +I.P, nw: 1, na: 1, s: 0, v: 0, a0: +I.a0, b0: +I.b0, q: +I.qu, gQ: T8.usr.gQ },
  };
  const md = models[I.mod];
  if (!md) throw new InputError("Modèle de charge inconnu.");
  V.mod_i = ["SLW 60", "LM1", "Utilisateur"].indexOf(I.mod) + 1;
  const Pw = V.Pw = md.Pw;
  Object.assign(V, { tr_nw: md.nw, tr_na: md.na, tr_s: md.s, tr_v: md.v, tr_a0: md.a0, tr_b0: md.b0, q_eq: md.q });
  const gam_Q = V.gam_Q = md.gQ;
  const lat_on = V.lat_on = (I.pos === "À côté du regard" || I.pos === "À cheval") ? 1 : 0;
  const vert_on = V.vert_on = I.pos === "À côté du regard" ? 0 : 1;
  const gG_stb = V.gG_stb = I.su === "Oui" ? gG_sup : gG_inf;
  V.g_terre = I.gch * Math.min(I.ech, ec) + gam_sol * Math.max(ec - I.ech, 0);
  V.g_dal = gam_beton * I.td;
  V.W_terre = V.g_terre * V.A_dalle; V.W_dal = V.g_dal * V.A_dalle;
  V.Q_dalle = vert_on * (I.nroues * Pw + (I.mod === "Utilisateur" ? I.qd * V.A_dalle : 0));
  V.f_gm = (2 * L.gm - L.pm) / (4 * L.gm ** 2);
  V.f_pm = 1 / (4 * L.gm);
  const nu = { gm: +I.nugm, pm: +I.nupm };
  for (const w of WALLS) {
    V["nt_" + w] = V.W_terre * V["f_" + w];
    V["nd_" + w] = V.W_dal * V["f_" + w];
    V["nq_" + w] = (I.trans === "Aires tributaires" ? V.Q_dalle * V["f_" + w] : 0) + nu[w];
  }
  V.psd_tete = gG_sup * (soil(z1) + sig_c);
  V.psd_pied = gG_sup * (soil(z2) + sig_c);

  // Tableau T-H1 : roues
  const wheels = [];
  for (let k = 1; k <= 3; k++) for (let j = 1; j <= 2; j++)
    wheels.push({ k, j, x: +I.d + (j - 1) * md.v, y: (k - (md.na + 1) / 2) * md.s, Q: (k <= md.na && j <= md.nw) ? Pw : 0 });
  const pQ = z => lat_on * (I.optlat === "Surcharge équivalente" ? K * md.q : wheels.reduce((s, r) => s + bouss(r.x, r.y, r.Q, z, z2), 0));

  // Tableau T-H2 : 11 tranches
  const inPen = (w, z) => (I.pen === (w === "gm" ? "Grand mur" : "Petit mur") || I.pen === "Les deux") && z >= I.zp1 && z <= I.zp2;
  const slices = [];
  for (let j = 0; j <= 10; j++) {
    const z = z1 + j * hl / 10, sk = soil(z), q = pQ(z), p = gG_sup * (sk + sig_c) + gam_Q * q;
    const xg = inPen("gm", z), xp = inPen("pm", z);
    slices.push({ j, z, sk, pQ: q, pEd: p, excl: xg && xp ? "GM et PM" : xg ? "GM" : xp ? "PM" : "", xgm: xg ? 1 : 0, xpm: xp ? 1 : 0 });
  }
  V.pQ_max = Math.max(...slices.map(s => s.pQ));
  V.pEd_max = Math.max(...slices.map(s => s.pEd));

  // Tableau T-H3 : 41 points le long de la bande
  const NP = 41, pts = [];
  for (let i = 0; i < NP; i++) {
    const x = i * h / (NP - 1), z = z1 - I.td / 2 + x;
    const q = pQ(Math.max(z, 0.001));
    const c = (z >= z1 - 1e-4 && z <= z2 + 1e-4) ? 1 : 0;
    pts.push({ i, x, z, pQ: q, pEd: c * (gG_sup * (soil(z) + sig_c) + gam_Q * q), c });
  }
  // Statique de la bande (intégration par trapèzes)
  let F = 0, G = 0;
  pts.forEach((p, i) => {
    if (i > 0) { const a = pts[i - 1], dx = p.x - a.x; F += (a.pEd + p.pEd) / 2 * dx; G += (a.x * a.pEd + p.x * p.pEd) / 2 * dx; }
    p.F = F; p.G = G;
  });
  V.st_R1 = (h * F - G) / h; V.st_R2 = F - V.st_R1;
  pts.forEach(p => { p.M = V.st_R1 * p.x - (p.x * p.F - p.G); });
  V.st_Mmax = Math.max(...pts.map(p => p.M));
  V.st_x0 = pts.find(p => p.M === V.st_Mmax).x;

  // ---- 3_Predim (EN 1996-3 §4.5)
  const Qc = ((lat_on === 1 && I.d <= 1.5) || vert_on === 1) ? Pw : 0;
  const pc = { h: hl <= 2.6, q: lat_on * md.q <= 5, c: Qc <= 15, b: I.beta_sol <= 0, he: z2 <= 1.15 * hl, w: I.nappe === "Non" };
  V.pre_zc = Math.max(z1, z2 - 0.5 * z2);
  for (const w of WALLS) {
    const ok = b => b ? "OK" : "HORS DOMAINE";
    V["pc_h_" + w] = ok(pc.h); V["pc_t_" + w] = ok(t[w] >= 0.2); V["pc_q_" + w] = ok(pc.q); V["pc_c_" + w] = ok(pc.c);
    V["pc_b_" + w] = ok(pc.b); V["pc_he_" + w] = ok(pc.he); V["pc_w_" + w] = ok(pc.w);
    V["pre_dom_" + w] = ["h", "t", "q", "c", "b", "he", "w"].every(k => V[`pc_${k}_${w}`] === "OK") ? "DANS LE DOMAINE" : "HORS DOMAINE";
    const bc = L[w];
    V["pre_beta_" + w] = bc >= 2 * hl ? 20 : bc <= hl ? 60 : 60 - 40 * (bc / hl - 1);
    V["pre_Nmax_" + w] = gG_sup * (V["nt_" + w] + V["nd_" + w]) + gam_Q * V["nq_" + w] + gG_sup * I.gmac * t[w] * (V.pre_zc - z1);
    V["pre_Nmin_" + w] = gG_stb * V["nt_" + w] + gG_inf * V["nd_" + w] + gG_inf * I.gmac * t[w] * (V.pre_zc - z1);
    V["pre_NRd_" + w] = t[w] * fd * 1000 / 3;
    V["pre_Nreq_" + w] = gam_sol * hl * z2 ** 2 / (V["pre_beta_" + w] * t[w]);
    V["pre_r1_" + w] = V["pre_Nmax_" + w] / V["pre_NRd_" + w];
    V["pre_r2_" + w] = V["pre_Nreq_" + w] / Math.max(V["pre_Nmin_" + w], 0.001);
    V["pre_v_" + w] = V["pre_dom_" + w] !== "DANS LE DOMAINE" ? "HORS DOMAINE" : Math.max(V["pre_r1_" + w], V["pre_r2_" + w]) <= 1 ? "OK" : "NON VÉRIFIÉ";
  }

  // ---- 4_Classique (bande verticale isostatique)
  V.cl_h = h;
  const p1 = V.cl_p1 = V.psd_tete + gam_Q * V.pQ_max;
  const p2 = V.cl_p2 = V.psd_pied + gam_Q * V.pQ_max;
  const dp = V.cl_dp = p2 - p1;
  V.cl_R1 = h * (2 * p1 + p2) / 6; V.cl_R2 = h * (p1 + 2 * p2) / 6;
  const x0 = V.cl_x0 = Math.abs(dp) < 1e-6 ? h / 2 : h / dp * (Math.sqrt(p1 ** 2 + 2 * dp * V.cl_R1 / h) - p1);
  const Mc = V.cl_M = V.cl_R1 * x0 - p1 * x0 ** 2 / 2 - dp * x0 ** 3 / (6 * h);
  V.cl_hef = rho_2 * h; V.cl_einit = V.cl_hef / 450;
  for (const w of WALLS) {
    const tw = t[w], S = s => V[s + "_" + w];
    V["cl_Nt1_" + w] = gG_sup * (S("nt") + S("nd")) + gam_Q * S("nq");
    V["cl_Nt2_" + w] = gG_stb * S("nt") + gG_inf * S("nd");
    V["cl_N1_" + w] = S("cl_Nt1") + gG_sup * I.gmac * tw * Math.max(x0 - I.td / 2, 0);
    V["cl_N2_" + w] = S("cl_Nt2") + gG_inf * I.gmac * tw * Math.max(x0 - I.td / 2, 0);
    V["cl_e1_" + w] = Mc / S("cl_N1") + V.cl_einit;
    V["cl_e2_" + w] = Mc / S("cl_N2") + V.cl_einit;
    V["cl_phi_" + w] = Math.max(1 - 2 * S("cl_e1") / tw, 0);
    V["cl_NRd_" + w] = S("cl_phi") * tw * fd * 1000;
    V["cl_r1_" + w] = S("cl_NRd") > 0 ? S("cl_N1") / S("cl_NRd") : 99;
    V["cl_r2_" + w] = S("cl_e2") / (e_lim * tw);
    V["cl_v1_" + w] = S("cl_r1") <= 1 && S("cl_r2") <= 1 ? "OK" : S("cl_r2") > 1 ? "INSTABLE" : "NON VÉRIFIÉ";
    V["cl_Nreq_" + w] = e_lim * tw - V.cl_einit > 0 ? Mc / (e_lim * tw - V.cl_einit) : 0;
    V["cl_sig_" + w] = S("cl_N2") / tw;
    V["cl_fx_" + w] = V.fxk_1 / gam_M * 1000 + S("cl_sig");
    V["cl_MRd_" + w] = S("cl_fx") * tw ** 2 / 6;
    V["cl_r3_" + w] = Mc / S("cl_MRd");
    V["cl_sv1_" + w] = S("cl_Nt2") / tw;
    V["cl_VR1_" + w] = Math.min(V.fvk_0 + 0.4 * S("cl_sv1") / 1000, V.fvlt) / gam_M * 1000 * tw;
    V["cl_r4_" + w] = V.cl_R1 / S("cl_VR1");
    V["cl_sv2_" + w] = (S("cl_Nt2") + gG_inf * I.gmac * tw * hl) / tw;
    V["cl_VR2_" + w] = Math.min(V.fvk_0 + 0.4 * S("cl_sv2") / 1000, V.fvlt) / gam_M * 1000 * tw;
    V["cl_r5_" + w] = I.liaison === "Relevé béton" ? 0 : V.cl_R2 / S("cl_VR2");
    V["cl_v2_" + w] = Math.max(S("cl_r4"), S("cl_r5")) <= 1 ? (I.liaison === "Relevé béton" ? "OK (pied : relevé)" : "OK") : "NON VÉRIFIÉ";
    V["cl_rmax_" + w] = Math.max(S("cl_r1"), Math.min(S("cl_r2"), S("cl_r3")), S("cl_r4"), S("cl_r5"));
    V["cl_v_" + w] = S("cl_rmax") <= 1 ? "OK" : "NON VÉRIFIÉ";
  }

  // ---- 5_Complete (EN 1996-1-1)
  V.cp_mu = V.fxk_1 / V.fxk_2;
  const t5 = T.t5, nx = t5.x.length, ny = t5.y.length;
  V.cp_t5ok = t5.grid.every(r => r.every(v => v !== null && v !== "" && Number.isFinite(Number(v)))) ? "OUI" : "NON";
  const muC = Math.min(Math.max(V.cp_mu, t5.y[0]), t5.y[ny - 1]);
  V.cp_j = Math.min(matchLE(muC, t5.y), ny - 1);
  V.cp_ty = (muC - t5.y[V.cp_j - 1]) / (t5.y[V.cp_j] - t5.y[V.cp_j - 1]);
  V.cp_fdh = I.kpar * fd;
  V.cp_cact = (I.pos === "Sur la dalle (hors tampon)" || I.pos === "À cheval") ? "OUI" : "SANS OBJET";
  V.cp_a0d = md.a0 + 2 * ec * Math.tan(rad(I.theta));
  V.cp_b0d = md.b0 + 2 * ec * Math.tan(rad(I.theta));
  const relev = I.liaison === "Relevé béton";
  for (const w of WALLS) {
    const tw = t[w], Lw = L[w], S = s => V[s + "_" + w], set = (s, v) => (V[s + "_" + w] = v);
    // 10.1
    set("cp_rho4", h <= 1.15 * Lw ? rho_2 / (1 + (rho_2 * h / Lw) ** 2) : 0.5 * Lw / h);
    set("cp_hef", S("cp_rho4") * h);
    set("cp_lam", S("cp_hef") / tw);
    set("cp_vlam", S("cp_lam") <= 27 ? "OK" : "NON VÉRIFIÉ");
    set("cp_ei", S("cp_hef") / 450);
    set("cp_Nt1", gG_sup * (S("nt") + S("nd")) + gam_Q * S("nq"));
    set("cp_Nt2", gG_stb * S("nt") + gG_inf * S("nd"));
    set("cp_Nb1", S("cp_Nt1") + gG_sup * I.gmac * tw * hl);
    set("cp_Nb2", S("cp_Nt2") + gG_inf * I.gmac * tw * hl);
    // 10.2
    set("cp_e0", e0_rel * tw);
    set("cp_et", Math.max(S("cp_e0") + gam_Q * nu[w] * I.eu / Math.max(S("cp_Nt1"), 0.001) + S("cp_ei"), 0.05 * tw));
    set("cp_pt", Math.max(1 - 2 * S("cp_et") / tw, 0));
    set("cp_NRt", S("cp_pt") * tw * fd * 1000);
    set("cp_eb", Math.max(S("cp_ei"), 0.05 * tw));
    set("cp_pb", 1 - 2 * S("cp_eb") / tw);
    set("cp_NRb", S("cp_pb") * tw * fd * 1000);
    set("cp_r_comp", Math.max(S("cp_Nt1") / Math.max(S("cp_NRt"), 0.001), S("cp_Nb1") / S("cp_NRb")));
    // 10.3
    set("cp_kv", Lw ** 4 / (Lw ** 4 + h ** 4));
    set("cp_k", I.chemin === "Bande verticale" ? 1 : S("cp_kv"));
    set("cp_M", S("cp_k") * V.st_Mmax);
    set("cp_Nm1", S("cp_Nt1") + gG_sup * I.gmac * tw * Math.max(V.st_x0 - I.td / 2, 0));
    set("cp_Nm2", S("cp_Nt2") + gG_inf * I.gmac * tw * Math.max(V.st_x0 - I.td / 2, 0));
    for (const c of ["1", "2"]) {
      const Nm = S("cp_Nm" + c), Nt = S("cp_Nt" + c);
      set("cp_em" + c, 0.5 * S("cp_e0") * Nt / Nm + S("cp_M") / Nm + S("cp_ei"));
      set("cp_ek" + c, S("cp_lam") <= lam_c ? 0 : 0.002 * V.phi_inf * S("cp_lam") * Math.sqrt(tw * S("cp_em" + c)));
      set("cp_emk" + c, Math.max(S("cp_em" + c) + S("cp_ek" + c), 0.05 * tw));
    }
    set("cp_lr", S("cp_lam") * Math.sqrt(1 / K_E));
    for (const c of ["1", "2"]) {
      const e = S("cp_emk" + c);
      set("cp_pm" + c, e >= 0.5 * tw ? 0 : (1 - 2 * e / tw) * Math.exp(-(((S("cp_lr") - 0.063) / (0.73 - 1.17 * e / tw)) ** 2) / 2));
    }
    set("cp_r_m1", S("cp_pm1") > 0 ? S("cp_Nm1") / (S("cp_pm1") * tw * fd * 1000) : 99);
    set("cp_r_m2", S("cp_emk2") / (e_lim * tw));
    set("cp_v_m", Math.max(S("cp_r_m1"), S("cp_r_m2")) <= 1 ? "OK" : "NON VÉRIFIÉ");
    // 10.4
    set("cp_hL", h / Lw);
    const hLc = Math.min(Math.max(S("cp_hL"), t5.x[0]), t5.x[nx - 1]);
    set("cp_i", Math.min(matchLE(hLc, t5.x), nx - 1));
    const i = S("cp_i"), j = V.cp_j;
    set("cp_tx", (hLc - t5.x[i - 1]) / (t5.x[i] - t5.x[i - 1]));
    const tx = S("cp_tx"), ty = V.cp_ty, g = (r, c) => Number(t5.grid[r - 1][c - 1]);
    set("cp_a2", V.cp_t5ok === "OUI" ? (1 - tx) * (1 - ty) * g(j, i) + tx * (1 - ty) * g(j, i + 1) + (1 - tx) * ty * g(j + 1, i) + tx * ty * g(j + 1, i + 1) : 0);
    set("cp_M2", S("cp_a2") * V.pEd_max * Lw ** 2);
    set("cp_M1", V.cp_mu * S("cp_M2"));
    set("cp_MR1", (V.fxk_1 / gam_M * 1000 + S("cp_Nm2") / tw) * tw ** 2 / 6);
    set("cp_MR2", V.fxk_2 / gam_M * 1000 * tw ** 2 / 6);
    set("cp_r_pl", V.cp_t5ok === "OUI" ? Math.max(S("cp_M1") / S("cp_MR1"), S("cp_M2") / S("cp_MR2")) : 99);
    set("cp_v_pl", V.cp_t5ok !== "OUI" ? "T5 NON RENSEIGNÉE" : S("cp_r_pl") <= 1 ? "OK" : "NON VÉRIFIÉ");
    // 10.5
    set("cp_la", I.la === "Entre axes" ? Lw : (w === "gm" ? +I.a : +I.b));
    set("cp_lat", S("cp_la") / tw);
    set("cp_Nad", 1.5 * V.cp_fdh * 1000 * tw / 10);
    set("cp_qlat", V.cp_fdh * 1000 * (tw / S("cp_la")) ** 2);
    set("cp_pv", Math.max(...slices.map(s => (w === "gm" ? s.xgm : s.xpm) ? 0 : s.pEd)));
    set("cp_nex", slices.reduce((n, s) => n + (w === "gm" ? s.xgm : s.xpm), 0));
    set("cp_vc", I.harpe === "Oui" && S("cp_lat") <= 25 ? "REMPLIES" : "NON REMPLIES");
    set("cp_r_v", S("cp_vc") === "REMPLIES" ? S("cp_pv") / S("cp_qlat") : 99);
    set("cp_sa", S("cp_pv") * Lw / 2 / t[OTHER[w]]);
    set("cp_r_a", S("cp_sa") / (V.cp_fdh * 1000));
    set("cp_v_v", S("cp_vc") !== "REMPLIES" ? "NON APPLICABLE" : Math.max(S("cp_r_v"), S("cp_r_a")) <= 1 ? "OK" : "NON VÉRIFIÉ");
    // 10.6
    set("cp_lb", Math.min(Lw, Math.min(V.cp_a0d, V.cp_b0d) + +I.td));
    set("cp_Ab", S("cp_lb") * tw);
    set("cp_a1", (Lw - S("cp_lb")) / 2);
    set("cp_lef", Math.min(Lw, S("cp_lb") + hl * Math.tan(rad(30))));
    set("cp_beta", Math.min(Math.max((1 + 0.3 * S("cp_a1") / hl) * (1.5 - 1.1 * S("cp_Ab") / (S("cp_lef") * tw)), 1), Math.min(1.25 + S("cp_a1") / (2 * hl), 1.5)));
    set("cp_Nc", gam_Q * Pw + gG_sup * (S("nt") + S("nd")) * S("cp_lb"));
    set("cp_NRc", S("cp_beta") * S("cp_Ab") * fd * 1000);
    set("cp_r_c", V.cp_cact === "OUI" ? S("cp_Nc") / S("cp_NRc") : 0);
    set("cp_v_c", V.cp_cact !== "OUI" ? "SANS OBJET" : S("cp_r_c") <= 1 ? "OK" : "NON VÉRIFIÉ");
    // 10.7
    set("cp_Vt", S("cp_k") * V.st_R1);
    set("cp_VRt", Math.min(V.fvk_0 + 0.4 * S("cp_Nt2") / tw / 1000, V.fvlt) / gam_M * 1000 * tw);
    set("cp_Vb", S("cp_k") * V.st_R2);
    set("cp_VRb", Math.min(V.fvk_0 + 0.4 * S("cp_Nb2") / tw / 1000, V.fvlt) / gam_M * 1000 * tw);
    set("cp_r_s", Math.max(S("cp_Vt") / S("cp_VRt"), relev ? 0 : S("cp_Vb") / S("cp_VRb")));
    set("cp_v_s", S("cp_r_s") <= 1 ? "OK" : "NON VÉRIFIÉ");
  }
  // 10.8 Soulèvement
  V.cp_zb = z2 + +I.tr;
  V.cp_U = gam_w * Math.max(V.cp_zb - zn, 0) * V.A_ext * V.B_ext;
  V.cp_G = V.W_terre + V.W_dal + I.gmac * hl * 2 * (L.gm * t.gm + L.pm * t.pm) + gam_beton * I.tr * V.A_ext * V.B_ext;
  V.cp_r_u_gm = V.cp_r_u_pm = I.nappe === "Oui" ? gG_upl_dst * V.cp_U / (gG_upl_stb * V.cp_G) : 0;
  V.cp_v_u = I.nappe !== "Oui" ? "SANS OBJET" : gG_upl_dst * V.cp_U <= gG_upl_stb * V.cp_G ? "OK" : "NON VÉRIFIÉ";
  // 10.9 Phase provisoire
  V.cp_M3 = gG_sup * (K * gam_sol * hl ** 3 / 6 + sig_c * hl ** 2 / 2);
  V.cp_p3 = gG_sup * (K * gam_sol * hl + sig_c);
  for (const w of WALLS) {
    const tw = t[w], S = s => V[s + "_" + w], set = (s, v) => (V[s + "_" + w] = v);
    set("cp_N3", gG_inf * I.gmac * tw * hl);
    set("cp_r3c", V.cp_M3 / S("cp_N3") / (e_lim * tw));
    set("cp_r3v", S("cp_vc") === "REMPLIES" ? V.cp_p3 / S("cp_qlat") : 99);
    set("cp_v3", I.c3 !== "Oui" ? "SANS OBJET" : (S("cp_r3c") <= 1 || (I.chemin === "Voûte horizontale" && S("cp_r3v") <= 1)) ? "OK" : "REMBLAIEMENT INTERDIT AVANT DALLE");
    // Synthèse
    set("cp_r_path", I.chemin === "Bande verticale" ? Math.max(S("cp_r_m1"), S("cp_r_m2")) : I.chemin === "Plaque" ? S("cp_r_pl") : Math.max(S("cp_r_v"), S("cp_r_a")));
    set("cp_rmax", Math.max(S("cp_r_comp"), S("cp_r_path"), S("cp_r_c"), S("cp_r_s")));
    const r = S("cp_rmax");
    set("cp_mech", r === S("cp_r_path") ? I.chemin : r === S("cp_r_comp") ? "Compression" : r === S("cp_r_s") ? "Cisaillement" : "Charge concentrée");
    set("cp_v", r <= 1 ? "OK" : "NON VÉRIFIÉ");
  }

  // Alertes (feuille 6_Synthese)
  const A = [];
  if (V.pre_dom_gm !== "DANS LE DOMAINE" || V.pre_dom_pm !== "DANS LE DOMAINE") A.push("Prédimensionnement EN 1996-3 hors domaine : valeurs indicatives.");
  if (V.chk_usage !== "OK") A.push("Élément déconseillé en enterré.");
  if (V.chk_mx !== "OK") A.push("Élément ou mortier incompatible avec la classe d'exposition.");
  if (V.cp_nex_gm + V.cp_nex_pm > 0) A.push("Tranches exclues de la voûte par une pénétration : prévoir un cadre en béton.");
  if (I.chemin === "Plaque" && V.cp_t5ok !== "OUI") A.push("Table T5 (annexe E) non renseignée : vérification en plaque impossible.");
  if (V.cp_v3_gm === "REMBLAIEMENT INTERDIT AVANT DALLE" || V.cp_v3_pm === "REMBLAIEMENT INTERDIT AVANT DALLE") A.push("Consigne : remblaiement interdit avant coulage de la dalle supérieure.");
  if (I.mod === "LM1") A.push("LM1 : répartition sur remblai selon EN 1991-2 §4.9.1 à vérifier.");
  if (V.chk_ab !== "OK") A.push("Géométrie : a doit être supérieur ou égal à b.");
  if (I.chemin === "Voûte horizontale") A.push("Voûte horizontale : la flexion verticale est supposée redistribuée sur l'arc (fissuration des joints d'assise admise).");
  if (relev) A.push("Liaison en pied par relevé béton : effort tranchant à justifier en béton armé (hors périmètre).");
  A.push("Tables normatives pré-remplies à vérifier (page Coefficients).");

  return { V, wheels, slices, pts, alerts: A, t };
}
