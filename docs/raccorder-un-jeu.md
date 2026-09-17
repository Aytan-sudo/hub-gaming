# Raccorder un jeu au passeport — méthode

Document de travail pour ajouter un jeu au passeport commun du hub sans refaire
les découvertes, ni les erreurs, des raccordements précédents. Il suppose une
session qui repart de zéro : tout ce qu'il faut savoir est ici ou dans les
fichiers qu'il cite.

État au 17 septembre 2026 : passeport **1.9.0**, hub **1.12.0**, dix-neuf jeux
raccordés — toute la collection.

> Pour ajouter une **simple carte** au catalogue, sans tampon, il suffit de
> `node ~/dev/python/Jeux_Pages/HUB/ajouter-jeu.mjs` depuis le dossier du jeu
> (voir le README du hub ; penser à `--theme`). Ce document traite du
> **raccordement** : profils, tampons, missions.

---

## 1. Comprendre en cinq minutes

**Principe.** Un passeport par joueur, stocké dans `localStorage`, partagé par
tous les jeux parce qu'ils sont servis depuis la même origine
(`https://aytan-sudo.github.io`). Aucun serveur.

| Élément | Où | Rôle |
| --- | --- | --- |
| `commun/passeport.js` | HUB (source unique) | Coffre versionné, règles des tampons, adaptateurs de stockage par jeu |
| `commun/liaison.js` | HUB | Bandeau du passeport dans les jeux, profil gardé dans les liens internes |
| `commun/passeport.css` | HUB | Style du bandeau |
| `scripts/distribuer.mjs` | HUB | Copie les trois fichiers dans chaque jeu raccordé (liste `destinations`) |
| `jeux.json` | HUB | Catalogue : thème, `connecte`, mission, consigne |
| `js/hub.js` | HUB | Interface : profils, missions, semaine, espace administrateur |
| `js/missions.js` | HUB | Missions du jour : trois cartes au plus, une par thème, et liste complète |
| `tests/passeport.test.mjs` | HUB | Tests unitaires du module (`npm test`) |
| `tests/navigateur.mjs` | HUB | Parcours WebKit complet de la collection (manuel, pas en CI) |
| `tests/jouer-les-jeux.mjs` | HUB | Chaque jeu raccordé joué pour de vrai avec un profil, jusqu'au tampon (manuel) |

Chaque jeu raccordé **embarque sa propre copie** de `commun/` (hors ligne).
Conséquence majeure : des copies de versions différentes coexistent sur les
appareils. Le module est écrit pour qu'une copie ancienne lise sans broncher
les données d'une version plus récente (voir §7).

**API vue depuis un jeu** (script classique chargé avant l'app) :

```js
Passeport.profilId            // id du joueur, ou null en mode invité
Passeport.jourLocal()         // 'AAAA-MM-JJ', date locale
Passeport.stockageJeu('espace') // { getItem, setItem, removeItem } du joueur, ou null en invité
Passeport.noter(jeu, n)       // effort : n = compte du jour ; tampon si n >= seuil
Passeport.noter(jeu, n, true) // réussite : tampon immédiat
// Événements window : 'passeport-tampon' (detail = activité), 'passeport-erreur' (detail = message)
```

**Règle des tampons (décidée par l'utilisateur) :** le tampon du thème
récompense **l'effort OU la réussite**, au premier des deux.

- Réussite = une partie réussie, **même du premier coup**.
- Effort = un seuil de « réponses » dans la journée ; les erreurs comptent, les
  expirations et les simples visites non. Pour les casse-tête, où l'on ne
  « répond » pas, on compte une action significative.
- Un tampon affiché par thème et par jour ; une activité est tout de même
  enregistrée par jeu (`activite/<profil>/<jour>/<jeu>`).

| Jeu (`id` JEUX) | Thème | Réussite | Effort (seuil) | Espace |
| --- | --- | --- | --- | --- |
| `geo-trouve-tout` | geo | manche ≥ 6/10, ou série de 10 en marathon | 10 réponses | `geo` |
| `html_multiplication` | nombres | partie gagnée (30 diamants) | 10 calculs | `multiplication` |
| `sutom` | mots | mot trouvé | 10 mots acceptés (sur plusieurs parties) | `sutom` |
| `demineur` | logique | grille déminée | 10 parties jouées jusqu'au bout | `demineur` |
| `slitherlink` | logique | boucle fermée | 30 traits posés | `slitherlink` |
| `architecte` | logique | grille terminée (tous les murs) | 30 murs posés | `architecte` |
| `solitaire` | logique | partie gagnée | 50 coups | `solitaire` |
| `polyominos` | logique | grille complétée (indices compris) | 20 pièces posées | `polyominos` |
| `mosaicomino` | logique | composition achevée (indices compris) | 20 tesselles posées | `mosaicomino` |
| `2048` | nombres | objectif atteint, ou grille du jour menée à son terme | 100 coups | `2048` |
| `snake` | aventure | record battu (variante + vitesse) | 20 fruits mangés | `snake` |
| `motamorphose` | mots | chaîne trouvée | 10 mots acceptés | `motamorphose` |
| `Dames` | logique | partie gagnée (règles maison comprises) | 20 coups joués | `dames` |
| `diamants` | logique | défi du jour réussi | 20 échanges | `diamants` |
| `laser-mirror` | logique | cristal atteint | 20 rotations | `lasers` |
| `untangle` | logique | grille démêlée | 20 sommets déposés | `untangle` |
| `maze-for-adventurers` | aventure | trésor trouvé (donjon terminé) | 150 mètres marchés | `maze` |
| `le-compte-est-bon` | nombres | compte trouvé (indices compris) | 10 calculs posés | `compte-est-bon` |
| `la-ruche` | mots | grade de Butineuse atteint | 10 mots acceptés (rares compris) | `ruche` |

**Plus aucun jeu libre** : la collection entière est raccordée. Le compte
est bon et La Ruche (1.9.0) sont les premiers jeux neufs raccordés dès leur
première semaine : leurs pages gardaient déjà `?profil=`, et leur mise en page
a dû rendre les 44 px du bandeau sur l'iPhone SE.

---

## 2. Avant de coder : décider la règle avec l'utilisateur

1. Lire le jeu pour savoir ce qu'est **une réussite** (fin de partie gagnée,
   grille résolue…) et ce qui peut servir d'**effort** (réponse, pose, coup).
2. Si la correspondance n'est pas évidente, **poser la question** avec une
   proposition recommandée et un seuil chiffré. Un raccordement fait sans
   demander (« 10 mots » dans SUTOM) a déjà dû être refait.
3. Calibrer le seuil sur une partie typique : l'effort doit valoir à peu près
   une partie ou une demi-partie (Polyominos : 9 pièces par grille → 20 poses).
4. Annoncer dans le compte rendu les seuils choisis et qu'ils se changent en une ligne.

---

## 3. Explorer le jeu : la liste de ce qu'il faut trouver

Lire au minimum `index.html`, `js/app.js` (ou équivalent), le module de
stockage, `sw.js`, `package.json`, `tests/test-page.mjs` et le test de stockage.

| À repérer | Pourquoi |
| --- | --- |
| Module de stockage et **toutes ses clés** (`jeu.xxx`) | Adaptateur de profil ; liste des anciennes clés pour `reprendreAncien` |
| **Script en ligne** qui lit les préférences avant le rendu | Doit lire le passeport ; des tests vérifient souvent la chaîne exacte |
| Toute **réécriture d'adresse** (`history.replaceState`, `url.search = ''`, `setUrl`) | Elle efface `?profil=` → un rechargement change d'enfant |
| **Liens de partage** construits depuis `location.href` | Ne doivent jamais emporter `profil` ni `mission` |
| **Démarrage** : lecture de `?jour=`/`?seed=` vs reprise de la sauvegarde | Piège Polyominos/Mosaïcomino : recharger relançait une grille neuve |
| Point **fin de partie gagnée** | Appel `noter(…, true)` |
| Point **action d'effort** réussie | Appel `noter(…, n)` ; dédoubler si très fréquent (glisser) |
| `sw.js` : **réseau d'abord ou cache d'abord** | Cache d'abord (Multiplication) : changer le nom du cache est obligatoire pour livrer le module |
| Concordance de **version** (package.json, constante JS, nom du cache, texte affiché) | Les tests de page la vérifient |
| Tests de page : « un seul script », chaîne `localStorage.getItem('x.preferences')`, liste de la coquille | À adapter, pas à contourner |
| **Mise en page** : hauteur fixe (`100dvh`), en-tête avec 4 boutons de 44 px | Le bandeau ajoute 44 px ; en-têtes souvent déjà en débordement sur iPhone SE |

---

## 4. Côté hub

### 4.1 Module commun `commun/passeport.js`

1. En-tête : incrémenter la version (`/* Passeport 1.x.0 — …`).
2. Ajouter l'entrée `JEUX` :
   ```js
   monjeu: { theme: 'logique', questions: 20, stockage: 'monjeu', nom: 'Mon Jeu' },
   ```
   `questions` = seuil d'effort ; `stockage` = nom d'espace (minuscules, `[a-z0-9_-]`).
3. `reprendreAncien` : ajouter les anciennes clés du mode invité à la liste, et
   le préfixe au tableau `['geo', 'sutom', …].find(n => k.startsWith(n + '.'))`.
4. **Ne jamais** rendre le validateur plus strict pour les jeux inconnus, ni
   ajouter un champ de profil obligatoire (§7).

### 4.2 Tests unitaires `tests/passeport.test.mjs`

- Seuil : `note(c, p.id, 'monjeu', seuil - 1)` → rien ; `seuil` → tampon du bon
  thème ; `stockageJeu('monjeu', p.id)` non nul.
- `reprendreAncien` : ajouter une ancienne clé et **mettre à jour le compte attendu**.
- Les tests qui listent les jeux doivent dériver la liste de `P.JEUX` (sinon ils
  cassent à chaque ajout, cf. `jeuxVus`).

### 4.3 Distribution, catalogue, interface

- `scripts/distribuer.mjs` : ajouter le dossier à `destinations`, puis
  `npm run distribuer` et `npm run verifier:copies`.
- `jeux.json` : `"passeport": { "theme", "connecte": true, "mission", "consigne" }`.
  La consigne dit la règle : « Complète une grille, ou pose 20 pièces · Polyominos ».
- `tests/navigateur.mjs` : nombre de lignes de la liste complète
  (`#missions-toutes li`, un par jeu raccordé ; les cartes `#missions .xp-mission`
  restent au plus trois, une par thème) et liste des bandeaux vérifiés (boucle
  `for (const [dossier, jeu, consigne] of …)`). Chercher les liens de mission dans
  `#missions-toutes`, pas dans les cartes, qui changent chaque jour.
- Un nouveau **thème** raccordé ajoute une carte possible : les missions du jour
  (`js/missions.js`) restent plafonnées à trois et tournent entre les thèmes.
- `README.md` : tableau réussite/effort, liste des jeux raccordés, données
  isolées par profil, dossiers à servir côte à côte.
- Version du hub : `package.json`, `js/hub.js` (`VERSION`), `sw.js` (`CACHE`) —
  `npm run check` refuse une discordance.

---

## 5. Côté jeu

### 5.1 `index.html`

Avant le script en ligne de l'en-tête :

```html
<link rel="stylesheet" href="commun/passeport.css">
<script src="commun/passeport.js"></script>
<script src="commun/liaison.js" defer></script>
```

Script en ligne des préférences :

```js
const magasin = Passeport.stockageJeu('monjeu') || localStorage;
const preferences = JSON.parse(magasin.getItem('monjeu.preferences') || '{}');
```

Bandeau, premier élément du `body` ou du conteneur de page (`.page`, `.app`) :

```html
<div class="passeport-ruban" data-passeport-ruban data-jeu="monjeu"
     data-consigne="Tampon : une grille complétée ou 20 pièces"></div>
```

`data-jeu` = l'`id` de `JEUX`. `data-consigne` est facultatif (défaut :
« Tampon : 10 réponses ou une partie réussie »).

Vérifier au passage `user-scalable=no` dans le viewport (souvent absent).

### 5.2 Stockage

Le mode invité doit rester **strictement identique** : on n'intercale le
passeport que s'il y a un profil.

```js
// Ouvert depuis le hub avec un passeport, le jeu range tout dans l'espace du
// joueur ; en mode invité, dans localStorage, comme avant.
const passeport = globalThis.Passeport?.stockageJeu('monjeu') ?? null;
const magasin = () => passeport ?? localStorage;   // ou « if (passeport) return passeport; » dans le coffre existant
```

Compteur d'effort, dans le module de stockage (testable sans navigateur) :

```js
export function compterPosePasseport(jour, espace = passeport) {
    if (!espace) return null;                                  // invité : rien ne compte
    let compte = null;
    try { compte = JSON.parse(espace.getItem('monjeu.passeport')); } catch { /* illisible : on repart */ }
    const poses = compte?.jour === jour && Number.isInteger(compte.poses) ? compte.poses + 1 : 1;
    try { espace.setItem('monjeu.passeport', JSON.stringify({ jour, poses })); } catch { /* le passeport signale l'échec */ }
    return poses;
}
```

L'adaptateur accepte **tout JSON valide** (y compris `true`, des nombres), mais
pas une chaîne non JSON.

### 5.3 Partie

```js
// Le tampon du passeport : une partie réussie le donne tout de suite ;
// sinon, la Nième action du jour. En mode invité, rien ne compte.
function noterPasseport({ pose = false, reussite = false }) {
    const joueur = globalThis.Passeport;
    if (!joueur?.profilId) return;
    const poses = pose ? compterPosePasseport(joueur.jourLocal()) : 0;
    if (poses !== null) joueur.noter('monjeu', poses, reussite);
}
```

- Appeler `noterPasseport({ pose: true })` **après** une action validée par le
  moteur (jamais sur un refus, une ouverture, une expiration).
- Appeler `noterPasseport({ reussite: true })` à la fin gagnée. Un second appel
  le même jour renvoie `deja` : pas de doublon, pas besoin de garde.
- Action très fréquente (traits de Slitherlink pendant un glisser) : compter en
  mémoire et confier le total au passeport avec la sauvegarde différée.

### 5.4 Adresse, partage, reprise

- Toute réécriture d'adresse **garde `profil`** :
  ```js
  const url = new URL(location.href);
  const profil = url.searchParams.get('profil');
  url.search = '';
  if (profil !== null) url.searchParams.set('profil', profil);
  ```
- Les liens partagés **retirent** `profil` et `mission` (ou partent d'une URL fixe).
- Si l'adresse porte `?jour=`/`?seed=` : reprendre la sauvegarde quand elle
  désigne la même grille, au lieu de relancer une grille neuve.

### 5.5 Hors ligne et versions

- `sw.js` : ajouter `'commun/passeport.js'`, `'commun/liaison.js'`,
  `'commun/passeport.css'` à la coquille ; changer le nom du cache.
- Monter la version partout où le jeu la porte (paquet, constante JS, cache,
  texte affiché dans la page, `package-lock.json` pour Multiplication).
- README du jeu : une section `## Version x.y.z — Le passeport commun`.

### 5.6 Tests du jeu

- Test du compteur dans le test de stockage existant : invité → `null` ;
  seuil atteint ; remise à zéro le lendemain ; compteur illisible ; rien écrit
  dans le `localStorage` invité.
- Adapter les tests qui cherchent `localStorage.getItem('x.preferences')` (chercher
  `getItem('x.preferences')`) ou qui exigent un seul script (exclure `src="commun/`).
- Si le jeu a un harnais jsdom (SUTOM) : charger `passeport.js` dans un `vm`
  avant l'import de l'app (option `avant` du harnais de SUTOM, modèle dans
  `Sutom/tests/test-passeport.mjs`).

### 5.7 Redistribuer à tous les jeux raccordés

Tout changement de `commun/` se redistribue à **tous** les jeux (`npm run
distribuer`) et chacun monte une version corrective avec une ligne de README.
C'est indispensable pour Multiplication (cache d'abord) et exigé par
`verifier:copies` pour les autres.

---

## 6. Vérifier l'absence de bug — protocole

L'utilisateur attend qu'on **joue réellement** et qu'on regarde les captures.

### 6.1 Automatique

```bash
cd ~/dev/python/Jeux_Pages/HUB
npm test && npm run check && npm run verifier:copies && node scripts/verifier-collection.mjs
for d in <jeux touchés>; do (cd ../$d && npm test && npm run check); done
node ../OUTILS/verifier-ios.mjs            # depuis le dossier du jeu ; puis --modele "iPhone SE"
node ../OUTILS/verifier-ios.mjs --simulateur --garder                       # vrai Safari, iPhone 15 · iOS 26
node ../OUTILS/verifier-ios.mjs --simulateur --garder --modele "iPhone SE"  # 375 × 549 utiles
node tests/navigateur.mjs                  # au moins deux passages : il a déjà été instable
node tests/jouer-les-jeux.mjs              # joue chaque jeu : seuil − 1, seuil, réussite
```

`verifier-ios` tourne **en mode invité** : il ne voit ni le bandeau rempli ni
les effets d'un profil. Il faut donc aussi un parcours avec profil.

Le simulateur donne la vraie hauteur : les profils Playwright ignorent la barre
de Safari (SE de 3ᵉ génération : 667 px sous Playwright, 549 dans Safari
d'iOS 26). C'est lui qui tranche pour une page à hauteur fixe et le bandeau de
44 px (§6.3).

### 6.2 Parcours WebKit avec profil

`tests/jouer-les-jeux.mjs` le fait déjà pour les jeux raccordés : **y ajouter le
nouveau jeu** plutôt que d'écrire un script jetable. Il sert
`~/dev/python/Jeux_Pages` sur un port, charge Playwright depuis
`../OUTILS/node_modules/playwright/index.mjs`, et crée le profil **dans le hub,
dans le même contexte de navigateur** que le jeu.

Il pose le compteur du jeu à « seuil − 2 » avant les deux dernières actions, qui
sont de vraies actions de jeu : inutile de jouer cent coups pour mesurer un
passage de seuil. Sa tête de fichier liste les ruses que chaque jeu a imposées
(échange qui aligne dans Diamants, miroir libre dans Lasers, variante sans murs
dans Snake).

| Vérifier | Comment |
| --- | --- |
| Mode invité inchangé | Bandeau « Mode invité », données dans `localStorage`, aucun `x.passeport` |
| Bandeau et consigne | Texte du `.passeport-ruban` avec le prénom |
| Profil gardé | `new URL(page.url()).searchParams.get('profil')` après démarrage, nouvelle partie, rechargement |
| Effort | seuil − 1 → aucune clé `activite/<profil>/…/<jeu>` ; seuil → une clé et bandeau « Tampon gagné » |
| Compteur persistant | Rechargement au milieu, compteur intact |
| Réussite | Finir une partie (indices, lien de grille résolue, réponses exactes) → tampon ; rechargement → pas de doublon |
| Données dans le profil | `Passeport.stockageJeu(espace).getItem(...)` rempli, `localStorage` invité vide |
| Séparation | Second profil : aucun compteur ni partie hérités |
| Reprise | Poser, recharger, retrouver la même grille |
| Hors ligne | Couper le serveur (`req.socket.destroy()`), recharger : le jeu s'ouvre avec le bandeau |
| Erreurs | `page.on('pageerror')` vide |

### 6.3 Mise en page

- Mesurer `scrollHeight - innerHeight` **avec et sans** bandeau
  (`.passeport-ruban{display:none!important}`) sur iPhone SE, 13 Mini, 15.
  L'écart attendu est exactement 44 px ; plus, c'est un bug ou un bandeau d'erreur.
- Page à hauteur fixe : le clavier ou le plateau ne doit pas sortir de l'écran
  (SUTOM : grille dimensionnée par requête de conteneur ; Architecte : hauteur du
  bandeau déduite du budget du plateau).
- En-tête : vérifier que le titre ne passe pas sous les boutons (rectangle du
  texte via `Range`, comparé au rectangle du premier bouton). Déjà corrigé dans
  SUTOM, Polyominos, Mosaïcomino.
- **Regarder les captures**, pas seulement les chiffres — celles du simulateur
  d'abord (`OUTILS/captures/*-simulateur.png`).
- Pour savoir si un défilement est nouveau ou préexistant, mesurer l'avant :
  `git worktree add /tmp/avant-<jeu> HEAD~1`, y lancer `verifier-ios`, puis
  `git worktree remove`. Plusieurs jeux défilaient déjà (Diamants 153 px,
  Motamorphose 197 px sur l'iPhone SE du simulateur) : le bandeau n'y ajoute que
  ses 44 px, et c'est ce chiffre-là qu'il faut savoir citer.
- Le bandeau rempli dans le vrai Safari : créer le profil à la main dans le hub
  local avec `--voir` (le simulateur ne se pilote pas au doigt par script),
  puis ouvrir le jeu dans le même onglet.

### 6.4 En ligne, après le push

```bash
gh run list -R Aytan-sudo/<depot> -L 3                     # attendre les déploiements (gh run watch)
curl -s "https://aytan-sudo.github.io/<jeu>/commun/passeport.js?v=$RANDOM" | head -1   # version servie, pour chaque jeu
node ~/dev/python/Jeux_Pages/OUTILS/verifier-ios.mjs --url "https://aytan-sudo.github.io/<jeu>/?v=$RANDOM" --modele "iPhone SE"
node ~/dev/python/Jeux_Pages/OUTILS/verifier-ios.mjs --url "https://aytan-sudo.github.io/<jeu>/?v=$RANDOM" --simulateur
```

Puis un parcours court sur les sites publiés : profil créé dans le hub en ligne,
mission, reprise au rechargement, réussite, tampon.

---

## 7. Compatibilité : les règles à ne pas casser

1. **Jeux inconnus tolérés.** Une copie ancienne lit, conserve et exporte les
   activités et données d'un jeu qu'elle ne connaît pas.
2. **Champs de profil facultatifs seulement** (`ton`, `sansObjectif`, `jeuxVus`).
   Un champ obligatoire ou une valeur hors bornes (objectif ≠ 2 à 7) ferait
   déclarer le profil illisible par les copies anciennes.
3. **`jeuxVus`** : un jeu raccordé après le dernier réglage d'un profil y entre
   d'office (missions, journées). Rien à migrer pour un nouveau jeu.
4. **Changer `VERSION`** (format stocké) bloque volontairement les copies
   anciennes : il faudrait alors republier tous les jeux raccordés ensemble.
5. Une entrée illisible est mise de côté et signalée ; l'export continue.

---

## 8. Pièges déjà rencontrés

| Piège | Parade |
| --- | --- |
| zsh ne découpe pas `$F` en plusieurs fichiers | Écrire la liste de fichiers en clair |
| `sed -i` sur macOS | `sed -i ''`, ou un petit script Node/Python pour les remplacements multi-lignes |
| Premier `git push` refusé par le mode automatique | Donner la commande à l'utilisateur ; ne pas réessayer telle quelle |
| Motamorphose : branche locale `feat/initial-release` qui suit `origin/main` | `git push origin feat/initial-release:main` |
| Maze for Adventurers : pas de service worker | Raccordé sans en ajouter un : le passeport marche en ligne, le jeu ne s'ouvre toujours pas hors ligne. `verifier-collection.mjs` saute ce dossier exprès |
| Jeu à canevas plein écran : le bandeau rogne la scène | Elle se redimensionne seule, rien ne défile ; mesurer plutôt ce que perdent les **commandes tactiles** (Maze : flèches à 34 px sur iPhone SE) |
| Compteur incrémenté à chaque image (mètres, pixels) | Accumuler en mémoire et n'écrire que tous les N pas ; déposer le reste en quittant l'écran de jeu et sur `pagehide` / `visibilitychange` |
| Mode invité testé sans `?profil=` | Le coffre reprend le **dernier profil choisi** : c'est `?profil=` **vide** qui donne le mode invité |
| `assert.deepEqual` sur un tableau venu d'un `vm` | Étaler : `[...tableau]` |
| Clic Playwright intercepté dans un SVG | `click({ force: true })` |
| Nouveau contexte de navigateur = profil absent | Le bandeau affiche une erreur sur plusieurs lignes et fausse les mesures |
| Réponses Multiplication tapées en quelques ms | Le jeu perd des diamants : lire et saisir en un `evaluate`, puis attendre 60 ms |
| Adresse `blob:` de l'export comptée comme appel externe | Filtre `/^(data\|blob):/` dans `tests/navigateur.mjs` |
| Réécriture d'adresse `url.search = ''` | Remet `profil` (§5.4) |
| Recharger relance une grille neuve (`?jour=`) | Reprendre la sauvegarde de la même grille |
| Tests qui comptent les jeux, missions ou copies | Les mettre à jour ou dériver de `P.JEUX` |
| Clé numérique dans `JEUX` (`'2048'`) | JS la range en tête de `Object.keys` : comparer les listes sans ordre |
| Clés du mode invité séparées par `:` et non `.` | `ANCIENNES_CLES` les nomme en clair, espace par espace |
| Intercepter le passeport **avant** `if (coffre) return coffre` | Le coffre mémorisé serait ignoré à chaque appel |
| Bandeau posé à côté du conteneur dans un `body` en `flex` **ligne** | Le jeu part hors de l'écran (Diamants) : passer le `body` en colonne |
| Budget de plateau en `100vh` | Sur iOS c'est la hauteur « grande », barre de Safari ignorée : `100dvh` (2048) |
| Plateau déjà borné par la hauteur | Lui faire rendre les 44 px du bandeau dans **toutes** ses règles, media queries comprises (Untangle) |
| Oublier de redistribuer / de monter une version | `verifier:copies` et les tests de page le signalent |

---

## 9. Commit et publication

- Un commit par dépôt, message en français qui dit la règle, les corrections
  trouvées en chemin et les vérifications faites.
- Pousser tous les dépôts touchés (jeu, hub, redistributions), puis dérouler §6.4.
- Compte rendu à l'utilisateur : règle et seuils, bugs trouvés et corrigés, ce
  qui a été vérifié (et où : local, WebKit, simulateur iOS, en ligne), ce qui
  ne l'a pas été — le vrai téléphone, notamment, s'il n'a pas servi.
