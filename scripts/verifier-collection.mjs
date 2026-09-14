// À lancer depuis le checkout de la collection : chaque SW doit conserver
// les caches de ses voisins lors de son activation, même avec un ancien cache.
import { readFile, access } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import assert from 'node:assert/strict';
const racine = new URL('../../', import.meta.url);
const catalogue = JSON.parse(await readFile(new URL('HUB/jeux.json', racine)));
let verifies = 0;
for (const dossier of ['HUB', ...catalogue.jeux.map(j => j.dossier)]) {
    const fichier = new URL(`${dossier}/sw.js`, racine);
    try { await access(fichier); } catch { continue; } // le portage Maze n'a pas de SW
    const source = await readFile(fichier, 'utf8');
    const courant = source.match(/const (?:CACHE|VERSION) = '([^']+)'/)[1];
    const prefixe = courant.replace(/\d+(?:\.\d+)*$/, '');
    const ancien = prefixe + '0.0.0';
    const voisin = 'un-autre-jeu-8.0.0';
    const supprimes = [];
    const ecouteurs = {};
    let attente;
    runInNewContext(source, {
        self: { addEventListener: (nom, fn) => { ecouteurs[nom] = fn; }, clients: { claim: async () => {} } },
        caches: { keys: async () => [courant, ancien, voisin], delete: async n => { supprimes.push(n); return true; } }
    });
    ecouteurs.activate({ waitUntil: promesse => { attente = promesse; } });
    await attente;
    assert.deepEqual(supprimes, [ancien], `${dossier} : purge limitée au jeu`);
    verifies++;
}
console.log(`${verifies} service workers : anciens caches nettoyés, voisins conservés.`);
