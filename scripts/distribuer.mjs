// Une seule source commune, des copies embarquées pour le hors-ligne.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
const racine = new URL('../', import.meta.url);
const destinations = ['Geo-Trouve-Tout', 'html_multiplication', 'Sutom', 'Demineur', 'Slitherlink'];
const fichiers = ['passeport.js', 'liaison.js', 'passeport.css'];
for (const destination of destinations) {
    const cible = new URL(`../${destination}/commun/`, racine);
    if (!process.argv.includes('--check')) await mkdir(cible, { recursive: true });
    for (const nom of fichiers) {
        const source = await readFile(new URL(`commun/${nom}`, racine), 'utf8');
        if (process.argv.includes('--check')) {
            if (await readFile(new URL(nom, cible), 'utf8') !== source) throw new Error(`Copie désynchronisée : ${destination}/commun/${nom}`);
        } else await writeFile(new URL(nom, cible), source);
    }
}
console.log('Module commun : copies ' + (process.argv.includes('--check') ? 'vérifiées.' : 'distribuées.'));
