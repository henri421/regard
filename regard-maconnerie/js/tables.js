// Tables normatives et catalogue par défaut.
// Valeurs PRÉ-REMPLIES À VÉRIFIER par l'ingénieur (mêmes valeurs que la feuille 1_Coefficients du classeur).
// Toutes ces valeurs sont modifiables dans l'application et enregistrées dans le fichier projet.

export const TYPES = ["Terre cuite", "Silico-calcaire", "Béton de granulats", "Béton cellulaire"];

export function defaultTables() {
  return {
    // T1  γM (EN 1996-1-1 Tab. 2.3, valeurs recommandées, ANL à confirmer)
    // ligne = classe d'exécution 1 à 5 ; [cat. I mortier performanciel, cat. I recette ou cat. II]
    t1: [[1.5, 1.7], [1.7, 2.0], [2.0, 2.2], [2.2, 2.5], [2.5, 2.7]],

    // T2  fk = K·fb^α·fm^β (EN 1996-1-1 Tab. 3.3)
    t2: [
      ["Terre cuite", 1, "G", 0.55, 0.70, 0.30],
      ["Terre cuite", 2, "G", 0.45, 0.70, 0.30],
      ["Terre cuite", 3, "G", 0.35, 0.70, 0.30],
      ["Terre cuite", 4, "G", 0.35, 0.70, 0.30],
      ["Silico-calcaire", 1, "G", 0.55, 0.70, 0.30],
      ["Silico-calcaire", 2, "G", 0.45, 0.70, 0.30],
      ["Béton de granulats", 1, "G", 0.55, 0.70, 0.30],
      ["Béton de granulats", 2, "G", 0.52, 0.70, 0.30],
      ["Béton de granulats", 3, "G", 0.40, 0.70, 0.30],
      ["Béton de granulats", 4, "G", 0.40, 0.70, 0.30],
      ["Béton cellulaire", 1, "G", 0.55, 0.70, 0.30],
      ["Terre cuite", 1, "T", 0.75, 0.85, 0.00],
      ["Terre cuite", 2, "T", 0.70, 0.85, 0.00],
      ["Terre cuite", 3, "T", 0.50, 0.85, 0.00],
      ["Silico-calcaire", 1, "T", 0.80, 0.85, 0.00],
      ["Silico-calcaire", 2, "T", 0.65, 0.85, 0.00],
      ["Béton de granulats", 1, "T", 0.80, 0.85, 0.00],
      ["Béton de granulats", 2, "T", 0.65, 0.85, 0.00],
      ["Béton de granulats", 3, "T", 0.50, 0.85, 0.00],
      ["Béton cellulaire", 1, "T", 0.80, 0.85, 0.00],
    ],

    // T3  fvk0 (EN 1996-1-1 Tab. 3.4) : [type, M10-M20, M2,5-M9, M1-M2, joint mince]
    t3: [
      ["Terre cuite", 0.30, 0.20, 0.10, 0.30],
      ["Silico-calcaire", 0.20, 0.15, 0.10, 0.40],
      ["Béton de granulats", 0.20, 0.15, 0.10, 0.40],
      ["Béton cellulaire", 0.20, 0.15, 0.10, 0.40],
    ],

    // T4  fxk1, fxk2 (EN 1996-1-1 Tab. 3.6 et 3.7) : [type, fxk1 fm<5, fxk2 fm<5, fxk1 fm≥5, fxk2 fm≥5]
    t4: [
      ["Terre cuite", 0.10, 0.40, 0.10, 0.40],
      ["Silico-calcaire", 0.05, 0.20, 0.10, 0.40],
      ["Béton de granulats", 0.05, 0.20, 0.10, 0.40],
      ["Béton cellulaire", 0.05, 0.20, 0.10, 0.40],
    ],

    // T5  α2, panneau sur 4 bords simplement appuyés (EN 1996-1-1 annexe E) : À TRANSCRIRE
    t5: {
      x: [0.30, 0.50, 0.75, 1.00, 1.25, 1.50, 1.75, 2.00],          // h/L
      y: [0.30, 0.35, 0.40, 0.50, 0.60, 0.70, 0.80, 0.90, 1.00],   // μ
      grid: Array.from({ length: 9 }, () => Array(8).fill(null)),
    },

    // T8  Modèles de trafic
    t8: {
      alpha_Q: 1.0, alpha_udl: 1.0,
      slw: { Pw: 100, nw: 2, na: 3, s: 1.50, v: 2.00, a0: 0.60, b0: 0.20, q: 33.3, gQ: 1.50 },
      lm1: { Pw: 150, nw: 2, na: 2, s: 1.20, v: 2.00, a0: 0.40, b0: 0.40, ts: 600, Ls: 3.0, Bs: 2.2, udl: 9, gQ: 1.35 },
      usr: { gQ: 1.50 },
    },

    // T9  Coefficients partiels (EN 1990, EN 1997-1, ANL à confirmer)
    t9: { gG_sup: 1.35, gG_inf: 1.00, gG_upl_stb: 0.90, gG_upl_dst: 1.00 },

    // T10  Constantes
    t10: { K_E: 1000, gam_w: 10, gam_beton: 25, lam_c: 15, rho_2: 0.75, e0_rel: 1 / 6, e_lim: 0.45 },
    phi: { "Terre cuite": 1.0, "Silico-calcaire": 1.5, "Béton de granulats": 1.5, "Béton cellulaire": 1.0 },
  };
}

export function defaultCatalogue() {
  return {
    // code, désignation, norme, groupe, catégorie, type, dimensions, déclaration, f déclarée, δ, usage enterré, MX max, source
    elements: [
      ["BBP15-24", "Bloc béton plein", "EN 771-3", 1, "I", "Béton de granulats", "490×240×190", "Normalisée", 15, 1.0, "Admis", 5, "Générique"],
      ["BBP20-24", "Bloc béton plein", "EN 771-3", 1, "I", "Béton de granulats", "490×240×190", "Normalisée", 20, 1.0, "Admis", 5, "Générique"],
      ["BBC10-20", "Bloc béton creux", "EN 771-3", 2, "I", "Béton de granulats", "490×200×190", "Normalisée", 10, 1.0, "Déconseillé", 3, "Générique"],
      ["BTP25-24", "Brique terre cuite pleine", "EN 771-1", 1, "I", "Terre cuite", "240×115×71", "Moyenne", 28, 0.90, "Admis", 5, "Générique"],
      ["BTP15-24", "Brique terre cuite perforée", "EN 771-1", 2, "I", "Terre cuite", "300×240×238", "Normalisée", 15, 1.0, "Déconseillé", 3, "Générique"],
      ["SCP20-24", "Bloc silico-calcaire plein", "EN 771-2", 1, "I", "Silico-calcaire", "248×240×248", "Normalisée", 20, 1.0, "Admis", 4, "Générique"],
      ["BCA4-24", "Béton cellulaire", "EN 771-4", 1, "I", "Béton cellulaire", "600×240×250", "Normalisée", 4, 1.0, "Déconseillé", 2, "Générique"],
    ],
    // code, désignation, classe, type G/T, fm, conception, MX max, source
    mortiers: [
      ["M5-G", "Mortier d'usage courant", "M5", "G", 5, "Performanciel", 3, "Générique"],
      ["M10-G", "Mortier d'usage courant", "M10", "G", 10, "Performanciel", 5, "Générique"],
      ["M15-G", "Mortier d'usage courant", "M15", "G", 15, "Performanciel", 5, "Générique"],
      ["M20-G", "Mortier d'usage courant", "M20", "G", 20, "Performanciel", 5, "Générique"],
      ["M10-R", "Mortier de recette 1:3 (CEM III/A)", "M10", "G", 10, "Recette", 5, "Générique"],
      ["M10-T", "Mortier joint mince", "M10", "T", 10, "Performanciel", 4, "Générique"],
    ],
    // code, désignation, SR, tenue chimique, usage recommandé
    ciments: [
      ["CEM I", "CEM I 42,5 R", "Non", "Faible", "Hors gel, eaux claires"],
      ["CEM II", "CEM II/A-LL 42,5 N", "Non", "Moyenne", "Usage courant, MX2 à MX3"],
      ["CEM III/A", "CEM III/A 42,5 N", "Selon fiche", "Bonne", "Regards, MX3 à MX5 (défaut)"],
      ["CEM III/B", "CEM III/B 42,5 N-LH/SR", "Oui", "Très bonne", "Eaux usées agressives, MX5"],
    ],
  };
}

// Pour mémoire (non utilisés dans les calculs)
export const T6 = {
  cols: ["50", "100", "150", "200", "≥ 250"],
  rows: [
    ["40", 0.80, 0.70, null, null, null], ["50", 0.85, 0.75, 0.70, null, null],
    ["65", 0.95, 0.85, 0.75, 0.70, 0.65], ["100", 1.15, 1.00, 0.90, 0.80, 0.75],
    ["150", 1.30, 1.20, 1.10, 1.00, 0.95], ["200", 1.45, 1.35, 1.25, 1.15, 1.10],
    ["≥ 250", 1.55, 1.45, 1.35, 1.25, 1.15],
  ],
};
export const T7 = [
  ["MX1", "Sec", "Sans objet en enterré"],
  ["MX2", "Humide, sans gel", "Regard hors gel, eaux claires"],
  ["MX3", "Humide avec cycles de gel", "Regard sous chaussée, partie haute"],
  ["MX4", "Air salin, eau de mer ou sels de déverglaçage", "Regard sous chaussée salée"],
  ["MX5", "Milieu chimique agressif", "Regard d'eaux usées (H2S, sulfates)"],
];
