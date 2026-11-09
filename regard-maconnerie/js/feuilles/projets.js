// GENERE depuis aedificium-ui/src/projets.ts par _banc-local/copier-projets.mjs.
// Ne pas modifier a la main.
/**
 * Projets de la suite : arborescence, feuilles de calcul et heritage.
 *
 *     projet → dossiers libres → elements (reperes P1, M1…) → calculs (une app)
 *            → feuilles de calcul (F1, F2…)
 *
 * Une feuille est soit COMPLETE (`origine === null`, `donnees` = le JSON de
 * l'app), soit HERITEE d'une autre feuille du meme calcul : elle ne stocke
 * alors que ce qui differe (`surcharges`, chemin → valeur) et suit sa feuille
 * d'origine pour tout le reste. Changer le beton de la feuille 1 change donc
 * celui des feuilles qui en heritent, sauf celles qui l'ont surcharge.
 *
 * Ce module est pur (aucun acces au DOM ni au stockage) et sans import : le
 * hub, qui n'a pas de compilation, en charge une copie dont les types sont
 * retires (`_banc-local/copier-projets.mjs`). Pas d'enum, pas de propriete de
 * parametre : le retrait des types doit suffire.
 */

export const FORMAT_PROJET = 'aedificium-projet/1';

                                                                                       

                                                  

/** `alerte` : ni conforme ni refuse (incomplet, armatures requises...). */
                                                 

                          
             
              
                                                                               
                        
                                                                            
                         
                                                                       
                
                                                                                       
                                   
                                                                                 
                                                     
 

                         
                 
             
                                                                              
              
                                                                         
                  
              
                      
                                    
                 
 

                                
                  
             
              
                    
 

                          
                  
             
              
                   
 

                                            

                         
                               
             
              
               
                  
                   
 

/** Resume d'un projet, pour la liste des projets. */
                               
             
              
                  
 

                              
            
                 
           
               
                      
                  

/** Erreur metier ; `code` permet a l'interface de traduire le message. */
export class ErreurProjet extends Error {
  code                  ;
  constructor(code                  , message        ) {
    super(message);
    this.name = 'ErreurProjet';
    this.code = code;
  }
}

/* ------------------------------------------------------------------ */
/* Identifiants et dates                                              */
/* ------------------------------------------------------------------ */

let compteur = 0;

/** Identifiant stable : renommer ou deplacer un noeud ne le change pas. */
export function nouvelId()         {
  const c = (globalThis                                              ).crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  compteur += 1;
  return `id-${Date.now().toString(36)}-${compteur.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

const maintenant = ()         => new Date().toISOString();

/* ------------------------------------------------------------------ */
/* Chemins JSON et differences                                        */
/* ------------------------------------------------------------------ */

/** Marque d'un champ present a l'origine et retire dans la feuille heritee. */
export const SUPPRIME       = { '~supprime': true };

const estSupprime = (v      )          =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && Object.keys(v).length === 1 && v['~supprime'] === true;

const estObjet = (v                  )                               =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Chemin d'un champ : cles jointes par `/` (`~` et `/` echappes comme en JSON Pointer). */
export function chemin(cles                   )         {
  return cles.map((c) => c.replace(/~/g, '~0').replace(/\//g, '~1')).join('/');
}

export function clesDuChemin(c        )           {
  return c === '' ? [] : c.split('/').map((k) => k.replace(/~1/g, '/').replace(/~0/g, '~'));
}

export function copie                (v   )    {
  return JSON.parse(JSON.stringify(v))     ;
}

/**
 * Feuilles de l'arbre JSON, par chemin. Les tableaux et les objets vides sont
 * des valeurs entieres : une liste de bandes de charge se surcharge d'un bloc.
 */
export function aplatir(v      , prefixe           = [], sortie                    = new Map())                    {
  if (estObjet(v) && Object.keys(v).length > 0) {
    for (const [k, x] of Object.entries(v)) aplatir(x, [...prefixe, k], sortie);
  } else {
    sortie.set(chemin(prefixe), v);
  }
  return sortie;
}

const egaux = (a      , b      )          => JSON.stringify(a) === JSON.stringify(b);

/** Ce qui differe de `base` dans `v` : champs changes ou ajoutes, et champs retires. */
export function difference(base      , v      )                       {
  const a = aplatir(base);
  const b = aplatir(v);
  const d                       = {};
  for (const [c, x] of b) {
    if (!a.has(c) || !egaux(a.get(c)        , x)) d[c] = copie(x);
  }
  for (const c of a.keys()) {
    if (!b.has(c)) d[c] = copie(SUPPRIME);
  }
  return d;
}

function poser(racine      , cles          , valeur      )       {
  if (cles.length === 0) return copie(valeur);
  const o                          = estObjet(racine) ? racine : {};
  const [tete, ...reste] = cles;
  o[tete] = poser(o[tete] ?? null, reste, valeur);
  return o;
}

function retirer(racine      , cles          )       {
  if (cles.length === 0) return null;
  if (!estObjet(racine)) return racine;
  const [tete, ...reste] = cles;
  if (!(tete in racine)) return racine;
  if (reste.length === 0) delete racine[tete];
  else racine[tete] = retirer(racine[tete], reste);
  return racine;
}

/** Recompose une feuille : copie de la base, retraits d'abord, puis valeurs posees. */
export function appliquer(base      , surcharges                      )       {
  let r = copie(base);
  const entrees = Object.entries(surcharges);
  for (const [c, v] of entrees) if (estSupprime(v)) r = retirer(r, clesDuChemin(c));
  for (const [c, v] of entrees) if (!estSupprime(v)) r = poser(r, clesDuChemin(c), v);
  return r;
}

/* ------------------------------------------------------------------ */
/* Projet et arborescence                                             */
/* ------------------------------------------------------------------ */

export function creerProjet(nom        )         {
  const t = maintenant();
  return { format: FORMAT_PROJET, id: nouvelId(), nom, cree: t, modifie: t, enfants: [] };
}

export function toucher(p        )       {
  p.modifie = maintenant();
}

                 
               
                 
                         
 

/** Dossier ou element, et la liste qui le contient. */
export function trouverNoeud(p        , id        )               {
  const chercher = (liste         , parent                )               => {
    for (const n of liste) {
      if (n.id === id) return { noeud: n, liste, parent };
      if (n.type === 'dossier') {
        const r = chercher(n.enfants, n);
        if (r) return r;
      }
    }
    return null;
  };
  return chercher(p.enfants, null);
}

/** Tous les elements du projet, dans l'ordre de l'arbre. */
export function elements(p        )                  {
  const r                  = [];
  const parcourir = (l         )       => {
    for (const n of l) {
      if (n.type === 'element') r.push(n);
      else parcourir(n.enfants);
    }
  };
  parcourir(p.enfants);
  return r;
}

export function trouverCalcul(p        , id        )                                                    {
  for (const e of elements(p)) {
    const c = e.calculs.find((x) => x.id === id);
    if (c) return { calcul: c, element: e };
  }
  return null;
}

/** Noms du dossier racine jusqu'au noeud (fil d'Ariane), noeud compris. */
export function cheminDuNoeud(p        , id        )           {
  const descendre = (liste         , acc          )                  => {
    for (const n of liste) {
      if (n.id === id) return [...acc, n.nom];
      if (n.type === 'dossier') {
        const r = descendre(n.enfants, [...acc, n.nom]);
        if (r) return r;
      } else {
        const c = n.calculs.find((x) => x.id === id);
        if (c) return [...acc, n.nom, c.nom];
      }
    }
    return null;
  };
  return descendre(p.enfants, []) ?? [];
}

function listeDuParent(p        , parentId               )          {
  if (parentId === null) return p.enfants;
  const place = trouverNoeud(p, parentId);
  if (!place || place.noeud.type !== 'dossier') {
    throw new ErreurProjet('introuvable', `Dossier introuvable : ${parentId}`);
  }
  return place.noeud.enfants;
}

export function ajouterDossier(p        , parentId               , nom        )          {
  const d          = { type: 'dossier', id: nouvelId(), nom, enfants: [] };
  listeDuParent(p, parentId).push(d);
  toucher(p);
  return d;
}

export function ajouterElement(p        , parentId               , nom        )                {
  const e                = { type: 'element', id: nouvelId(), nom, calculs: [] };
  listeDuParent(p, parentId).push(e);
  toucher(p);
  return e;
}

/** Nouveau calcul d'un element, avec une premiere feuille complete. */
export function ajouterCalcul(
  p        ,
  elementId        ,
  app                                               ,
  donnees      ,
  nomFeuille = 'Feuille 1'
)         {
  const place = trouverNoeud(p, elementId);
  if (!place || place.noeud.type !== 'element') {
    throw new ErreurProjet('introuvable', `Élément introuvable : ${elementId}`);
  }
  const f          = { id: nouvelId(), nom: nomFeuille, statut: 'justifier', origine: null, donnees: copie(donnees), surcharges: {} };
  const c         = { type: 'calcul', id: nouvelId(), app: app.app, adresse: app.adresse, nom: app.nom, feuilles: [f], active: f.id };
  place.noeud.calculs.push(c);
  toucher(p);
  return c;
}

/** Renomme un dossier, un element, un calcul ou une feuille. */
export function renommer(p        , id        , nom        )       {
  const place = trouverNoeud(p, id);
  if (place) {
    place.noeud.nom = nom;
    toucher(p);
    return;
  }
  for (const e of elements(p)) {
    for (const c of e.calculs) {
      if (c.id === id) {
        c.nom = nom;
        toucher(p);
        return;
      }
      const f = c.feuilles.find((x) => x.id === id);
      if (f) {
        f.nom = nom;
        toucher(p);
        return;
      }
    }
  }
  throw new ErreurProjet('introuvable', `Introuvable : ${id}`);
}

function contient(n       , id        )          {
  return n.type === 'dossier' && n.enfants.some((x) => x.id === id || contient(x, id));
}

/** Deplace un dossier ou un element vers un dossier (null : racine), a la position `index`. */
export function deplacer(p        , id        , versParentId               , index         )       {
  const place = trouverNoeud(p, id);
  if (!place) throw new ErreurProjet('introuvable', `Introuvable : ${id}`);
  if (versParentId === id || (versParentId !== null && contient(place.noeud, versParentId))) {
    throw new ErreurProjet('deplacement', 'Un dossier ne peut pas entrer dans lui-même ni dans un de ses sous-dossiers.');
  }
  const cible = listeDuParent(p, versParentId);
  place.liste.splice(place.liste.indexOf(place.noeud), 1);
  const i = index === undefined ? cible.length : Math.max(0, Math.min(index, cible.length));
  cible.splice(i, 0, place.noeud);
  toucher(p);
}

/** Supprime un dossier (avec son contenu), un element ou un calcul. */
export function supprimerNoeud(p        , id        )       {
  const place = trouverNoeud(p, id);
  if (place) {
    place.liste.splice(place.liste.indexOf(place.noeud), 1);
    toucher(p);
    return;
  }
  const t = trouverCalcul(p, id);
  if (!t) throw new ErreurProjet('introuvable', `Introuvable : ${id}`);
  t.element.calculs.splice(t.element.calculs.indexOf(t.calcul), 1);
  toucher(p);
}

/** Copie d'un calcul avec de nouveaux identifiants ; l'heritage interne suit. */
function copierCalcul(c        )         {
  const nouveaux = new Map(c.feuilles.map((f) => [f.id, nouvelId()]));
  const feuilles            = c.feuilles.map((f) => ({
    ...(JSON.parse(JSON.stringify(f))           ),
    id: nouveaux.get(f.id)          ,
    origine: f.origine === null ? null : (nouveaux.get(f.origine) ?? null),
  }));
  return { ...c, id: nouvelId(), feuilles, active: nouveaux.get(c.active) ?? feuilles[0].id };
}

function copierNoeud(n       )        {
  if (n.type === 'element') return { type: 'element', id: nouvelId(), nom: n.nom, calculs: n.calculs.map(copierCalcul) };
  return { type: 'dossier', id: nouvelId(), nom: n.nom, enfants: n.enfants.map(copierNoeud) };
}

/**
 * Duplique un dossier, un element (avec tous ses calculs) ou un calcul, juste
 * apres l'original. La copie est independante de l'original.
 */
export function dupliquer(p        , id        , suffixe = ' (copie)')         {
  const place = trouverNoeud(p, id);
  if (place) {
    const n = copierNoeud(place.noeud);
    n.nom += suffixe;
    place.liste.splice(place.liste.indexOf(place.noeud) + 1, 0, n);
    toucher(p);
    return n.id;
  }
  const t = trouverCalcul(p, id);
  if (!t) throw new ErreurProjet('introuvable', `Introuvable : ${id}`);
  const c = copierCalcul(t.calcul);
  c.nom += suffixe;
  t.element.calculs.splice(t.element.calculs.indexOf(t.calcul) + 1, 0, c);
  toucher(p);
  return c.id;
}

/* ------------------------------------------------------------------ */
/* Feuilles de calcul et heritage                                     */
/* ------------------------------------------------------------------ */

export function trouverFeuille(c        , id        )          {
  const f = c.feuilles.find((x) => x.id === id);
  if (!f) throw new ErreurProjet('introuvable', `Feuille introuvable : ${id}`);
  return f;
}

/** JSON complet d'une feuille, origine et surcharges recomposees. */
export function donneesDeFeuille(c        , id        )       {
  const vus = new Set        ();
  const recomposer = (fid        )       => {
    if (vus.has(fid)) throw new ErreurProjet('cycle', 'Héritage circulaire entre feuilles.');
    vus.add(fid);
    const f = trouverFeuille(c, fid);
    return f.origine === null ? copie(f.donnees) : appliquer(recomposer(f.origine), f.surcharges);
  };
  return recomposer(id);
}

/**
 * Enregistre le JSON complet saisi dans une feuille. Une feuille heritee n'en
 * garde que la difference avec son origine.
 */
export function ecrireFeuille(c        , id        , donnees      )       {
  const f = trouverFeuille(c, id);
  if (f.origine === null) f.donnees = copie(donnees);
  else f.surcharges = difference(donneesDeFeuille(c, f.origine), donnees);
}

/** Chemins des champs propres a une feuille heritee (vide pour une feuille complete). */
export function champsSurcharges(c        , id        )           {
  return Object.keys(trouverFeuille(c, id).surcharges);
}

/** Nom libre suivant : « Feuille 2 », « Feuille 3 »… (`Sheet` en anglais). */
function nomSuivant(c        , prefixe        )         {
  let n = c.feuilles.length + 1;
  const pris = new Set(c.feuilles.map((f) => f.nom));
  while (pris.has(`${prefixe} ${n}`)) n += 1;
  return `${prefixe} ${n}`;
}

/**
 * Duplique une feuille, juste apres elle. `liee` (par defaut) : la copie herite
 * de la feuille dupliquee ; sinon c'est une copie complete et independante.
 */
export function dupliquerFeuille(c        , id        , liee = true, prefixe = 'Feuille')          {
  const src = trouverFeuille(c, id);
  const f          = liee
    ? { id: nouvelId(), nom: nomSuivant(c, prefixe), statut: src.statut, origine: src.id, donnees: null, surcharges: {} }
    : { id: nouvelId(), nom: nomSuivant(c, prefixe), statut: src.statut, origine: null, donnees: donneesDeFeuille(c, id), surcharges: {} };
  c.feuilles.splice(c.feuilles.indexOf(src) + 1, 0, f);
  c.active = f.id;
  return f;
}

/** Fait d'une feuille heritee une copie complete : elle ne suit plus son origine. */
export function detacherFeuille(c        , id        )       {
  const f = trouverFeuille(c, id);
  if (f.origine === null) return;
  f.donnees = donneesDeFeuille(c, id);
  f.origine = null;
  f.surcharges = {};
}

/** Rend a des champs (et a leurs sous-champs) la valeur de la feuille d'origine. */
export function revenirAOrigine(c        , id        , chemins                   )       {
  const f = trouverFeuille(c, id);
  for (const k of Object.keys(f.surcharges)) {
    if (chemins.some((x) => k === x || k.startsWith(`${x}/`))) delete f.surcharges[k];
  }
}

/** Feuilles qui heritent directement de `id`. */
export function heritiers(c        , id        )            {
  return c.feuilles.filter((f) => f.origine === id);
}

/** Refuse de supprimer la derniere feuille, ou une feuille dont d'autres heritent. */
export function supprimerFeuille(c        , id        )       {
  const f = trouverFeuille(c, id);
  if (c.feuilles.length === 1) throw new ErreurProjet('derniere-feuille', 'Un calcul garde au moins une feuille.');
  const h = heritiers(c, id);
  if (h.length > 0) {
    throw new ErreurProjet(
      'heritiers',
      `Des feuilles héritent de « ${f.nom} » (${h.map((x) => x.nom).join(', ')}) : détachez-les d'abord.`
    );
  }
  c.feuilles.splice(c.feuilles.indexOf(f), 1);
  if (c.active === id) c.active = c.feuilles[0].id;
}

export function definirStatut(c        , id        , statut               )       {
  trouverFeuille(c, id).statut = statut;
}

/* ------------------------------------------------------------------ */
/* Fichier de projet                                                  */
/* ------------------------------------------------------------------ */

export function exporterProjet(p        )         {
  return JSON.stringify(p, null, 2);
}

const texte = (v         )              => typeof v === 'string';

function controlerFeuille(f         )               {
  if (typeof f !== 'object' || f === null) return false;
  const o = f                           ;
  return (
    texte(o.id) &&
    texte(o.nom) &&
    (o.statut === 'justifier' || o.statut === 'etude') &&
    (o.origine === null || texte(o.origine)) &&
    typeof o.surcharges === 'object' &&
    o.surcharges !== null
  );
}

function controlerNoeud(n         )          {
  if (typeof n !== 'object' || n === null) return false;
  const o = n                           ;
  if (!texte(o.id) || !texte(o.nom)) return false;
  if (o.type === 'dossier') return Array.isArray(o.enfants) && o.enfants.every(controlerNoeud);
  if (o.type !== 'element' || !Array.isArray(o.calculs)) return false;
  return o.calculs.every((c) => {
    if (typeof c !== 'object' || c === null) return false;
    const k = c                           ;
    if (!texte(k.id) || !texte(k.app) || !texte(k.nom) || !Array.isArray(k.feuilles) || k.feuilles.length === 0) return false;
    if (!k.feuilles.every(controlerFeuille)) return false;
    const ids = new Set((k.feuilles             ).map((f) => f.id));
    return (k.feuilles             ).every((f) => f.origine === null || ids.has(f.origine));
  });
}

/** Relit un fichier de projet ; refuse net un format inconnu ou un arbre incoherent. */
export function importerProjet(contenu        )         {
  let brut         ;
  try {
    brut = JSON.parse(contenu);
  } catch {
    throw new ErreurProjet('format', 'Fichier illisible : ce n’est pas du JSON.');
  }
  const o = brut                           ;
  if (typeof o !== 'object' || o === null || o.format !== FORMAT_PROJET) {
    throw new ErreurProjet('format', `Format inconnu : ${JSON.stringify(o?.format)} (attendu ${FORMAT_PROJET}).`);
  }
  if (!texte(o.id) || !texte(o.nom) || !Array.isArray(o.enfants) || !o.enfants.every(controlerNoeud)) {
    throw new ErreurProjet('format', 'Fichier de projet incomplet ou incohérent.');
  }
  const p = brut          ;
  for (const e of elements(p)) {
    for (const c of e.calculs) {
      if (!texte(c.adresse)) c.adresse = '';
      if (!c.feuilles.some((f) => f.id === c.active)) c.active = c.feuilles[0].id;
      for (const f of c.feuilles) donneesDeFeuille(c, f.id); // detecte les cycles
    }
  }
  if (!texte(p.cree)) p.cree = maintenant();
  if (!texte(p.modifie)) p.modifie = p.cree;
  return p;
}

/** Empreinte courte des donnees d'une feuille : sert a reperer un verdict perime. */
function empreinte(c        , id        )         {
  let h = 5381;
  for (const car of JSON.stringify(donneesDeFeuille(c, id))) h = (h * 33 + car.charCodeAt(0)) >>> 0;
  return h.toString(36);
}

/** Enregistre le verdict que l'app vient de calculer ; `null` l'efface. */
export function definirVerdict(c        , id        , etat                    )       {
  const f = trouverFeuille(c, id);
  if (etat === null) delete f.verdict;
  else f.verdict = { etat, empreinte: empreinte(c, id) };
}

/**
 * Verdict d'une feuille. `perime` : ses donnees ont change depuis le calcul,
 * typiquement parce que la feuille d'origine a ete modifiee ; il faut rouvrir
 * la feuille pour le recalculer. Un verdict perime n'est jamais montre comme valable.
 */
export function verdictDeFeuille(c        , id        )                                {
  const f = trouverFeuille(c, id);
  if (!f.verdict) return null;
  return f.verdict.empreinte === empreinte(c, id) ? f.verdict.etat : 'perime';
}

/** Pire verdict des feuilles a justifier d'un calcul (les etudes ne comptent pas). */
export function verdictDuCalcul(c        )                                {
  const vus = c.feuilles.filter((f) => f.statut === 'justifier').map((f) => verdictDeFeuille(c, f.id));
  return (['ko', 'perime', 'alerte', 'ok']         ).find((v) => vus.includes(v)) ?? null;
}
