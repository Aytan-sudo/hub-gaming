// Exporte assets/icon.svg en icônes PNG pour iOS et le manifeste (180, 192,
// 512 px). À lancer seulement quand le dessin change : `npm run icones`. Les
// tests ne réécrivent plus ces fichiers suivis par git.
// Utilise le Playwright du dossier voisin OUTILS, comme tests/navigateur.mjs.
import { webkit } from '../../OUTILS/node_modules/playwright/index.mjs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const racine = fileURLToPath(new URL('../', import.meta.url));
const svg = await readFile(`${racine}assets/icon.svg`, 'utf8');
const navigateur = await webkit.launch();
try {
    const page = await navigateur.newPage();
    for (const taille of [180, 192, 512]) {
        await page.setViewportSize({ width: taille, height: taille });
        await page.setContent(`<style>body{margin:0}svg{width:${taille}px;height:${taille}px;display:block}</style>${svg}`);
        await page.locator('svg').screenshot({ path: `${racine}assets/icon-${taille}.png` });
    }
} finally {
    await navigateur.close();
}
console.log('Icônes 180, 192 et 512 px exportées depuis assets/icon.svg.');
