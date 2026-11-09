// GENERE depuis aedificium-ui/src/langue.ts par _banc-local/copier-projets.mjs.
// Ne pas modifier a la main.
/**
 * Langue de la page : francais (par defaut) ou anglais.
 *
 * Une seule compilation par app : `index.html` et `en/index.html` chargent le
 * meme script, qui lit la langue sur `<html lang>` et la fixe ici au
 * demarrage, AVANT tout rendu. Les nombres, le CSV et la note suivent cette
 * langue ; les textes propres a l'app vivent dans son `textes.ts`.
 *
 * L'etat est global au module, par commodite : une page n'a qu'une langue.
 * Les tests qui passent en anglais remettent `definirLangue('fr')` apres eux.
 */

                                 

let courante         = 'fr';

export function definirLangue(langue        )       {
  courante = langue;
}

export function langueCourante()         {
  return courante;
}

/** Langue declaree par la page (`<html lang="en">`), francais sinon. */
export function langueDuDocument(doc                                       )         {
  return /^en\b/i.test(doc.documentElement.lang) ? 'en' : 'fr';
}

/**
 * Lien de la barre de la suite vers l'autre version de la page. La version
 * anglaise vit dans le sous-dossier `en/` de chaque app.
 */
export function lienDeLangue(langue        )         {
  return langue === 'fr'
    ? '<a class="barre-langue" href="en/" hreflang="en" lang="en" aria-label="English version">EN</a>'
    : '<a class="barre-langue" href="../" hreflang="fr" lang="fr" aria-label="Version française">FR</a>';
}

/** Regle de traduction : motif ancre (`^…$`) et remplacement. */
                                                                                           

/**
 * Traducteur des phrases produites en francais par le noyau de calcul
 * (titres, motifs, libelles), pour l'affichage en anglais.
 *
 * Ordre : phrase exacte, puis premiere regle dont le motif correspond. Les
 * virgules decimales restantes (« 0,6 ») passent au point. Une phrase
 * inconnue sort telle quelle : les tests d'affichage en anglais la signalent
 * (lettres accentuees, mots francais). En francais, rien n'est touche.
 */
export function traducteur(
  exactes                                  ,
  regles                           = []
)                             {
  return (phrase) => {
    if (courante === 'fr') return phrase;
    let sortie = exactes[phrase];
    if (sortie === undefined) {
      const r = regles.find(([motif]) => motif.test(phrase));
      sortie = r === undefined ? phrase : phrase.replace(r[0], r[1]          );
    }
    return pointDecimal(sortie);
  };
}

/** « 0,6 » -> « 0.6 » ; une virgule suivie d'une espace reste une virgule. */
export function pointDecimal(texte        )         {
  return texte.replace(/(\d),(?=\d)/g, '$1.');
}
