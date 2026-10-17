# Regards en maçonnerie

Application web installable (PWA) de vérification des murs de regards enterrés en maçonnerie non armée, soumis à la poussée des terres et au trafic lourd (SLW 60, LM1 ou charge utilisateur). Elle reprend à l'identique les formules, les noms et les sorties du classeur `Verification_regard_maconnerie.xlsx` v1.1, qui fait foi pour la recette.

Cadre normatif : EN 1996-1-1:2005+A1:2012, EN 1996-2, EN 1996-3, EN 1997-1, EN 1990, EN 1991-2 (première génération), DIN 1072 pour le SLW 60.

## Confidentialité

Tout le calcul s'exécute dans le navigateur. Aucune donnée de projet n'est envoyée ni stockée sur un serveur. Le dépôt et le code sont publics ; les saisies restent dans le navigateur de l'utilisateur et dans les fichiers `.json` qu'il enregistre lui-même. L'import d'un classeur `.xlsx` est lu localement.

## Fonctions

L'écran suit la mise en page des autres outils de la suite Aedificium : la saisie en cadres à gauche ; au centre, la coupe du regard avec la poussée de calcul et le trafic, puis les diagrammes de poussée et de moment ; à droite, le verdict de chaque mur, le mécanisme gouvernant et les taux de travail de chaque vérification (les chemins de charge non retenus sont affichés pour information). Sous ces colonnes, le détail du calcul reprend en volets repliables les pages du classeur : données et valeurs dérivées, Prédimensionnement EN 1996-3, Bande verticale classique, Méthode complète EN 1996-1-1, Synthèse, Tables normatives et Catalogue. Chaque ligne de calcul affiche la désignation, le symbole, la valeur par mur, l'unité, la formule en clair et la référence normative. Les résultats se recalculent à chaque saisie.

Le bouton **Enregistrer** produit un fichier projet `.json` contenant la saisie, les tables et le catalogue (schéma dans `schema/projet.schema.json`). **Ouvrir** le relit. **Importer un classeur .xlsx** reprend la saisie, les tables T1 à T10 et le catalogue d'un classeur existant, y compris la v1.0. **Imprimer la note** produit la note de calcul A4 portrait (pages Saisie, Prédim., Classique, Complète, Synthèse) avec la version de l'application en pied de page ; choisir « Enregistrer au format PDF » dans la boîte d'impression pour obtenir un PDF.

Après la première visite, l'application fonctionne hors ligne et peut être installée comme une application (menu du navigateur, « Installer »).

## Mise en ligne sur GitHub Pages

Le dépôt [henri421/regard](https://github.com/henri421/regard) contient ce dossier `regard-maconnerie/` et le workflow `.github/workflows/regard-maconnerie.yml`. Réglage : Settings, Pages, Source : **GitHub Actions**.

À chaque poussée sur `main`, le workflow `Recette et publication` exécute les tests puis publie le contenu de `regard-maconnerie/` ; si un test échoue, rien n'est publié. L'application est disponible à l'adresse <https://henri421.github.io/regard/> et reliée au hub [WebAedificium](https://henri421.github.io/WebAedificium/).

Tous les chemins sont relatifs : le dossier peut être renommé ou placé ailleurs (adapter alors `path` et `working-directory` dans le workflow).

## Essai en local

Un service worker ne fonctionne pas depuis `file://`. Depuis le dossier `regard-maconnerie/` :

```
python -m http.server 8000
```

puis ouvrir `http://localhost:8000/`.

## Recette

```
node tests/run-tests.mjs        (Node 18 ou plus, aucune dépendance)
```

Le test compare 353 valeurs nommées du moteur à celles du classeur recalculé, sur dix scénarios (`tests/fixtures/`), avec une tolérance relative de 0,1 %. Il contrôle aussi que la version du service worker correspond à `js/version.js` et que tous les fichiers mis en cache existent.

Le scénario `plaque_t5_fictive` utilise une table T5 aux valeurs **fictives**, uniquement pour tester l'interpolation ; elles ne doivent jamais servir au calcul.

Après une modification du classeur, régénérer les scénarios (Python, openpyxl et LibreOffice requis) :

```
python tools/generer_regard_maconnerie.py classeur.xlsx
python tools/make_fixtures.py classeur.xlsx [chemin/vers/soffice]
node tests/run-tests.mjs
```

## Publier une nouvelle version

Modifier `VERSION` dans `js/version.js` **et** dans `sw.js` (même valeur), puis pousser. Les postes qui ont déjà l'application reçoivent la nouvelle version au prochain chargement, avec un message les invitant à recharger. Une note imprimée indique toujours la version qui l'a produite.

## Organisation

| Fichier | Rôle |
| --- | --- |
| `index.html`, `css/app.css` | Interface (jetons communs de la suite, `WebAedificium/DESIGN.md`, thème clair) et mise en page d'impression A4 |
| `js/engine.js` | Moteur de calcul, traduction fidèle des formules du classeur ; clés = noms définis |
| `js/report.js` | Lignes des pages de calcul (désignation, symbole, formule, référence) |
| `js/tables.js` | Tables T1 à T10 et catalogue par défaut |
| `js/inputs.js` | Définition des saisies (feuille 0_Saisie) |
| `js/app.js` | Liaison interface, fichiers projet, impression |
| `js/xlsx-import.js` | Import local d'un classeur |
| `lib/xlsx.full.min.js` | SheetJS 0.18.5, chargé seulement à l'import |
| `sw.js`, `manifest.webmanifest`, `icons/` | Fonctionnement hors ligne et installation |
| `tests/`, `tools/` | Recette, générateur du classeur, régénération des scénarios, schéma JSON |

## Points de vigilance

Les tables normatives sont pré-remplies et **à vérifier** sur les normes et l'annexe nationale luxembourgeoise avant tout usage. La table T5 (annexe E) est livrée vide : la vérification en plaque reste inactive tant qu'elle n'est pas transcrite. Les modifications de tables faites dans l'application sont enregistrées avec chaque projet.

Le classeur v1.0 contenait une erreur dans le facteur Φm de l'annexe G : Excel applique le signe moins avant la puissance, si bien que `EXP(-(u)^2/2)` valait e^(+u²/2). La v1.1 et cette application utilisent e^(−u²/2).

## Licences

Code de l'application : licence MIT (`LICENSE` à la racine du dépôt).

### Composants tiers

SheetJS Community Edition : Apache 2.0 (`lib/xlsx-LICENSE.txt`).
