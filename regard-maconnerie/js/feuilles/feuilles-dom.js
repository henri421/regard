// GENERE depuis aedificium-ui/src/feuilles-dom.ts par _banc-local/copier-projets.mjs.
// Ne pas modifier a la main.
/**
 * Barre des feuilles de calcul, commune a toutes les apps (etape 9.5).
 *
 * L'app fournit trois fonctions : lire son etat en JSON, le recharger, et
 * (facultatif) le libelle d'un champ. La barre fait le reste :
 *
 * - ouverte depuis le hub (`?projet=…&calcul=…&feuille=…`), elle affiche le
 *   chemin du calcul et ses feuilles (F1, F2…), et enregistre chaque saisie
 *   dans la feuille courante ; une feuille heritee n'en garde que ce qui
 *   differe de son origine ;
 * - ouverte hors projet, elle propose « Ranger dans un projet… ».
 *
 * Le projet est relu avant chaque ecriture : le hub ou un autre onglet a pu le
 * modifier entre-temps.
 */

import { langueCourante } from './langue.js';
import {
  ErreurProjet,
  ajouterCalcul,
  ajouterElement,
  champsSurcharges,
  cheminDuNoeud,
  clesDuChemin,
  creerProjet,
  definirStatut,
  detacherFeuille,
  donneesDeFeuille,
  dupliquerFeuille,
  definirVerdict,
  verdictDeFeuille,
  ecrireFeuille,
                   
  elements,
  renommer,
  revenirAOrigine,
  supprimerFeuille,
  toucher,
  trouverCalcul,
  trouverFeuille,
              
            
              
} from './projets.js';
import { depotParDefaut,                   } from './projets-stockage.js';

                                  
                                                              
              
                              
                 
                                                                   
                         
                                                      
               
                                                                                  
                                      
                                                                            
                                   
                                                                                 
                                    
                                                                              
                                 
                                           
                      
                       
                                                              
                 
 

                                
                                                                              
                   
                                                            
                          
                                                       
                               
 

const T = (fr        , en        )         => (langueCourante() === 'en' ? en : fr);

const ech = (s        )         =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]          );

const STYLE = `
.af-barre{font-family:var(--sans,system-ui,sans-serif);font-size:13px;border:1px solid var(--bordure,#c8c6c0);
  border-radius:var(--rayon,4px);background:var(--surface,#fff);padding:8px 10px;margin:0 0 12px}
.af-chemin{color:var(--texte-faible,#6a6862);font-size:12px;margin-bottom:6px}
.af-chemin{display:flex;flex-wrap:wrap;gap:4px 12px;align-items:center;justify-content:space-between}
.af-chemin a{color:var(--accent,#1e5aa8)}
.af-aller{display:flex;gap:6px;align-items:center}
.af-aller select{font:inherit;font-size:12px;padding:2px 4px;border:1px solid var(--bordure,#c8c6c0);border-radius:var(--rayon-petit,3px);max-width:280px}
.af-onglets{display:flex;flex-wrap:wrap;gap:4px;align-items:center}
.af-onglet{font:inherit;padding:4px 10px;border:1px solid var(--bordure,#c8c6c0);border-radius:var(--rayon-petit,3px);
  background:var(--surface-appui,#f2f1ec);color:var(--texte,#1a1a1a);cursor:pointer;display:inline-flex;gap:6px;align-items:baseline}
.af-onglet[aria-selected="true"]{background:var(--accent-doux,#eaf1f9);border-color:var(--accent,#1e5aa8);font-weight:600}
.af-onglet .af-origine{color:var(--texte-faible,#6a6862);font-weight:400;font-size:11px}
.af-onglet.af-etude{font-style:italic}
.af-pastille{display:inline-block;min-width:1.2em;margin-right:4px;font-weight:700;text-align:center}
.af-v-ok{color:var(--ok,#2e7d4f)}.af-v-alerte{color:var(--alerte,#b26a00)}.af-v-ko{color:var(--refus,#b3261e)}.af-v-perime{color:var(--texte-faible,#6a6862)}
.af-actions{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}
.af-actions button,.af-dialogue button{font:inherit;font-size:12px;padding:3px 9px;border:1px solid var(--bordure,#c8c6c0);
  border-radius:var(--rayon-petit,3px);background:var(--surface,#fff);color:var(--texte,#1a1a1a);cursor:pointer}
.af-actions button:hover,.af-onglet:hover{background:var(--accent-doux,#eaf1f9)}
.af-actions .af-danger{color:var(--refus,#a52121)}
.af-statut{font-size:11px;padding:0 6px;border-radius:var(--rayon-petit,3px);background:var(--ok-fond,#eaf4ee);color:var(--ok,#1f6f3f)}
.af-statut.af-etude{background:var(--surface-appui,#f2f1ec);color:var(--texte-doux,#4a4842)}
.af-propres{margin-top:6px;color:var(--texte-doux,#4a4842)}
.af-propres button{font:inherit;font-size:12px;border:0;background:none;color:var(--accent,#1e5aa8);cursor:pointer;padding:0 2px}
.af-hors{display:flex;flex-wrap:wrap;gap:8px;align-items:center;color:var(--texte-doux,#4a4842)}
.af-dialogue{border:1px solid var(--bordure,#c8c6c0);border-radius:var(--rayon,4px);padding:14px 16px;
  max-width:min(420px,calc(100vw - 32px));font-family:var(--sans,system-ui,sans-serif);font-size:13px}
.af-dialogue::backdrop{background:rgba(26,26,26,.25)}
.af-dialogue label{display:flex;flex-direction:column;gap:4px;margin:0 0 10px}
.af-dialogue [hidden]{display:none}
.af-dialogue input,.af-dialogue select{font:inherit;padding:5px 7px;border:1px solid var(--bordure,#c8c6c0);border-radius:var(--rayon-petit,3px)}
.af-dialogue .af-boutons{display:flex;justify-content:flex-end;gap:6px}
.af-dialogue .af-principal{background:var(--accent,#1e5aa8);border-color:var(--accent,#1e5aa8);color:#fff}
.af-propre{box-shadow:inset 3px 0 0 var(--accent,#1e5aa8);background:var(--accent-doux,#eaf1f9)}
`;

function injecterStyle(doc          )       {
  if (doc.getElementById('af-style')) return;
  const s = doc.createElement('style');
  s.id = 'af-style';
  s.textContent = STYLE;
  doc.head.appendChild(s);
}

/** Boite modale ; « Annuler » n'est pas un bouton d'envoi (Entree valide toujours). */
function boite(doc          , html        )                    {
  const d = doc.createElement('dialog');
  d.className = 'af-dialogue';
  d.innerHTML = html;
  doc.body.appendChild(d);
  d.addEventListener('close', () => d.remove());
  for (const b of d.querySelectorAll('[data-fermer]')) b.addEventListener('click', () => d.close('non'));
  d.showModal();
  return d;
}

const ANNULER = ()         => `<button type="button" data-fermer>${T('Annuler', 'Cancel')}</button>`;

function demander(doc          , titre        , valeur        )                         {
  return new Promise((ok) => {
    const d = boite(
      doc,
      `<form method="dialog"><label>${ech(titre)}<input name="v" value="${ech(valeur)}" required></label>
       <div class="af-boutons">${ANNULER()}<button value="oui" class="af-principal">${T('Valider', 'OK')}</button></div></form>`
    );
    const champ = d.querySelector('input')                    ;
    champ.select();
    d.addEventListener('close', () => ok(d.returnValue === 'oui' && champ.value.trim() ? champ.value.trim() : null));
  });
}

function signaler(doc          , message        )       {
  boite(doc, `<form method="dialog"><p>${ech(message)}</p><div class="af-boutons"><button class="af-principal">OK</button></div></form>`);
}

function messageDErreur(e         )         {
  if (!(e instanceof ErreurProjet)) return String((e         )?.message ?? e);
  if (langueCourante() !== 'en') return e.message;
  const en                         = {
    format: 'Unknown or inconsistent project file.',
    introuvable: 'Item not found (deleted in another tab?).',
    cycle: 'Circular inheritance between sheets.',
    heritiers: 'Other sheets inherit from this one: detach them first.',
    'derniere-feuille': 'A calculation keeps at least one sheet.',
    deplacement: 'A folder cannot go into itself or one of its subfolders.',
  };
  return en[e.code] ?? e.message;
}

/** Libelle par defaut : le chemin, cles separees par « › ». */
const pastille = (v                               )         => {
  if (v === null) return '';
  const fr = { ok: 'Vérifié', alerte: 'À examiner', ko: 'Non vérifié', perime: 'À recalculer : données modifiées' }[v];
  const en = { ok: 'Verified', alerte: 'To review', ko: 'Not verified', perime: 'To recompute: data changed' }[v];
  const langue = document.documentElement.lang.startsWith('en') ? en : fr;
  return `<span class="af-pastille af-v-${v}" title="${langue}" aria-label="${langue}">${{ ok: '✓', alerte: '!', ko: '✗', perime: '↻' }[v]}</span>`;
};

const libelleBrut = (c        )         => clesDuChemin(c).join(' › ');

/**
 * Libelle d'un champ lu sur la page : le texte du <label> du champ
 * [data-champ] ou [data-fixe] de la derniere cle du chemin, ou son aria-label ; une liste [data-liste] prend le titre de son cadre. Chaine vide si le
 * champ n'est pas a l'ecran. Suit donc la langue de la page sans table a tenir.
 */
const VERDICTS_KO = ['depasse', 'non-ok', 'refus', 'verdict-non-conforme', 'verdict-refus', 'verdict-impossible', 'verdict-instable'];
const VERDICTS_OK = ['ok', 'verdict-conforme', 'verdict-ok', 'verdict-sans-armatures'];

/**
 * Verdict affiche par l'app, lu sur la page : le pire de ses cartes `.verdict`.
 * Rend `null` s'il n'y a rien a conclure, notamment quand une erreur ou un avis
 * « resultat perime » est visible : l'ecran garde alors l'ancien resultat, qui
 * ne doit pas passer pour le verdict de la saisie courante. Une classe de
 * verdict inconnue compte comme une alerte, jamais comme un succes.
 */
export function verdictDepuisPage(doc                                    )                     {
  const visibles = (sel        )            => Array.from(doc.querySelectorAll(sel)).filter((e) => !e.closest('[hidden]'));
  const alarme = visibles('.erreur,[data-role^="erreur"],[data-role="perime"]');
  if (alarme.some((e) => (e.textContent ?? '').trim() !== '')) return null;
  let pire                     = null;
  for (const e of visibles('.verdict')) {
    const classes = Array.from(e.classList).filter((c) => c !== 'verdict' && c !== 'bloc');
    if (classes.includes('constat')) continue;
    if (classes.some((c) => VERDICTS_KO.includes(c))) return 'ko';
    const favorable = classes.length === 0 || classes.some((c) => VERDICTS_OK.includes(c));
    if (!favorable) pire = 'alerte';
    else pire ??= 'ok';
  }
  return pire;
}

export function libelleDepuisPage(chemin        , doc                                 )         {
  const cle = clesDuChemin(chemin).at(-1) ?? '';
  const q = cle.replace(/["\\]/g, '\\$&');
  const champ = doc.querySelector(`[data-champ="${q}"],[data-fixe="${q}"]`);
  // Une liste (segments, charges...) se nomme par le titre de son cadre.
  const liste = champ ? null : doc.querySelector(`[data-liste="${q}"]`);
  const texte = champ
    ? (champ.closest('label')?.querySelector('span')?.textContent ?? champ.getAttribute('aria-label') ?? '')
    : (liste?.closest('fieldset')?.querySelector('legend')?.textContent ?? '');
  return texte.replace(/\s+/g, ' ').trim();
}

export function brancherFeuilles(o                 )                {
  const doc = o.conteneur.ownerDocument;
  const fen = doc.defaultView          ;
  const depot = o.depot ?? depotParDefaut();
  const delai = o.delai ?? 400;
  const hub =
    o.adresseHub ??
    new URL(`../WebAedificium/${langueCourante() === 'en' ? 'en/' : ''}`, fen.location.href.split(/[?#]/)[0].replace(/\/en\/[^/]*$/, '/')).href;
  injecterStyle(doc);

  const params = new URLSearchParams(fen.location.search);
  let projetId = params.get('projet');
  let calculId = params.get('calcul');
  let feuilleId = params.get('feuille');
  let projet                = null;
  let minuterie                                       = null;
  // Tant que la feuille n'est pas chargee, la saisie affichee n'est pas la
  // sienne : rien ne doit l'enregistrer dedans.
  let pret = false;
  // Derniere saisie enregistree : rien n'est reecrit tant qu'elle ne change pas
  // (une app qui redessine souvent, comme MBT, signale a chaque trace).
  let dernierEcrit = '';

  const calcul = ()                => (projet && calculId ? (trouverCalcul(projet, calculId)?.calcul ?? null) : null);

  function majAdresse()       {
    const u = new URL(fen.location.href);
    if (projetId && calculId && feuilleId) {
      u.searchParams.set('projet', projetId);
      u.searchParams.set('calcul', calculId);
      u.searchParams.set('feuille', feuilleId);
    } else {
      for (const k of ['projet', 'calcul', 'feuille']) u.searchParams.delete(k);
    }
    fen.history.replaceState(null, '', u.href);
  }

  /** Relit le projet, applique `fn`, enregistre, redessine. */
  async function modifier(fn                                )                   {
    try {
      if (!projetId || !calculId) return false;
      const frais = await depot.lire(projetId);
      if (!frais) throw new ErreurProjet('introuvable', T('Projet introuvable dans ce navigateur.', 'Project not found in this browser.'));
      projet = frais;
      const c = calcul();
      if (!c) throw new ErreurProjet('introuvable', T('Calcul introuvable dans le projet.', 'Calculation not found in the project.'));
      fn(projet, c);
      toucher(projet);
      await depot.ecrire(projet);
      dessiner();
      return true;
    } catch (e) {
      signaler(doc, messageDErreur(e));
      return false;
    }
  }

  async function enregistrer()                {
    if (minuterie !== null) {
      clearTimeout(minuterie);
      minuterie = null;
    }
    if (!feuilleId || !pret) return;
    const fid = feuilleId;
    const donnees = o.lire();
    const verdict = o.verdict ? o.verdict() : verdictDepuisPage(doc);
    const texte = `${fid}:${JSON.stringify(donnees)}:${verdict}`;
    if (texte === dernierEcrit) return;
    const ok = await modifier((_p, c) => {
      ecrireFeuille(c, fid, donnees);
      definirVerdict(c, fid, verdict);
    });
    if (ok) dernierEcrit = texte;
  }

  function chargerFeuille()       {
    const c = calcul();
    if (!c || !feuilleId) return;
    const d = donneesDeFeuille(c, feuilleId);
    dernierEcrit = `${feuilleId}:${JSON.stringify(d)}:${verdictDeFeuille(c, feuilleId)}`;
    o.charger(d);
  }

  /** Les autres calculs du projet, toutes apps confondues, pour y aller d'un clic. */
  function menuAutresCalculs(p        , actuel        )         {
    const options = elements(p).flatMap((e) =>
      e.calculs
        .filter((k) => k.id !== actuel.id && k.adresse)
        .map((k) => {
          const u = new URL(k.adresse, fen.location.href);
          u.search = new URLSearchParams({ projet: p.id, calcul: k.id, feuille: k.active }).toString();
          const libelle = [...cheminDuNoeud(p, e.id), k.nom || k.app].join(' › ');
          return `<option value="${ech(u.href)}">${ech(libelle)}</option>`;
        })
    );
    if (options.length === 0) return '';
    return `<label class="af-aller">${T('Aller à', 'Go to')}
      <select data-af-aller><option value="">${T('autre calcul du projet…', 'other calculation in the project…')}</option>${options.join('')}</select></label>`;
  }

  async function changerDeFeuille(id        )                {
    await enregistrer();
    feuilleId = id;
    await modifier((_p, c) => (c.active = id));
    majAdresse();
    chargerFeuille();
    dessiner();
  }

  /* -------------------------------------------------------------- */
  /* Dessin                                                         */
  /* -------------------------------------------------------------- */

  function dessinerHorsProjet()       {
    o.conteneur.innerHTML = `<div class="af-barre af-hors">
        <span>${T('Calcul hors projet.', 'Calculation outside any project.')}</span>
        <span class="af-actions" style="margin:0"><button data-af="ranger">${T('Ranger dans un projet…', 'File in a project…')}</button></span>
        <a href="${ech(hub)}#projets" target="_blank" rel="noopener">${T('Mes projets', 'My projects')} ↗</a></div>`;
    o.marquer?.([]);
  }

  function dessiner()       {
    const c = calcul();
    if (!projet || !c || !feuilleId) {
      dessinerHorsProjet();
      return;
    }
    if (!c.feuilles.some((f) => f.id === feuilleId)) feuilleId = c.active;
    const f = trouverFeuille(c, feuilleId          );
    const chemin = [projet.nom, ...cheminDuNoeud(projet, c.id).slice(0, -1), c.nom || o.nomApp].map(ech).join(' › ');
    const onglets = c.feuilles
      .map((x) => {
        const origine = x.origine ? c.feuilles.find((y) => y.id === x.origine)?.nom : null;
        return `<button class="af-onglet${x.statut === 'etude' ? ' af-etude' : ''}" role="tab" aria-selected="${x.id === f.id}" data-af-feuille="${ech(x.id)}"
          title="${x.statut === 'justifier' ? T('À justifier : part dans la note', 'To justify: goes into the report') : T('Étude : hors note', 'Study: not in the report')}">
          ${pastille(verdictDeFeuille(c, x.id))}${ech(x.nom)}${origine ? `<span class="af-origine">← ${ech(origine)}</span>` : ''}</button>`;
      })
      .join('');
    const propres = champsSurcharges(c, f.id);
    const nom = (k        )         => (o.libelle ? o.libelle(k) : '') || libelleDepuisPage(k, doc) || libelleBrut(k);
    const ligneOrigine = f.origine
      ? `<div class="af-propres">${T("D'après", 'Based on')} « ${ech(c.feuilles.find((y) => y.id === f.origine)?.nom ?? '?')} » ·
          ${
            propres.length === 0
              ? T('aucun champ propre : tout suit la feuille d’origine.', 'no own field: everything follows the original sheet.')
              : `${T('propre à cette feuille', 'own to this sheet')} : ${propres
                  .map((k) => `${ech(nom(k))} <button data-af-revenir="${ech(k)}" title="${T('Revenir à la valeur de la feuille d’origine', 'Back to the value of the original sheet')}">↺</button>`)
                  .join(' · ')}`
          }</div>`
      : '';
    o.conteneur.innerHTML = `<div class="af-barre">
        <div class="af-chemin"><a href="${ech(hub)}#projets/${ech(projet.id)}" target="_blank" rel="noopener">${chemin}</a>${menuAutresCalculs(projet, c)}</div>
        <div class="af-onglets" role="tablist">${onglets}
          <span class="af-statut${f.statut === 'etude' ? ' af-etude' : ''}">${f.statut === 'justifier' ? T('à justifier', 'to justify') : T('étude', 'study')}</span></div>
        <div class="af-actions">
          <button data-af="dupliquer" title="${T('Nouvelle feuille qui suit celle-ci, sauf les champs que vous changerez', 'New sheet that follows this one, except the fields you change')}">${T('Dupliquer', 'Duplicate')}</button>
          <button data-af="copier">${T('Copie indépendante', 'Independent copy')}</button>
          <button data-af="renommer">${T('Renommer', 'Rename')}</button>
          <button data-af="statut">${f.statut === 'justifier' ? T('Passer en étude', 'Mark as study') : T('Passer à justifier', 'Mark to justify')}</button>
          ${f.origine ? `<button data-af="detacher" title="${T('La feuille ne suit plus son origine', 'The sheet stops following its origin')}">${T('Détacher', 'Detach')}</button>` : ''}
          <button data-af="supprimer" class="af-danger">${T('Supprimer la feuille', 'Delete sheet')}</button>
          <button data-af="sortir">${T('Quitter le projet', 'Leave the project')}</button>
        </div>${ligneOrigine}</div>`;
    o.marquer?.(propres);
  }

  /* -------------------------------------------------------------- */
  /* Actions                                                        */
  /* -------------------------------------------------------------- */

  async function ranger()                {
    const liste = await depot.lister();
    const choixProjets = liste.map((r) => `<option value="${ech(r.id)}">${ech(r.nom)}</option>`).join('');
    const d = boite(
      doc,
      `<form method="dialog">
        <label>${T('Projet', 'Project')}<select name="projet">${choixProjets}<option value="">${T('Nouveau projet…', 'New project…')}</option></select></label>
        <label data-nouveau>${T('Nom du nouveau projet', 'New project name')}<input name="nomProjet"></label>
        <label>${T('Élément (repère)', 'Element (mark)')}<select name="element"></select></label>
        <label data-nouvel-element>${T('Repère du nouvel élément (P1, M1…)', 'New element mark (B1, W1…)')}<input name="nomElement"></label>
        <div class="af-boutons">${ANNULER()}<button value="oui" class="af-principal">${T('Ranger', 'File')}</button></div></form>`
    );
    const f = d.querySelector('form')                   ;
    const selP = f.elements.namedItem('projet')                     ;
    const selE = f.elements.namedItem('element')                     ;
    const nouveau = d.querySelector('[data-nouveau]')               ;
    const nouvelElement = d.querySelector('[data-nouvel-element]')               ;
    let lu                = null;
    async function majElements()                {
      lu = selP.value ? await depot.lire(selP.value) : null;
      nouveau.hidden = selP.value !== '';
      const els = lu ? elements(lu) : [];
      selE.innerHTML =
        els.map((e) => `<option value="${ech(e.id)}">${ech(cheminDuNoeud(lu          , e.id).join(' › '))}</option>`).join('') +
        `<option value="">${T('Nouvel élément…', 'New element…')}</option>`;
      nouvelElement.hidden = selE.value !== '';
    }
    selP.addEventListener('change', () => void majElements());
    selE.addEventListener('change', () => (nouvelElement.hidden = selE.value !== ''));
    await majElements();
    d.addEventListener('close', async () => {
      if (d.returnValue !== 'oui') return;
      try {
        const nomP = (f.elements.namedItem('nomProjet')                    ).value.trim();
        const nomE = (f.elements.namedItem('nomElement')                    ).value.trim();
        const p = selP.value ? await depot.lire(selP.value) : creerProjet(nomP || T('Projet sans nom', 'Untitled project'));
        if (!p) return;
        const elementId = selE.value && selP.value ? selE.value : ajouterElement(p, null, nomE || o.nomApp).id;
        // Nom de calcul vide : on affiche le nom de l'app, dans la langue de la page.
        const c = ajouterCalcul(p, elementId, { app: o.app, adresse: fen.location.href.split(/[?#]/)[0], nom: '' }, o.lire(), T('Feuille 1', 'Sheet 1'));
        await depot.ecrire(p);
        projet = p;
        projetId = p.id;
        calculId = c.id;
        feuilleId = c.active;
        majAdresse();
        dessiner();
      } catch (e) {
        signaler(doc, messageDErreur(e));
      }
    });
  }

  async function agir(action        )                {
    const fid = feuilleId          ;
    switch (action) {
      case 'ranger':
        await ranger();
        return;
      case 'dupliquer':
      case 'copier': {
        await enregistrer();
        let nouvelle = '';
        if (await modifier((_p, c) => (nouvelle = dupliquerFeuille(c, fid, action === 'dupliquer', T('Feuille', 'Sheet')).id))) {
          feuilleId = nouvelle;
          majAdresse();
          chargerFeuille();
          dessiner();
        }
        return;
      }
      case 'renommer': {
        const c = calcul();
        const nom = await demander(doc, T('Nom de la feuille', 'Sheet name'), c ? trouverFeuille(c, fid).nom : '');
        if (nom) await modifier((p) => renommer(p, fid, nom));
        return;
      }
      case 'statut':
        await modifier((_p, c) => definirStatut(c, fid, trouverFeuille(c, fid).statut === 'justifier' ? 'etude' : 'justifier'));
        return;
      case 'detacher':
        await enregistrer();
        await modifier((_p, c) => detacherFeuille(c, fid));
        return;
      case 'supprimer': {
        const c = calcul();
        if (!c) return;
        const nom = trouverFeuille(c, fid).nom;
        const d = boite(
          doc,
          `<form method="dialog"><p>${ech(T(`Supprimer la feuille « ${nom} » ?`, `Delete the sheet “${nom}”?`))}</p>
           <div class="af-boutons">${ANNULER()}<button value="oui" class="af-principal">${T('Supprimer', 'Delete')}</button></div></form>`
        );
        d.addEventListener('close', async () => {
          if (d.returnValue !== 'oui') return;
          if (minuterie !== null) clearTimeout(minuterie);
          minuterie = null;
          if (await modifier((_p, k) => supprimerFeuille(k, fid))) {
            feuilleId = calcul()?.active ?? null;
            majAdresse();
            chargerFeuille();
            dessiner();
          }
        });
        return;
      }
      case 'sortir':
        await enregistrer();
        projet = null;
        projetId = calculId = feuilleId = null;
        majAdresse();
        dessiner();
        return;
    }
  }

  // « Aller à » : on enregistre la saisie en cours, puis on ouvre l'autre calcul.
  o.conteneur.addEventListener('change', (ev) => {
    const sel = ev.target                     ;
    if (!sel.matches('[data-af-aller]') || !sel.value) return;
    const cible = sel.value;
    void enregistrer().then(() => fen.location.assign(cible));
  });

  o.conteneur.addEventListener('click', (ev) => {
    const cible = ev.target               ;
    const onglet = cible.closest             ('[data-af-feuille]');
    if (onglet) {
      const id = onglet.dataset.afFeuille          ;
      if (id !== feuilleId) void changerDeFeuille(id);
      return;
    }
    const rev = cible.closest             ('[data-af-revenir]');
    if (rev) {
      const k = rev.dataset.afRevenir          ;
      const fid = feuilleId          ;
      void (async () => {
        await enregistrer();
        if (await modifier((_p, c) => revenirAOrigine(c, fid, [k]))) chargerFeuille();
      })();
      return;
    }
    const b = cible.closest             ('[data-af]');
    if (b) void agir(b.dataset.af          );
  });

  // Retour sur l'onglet : le projet a pu changer ailleurs (feuille d'origine
  // modifiee dans un autre onglet, renommage dans le hub).
  fen.addEventListener('focus', () => {
    if (!projetId || minuterie !== null) return;
    void depot.lire(projetId).then((p) => {
      if (!p) return;
      projet = p;
      chargerFeuille();
      dessiner();
    });
  });
  fen.addEventListener('pagehide', () => void enregistrer());

  // Ouverture : depuis le hub (parametres) ou hors projet.
  void (async () => {
    if (projetId && calculId) {
      try {
        projet = await depot.lire(projetId);
      } catch {
        projet = null;
      }
      const c = calcul();
      if (!c) {
        signaler(doc, T('Ce calcul n’existe plus dans ce navigateur : l’app s’ouvre hors projet.', 'This calculation no longer exists in this browser: the app opens outside any project.'));
        projetId = calculId = feuilleId = null;
        projet = null;
        majAdresse();
      } else {
        if (!feuilleId || !c.feuilles.some((f) => f.id === feuilleId)) feuilleId = c.active;
        const d = donneesDeFeuille(c, feuilleId);
        pret = true;
        if (d === null) {
          // Calcul cree depuis le hub : l'app prend ses valeurs par defaut et les ecrit.
          o.charger(null);
          await enregistrer();
        } else {
          o.charger(d);
        }
        majAdresse();
      }
    }
    pret = true;
    dessiner();
  })();

  return {
    signaler() {
      if (!feuilleId || !pret) return;
      if (minuterie !== null) clearTimeout(minuterie);
      minuterie = setTimeout(() => void enregistrer(), delai);
    },
    dansUnProjet: () => feuilleId !== null,
    enregistrer,
  };
}
