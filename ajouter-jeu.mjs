#!/usr/bin/env node
/**
 * Ajoute (ou met a jour) un jeu dans le hub, puis commit et push.
 *
 * Lance depuis le dossier d'un jeu :
 *     node /chemin/vers/HUB/ajouter-jeu.mjs
 *
 * Tout est devine automatiquement a partir du depot git, du manifest et de
 * l'index.html du jeu. Chaque champ reste surchargeable par une option.
 *
 * Options :
 *   --dir <chemin>     dossier du jeu             (defaut : dossier courant)
 *   --nom <texte>      nom affiche
 *   --desc <texte>     description (1 phrase)
 *   --url <lien>       lien de jeu
 *   --depot <lien>     lien du code source
 *   --couleur <hex>    couleur d'accent de la carte
 *   --icone <lien>     image de la vignette
 *   --emoji <emoji>    repli si l'icone ne charge pas
 *   --tags a,b,c       etiquettes
 *   --theme <theme>    page du passeport : geo, nombres, mots, logique, aventure
 *                      (defaut : devine depuis les tags, conserve a la mise a jour)
 *   --id <slug>        identifiant (defaut : nom du depot)
 *   --retirer          retire le jeu du hub au lieu de l'ajouter
 *   --no-push          ecrit et commit, mais ne pousse pas
 *   --dry-run          montre ce qui serait fait, n'ecrit rien
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { runInNewContext } from "node:vm";

const HUB = dirname(fileURLToPath(import.meta.url));
const FICHIER_JEUX = join(HUB, "jeux.json");

// Les themes viennent du module du passeport : une seule liste pour le hub et les jeux.
const passeport = { module: { exports: {} } };
runInNewContext(readFileSync(join(HUB, "commun/passeport.js"), "utf8"), passeport);
const THEMES = Object.keys(passeport.module.exports.THEMES);

/* ------------------------------------------------------------------ outils */

const sortieDe = (cmd, args, cwd) =>
    execFileSync(cmd, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

/** Comme sortieDe, mais renvoie null au lieu de lever si la commande echoue. */
function essaie(cmd, args, cwd) {
    try {
        return sortieDe(cmd, args, cwd);
    } catch {
        return null;
    }
}

const info = (msg) => console.log(msg);
const alerte = (msg) => console.log(`  ⚠  ${msg}`);

function abandonne(msg) {
    console.error(`\n✖  ${msg}\n`);
    process.exit(1);
}

/* ------------------------------------------------------------- lecture jeu */

/** Extrait proprietaire et depot depuis l'URL du remote git. */
function depotDeGit(dossier) {
    const remote = essaie("git", ["remote", "get-url", "origin"], dossier);
    if (!remote) return null;

    const m = remote.match(/github\.com[:/]([^/]+)\/(.+?)(?:\.git)?$/);
    return m ? { proprietaire: m[1], nom: m[2] } : null;
}

/** URL GitHub Pages : site utilisateur a la racine, sinon site de projet. */
function urlPages({ proprietaire, nom }) {
    const hote = `${proprietaire.toLowerCase()}.github.io`;
    return nom.toLowerCase() === hote ? `https://${hote}/` : `https://${hote}/${nom}/`;
}

function lireManifest(dossier) {
    for (const f of ["manifest.webmanifest", "manifest.json", "site.webmanifest"]) {
        const chemin = join(dossier, f);
        if (!existsSync(chemin)) continue;
        try {
            return JSON.parse(readFileSync(chemin, "utf8"));
        } catch {
            alerte(`${f} est illisible, il est ignore.`);
        }
    }
    return {};
}

function lireIndex(dossier) {
    const chemin = join(dossier, "index.html");
    if (!existsSync(chemin)) return {};

    const html = readFileSync(chemin, "utf8");
    const cherche = (re) => html.match(re)?.[1]?.trim() || null;

    return {
        titre: cherche(/<title[^>]*>([\s\S]*?)<\/title>/i),
        description: cherche(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i),
        couleur: cherche(/<meta\s+name=["']theme-color["']\s+content=["']([^"']*)["']/i),
    };
}

/** Choisit l'icone la plus adaptee du manifest et la resout en URL absolue. */
function iconeDepuisManifest(manifest, base) {
    const icones = Array.isArray(manifest.icons) ? manifest.icons : [];
    if (icones.length === 0) return null;

    const taille = (i) => parseInt(i.sizes?.split("x")[0], 10) || 0;
    // On vise ~192px : assez net pour une vignette, sans charger un 512 pour rien.
    const choisie =
        icones.find((i) => taille(i) === 192) ||
        icones.filter((i) => taille(i) > 0).sort((a, b) => taille(a) - taille(b))[0] ||
        icones[0];

    return choisie?.src ? new URL(choisie.src.replace(/^\.\//, ""), base).href : null;
}

/** Range un jeu dans une page du passeport ; la plupart des jeux de la collection sont des casse-tete. */
function themeDevine(tags) {
    const mots = tags.join(" ").toLowerCase();
    if (/géo|geograph|pays|capitale/.test(mots)) return "geo"; // pas « carte » : le Solitaire a des cartes
    if (/\bmots?\b|lettre|vocabulaire|orthographe/.test(mots)) return "mots";
    if (/calcul|math|multiplication|addition/.test(mots)) return "nombres";
    if (/aventure|arcade|réflexes|labyrinthe|action/.test(mots)) return "aventure";
    return "logique";
}

/* ------------------------------------------------------------------ script */

const { values: opt } = parseArgs({
    options: {
        dir: { type: "string" },
        nom: { type: "string" },
        desc: { type: "string" },
        url: { type: "string" },
        depot: { type: "string" },
        couleur: { type: "string" },
        icone: { type: "string" },
        emoji: { type: "string" },
        tags: { type: "string" },
        theme: { type: "string" },
        id: { type: "string" },
        retirer: { type: "boolean", default: false },
        push: { type: "boolean", default: true },
        "dry-run": { type: "boolean", default: false },
    },
    allowPositionals: false,
    // Sans cela, parseArgs refuse « --no-push », pourtant documenté.
    allowNegative: true,
});

const simulation = opt["dry-run"];
const dossierJeu = resolve(opt.dir || process.cwd());

if (!existsSync(dossierJeu)) {
    abandonne(`Le dossier ${dossierJeu} n'existe pas.`);
}
if (resolve(dossierJeu) === resolve(HUB)) {
    abandonne("Ce script doit etre lance depuis le dossier d'un jeu, pas depuis le hub lui-meme.");
}
if (opt.theme && !THEMES.includes(opt.theme)) {
    abandonne(`Theme inconnu « ${opt.theme} ». Choix possibles : ${THEMES.join(", ")}.`);
}

/* -- 1. Rassembler les informations du jeu -- */

const depotGit = depotDeGit(dossierJeu);
const manifest = lireManifest(dossierJeu);
const page = lireIndex(dossierJeu);

const id = opt.id || depotGit?.nom || basename(dossierJeu);
const url = opt.url || (depotGit ? urlPages(depotGit) : null);

if (!url) {
    abandonne(
        "Impossible de deviner l'adresse du jeu : aucun remote GitHub trouve.\n" +
        "   Ajoute-la a la main avec --url https://…"
    );
}

const jeu = {
    id,
    nom: opt.nom || manifest.name || page.titre || id,
    description: opt.desc || manifest.description || page.description || "",
    url,
    depot: opt.depot || (depotGit ? `https://github.com/${depotGit.proprietaire}/${depotGit.nom}` : ""),
    couleur: opt.couleur || manifest.theme_color || page.couleur || "",
    icone: opt.icone || iconeDepuisManifest(manifest, url) || "",
    emoji: opt.emoji || "🎮",
    tags: opt.tags ? opt.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    ajoute: new Date().toISOString().slice(0, 10),
};
jeu.passeport = { theme: opt.theme || themeDevine(jeu.tags), connecte: false };

// Un titre de page porte souvent un suffixe decoratif : on garde la partie utile.
jeu.nom = jeu.nom.split(/\s+[—–|]\s+/)[0].trim();

/* -- 2. Verifications qui n'empechent pas d'avancer -- */

if (!opt.retirer) {
    const enAvance = essaie("git", ["log", "--oneline", "@{upstream}..HEAD"], dossierJeu);
    if (enAvance) {
        alerte(`${enAvance.split("\n").length} commit(s) non pousse(s) dans ${basename(dossierJeu)}.`);
    }
}

/* -- 3. Mettre a jour jeux.json -- */

if (!existsSync(FICHIER_JEUX)) {
    abandonne(`${FICHIER_JEUX} est introuvable.`);
}

const donnees = JSON.parse(readFileSync(FICHIER_JEUX, "utf8"));
donnees.jeux = Array.isArray(donnees.jeux) ? donnees.jeux : [];

const position = donnees.jeux.findIndex((j) => j.id === jeu.id);
let action;
let carte = jeu;

if (opt.retirer) {
    if (position === -1) abandonne(`Aucun jeu « ${jeu.id} » dans le hub.`);
    donnees.jeux.splice(position, 1);
    action = `Retire « ${jeu.id} » du hub`;
} else if (position === -1) {
    donnees.jeux.push(jeu);
    action = `Ajoute « ${jeu.nom} » au hub`;
} else {
    // Mise a jour : on conserve la date d'ajout d'origine et ce que l'utilisateur
    // a pu affiner a la main (description, tags, emoji). Le texte du manifest est
    // rarement meilleur qu'une phrase ecrite pour la carte : il ne reprend la main
    // que si la carte n'en avait pas, ou si --desc le demande explicitement.
    const ancien = donnees.jeux[position];
    donnees.jeux[position] = {
        ...ancien,
        ...jeu,
        ajoute: ancien.ajoute || jeu.ajoute,
        description: opt.desc || ancien.description || jeu.description,
        emoji: opt.emoji || ancien.emoji || jeu.emoji,
        tags: opt.tags ? jeu.tags : ancien.tags?.length ? ancien.tags : jeu.tags,
        // Le raccordement (mission, consigne) se regle a la main : on n'y touche jamais.
        passeport: ancien.passeport
            ? { ...ancien.passeport, theme: opt.theme || ancien.passeport.theme }
            : { ...jeu.passeport, theme: opt.theme || themeDevine(opt.tags ? jeu.tags : ancien.tags || []) },
    };
    carte = donnees.jeux[position];
    action = `Met a jour « ${jeu.nom} » dans le hub`;
}

info("");
info(`  ${action}`);
if (!opt.retirer) {
    info(`     ${carte.url}`);
    info(`     Passeport : ${carte.passeport.theme}${opt.theme ? "" : " (--theme pour changer)"}`);
    if (carte.description) {
        info(`     ${carte.description}`);
    } else {
        alerte("Pas de description. Ajoute --desc \"…\" pour une carte plus parlante.");
    }
}
info("");

if (simulation) {
    info("  (--dry-run : rien n'a ete ecrit)\n");
    process.exit(0);
}

writeFileSync(FICHIER_JEUX, JSON.stringify(donnees, null, 2) + "\n");

/* -- 4. Commit et push depuis le hub -- */

if (!existsSync(join(HUB, ".git"))) {
    alerte("Le hub n'est pas encore un depot git : fichier ecrit, rien de pousse.\n");
    process.exit(0);
}

const modifie = essaie("git", ["status", "--porcelain", "jeux.json"], HUB);
if (!modifie) {
    info("  Le hub etait deja a jour, rien a commiter.\n");
    process.exit(0);
}

try {
    sortieDe("git", ["add", "jeux.json"], HUB);
    sortieDe("git", ["commit", "-m", action], HUB);
    info("  ✓ Commit effectue");
} catch (err) {
    abandonne(`Le commit a echoue :\n${err.stderr || err.message}`);
}

if (!opt.push) {
    info("  (--no-push : le commit reste local)\n");
    process.exit(0);
}

try {
    sortieDe("git", ["push"], HUB);
    info("  ✓ Pousse sur GitHub — la page sera a jour dans une minute\n");
} catch (err) {
    abandonne(`Le push a echoue :\n${err.stderr || err.message}`);
}
