# Hub de jeux

Page d'accueil qui rassemble mes jeux web. Chaque jeu reste dans son propre dépôt,
avec ses propres GitHub Pages : le hub ne fait que pointer vers eux.

**En ligne : https://aytan-sudo.github.io/hub-gaming/**

## Comment c'est fait

`index.html` ne contient aucun nom de jeu. Il lit `jeux.json` et fabrique les cartes.
Ajouter un jeu, c'est donc ajouter une entrée JSON — jamais toucher à la mise en page.

```
index.html        structure de la page
css/style.css     apparence (clair et sombre)
js/hub.js         lit jeux.json, construit la grille
jeux.json         les données : un objet par jeu
ajouter-jeu.mjs   ajoute un jeu au hub depuis le dossier de ce jeu
```

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
| `--id <slug>` | identifiant (défaut : nom du dépôt) |
| `--retirer` | retirer le jeu du hub |
| `--no-push` | écrire et commit, sans pousser |
| `--dry-run` | montrer ce qui serait fait, sans rien écrire |

Relancer le script sur un jeu déjà présent le **met à jour** : l'icône, l'URL et
la couleur sont rafraîchies, mais la date d'ajout, la description, les tags et
l'emoji réglés à la main sont conservés. Pour remplacer une description écrite à
la main, il faut la donner : `--desc "…"`.

> **Sur la couleur.** Le script prend `theme_color` du manifest, qui est une
> couleur de *fond* — souvent très sombre, donc invisible comme accent. Si la
> carte manque de peps, force une couleur vive : `--couleur "#e7002a"`.

## Voir la page en local

`jeux.json` est chargé par `fetch`, ce qui ne marche pas en ouvrant le fichier
directement (`file://`). Il faut un petit serveur :

```bash
cd ~/dev/python/Jeux_Pages/HUB
python3 -m http.server 8000
# puis http://localhost:8000
```

## Ajouter un jeu à la main

Si le script ne convient pas, une entrée de `jeux.json` ressemble à ça — seuls
`id`, `nom` et `url` sont vraiment nécessaires :

```json
{
  "id": "sutom",
  "nom": "SUTOM",
  "description": "Devinez le mot caché en six essais.",
  "url": "https://aytan-sudo.github.io/sutom/",
  "depot": "https://github.com/Aytan-sudo/sutom",
  "couleur": "#e7002a",
  "icone": "https://aytan-sudo.github.io/sutom/assets/icon-192.png",
  "emoji": "🔴",
  "tags": ["mots", "réflexion"],
  "ajoute": "2026-08-17"
}
```

L'ordre des jeux dans le tableau est l'ordre d'affichage.
