// Description des pages de calcul : mêmes lignes que le classeur
// (désignation, symbole, valeur(s), unité, formule écrite en clair, référence normative).
// val : "clé" (une valeur) | "@base" (base_gm et base_pm) | (V, I) => valeur ou [gm, pm]
// f : nombre de décimales, ou "t" pour du texte ; v : verdict encadré

const S = (title, lines, extra) => ({ title, lines, extra });
const l = (d, s, val, u = "", fx = "", ref = "", o = {}) => ({ d, s, val, u, fx, ref, f: o.f ?? 2, v: !!o.v, note: o.note });
const t = { f: "t" }, tv = { f: "t", v: true };

export const SAISIE_DERIVED = [
  S("Géométrie retenue", [
    l("Recouvrement retenu", "ec", "ec", "m", "ZTN − Zd ou saisie"),
    l("Hauteur libre retenue", "hl", "hl", "m", "Zd − td − Zr ou saisie"),
    l("Portée entre axes, grands murs", "L1", "L_gm", "m", "a + t2"),
    l("Portée entre axes, petits murs", "L2", "L_pm", "m", "b + t1"),
    l("Hauteur entre plans moyens", "h", "h_ax", "m", "hl + td/2 + tr/2"),
    l("Profondeur de la tête de mur", "z1", "z_tete", "m", "ec + td"),
    l("Profondeur du pied de mur", "z2", "z_pied", "m", "z1 + hl"),
    l("Longueur extérieure", "Aext", "A_ext", "m", "a + 2·t2"),
    l("Largeur extérieure", "Bext", "B_ext", "m", "b + 2·t1"),
    l("Aire nette de la dalle", "Ad", "A_dalle", "m²", "Aext·Bext − at·bt"),
    l("Contrôle de saisie", "", "chk_ab", "", "a ≥ b", "", tv),
  ]),
  S("Sol et nappe", [
    l("Coefficient au repos", "K0", "K_repos", "", "(1 − sin φ')(1 + sin βs)", "EN 1997-1 §9.5.2", { f: 3 }),
    l("Coefficient actif (terrain horizontal)", "Ka", "K_act", "", "tan²(45° − φ'/2)", "Rankine", { f: 3 }),
    l("Coefficient retenu", "K", "K_pou", "", "", "", { f: 3 }),
    l("Pression de compactage retenue", "σc", "sig_c", "kPa", "", "", { f: 1 }),
    l("Profondeur de nappe retenue", "zw", "z_nap", "m", "999 = sans nappe"),
  ]),
  S("Matériaux", [
    l("Type d'élément", "", "el_type", "", "", "Catalogue", t),
    l("Groupe", "", "el_grp", "", "", "Catalogue", { f: 0 }),
    l("Catégorie", "", "el_cat", "", "", "Catalogue", t),
    l("Résistance normalisée", "fb", "el_fb", "N/mm²", "", "Catalogue", { f: 1 }),
    l("Type de mortier", "", "mo_type", "", "G usage courant, T joint mince", "Catalogue", t),
    l("Résistance du mortier", "fm", "mo_fm", "N/mm²", "", "Catalogue", { f: 1 }),
    l("Conception du mortier", "", "mo_conc", "", "", "Catalogue", t),
    l("Coefficient K", "K", "K_mac", "", "", "EN 1996-1-1 Tab. 3.3"),
    l("Exposant α", "α", "alpha_mac", "", "", "EN 1996-1-1 Tab. 3.3"),
    l("Exposant β", "β", "beta_mac", "", "", "EN 1996-1-1 Tab. 3.3"),
    l("Résistance caractéristique en compression", "fk", "fk", "N/mm²", "K·fb^α·fm^β", "EN 1996-1-1 (3.1)"),
    l("Coefficient partiel", "γM", "gam_M", "", "T1", "EN 1996-1-1 §2.4.3"),
    l("Résistance de calcul en compression", "fd", "fd", "N/mm²", "fk / γM", "EN 1996-1-1 §2.4.1", { f: 3 }),
    l("Résistance initiale au cisaillement", "fvk0", "fvk_0", "N/mm²", "T3", "EN 1996-1-1 Tab. 3.4"),
    l("Limite de résistance au cisaillement", "fvlt", "fvlt", "N/mm²", "0,065·fb", "EN 1996-1-1 §3.6.2", { f: 3 }),
    l("Résistance en flexion, rupture parallèle aux joints", "fxk1", "fxk_1", "N/mm²", "T4", "EN 1996-1-1 Tab. 3.6"),
    l("Résistance en flexion, rupture perpendiculaire", "fxk2", "fxk_2", "N/mm²", "T4", "EN 1996-1-1 Tab. 3.7"),
    l("Coefficient de fluage final", "φ∞", "phi_inf", "", "", "EN 1996-1-1 Tab. 3.8", { f: 1 }),
    l("Compatibilité avec la classe d'exposition", "", "chk_mx", "", "MX saisie ≤ MX max élément et mortier", "EN 1996-2", tv),
    l("Usage enterré de l'élément", "", "chk_usage", "", "", "Catalogue", tv),
  ]),
  S("Actions dérivées", [
    l("Charge par roue", "Pw", "Pw", "kN", "", "T8", { f: 1 }),
    l("Roues par essieu / nombre d'essieux", "nw / na", (V) => `${V.tr_nw} / ${V.tr_na}`, "", "", "T8", t),
    l("Espacement des essieux / voie", "s / v", (V) => `${fmt(V.tr_s, 2)} / ${fmt(V.tr_v, 2)}`, "m", "", "T8", t),
    l("Empreinte de la roue", "a0 × b0", (V) => `${fmt(V.tr_a0, 2)} × ${fmt(V.tr_b0, 2)}`, "m", "", "T8", t),
    l("Surcharge équivalente sur remblai", "qeq", "q_eq", "kPa", "", "T8", { f: 1 }),
    l("Coefficient partiel du trafic", "γQ", "gam_Q", "", "", "T8"),
    l("Trafic sur le remblai adjacent actif", "", "lat_on", "", "1 = oui", "", { f: 0 }),
    l("Trafic sur la dalle actif", "", "vert_on", "", "1 = oui", "", { f: 0 }),
    l("Coefficient des terres stabilisantes (C2)", "γG,stb", "gG_stb", "", "source unique : γG,sup", "EN 1990 §6.4.3"),
    l("Terres et chaussée sur la dalle", "gt", "g_terre", "kPa", "γch·ech + γ·(ec − ech)"),
    l("Poids propre de la dalle", "gd", "g_dal", "kPa", "25·td"),
    l("Résultante des terres sur la dalle", "Wt", "W_terre", "kN", "gt·Ad", "", { f: 1 }),
    l("Résultante du poids de la dalle", "Wd", "W_dal", "kN", "gd·Ad", "", { f: 1 }),
    l("Trafic total sur la dalle", "Qd", "Q_dalle", "kN", "nr·Pw (+ qd·Ad)", "", { f: 1 }),
    l("Fraction linéique, grands murs", "f1", "f_gm", "1/m", "(2A − B)/(4A²), A = L1, B = L2", "Aires tributaires à 45°", { f: 4 }),
    l("Fraction linéique, petits murs", "f2", "f_pm", "1/m", "1/(4A)", "Aires tributaires à 45°", { f: 4 }),
    l("Terres sur dalle, grands / petits murs (G)", "nt", (V) => [V.nt_gm, V.nt_pm], "kN/m", "Wt·f"),
    l("Dalle, grands / petits murs (G)", "nd", (V) => [V.nd_gm, V.nd_pm], "kN/m", "Wd·f"),
    l("Trafic, grands / petits murs (Q)", "nQ", (V) => [V.nq_gm, V.nq_pm], "kN/m", "Qd·f + nu"),
    l("Poussée de calcul des terres en tête", "ps,1", "psd_tete", "kPa", "γG·(K·γ·z1 + σc), nappe comprise", "EN 1997-1 §9.5", { f: 1 }),
    l("Poussée de calcul des terres en pied", "ps,2", "psd_pied", "kPa", "γG·(K·γ·z2 + σc), nappe comprise", "EN 1997-1 §9.5", { f: 1 }),
    l("Poussée caractéristique maximale du trafic", "pQ,max", "pQ_max", "kPa", "max du tableau T-H2", "", { f: 1 }),
    l("Poussée de calcul maximale", "pEd,max", "pEd_max", "kPa", "max du tableau T-H2", "", { f: 1 }),
  ]),
];

export const PREDIM = [
  S("Conditions d'application (EN 1996-3 §4.5)", [
    l("Hauteur libre du mur", "hl", "hl", "m", "hl ≤ 2,6 m", "§4.5(1)"),
    l("Condition sur la hauteur", "", "@pc_h", "", "", "", tv),
    l("Épaisseur du mur", "t", (V, I) => [+I.tgm, +I.tpm], "m", "t ≥ 0,20 m", "§4.5(1)"),
    l("Condition sur l'épaisseur", "", "@pc_t", "", "", "", tv),
    l("Plancher en tête formant diaphragme", "", () => "Oui", "", "dalle BA (hypothèse de l'outil)", "§4.5(1)", t),
    l("Surcharge caractéristique sur le remblai", "q", (V) => V.lat_on * V.q_eq, "kPa", "q ≤ 5 kPa", "§4.5(1)"),
    l("Condition sur la surcharge", "", "@pc_q", "", "", "", tv),
    l("Charge concentrée à moins de 1,5 m du mur", "Qc", (V, I) => ((V.lat_on === 1 && I.d <= 1.5) || V.vert_on === 1) ? V.Pw : 0, "kN", "Qc ≤ 15 kN", "§4.5(1)", { f: 1 }),
    l("Condition sur la charge concentrée", "", "@pc_c", "", "", "", tv),
    l("Condition sur le terrain (ne remonte pas)", "", "@pc_b", "", "βs ≤ 0", "§4.5(1)", tv),
    l("Hauteur de remblai retenue", "he", "z_pied", "m", "he = z2 (prudent)", "§4.5(1)"),
    l("Condition sur la hauteur de remblai", "", "@pc_he", "", "he ≤ 1,15·hl", "", tv),
    l("Condition sur la nappe", "", "@pc_w", "", "pas de pression hydrostatique", "§4.5(1)", tv),
    l("Domaine d'application", "", "@pre_dom", "", "valeurs suivantes indicatives si hors domaine", "", tv),
  ]),
  S("Encadrement de l'effort normal (b = 1 m)", [
    l("Espacement des refends (portée du mur)", "bc", (V) => [V.L_gm, V.L_pm], "m"),
    l("Coefficient β", "β", "@pre_beta", "", "20 si bc ≥ 2h ; 60 si bc ≤ h ; interpolation", "§4.5(2)", { f: 1 }),
    l("Profondeur du niveau de calcul", "zc", "pre_zc", "m", "mi-hauteur du remblai (0,5·he), à confirmer"),
    l("Effort normal maximal (C1)", "NEd,max", "@pre_Nmax", "kN/m", "1,35·G + γQ·Q", "EN 1990", { f: 1 }),
    l("Effort normal minimal (C2)", "NEd,min", "@pre_Nmin", "kN/m", "1,0·G, sans trafic sur dalle", "EN 1990", { f: 1 }),
    l("Borne supérieure", "NRd,max", "@pre_NRd", "kN/m", "t·b·fd/3", "EN 1996-3 (4.15)", { f: 1 }),
    l("Borne inférieure requise", "Nmin,req", "@pre_Nreq", "kN/m", "ρe·b·h·he²/(β·t)", "EN 1996-3 (4.16)", { f: 1 }),
    l("Taux NEd,max / NRd,max", "", "@pre_r1"),
    l("Taux Nmin,req / NEd,min", "", "@pre_r2"),
    l("Verdict du prédimensionnement", "", "@pre_v", "", "", "", tv),
  ]),
];

export const CLASSIQUE = [
  S("Chargement de calcul", [
    l("Portée entre plans moyens", "h", "cl_h", "m"),
    l("Poussée de calcul en tête", "p1", "cl_p1", "kPa", "ps,1 + γQ·pQ,max", "EN 1997-1 §9.5", { f: 1 }),
    l("Poussée de calcul en pied", "p2", "cl_p2", "kPa", "ps,2 + γQ·pQ,max", "EN 1997-1 §9.5", { f: 1 }),
    l("Écart", "Δp", "cl_dp", "kPa", "p2 − p1", "", { f: 1 }),
  ], "Bande de 1 m sur appuis articulés (dalle, radier), charge trapézoïdale p1 → p2, trafic pris uniforme et égal à son maximum."),
  S("Efforts", [
    l("Réaction en tête", "R1", "cl_R1", "kN/m", "h(2p1 + p2)/6", "", { f: 1 }),
    l("Réaction en pied", "R2", "cl_R2", "kN/m", "h(p1 + 2p2)/6", "", { f: 1 }),
    l("Position du moment maximal", "x0", "cl_x0", "m", "(h/Δp)(√(p1² + 2Δp·R1/h) − p1)", "", { f: 3 }),
    l("Moment maximal", "MEd", "cl_M", "kNm/m", "R1·x0 − p1·x0²/2 − Δp·x0³/(6h)"),
  ]),
  S("Efforts normaux au niveau x0", [
    l("Effort normal en tête (C1)", "Nt,C1", "@cl_Nt1", "kN/m", "1,35·G + γQ·Q", "EN 1990", { f: 1 }),
    l("Effort normal en tête (C2)", "Nt,C2", "@cl_Nt2", "kN/m", "γG,stb·terres + 1,0·dalle", "EN 1990", { f: 1 }),
    l("Effort normal en x0 (C1)", "NC1", "@cl_N1", "kN/m", "Nt + γG·γmaç·t·(x0 − td/2)", "", { f: 1 }),
    l("Effort normal en x0 (C2)", "NC2", "@cl_N2", "kN/m", "", "", { f: 1 }),
  ]),
  S("Flexion composée (EN 1996-1-1 §6.1.2.2)", [
    l("Hauteur effective", "hef", "cl_hef", "m", "ρ2·h", "§5.5.1.2"),
    l("Excentricité initiale", "einit", "cl_einit", "m", "hef/450", "§5.5.1.1", { f: 4 }),
    l("Excentricité (C1)", "eC1", "@cl_e1", "m", "MEd/N + einit", "", { f: 3 }),
    l("Excentricité (C2)", "eC2", "@cl_e2", "m", "MEd/N + einit", "", { f: 3 }),
    l("Facteur de réduction (C1)", "Φ", "@cl_phi", "", "1 − 2e/t", "(6.4)", { f: 3 }),
    l("Résistance en compression (C1)", "NRd", "@cl_NRd", "kN/m", "Φ·t·fd", "(6.2)", { f: 1 }),
    l("Taux en compression (C1)", "", "@cl_r1", "", "NC1/NRd"),
    l("Taux de stabilité (C2)", "", "@cl_r2", "", "eC2/(0,45·t)"),
    l("Verdict en flexion composée", "", "@cl_v1", "", "", "", tv),
    l("Effort normal requis pour la stabilité", "Nreq", "@cl_Nreq", "kN/m", "MEd/(0,45·t − einit)", "", { f: 1 }),
  ]),
  S("Flexion seule (EN 1996-1-1 §6.3.1)", [
    l("Contrainte de compression (C2)", "σd", "@cl_sig", "kPa", "NC2/t", "", { f: 1 }),
    l("Résistance en flexion apparente", "fxd1,app", "@cl_fx", "kPa", "fxk1/γM + σd", "§6.3.1(4)", { f: 1 }),
    l("Moment résistant", "MRd", "@cl_MRd", "kNm/m", "fxd1,app·t²/6", "(6.15)"),
    l("Taux en flexion seule", "", "@cl_r3", "", "MEd/MRd"),
  ]),
  S("Cisaillement aux appuis (EN 1996-1-1 §6.2)", [
    l("Effort tranchant en tête", "VEd,1", "cl_R1", "kN/m", "R1", "", { f: 1 }),
    l("Contrainte normale en tête (C2)", "σd,1", "@cl_sv1", "kPa", "", "", { f: 1 }),
    l("Résistance en tête", "VRd,1", "@cl_VR1", "kN/m", "min(fvk0 + 0,4σd ; fvlt)/γM·t", "(3.5), (6.13)", { f: 1 }),
    l("Taux en tête", "", "@cl_r4"),
    l("Effort tranchant en pied", "VEd,2", "cl_R2", "kN/m", "R2", "", { f: 1 }),
    l("Contrainte normale en pied (C2)", "σd,2", "@cl_sv2", "kPa", "", "", { f: 1 }),
    l("Résistance en pied (joint)", "VRd,2", "@cl_VR2", "kN/m", "", "", { f: 1 }),
    l("Taux en pied", "", "@cl_r5", "", "0 si relevé béton"),
    l("Verdict en cisaillement", "", "@cl_v2", "", "", "", tv),
  ]),
  S("Synthèse de la méthode classique", [
    l("Taux déterminant", "", "@cl_rmax", "", "stabilité : flexion composée OU flexion seule"),
    l("Verdict", "", "@cl_v", "", "", "", tv),
  ]),
];

export const COMPLETE = [
  S("Chemin de charge", [l("Chemin de charge retenu", "", (V, I) => I.chemin, "", "sélecteur de la page Saisie", "", t)]),
  S("10.1 Élancement (§5.5.1)", [
    l("Portée horizontale entre axes", "L", (V) => [V.L_gm, V.L_pm], "m"),
    l("Hauteur entre plans moyens", "h", "h_ax", "m"),
    l("Facteur ρ2", "ρ2", "rho_2", "", "T10", "§5.5.1.2"),
    l("Facteur ρ4", "ρ4", "@cp_rho4", "", "h ≤ 1,15L : ρ2/(1 + (ρ2h/L)²) ; sinon 0,5L/h", "(5.6), (5.7)", { f: 3 }),
    l("Hauteur effective", "hef", "@cp_hef", "m", "ρ4·h", "(5.2)", { f: 3 }),
    l("Élancement", "hef/tef", "@cp_lam", "", "≤ 27", "§5.5.1.4", { f: 1 }),
    l("Verdict d'élancement", "", "@cp_vlam", "", "", "", tv),
    l("Excentricité initiale", "einit", "@cp_ei", "m", "hef/450", "§5.5.1.1", { f: 4 }),
  ]),
  S("Efforts normaux", [
    l("En tête (C1)", "Nt,C1", "@cp_Nt1", "kN/m", "1,35·G + γQ·Q", "EN 1990", { f: 1 }),
    l("En tête (C2)", "Nt,C2", "@cp_Nt2", "kN/m", "γG,stb·terres + 1,0·dalle", "EN 1990", { f: 1 }),
    l("En pied (C1)", "Nb,C1", "@cp_Nb1", "kN/m", "Nt + γG·γmaç·t·hl", "", { f: 1 }),
    l("En pied (C2)", "Nb,C2", "@cp_Nb2", "kN/m", "", "", { f: 1 }),
  ]),
  S("10.2 Compression en tête et en pied (§6.1.2.2)", [
    l("Excentricité d'appui de la dalle", "e0", "@cp_e0", "m", "e0/t (T10)·t", "", { f: 4 }),
    l("Excentricité en tête", "et", "@cp_et", "m", "Mid/Nid + ehe + einit ≥ 0,05t", "(6.5)", { f: 4 }),
    l("Facteur Φ en tête", "Φt", "@cp_pt", "", "1 − 2et/t", "(6.4)", { f: 3 }),
    l("Résistance en tête", "NRd,t", "@cp_NRt", "kN/m", "Φt·t·fd", "(6.2)", { f: 1 }),
    l("Excentricité en pied", "eb", "@cp_eb", "m", "einit ≥ 0,05t", "(6.5)", { f: 4 }),
    l("Facteur Φ en pied", "Φb", "@cp_pb", "", "", "", { f: 3 }),
    l("Résistance en pied", "NRd,b", "@cp_NRb", "kN/m", "", "", { f: 1 }),
    l("Taux en compression", "", "@cp_r_comp", "", "max(Nt/NRd,t ; Nb/NRd,b)"),
  ]),
  S("10.3 Flexion composée à mi-hauteur (annexe G)", [
    l("Moment isostatique de la poussée", "M0", "st_Mmax", "kNm/m", "statique de la bande (annexe)"),
    l("Part portée verticalement (Rankine-Grashof)", "kv", "@cp_kv", "", "L⁴/(L⁴ + h⁴)", "", { f: 3 }),
    l("Coefficient retenu", "k", "@cp_k", "", "1 si bande verticale, sinon kv", "", { f: 3 }),
    l("Moment de calcul vertical", "Mmd", "@cp_M", "kNm/m", "k·M0"),
    l("Effort normal au niveau de M0 (C1)", "Nm,C1", "@cp_Nm1", "kN/m", "", "", { f: 1 }),
    l("Effort normal au niveau de M0 (C2)", "Nm,C2", "@cp_Nm2", "kN/m", "", "", { f: 1 }),
    l("Excentricité em (C1)", "em", "@cp_em1", "m", "Mmd/Nmd + ehm + einit", "(6.7)", { f: 4 }),
    l("Excentricité de fluage (C1)", "ek", "@cp_ek1", "m", "0 si hef/tef ≤ λc", "(6.8)", { f: 4 }),
    l("Excentricité totale (C1)", "emk", "@cp_emk1", "m", "em + ek ≥ 0,05t", "(6.6)", { f: 4 }),
    l("Excentricité em (C2)", "em", "@cp_em2", "m", "Mmd/Nmd + ehm + einit", "(6.7)", { f: 4 }),
    l("Excentricité de fluage (C2)", "ek", "@cp_ek2", "m", "0 si hef/tef ≤ λc", "(6.8)", { f: 4 }),
    l("Excentricité totale (C2)", "emk", "@cp_emk2", "m", "em + ek ≥ 0,05t", "(6.6)", { f: 4 }),
    l("Élancement réduit", "λ", "@cp_lr", "", "(hef/tef)·√(fk/E)", "(G.2)", { f: 3 }),
    l("Facteur Φm (C1)", "Φm", "@cp_pm1", "", "A1·e^(−u²/2), u = (λ − 0,063)/(0,73 − 1,17emk/t)", "(G.1)", { f: 3 }),
    l("Facteur Φm (C2)", "Φm", "@cp_pm2", "", "idem", "(G.1)", { f: 3 }),
    l("Taux en compression (C1)", "", "@cp_r_m1", "", "Nm,C1/(Φm·t·fd)"),
    l("Taux de stabilité (C2)", "", "@cp_r_m2", "", "emk,C2/(0,45·t)"),
    l("Verdict (pris en compte si bande verticale)", "", "@cp_v_m", "", "", "", tv),
  ]),
  S("10.4 Plaque sur quatre bords (annexe E)", [
    l("Rapport h/L", "h/L", "@cp_hL", "", "", "", { f: 3 }),
    l("Rapport d'orthotropie", "μ", "cp_mu", "", "fxk1/fxk2", "§E", { f: 3 }),
    l("Table T5 renseignée", "", "cp_t5ok", "", "", "T5", t),
    l("Coefficient de moment", "α2", "@cp_a2", "", "interpolation bilinéaire dans T5", "§E", { f: 4 }),
    l("Charge latérale de calcul", "WEd", "pEd_max", "kPa", "maximum sur la hauteur (prudent)", "", { f: 1 }),
    l("Moment, rupture perpendiculaire aux joints", "MEd2", "@cp_M2", "kNm/m", "α2·WEd·L²", "(5.18)"),
    l("Moment, rupture parallèle aux joints", "MEd1", "@cp_M1", "kNm/m", "μ·α2·WEd·L²", "(5.17)"),
    l("Moment résistant MRd1", "MRd1", "@cp_MR1", "kNm/m", "(fxd1 + σd)·t²/6", "(6.15)"),
    l("Moment résistant MRd2", "MRd2", "@cp_MR2", "kNm/m", "fxd2·t²/6", "(6.15)"),
    l("Taux en plaque", "", "@cp_r_pl", "", "99 si T5 non renseignée"),
    l("Verdict en plaque", "", "@cp_v_pl", "", "", "", tv),
  ]),
  S("10.5 Voûte horizontale (§6.3.2)", [
    l("Portée de la voûte", "la", "@cp_la", "m", "entre axes ou libre", "", { f: 3 }),
    l("Rapport", "la/t", "@cp_lat", "", "≤ 25 : flèche d = 0", "§6.3.2(3)", { f: 1 }),
    l("Flèche de l'arc", "r", (V, I) => [0.9 * I.tgm, 0.9 * I.tpm], "m", "0,9t − d", "(6.14)", { f: 3 }),
    l("Résistance parallèle aux joints", "fd,h", "cp_fdh", "N/mm²", "kpar·fd", "", { f: 3 }),
    l("Poussée de l'arc", "Nad", "@cp_Nad", "kN/m", "1,5·fd·t/10", "(6.15)", { f: 1 }),
    l("Résistance latérale de calcul", "qlat,d", "@cp_qlat", "kPa", "fd·(t/la)²", "(6.16)", { f: 1 }),
    l("Poussée maximale sur les tranches retenues", "pEd,max", "@cp_pv", "kPa", "tableau T-H2, tranches exclues retirées", "", { f: 1 }),
    l("Nombre de tranches exclues (pénétration)", "", "@cp_nex", "", "cadre béton requis si > 0", "", { f: 0 }),
    l("Conditions d'application", "", "@cp_vc", "", "angles harpés et la/t ≤ 25", "", t),
    l("Taux de la voûte", "", "@cp_r_v", "", "pEd,max/qlat,d"),
    l("Compression d'anneau sur le mur orthogonal", "σa", "@cp_sa", "kPa", "pEd·L/2/t orth.", "", { f: 1 }),
    l("Taux de l'anneau", "", "@cp_r_a", "", "σa/fd,h"),
    l("Verdict de la voûte", "", "@cp_v_v", "", "", "", tv),
  ]),
  S("10.6 Charge concentrée sous la dalle (§6.1.3)", [
    l("Vérification active", "", "cp_cact", "", "roue sur la dalle près du mur", "", t),
    l("Empreinte diffusée transversale", "a0'", "cp_a0d", "m", "a0 + 2·ec·tan θ", "", { f: 3 }),
    l("Empreinte diffusée longitudinale", "b0'", "cp_b0d", "m", "b0 + 2·ec·tan θ", "", { f: 3 }),
    l("Longueur d'appui sur le mur", "lb", "@cp_lb", "m", "min(a0', b0') + td, ≤ L", "", { f: 3 }),
    l("Aire chargée", "Ab", "@cp_Ab", "m²", "lb·t", "", { f: 4 }),
    l("Distance au bout du mur", "a1", "@cp_a1", "m", "charge centrée", "", { f: 3 }),
    l("Longueur efficace à mi-hauteur", "lefm", "@cp_lef", "m", "diffusion à 60°", "§6.1.3(3)", { f: 3 }),
    l("Facteur de majoration", "β", "@cp_beta", "", "(1 + 0,3a1/hc)(1,5 − 1,1Ab/Aef)", "(6.10)", { f: 3 }),
    l("Effort concentré de calcul", "NEdc", "@cp_Nc", "kN", "γQ·Pw + G sur lb", "", { f: 1 }),
    l("Résistance", "NRdc", "@cp_NRc", "kN", "β·Ab·fd", "(6.9)", { f: 1 }),
    l("Taux", "", "@cp_r_c"),
    l("Verdict", "", "@cp_v_c", "", "", "", tv),
  ]),
  S("10.7 Cisaillement aux liaisons (§6.2)", [
    l("Part verticale retenue", "k", "@cp_k", "", "1 si bande verticale, sinon kv", "", { f: 3 }),
    l("Effort tranchant en tête", "VEd,t", "@cp_Vt", "kN/m", "k·R1", "", { f: 1 }),
    l("Résistance en tête (C2)", "VRd,t", "@cp_VRt", "kN/m", "min(fvk0 + 0,4σd ; fvlt)/γM·t", "(6.13)", { f: 1 }),
    l("Effort tranchant en pied", "VEd,b", "@cp_Vb", "kN/m", "k·R2", "", { f: 1 }),
    l("Résistance en pied (C2)", "VRd,b", "@cp_VRb", "kN/m", "", "(6.13)", { f: 1 }),
    l("Taux", "", "@cp_r_s", "", "pied exclu si relevé béton"),
    l("Effort à transmettre au relevé", "", (V, I) => I.liaison === "Relevé béton" ? [V.cp_Vb_gm, V.cp_Vb_pm] : [0, 0], "kN/m", "", "", { f: 1 }),
    l("Verdict", "", "@cp_v_s", "", "", "", tv),
  ]),
  S("10.8 Soulèvement (EN 1997-1 §2.4.7.4), regard vide", [
    l("Profondeur de la sous-face du radier", "zb", "cp_zb", "m", "z2 + tr"),
    l("Poussée d'Archimède", "U", "cp_U", "kN", "γw·hw·Aext·Bext", "", { f: 1 }),
    l("Poids stabilisant", "G", "cp_G", "kN", "terres + dalle + murs + radier", "", { f: 1 }),
    l("Taux", "", "cp_r_u_gm", "", "1,0·U/(0,9·G)", "EN 1997-1 (2.8)"),
    l("Verdict", "", "cp_v_u", "", "", "", tv),
  ]),
  S("10.9 Phase provisoire C3 : remblai avant coulage de la dalle", [
    l("Moment en console à la base", "M3", "cp_M3", "kNm/m", "γG·(K·γ·hl³/6 + σc·hl²/2)"),
    l("Effort normal à la base", "N3", "@cp_N3", "kN/m", "1,0·γmaç·t·hl", "", { f: 1 }),
    l("Taux en console", "", "@cp_r3c", "", "(M3/N3)/(0,45t)"),
    l("Poussée maximale provisoire", "p3", "cp_p3", "kPa", "γG·(K·γ·hl + σc)", "", { f: 1 }),
    l("Taux en voûte provisoire", "", "@cp_r3v", "", "p3/qlat,d"),
    l("Verdict de la phase provisoire", "", "@cp_v3", "", "console OU voûte", "", tv),
  ]),
  S("Synthèse de la méthode complète", [
    l("Taux du chemin de charge", "", "@cp_r_path"),
    l("Taux déterminant", "", "@cp_rmax", "", "compression, chemin, concentrée, cisaillement"),
    l("Mécanisme gouvernant", "", "@cp_mech", "", "", "", t),
    l("Verdict", "", "@cp_v", "", "", "", tv),
  ]),
];

// Lignes de la feuille 6_Synthese : [libellé, référence, taux GM, taux PM, verdict GM, verdict PM]
export function syntheseRows(V, I) {
  const ok = r => r <= 1 ? "OK" : "NON VÉRIFIÉ";
  const c3 = w => I.c3 === "Oui" ? Math.min(V["cp_r3c_" + w], I.chemin === "Voûte horizontale" ? V["cp_r3v_" + w] : 99) : 0;
  return [
    ["Compression en tête et en pied (C1)", "§6.1.2", V.cp_r_comp_gm, V.cp_r_comp_pm, ok(V.cp_r_comp_gm), ok(V.cp_r_comp_pm)],
    ["Flexion composée à mi-hauteur (C1, C2)", "annexe G", Math.max(V.cp_r_m1_gm, V.cp_r_m2_gm), Math.max(V.cp_r_m1_pm, V.cp_r_m2_pm), V.cp_v_m_gm, V.cp_v_m_pm],
    ["Plaque sur quatre bords", "annexe E", V.cp_t5ok === "OUI" ? V.cp_r_pl_gm : 0, V.cp_t5ok === "OUI" ? V.cp_r_pl_pm : 0, V.cp_v_pl_gm, V.cp_v_pl_pm],
    ["Voûte horizontale et anneau", "§6.3.2", V.cp_vc_gm === "REMPLIES" ? Math.max(V.cp_r_v_gm, V.cp_r_a_gm) : 0, V.cp_vc_pm === "REMPLIES" ? Math.max(V.cp_r_v_pm, V.cp_r_a_pm) : 0, V.cp_v_v_gm, V.cp_v_v_pm],
    ["Charge concentrée sous la dalle", "§6.1.3", V.cp_r_c_gm, V.cp_r_c_pm, V.cp_v_c_gm, V.cp_v_c_pm],
    ["Cisaillement aux liaisons", "§6.2", V.cp_r_s_gm, V.cp_r_s_pm, V.cp_v_s_gm, V.cp_v_s_pm],
    ["Élancement", "§5.5.1.4", V.cp_lam_gm / 27, V.cp_lam_pm / 27, V.cp_vlam_gm, V.cp_vlam_pm],
    ["Phase provisoire C3", "", c3("gm"), c3("pm"), V.cp_v3_gm, V.cp_v3_pm],
    ["Soulèvement (regard vide)", "EN 1997-1", V.cp_r_u_gm, V.cp_r_u_pm, V.cp_v_u, V.cp_v_u],
  ];
}

export function hypotheses(V, I) {
  const n = (x, d) => fmt(x, d);
  return [
    ["Modèle de charge / position", `${I.mod} ; ${I.pos}`],
    ["Poussée du trafic adjacent / transmission", `${I.optlat} ; ${I.trans}`],
    ["Chemin de charge / portée de voûte", `${I.chemin} ; ${I.la}`],
    ["Matériaux", `${I.elem} ; ${I.mort} ; fd = ${n(V.fd, 2)} N/mm² ; γM = ${n(V.gam_M, 2)}`],
    ["Sol / nappe / compactage", `K = ${n(V.K_pou, 3)} ; nappe : ${I.nappe} ; compactage : ${I.comp}`],
    ["Géométrie", `a × b = ${n(+I.a, 2)} × ${n(+I.b, 2)} m ; hl = ${n(V.hl, 2)} m ; ec = ${n(V.ec, 2)} m ; t1 / t2 = ${n(+I.tgm, 2)} / ${n(+I.tpm, 2)} m`],
    ["Source unique / γQ", `${I.su} ; γQ = ${n(V.gam_Q, 2)}`],
  ];
}

// Au plus 3 decimales, sans zero inutile : « 0,5 » et non « 0,50 ».
export function fmt(x, d = 2) {
  if (typeof x !== "number") return x ?? "";
  if (!Number.isFinite(x)) return "—";
  return x.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: Math.min(d, 3), useGrouping: false });
}

// Taux de travail a deux decimales, arrondi VERS LE VERDICT : 0,999 s'affiche
// 0,99 (jamais « 1 » a cote d'un verdict favorable) et 1,001 s'affiche 1,01.
export function fmtTaux(r) {
  if (typeof r !== "number" || !Number.isFinite(r)) return fmt(r);
  const v = r <= 1 ? Math.floor(r * 100 + 1e-9) / 100 : Math.ceil(r * 100 - 1e-9) / 100;
  return fmt(v, 2);
}

export function resolve(line, V, I) {
  const { val } = line;
  if (typeof val === "function") return val(V, I);
  if (val.startsWith("@")) return [V[val.slice(1) + "_gm"], V[val.slice(1) + "_pm"]];
  return V[val];
}

export function verdictClass(s) {
  if (typeof s !== "string") return "";
  if (s.startsWith("OK") || s === "DANS LE DOMAINE" || s === "REMPLIES" || s === "OUI") return "ok";
  if (s === "SANS OBJET" || s === "NON APPLICABLE") return "na";
  if (s === "HORS DOMAINE" || s === "T5 NON RENSEIGNÉE" || s === "DÉCONSEILLÉ" || s === "NON REMPLIES") return "warn";
  return "bad";
}
