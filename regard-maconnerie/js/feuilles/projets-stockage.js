// GENERE depuis aedificium-ui/src/projets-stockage.ts par _banc-local/copier-projets.mjs.
// Ne pas modifier a la main.
/**
 * Stockage des projets dans le navigateur.
 *
 * Toutes les apps de la suite sont publiees sous `henri421.github.io/<depot>/`,
 * donc sur la MEME origine : elles partagent la meme base IndexedDB. Le hub et
 * les apps lisent et ecrivent les memes projets, sans serveur. Les donnees
 * restent propres au navigateur et a l'appareil : l'export en fichier sert de
 * sauvegarde et de passage d'un poste a l'autre.
 *
 * Comme `projets.ts`, ce module est copie dans le hub sans ses types.
 */

import { importerProjet,                                } from './projets.js';

                               
                                    
                                           
                                   
                                       
 

const resume = (p        )               => ({ id: p.id, nom: p.nom, modifie: p.modifie });
const plusRecentDAbord = (a              , b              )         => b.modifie.localeCompare(a.modifie);

/** Depot en memoire : tests, et repli quand IndexedDB est indisponible (navigation privee). */
export function depotEnMemoire()               {
  const m = new Map                ();
  return {
    async lister() {
      return [...m.values()].map((t) => resume(importerProjet(t))).sort(plusRecentDAbord);
    },
    async lire(id) {
      const t = m.get(id);
      return t === undefined ? null : importerProjet(t);
    },
    async ecrire(p) {
      m.set(p.id, JSON.stringify(p));
    },
    async supprimer(id) {
      m.delete(id);
    },
  };
}

const BASE = 'aedificium';
const TABLE = 'projets';

function requete   (r               )             {
  return new Promise((ok, ko) => {
    r.onsuccess = () => ok(r.result);
    r.onerror = () => ko(r.error);
  });
}

/** Depot IndexedDB partage par toute la suite (base `aedificium`, table `projets`). */
export function depotNavigateur(fabrique             = indexedDB)               {
  let ouverte                              = null;
  const base = ()                       => {
    if (ouverte === null) {
      ouverte = new Promise((ok, ko) => {
        const r = fabrique.open(BASE, 1);
        r.onupgradeneeded = () => {
          if (!r.result.objectStoreNames.contains(TABLE)) r.result.createObjectStore(TABLE, { keyPath: 'id' });
        };
        r.onsuccess = () => ok(r.result);
        r.onerror = () => ko(r.error);
      });
    }
    return ouverte;
  };
  const table = async (mode                    )                          =>
    (await base()).transaction(TABLE, mode).objectStore(TABLE);

  return {
    async lister() {
      const tous = (await requete((await table('readonly')).getAll()))            ;
      return tous.map(resume).sort(plusRecentDAbord);
    },
    async lire(id) {
      const p = (await requete((await table('readonly')).get(id)))                      ;
      return p === undefined ? null : importerProjet(JSON.stringify(p));
    },
    async ecrire(p) {
      await requete((await table('readwrite')).put(JSON.parse(JSON.stringify(p))));
    },
    async supprimer(id) {
      await requete((await table('readwrite')).delete(id));
    },
  };
}

/** IndexedDB si le navigateur l'offre, la memoire sinon. */
export function depotParDefaut()               {
  return typeof indexedDB === 'undefined' ? depotEnMemoire() : depotNavigateur();
}
