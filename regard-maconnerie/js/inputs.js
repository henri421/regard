// Définition des données d'entrée (feuille 0_Saisie du classeur).
// name = nom défini du classeur sans le préfixe « in_ » (sauf les données de sol, nommées sans préfixe).
// Champs : name, label, sym, unit, type (text|date|num|select), def (défaut), opts, note, ref, show (condition d'affichage)

export const GROUPS = [
  { id: "A", title: "A. Projet", fields: [
    { name: "projet", label: "Projet", type: "text", def: "Regard type (exemple)" },
    { name: "ref", label: "Référence", type: "text", def: "BE-2026-000" },
    { name: "ind", label: "Indice", type: "text", def: "A" },
    { name: "date", label: "Date du calcul", type: "date", def: "2026-10-15" },
    { name: "auteur", label: "Auteur", type: "text", def: "" },
  ]},
  { id: "B", title: "B. Géométrie", fields: [
    { name: "mode", label: "Mode de saisie de la géométrie", type: "select", opts: ["Dimensions", "Cotes"], def: "Dimensions" },
    { name: "a", label: "Longueur intérieure (grands murs)", sym: "a", unit: "m", type: "num", def: 1.50, note: "a ≥ b" },
    { name: "b", label: "Largeur intérieure (petits murs)", sym: "b", unit: "m", type: "num", def: 1.50 },
    { name: "tgm", label: "Épaisseur des grands murs", sym: "t1", unit: "m", type: "num", def: 0.24 },
    { name: "tpm", label: "Épaisseur des petits murs", sym: "t2", unit: "m", type: "num", def: 0.24 },
    { name: "td", label: "Épaisseur de la dalle supérieure", sym: "td", unit: "m", type: "num", def: 0.20 },
    { name: "tr", label: "Épaisseur du radier", sym: "tr", unit: "m", type: "num", def: 0.20 },
    { name: "at", label: "Ouverture du tampon, côté // a", sym: "at", unit: "m", type: "num", def: 0.60, note: "centrée, alignée" },
    { name: "bt", label: "Ouverture du tampon, côté // b", sym: "bt", unit: "m", type: "num", def: 0.60 },
    { name: "hl", label: "Hauteur libre intérieure", sym: "hl", unit: "m", type: "num", def: 2.50, show: v => v.mode !== "Cotes" },
    { name: "ec", label: "Recouvrement sur dalle", sym: "ec", unit: "m", type: "num", def: 0.30, note: "chaussée comprise", show: v => v.mode !== "Cotes" },
    { name: "ZTN", label: "Cote du terrain fini", sym: "ZTN", unit: "m NGL", type: "num", def: 300.00, show: v => v.mode === "Cotes" },
    { name: "Zd", label: "Cote du dessus de dalle", sym: "Zd", unit: "m NGL", type: "num", def: 299.70, show: v => v.mode === "Cotes" },
    { name: "Zr", label: "Cote du dessus de radier", sym: "Zr", unit: "m NGL", type: "num", def: 297.00, show: v => v.mode === "Cotes" },
  ]},
  { id: "C", title: "C. Sol", fields: [
    { name: "gam_sol", label: "Poids volumique du remblai", sym: "γ", unit: "kN/m³", type: "num", def: 20 },
    { name: "gam_dej", label: "Poids volumique déjaugé", sym: "γ'", unit: "kN/m³", type: "num", def: 10 },
    { name: "phi_sol", label: "Angle de frottement interne", sym: "φ'", unit: "°", type: "num", def: 30 },
    { name: "c_sol", label: "Cohésion (non exploitée en v1)", sym: "c'", unit: "kPa", type: "num", def: 0 },
    { name: "beta_sol", label: "Inclinaison du terrain", sym: "βs", unit: "°", type: "num", def: 0 },
    { name: "Kchoix", label: "Coefficient de poussée retenu", type: "select", opts: ["K0", "Ka"], def: "K0", note: "K0 : mur tenu par la dalle", ref: "EN 1997-1 §9.5" },
    { name: "comp", label: "Pression de compactage active", type: "select", opts: ["Non", "Oui"], def: "Non" },
    { name: "sigc", label: "Pression de compactage", sym: "σc", unit: "kPa", type: "num", def: 15, note: "uniforme sur la hauteur", show: v => v.comp === "Oui" },
  ]},
  { id: "D", title: "D. Nappe", fields: [
    { name: "nappe", label: "Présence d'une nappe", type: "select", opts: ["Non", "Oui"], def: "Non" },
    { name: "zw", label: "Profondeur de la nappe", sym: "zw", unit: "m", type: "num", def: 2.00, show: v => v.nappe === "Oui" && v.mode !== "Cotes" },
    { name: "Zn", label: "Cote de la nappe", sym: "Zw", unit: "m NGL", type: "num", def: 298.00, show: v => v.nappe === "Oui" && v.mode === "Cotes" },
  ]},
  { id: "E", title: "E. Matériaux", fields: [
    { name: "MX", label: "Classe d'exposition", type: "select", opts: ["MX1", "MX2", "MX3", "MX4", "MX5"], def: "MX3", ref: "EN 1996-2 annexe A" },
    { name: "elem", label: "Élément de maçonnerie", type: "select", opts: "elements", def: "BBP20-24" },
    { name: "mort", label: "Mortier", type: "select", opts: "mortiers", def: "M10-G" },
    { name: "cls", label: "Classe d'exécution", type: "select", opts: [1, 2, 3, 4, 5], def: 5, note: "fixe γM (T1)", ref: "EN 1996-1-1 Tab. 2.3" },
    { name: "gmac", label: "Poids volumique de la maçonnerie", sym: "γmaç", unit: "kN/m³", type: "num", def: 20 },
    { name: "ech", label: "Épaisseur de chaussée (comprise dans ec)", sym: "ech", unit: "m", type: "num", def: 0.10 },
    { name: "gch", label: "Poids volumique de la chaussée", sym: "γch", unit: "kN/m³", type: "num", def: 24 },
    { name: "liaison", label: "Liaison en pied de mur", type: "select", opts: ["Joint de mortier", "Relevé béton"], def: "Joint de mortier" },
  ]},
  { id: "F", title: "F. Options de calcul", fields: [
    { name: "chemin", label: "Chemin de charge retenu pour le verdict", type: "select", opts: ["Voûte horizontale", "Bande verticale", "Plaque"], def: "Voûte horizontale" },
    { name: "la", label: "Portée de la voûte horizontale", type: "select", opts: ["Entre axes", "Libre"], def: "Entre axes", note: "entre axes : prudent", ref: "EN 1996-1-1 §6.3.2" },
    { name: "harpe", label: "Angles harpés ou butées capables de la poussée", type: "select", opts: ["Oui", "Non"], def: "Oui", ref: "EN 1996-1-1 §6.3.2" },
    { name: "kpar", label: "Résistance parallèle / perpendiculaire aux joints", sym: "kpar", type: "num", def: 1.00, note: "1,0 pour éléments pleins" },
    { name: "pen", label: "Pénétration de canalisation", type: "select", opts: ["Aucune", "Grand mur", "Petit mur", "Les deux"], def: "Aucune", note: "tranches exclues de la voûte" },
    { name: "zp1", label: "Pénétration : profondeur du haut", sym: "zp1", unit: "m", type: "num", def: 1.50, show: v => v.pen !== "Aucune" },
    { name: "zp2", label: "Pénétration : profondeur du bas", sym: "zp2", unit: "m", type: "num", def: 1.90, show: v => v.pen !== "Aucune" },
    { name: "c3", label: "Vérifier la phase provisoire C3 (remblai avant dalle)", type: "select", opts: ["Oui", "Non"], def: "Oui" },
    { name: "su", label: "Principe de source unique", type: "select", opts: ["Non", "Oui"], def: "Non", note: "Oui : γG,sup aussi sur les terres stabilisantes", ref: "EN 1990 §6.4.3" },
  ]},
  { id: "G", title: "G. Chargement", fields: [
    { name: "mod", label: "Modèle de charge", type: "select", opts: ["SLW 60", "LM1", "Utilisateur"], def: "SLW 60", ref: "T8" },
    { name: "pos", label: "Position de la charge", type: "select", opts: ["À côté du regard", "Sur la dalle (hors tampon)", "Sur le tampon", "À cheval"], def: "À côté du regard" },
    { name: "optlat", label: "Poussée due au trafic adjacent", type: "select", opts: ["Surcharge équivalente", "Boussinesq"], def: "Surcharge équivalente", ref: "NAVFAC DM 7.02" },
    { name: "d", label: "Distance roue la plus proche / parement", sym: "d", unit: "m", type: "num", def: 0.50, show: v => v.optlat === "Boussinesq" },
    { name: "theta", label: "Angle de diffusion dans le recouvrement", sym: "θ", unit: "°", type: "num", def: 30, note: "30° pour un remblai" },
    { name: "trans", label: "Transmission de la dalle aux murs", type: "select", opts: ["Aires tributaires", "Charge linéaire saisie"], def: "Aires tributaires" },
    { name: "nroues", label: "Nombre de roues sur la dalle", sym: "nr", type: "num", def: 2, note: "positions sur dalle ou tampon" },
    { name: "qu", label: "Utilisateur : surcharge sur remblai", sym: "qu", unit: "kPa", type: "num", def: 10, show: v => v.mod === "Utilisateur" },
    { name: "P", label: "Utilisateur : charge ponctuelle par roue", sym: "P", unit: "kN", type: "num", def: 50, show: v => v.mod === "Utilisateur" },
    { name: "a0", label: "Utilisateur : empreinte transversale", sym: "a0", unit: "m", type: "num", def: 0.40, show: v => v.mod === "Utilisateur" },
    { name: "b0", label: "Utilisateur : empreinte longitudinale", sym: "b0", unit: "m", type: "num", def: 0.40, show: v => v.mod === "Utilisateur" },
    { name: "qd", label: "Utilisateur : charge répartie sur la dalle", sym: "qd", unit: "kPa", type: "num", def: 0, show: v => v.mod === "Utilisateur" },
    { name: "nugm", label: "Charge linéaire spéciale, grands murs (variable)", sym: "nu,1", unit: "kN/m", type: "num", def: 0, note: "s'ajoute à la transmission" },
    { name: "nupm", label: "Charge linéaire spéciale, petits murs (variable)", sym: "nu,2", unit: "kN/m", type: "num", def: 0, note: "s'ajoute à la transmission" },
    { name: "eu", label: "Excentricité de la charge linéaire spéciale", sym: "eu", unit: "m", type: "num", def: 0, note: "par rapport à l'axe du mur" },
  ]},
];

export const FIELDS = GROUPS.flatMap(g => g.fields);

export function defaultInputs() {
  const o = {};
  for (const f of FIELDS) o[f.name] = f.def;
  return o;
}

// Noms définis du classeur (sans préfixe in_) pour l'import xlsx
export const SOIL_NAMES = ["gam_sol", "gam_dej", "phi_sol", "c_sol", "beta_sol"];
