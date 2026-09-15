# Les jeux d’Aymeric — Mon passeport

Un hub de 17 jeux, avec un passeport personnel de découvertes. Interface pastel,
compagnons, polices arrondies embarquées, téléphone, tablette et ordinateur.
Aucun compte ni serveur applicatif : les fichiers sont servis par GitHub Pages,
les données de jeu restent dans le navigateur.

**Version 1.6.0 du passeport.** Adresse de publication :
https://aytan-sudo.github.io/hub-gaming/

## Jouer et collectionner

1. Créer un passeport avec un prénom ou un pseudo, un compagnon et une palette.
2. Choisir le joueur dans l’en-tête avant d’ouvrir une mission.
3. Dans chaque jeu raccordé, le tampon du
   thème récompense **l’effort ou la réussite**, au premier des deux :
   - **l’effort** : dix réponses essayées — les erreurs comptent, les délais
     expirés seuls ne comptent pas, une visite ou l’ouverture d’une page ne suffit
     pas. Les casse-tête, où l’on ne « répond » pas, comptent à leur façon ;
   - **ou une partie réussie**, même du premier coup.

   | Jeu | Réussite | Effort |
   | --- | --- | --- |
   | SUTOM | le mot trouvé | dix mots acceptés par le dictionnaire, sur une ou plusieurs parties de la journée |
   | Multiplication | la partie gagnée (30 diamants) | dix calculs saisis |
   | Géo Trouve-Tout | une manche à 6 sur 10 au moins, ou une série de 10 en marathon | dix réponses données |
   | Démineur | une grille déminée | dix parties jouées jusqu’au bout dans la journée, explosions comprises |
   | Slitherlink | une boucle fermée (grille résolue) | trente traits posés dans la journée, sur une ou plusieurs grilles |
   | L’Architecte | une grille terminée (tous les murs posés) | trente murs posés dans la journée, retraits et reprises compris |
   | Solitaire | une partie gagnée | cinquante coups joués dans la journée, sur une ou plusieurs donnes |
   | Polyominos | une grille complétée, indices compris | vingt pièces posées dans la journée |
   | Mosaïcomino | une composition achevée, indices compris | vingt tesselles posées dans la journée |

   Dans un jeu, `Passeport.noter(jeu, nombreDeReponses)` suit l’effort et
   `Passeport.noter(jeu, n, true)` signale une réussite.
4. Revenir au passeport depuis le bandeau du jeu : les tampons, les journées
   et les souvenirs se mettent à jour.

Un tampon par thème et par date, une seule journée pédagogique par date.
L’objectif est de quatre jours par semaine par défaut ; l’administrateur peut choisir
entre deux et sept jours et sélectionner les activités qui valident la journée.
La semaine commence le lundi et suit la date locale de l’appareil. Les tampons
et les souvenirs ne disparaissent jamais après une absence. Les souvenirs se
collectionnent après 5, 10, 15, 20, 25, 30, 50 et 100 journées d’apprentissage.
Le carnet montre les quatre tampons les plus récents ; « Feuilleter tous mes
tampons » ouvre l’historique complet du thème.

**Style et objectif par profil.** Un passeport n’est pas réservé aux enfants.
Dans « Nom et compagnon », chaque profil choisit son **style** : *ludique*
(mascotte, étoiles, souvenirs imagés) ou *sobre* (sans mascotte, tampons
droits, textes simples, « paliers » au lieu des souvenirs). Dans l’Espace
administrateur, **« Aucun objectif »** retire l’objectif de la semaine : les
journées jouées restent affichées, et le dernier nombre choisi est gardé pour
le jour où l’objectif revient. Les règles des tampons ne changent pas. Ces deux
réglages sont des champs facultatifs du profil (`ton`, `sansObjectif`, passeport
1.3.0) : une copie plus ancienne du module les ignore sans rejeter le profil.

Le passeport traverse les jeux et comporte cinq thèmes : géographie, nombres,
mots, logique, aventure. **Neuf jeux sont raccordés : Géo (Géographie),
Multiplication (Nombres), SUTOM (Mots, passeport 1.1.0), Démineur, Slitherlink
(Logique, 1.4.0), L’Architecte, Solitaire (Logique, 1.5.0), Polyominos et
Mosaïcomino (Logique, 1.6.0).** Les
autres restent jouables depuis le catalogue, avec leur thème, sans prétendre
distribuer des tampons. Leurs statistiques restent dans leur système existant.

Les préférences, la mémoire d’apprentissage et les statistiques de Géo, la
configuration, les révisions ciblées et les scores de Multiplication, ainsi que
les statistiques, la série du mot du jour, les réglages et la partie en cours de
SUTOM, les préférences, records et statistiques de Démineur, la série et la
partie en cours de Slitherlink, les préférences, parties, records et séries de
L’Architecte et de Solitaire, les préférences, grilles en cours et statistiques
de Polyominos et de Mosaïcomino, sont isolés par identifiant de profil. Renommer un profil conserve son
histoire. Un jeu déjà ouvert reste associé au profil qui l’a lancé, même si un
autre est choisi dans un autre onglet. Le mode invité conserve les anciennes
données. L’espace administrateur permet de les copier explicitement, sans les supprimer
ni écraser celles d’un profil. Les anciennes révisions de Multiplication sont
récupérées lorsque son prénom correspond exactement.

**Missions du jour.** L’accueil propose au plus **trois cartes, une par thème**
(`js/missions.js`). Les thèmes sans tampon aujourd’hui passent devant ; l’ordre
des thèmes tourne d’un cran par jour, et dans un thème à plusieurs jeux (Logique)
le jeu proposé tourne aussi : chacun revient régulièrement. Tous les jeux à
tampon du profil restent à un geste dans la liste repliée « Toutes les missions »,
où une étoile marque ceux qui ont déjà donné leur tampon du jour. Une carte par
jeu tenait avec deux ou trois jeux ; à neuf, la colonne des missions faisait
trois fois la hauteur du passeport.

Un jeu raccordé après le dernier réglage d’un profil **y entre d’office** : il
apparaît parmi ses missions et valide ses journées, sans rien cocher. Le profil
retient les jeux que l’administrateur a déjà vus (`jeuxVus`, passeport 1.5.0) :
un jeu décoché dans **Espace administrateur → Activités qui valident une
journée** reste décoché, seuls les jeux jamais vus sont ajoutés. Un profil plus
ancien que ce champ est réputé n’avoir connu que Géo et Multiplication.

## Conserver les profils sur un appareil

Utiliser **le même navigateur et la même origine** pour le hub et les jeux.
En production, ils partagent `https://aytan-sudo.github.io`. Installer le hub
sur l’écran d’accueil permet d’ouvrir la collection depuis une entrée commune ;
son manifeste couvre les chemins des jeux. Éviter de mélanger cette application,
plusieurs navigateurs et des installations séparées de chaque jeu : leurs
espaces de stockage peuvent différer, particulièrement sur iOS. L’installation,
l’ouverture des jeux et l’export en mode application ont été vérifiés sur iPhone.

Sur iOS, deux règles guident l’accueil (hub 1.1.0) :

- Dans Safari, les données d’un site peuvent être effacées après 7 jours
  d’utilisation de Safari sans visite ; l’app de l’écran d’accueil y échappe.
- L’app installée a **son propre stockage** : elle ne voit pas un passeport
  créé dans Safari.

Tant qu’aucun passeport n’existe, l’accueil sur iPhone ou iPad propose donc
d’installer l’app d’abord ; « Continuer sans installer » reste possible. Si des
passeports existent déjà dans Safari, une carte « Pour l’administrateur » explique
le transfert : exporter, installer, puis importer dans l’app. Dans l’app, l’accueil
rappelle comment ramener un passeport depuis Safari. Sur Chrome ou Edge, un
bouton « Installer l’app » apparaît quand le navigateur le permet ; l’app y
partage le stockage du navigateur, l’installation reste donc facultative.

Une carte rappelle aussi d’exporter : dès 3 journées de tampons jamais
sauvegardées, puis quand la dernière sauvegarde a 14 jours et que de nouveaux
tampons sont arrivés depuis. « Plus tard » la met en pause 7 jours (14 pour la
carte d’installation). La date du dernier export est propre à l’appareil,
visible dans l’espace administrateur, et ne part pas dans les sauvegardes. Le hub sait
qu’un export a été proposé, pas que le fichier a bien été rangé.

Dans **Espace administrateur → Sauvegarder les passeports** :

- **Exporter la sauvegarde** télécharge un JSON contenant tous les profils,
  y compris archivés, leurs tampons et les données des jeux raccordés.
  Vérifier que le fichier a bien été enregistré. Refaire l’export régulièrement.
- **Choisir une sauvegarde** valide le fichier puis montre son contenu avant
  toute modification. La confirmation remplace le coffre. Exporter d’abord
  le coffre actuel pour garder les progrès absents du fichier importé.
- **Demander la conservation du stockage** sollicite la protection proposée
  par le navigateur, qui peut la refuser. Elle ne remplace pas l’export.
- **Archiver** masque un profil après saisie de son prénom ou pseudo ; les données restent
  exportées et le profil peut être réactivé.

Chaque entrée possède une copie locale de secours. Une donnée illisible peut
être relue depuis cette copie ; un message invite alors à exporter. Si les deux
sont perdues, l’entrée est mise de côté et signalée : les autres profils, les
bilans et l’export continuent, et l’export indique ce qu’il n’a pas pu emporter.
Les formats plus récents sont protégés contre l’écrasement. Une restauration
prépare les données dans un nouveau coffre puis bascule un pointeur, lui aussi
doublé d’une copie : un fichier invalide ou un manque de place conserve le
coffre courant. Le coffre précédent est retenu ; si le pointeur était illisible,
aucun coffre n’est effacé. Les jeux ouverts avant la restauration doivent être
rouverts.

**Une sauvegarde locale ne survit pas à l’effacement des données du navigateur
ou à la perte de l’appareil.** Seul un fichier exporté, conservé hors de cet
espace de stockage, permet alors une restauration. Aucun verrouillage matériel,
chiffrement, contrôle parental ou mécanisme anti-triche n’est prétendu :
l’identifiant de profil dans les liens ne constitue pas une authentification.
Le fichier exporté peut être restauré ailleurs manuellement ; il n’y a pas de
synchronisation. L’horloge locale fait foi.

## Développer

```sh
cd ~/dev/python/Jeux_Pages/HUB
npm test
npm run check
npm run verifier:copies
npm run serve
# ouvrir http://localhost:8780/HUB/
```

Servir **toute la collection sur le même port**, en gardant les dossiers
`HUB` et les dossiers des jeux raccordés (`Geo-Trouve-Tout`, `html_multiplication`,
`Sutom`, `Demineur`, `Slitherlink`, `Architecte`, `Solitaire`, `Polyominos`, `Mosaicomino`) côte à côte. Le hub adapte ses
liens sur localhost. Des serveurs sur des ports différents ne partagent pas les
profils. `file://` n’est pas pris en charge.

```text
index.html / css/style.css  interface et dialogues accessibles
js/hub.js                   profils, missions, collections, sauvegardes
js/missions.js              choix des trois missions du jour, liste complète
commun/passeport.js         coffre versionné, règles et adaptateurs de stockage
commun/liaison.js           bandeau des jeux et conservation du profil dans les liens
commun/passeport.css        styles légers du bandeau
jeux.json                   catalogue, thèmes et état des raccordements
scripts/distribuer.mjs      copie le module commun dans les deux dépôts de jeux
sw.js                      fichiers hors ligne, cache propre au hub
```

Le module commun est volontairement embarqué dans chaque jeu : aucun appel au
hub n’est nécessaire pour jouer hors ligne. Après modification :
`npm run distribuer`, puis `npm run verifier:copies` et les tests des jeux.
Le préfixe `collection.v1.` isole les données des anciennes clés. Une activité
est une entrée indépendante par profil, date et jeu : deux onglets ne remplacent
pas un gros objet commun. Le schéma des sauvegardes est versionné séparément du
numéro de l’application.

`npm test` couvre les règles, les dates civiles, la séparation, les sauvegardes,
les écritures refusées et la restauration. `npm run check` vérifie la syntaxe,
les identifiants de l’interface, le catalogue, la version et le précache.
`node tests/navigateur.mjs` utilise le Playwright du dossier voisin `OUTILS`
(`npm install` puis `npx playwright install webkit` dans ce dossier). Il joue
réellement dix réponses dans chaque jeu, recharge Géo à mi-parcours, exporte
et réimporte le fichier, vérifie plusieurs largeurs et coupe le serveur pour
tester le hors-ligne. Les captures temporaires sont écrites dans le dossier
temporaire du système. Le clavier et l’installation sur un vrai iPhone restent
des contrôles manuels complémentaires.

Les icônes PNG (180, 192, 512 px) se régénèrent depuis `assets/icon.svg` avec
`npm run icones`, seulement quand le dessin change : les tests n’y touchent pas.
Les polices Fredoka et Nunito sont embarquées en WOFF2 (148 Ko pour les quatre
graisses), converties sans perte depuis les TTF de Google Fonts ; leurs
licences OFL sont à côté.

Pour publier la fonctionnalité, les dépôts du hub et des jeux raccordés
doivent tous être mis à jour. Les corrections des autres `sw.js` de la
collection limitent leur purge à leur propre cache : elles évitent qu’une mise
à jour d’un jeu supprime les fichiers hors ligne du hub ou de ses voisins.
Aucun serveur de données n’est à déployer.

## Raccorder un autre jeu

La méthode complète — choix de la règle, modifications du hub et du jeu,
protocole de vérification, pièges déjà rencontrés — est dans
[`docs/raccorder-un-jeu.md`](docs/raccorder-un-jeu.md). En résumé :

1. Définir une activité réellement jouée qui mérite un tampon, son thème et
   son espace de stockage dans `commun/passeport.js`.
2. Utiliser l’adaptateur du profil pour les données du jeu ; garder le mode
   invité et sa compatibilité. Ajouter la nouvelle destination à la distribution.
3. Appeler `Passeport.noter(idJeu, nombreDeReponses)` seulement après des actions
   validées par le moteur, pas lors d’une ouverture ni d’une expiration de délai.
   Décider ce qu’est une partie réussie dans ce jeu et appeler alors
   `Passeport.noter(idJeu, nombreDeReponses, true)` ; l’écrire dans la
   consigne de la mission et, si besoin, dans `data-consigne` sur le bandeau.
4. Embarquer les trois fichiers communs, le bandeau et
   `data-jeu="idJeu"` sur le bandeau, puis les ajouter au précache.
5. Passer `passeport.connecte` à `true` et renseigner `mission` et `consigne`
   dans `jeux.json`, puis vérifier la séparation des profils et l’aller-retour.

Chaque jeu garde sa copie du module, et un jeu resté en cache peut tourner
avec une copie plus ancienne que celle du hub. Depuis la 1.0.1, une copie lit,
conserve et exporte les activités, tampons et données des jeux qu’elle ne
connaît pas ; elle ne peut simplement pas les créer. Un nouveau jeu raccordé
ne demande donc pas de republier les autres le même jour. En revanche, un
changement du format stocké (`VERSION`) reste bloquant pour les copies plus
anciennes, par prudence : il faut alors publier tous les jeux raccordés.

## Ajouter un jeu

Depuis le dossier du jeu — c'est le point important, on ne revient jamais ici :

```bash
node ~/dev/python/Jeux_Pages/HUB/ajouter-jeu.mjs
```

Le script devine tout seul, en lisant le dossier du jeu :

| Champ | Source |
|---|---|
| lien de jeu | remote git → URL GitHub Pages |
| nom | `manifest.webmanifest` → `name`, sinon `<title>` |
| description | manifest → `description`, sinon `<meta name="description">` |
| couleur | manifest → `theme_color`, sinon `<meta name="theme-color">` |
| icône | manifest → `icons`, résolue en URL absolue |
| code source | remote git |

Puis il écrit `jeux.json`, commit et pousse. La page est à jour dans la minute.

### Options

Tout champ deviné peut être forcé :

```bash
node .../ajouter-jeu.mjs --desc "Une phrase qui donne envie" --tags "mots,réflexion" --emoji "🔴"
```

| Option | Effet |
|---|---|
| `--dir <chemin>` | dossier du jeu (défaut : dossier courant) |
| `--nom`, `--desc`, `--url`, `--depot` | forcer un champ |
| `--couleur <hex>` | couleur d'accent de la carte |
| `--icone <lien>`, `--emoji <emoji>` | vignette, et son repli si l'image ne charge pas |
| `--tags a,b,c` | étiquettes |
| `--theme <thème>` | page du passeport : `geo`, `nombres`, `mots`, `logique`, `aventure` (devinée depuis les tags sinon) |
| `--id <slug>` | identifiant (défaut : nom du dépôt) |
| `--retirer` | retirer le jeu du hub |
| `--no-push` | écrire et commit, sans pousser |
| `--dry-run` | montrer ce qui serait fait, sans rien écrire |

Relancer le script sur un jeu déjà présent le **met à jour** : l'icône, l'URL et
la couleur sont rafraîchies, mais la date d'ajout, la description, les tags,
l'emoji et le bloc `passeport` (thème, raccordement, mission) sont conservés. Pour remplacer une description écrite à
la main, il faut la donner : `--desc "…"`.

> **Sur la couleur.** Le script prend `theme_color` du manifest, qui est une
> couleur de *fond* — souvent très sombre, donc invisible comme accent. Si la
> carte manque de peps, force une couleur vive : `--couleur "#e7002a"`.


## Métadonnées du passeport

Une entrée peut conserver ses champs historiques et ajouter :

```json
{
  "dossier": "Geo-Trouve-Tout",
  "passeport": {
    "theme": "geo",
    "connecte": true,
    "mission": "Fais un tour du monde",
    "consigne": "10 réponses à essayer · Géo Trouve-Tout"
  }
}
```

`dossier` sert aux liens locaux. Une catégorie seule n’active pas les tampons :
le jeu doit être raccordé au module commun. Le script `ajouter-jeu.mjs` conserve
ces métadonnées lors des mises à jour.
