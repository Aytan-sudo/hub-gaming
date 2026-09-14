import { readdir, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const racine = new URL('../', import.meta.url);
async function fichiers(dossier) {
    const resultat = [];
    for (const e of await readdir(new URL(dossier, racine), { withFileTypes: true })) {
        if (e.isDirectory()) resultat.push(...await fichiers(dossier + e.name + '/'));
        else resultat.push(dossier + e.name);
    }
    return resultat;
}
for (const fichier of [...await fichiers('js/'), ...await fichiers('commun/'), ...await fichiers('scripts/'), 'sw.js']) {
    if (/\.(mjs|js)$/.test(fichier)) execFileSync(process.execPath, ['--check', new URL(fichier, racine).pathname]);
}
const paquet = JSON.parse(await readFile(new URL('package.json', racine)));
const sw = await readFile(new URL('sw.js', racine), 'utf8');
const app = await readFile(new URL('js/hub.js', racine), 'utf8');
const html = await readFile(new URL('index.html', racine), 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
if (new Set(ids).size !== ids.length) throw new Error('Identifiant HTML dupliqué');
for (const [, id] of app.matchAll(/\$\('([^']+)'\)/g)) if (!ids.includes(id)) throw new Error(`Élément absent : ${id}`);
const catalogue = JSON.parse(await readFile(new URL('jeux.json', racine)));
const noms = new Set();
for (const jeu of catalogue.jeux) {
    if (!jeu.id || noms.has(jeu.id) || !jeu.nom || !jeu.description) throw new Error('Jeu invalide ou dupliqué');
    noms.add(jeu.id);
    const url = new URL(jeu.url);
    if (url.origin !== 'https://aytan-sudo.github.io') throw new Error(`Origine inattendue : ${jeu.id}`);
    if (!['geo', 'nombres', 'mots', 'logique', 'aventure'].includes(jeu.passeport?.theme)) throw new Error(`Thème absent : ${jeu.id}`);
    if (jeu.passeport.connecte && (!jeu.passeport.mission || !jeu.passeport.consigne)) throw new Error(`Mission incomplète : ${jeu.id}`);
}
if (!sw.includes(`hub-gaming-${paquet.version}`) || !app.includes(`const VERSION = '${paquet.version}'`)) throw new Error('Versions discordantes');
for (const f of [...await fichiers('js/'), ...await fichiers('commun/'), ...await fichiers('css/'), ...await fichiers('assets/'), 'index.html', 'jeux.json', 'manifest.webmanifest']) {
    if (!sw.includes(`'${f}'`)) throw new Error(`Fichier hors ligne manquant : ${f}`);
}
console.log('Syntaxe, interface, catalogue, versions et coquille hors ligne vérifiés.');
