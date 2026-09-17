// Chaque jeu raccordé, joué pour de vrai sous WebKit avec un profil, jusqu'au
// tampon. Manuel comme `navigateur.mjs`, jamais en CI : il faut Playwright et
// plusieurs minutes.
//
// Ce que ce parcours vérifie, et que les tests unitaires ne peuvent pas voir :
// le compteur d'effort ne donne rien sous le seuil et donne le tampon au seuil
// exact, la réussite le donne tout de suite, le profil survit au rechargement,
// le localStorage du mode invité reste vide, et un second profil n'hérite de
// rien.
//
// Les seuils étant hauts (cent coups pour 2048), le parcours pose le compteur
// du jeu à « seuil − 2 » avant les deux actions qui comptent. Le compteur posé
// est bien celui que le jeu écrit, et les deux dernières actions sont de vraies
// actions de jeu : c'est le passage du seuil qu'on mesure, pas le compteur.
//
// Pièges rencontrés, et pourquoi le code est ainsi :
//
//  - Diamants refuse les échanges qui n'alignent rien, à juste titre. On lit
//    donc le plateau affiché et on cherche un échange qui aligne vraiment.
//  - Lasers verrouille certains miroirs. On en prend un libre, et on tourne
//    deux fois le même : la grille revient à son état de départ, la partie ne
//    peut pas se gagner en route, et le tampon ne vient que de l'effort.
//  - Snake refuse toute direction pendant la pause et le compte à rebours de
//    reprise, et en « Classique » les murs le tuent avant qu'on ait pu tourner.
//    On choisit « Sans murs » dans les réglages, comme un joueur le ferait :
//    le plateau s'enroule, et parcourir une ligne entière passe forcément sur
//    le fruit s'il s'y trouve. Aucune visée, aucun risque de mort.

import { webkit, devices } from '../../OUTILS/node_modules/playwright/index.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const racine = fileURLToPath(new URL('../../', import.meta.url));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.webp': 'image/webp', '.mp3': 'audio/mpeg' };

const serveur = createServer(async (req, res) => {
    let chemin = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (chemin.endsWith('/')) chemin += 'index.html';
    const fichier = resolve(racine, '.' + chemin);
    if (!fichier.startsWith(racine)) { res.writeHead(403); res.end(); return; }
    try {
        const data = await readFile(fichier);
        res.writeHead(200, { 'Content-Type': types[extname(fichier)] || 'application/octet-stream' });
        res.end(data);
    } catch { res.writeHead(404); res.end('Absent'); }
});
await new Promise(r => serveur.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${serveur.address().port}`;

const navigateur = await webkit.launch();
const contexte = await navigateur.newContext({ ...devices['iPhone SE'] });
const page = await contexte.newPage();
const erreurs = [];
page.on('pageerror', e => erreurs.push(`${page.url()} : ${e.message}`));

// Le profil se crée dans le hub, dans le même contexte que les jeux : un autre
// contexte n'aurait pas le même localStorage, et le bandeau afficherait une
// erreur sur plusieurs lignes au lieu du prénom.
await page.goto(`${base}/HUB/`);
const profil = await page.evaluate(() => Passeport.coffre.creerProfil({ nom: 'Camille' }).id);
const jour = await page.evaluate(() => Passeport.jourLocal());

const tampon = (jeu, qui = profil) => page.evaluate(
    ([p, j, d]) => Boolean(Passeport.coffre.lire(`activite/${p}/${d}/${j}`)), [qui, jeu, jour]);

const ouvrir = async (dossier, attendre) => {
    await page.goto(`${base}/${dossier}/?profil=${profil}`);
    await page.locator('.passeport-ruban a').waitFor();
    if (attendre) await page.locator(attendre).first().waitFor();
};

const fermerDialogues = () => page.evaluate(
    () => document.querySelectorAll('dialog[open]').forEach(d => d.close()));

const poserCompteur = (espace, cle, champ, n) => page.evaluate(
    ([e, c, ch, v, d]) => Passeport.stockageJeu(e).setItem(c, JSON.stringify({ jour: d, [ch]: v })),
    [espace, cle, champ, n, jour]);

const faits = [];
const verifier = async (nom, quoi) => {
    const avant = erreurs.length;
    await quoi();
    assert.equal(erreurs.length, avant, `${nom} : ${erreurs.slice(avant).join(' | ')}`);
    faits.push(nom);
    console.log(`  ✓ ${nom}`);
};

console.log('\nLes jeux raccordés, joués avec un profil\n');

// ── 2048 : cent coups, ou l'objectif ────────────────────────────────────────

await verifier('2048 — 99 coups ne donnent rien, le centième donne le tampon', async () => {
    await ouvrir('2048', '.tuile');
    await page.keyboard.press('ArrowLeft');             // un vrai coup, compté 1
    await poserCompteur('2048', '2048.passeport', 'coups', 98);
    await page.keyboard.press('ArrowUp');               // le 99e
    assert.equal(await tampon('2048'), false, 'tampon donné trop tôt');
    await page.keyboard.press('ArrowRight');            // le 100e
    assert.equal(await tampon('2048'), true, 'tampon manquant au seuil');
});

await verifier('2048 — le profil survit au rechargement, le localStorage invité reste vide', async () => {
    await page.reload();
    await page.locator('.tuile').first().waitFor();
    assert.equal(new URL(page.url()).searchParams.get('profil'), profil);
    assert.equal(await page.evaluate(() => localStorage.getItem('2048.preferences')), null);
    assert.ok(await page.evaluate(() => Passeport.stockageJeu('2048').getItem('2048.partie')));
});

// ── Untangle : vingt sommets, ou la grille démêlée ──────────────────────────

await verifier('Untangle — 19 sommets ne donnent rien, le vingtième donne le tampon', async () => {
    await ouvrir('Untangle', '#plateau .sommet');
    const glisser = async () => {
        const boite = await page.locator('#plateau .sommet').first().boundingBox();
        await page.mouse.move(boite.x + boite.width / 2, boite.y + boite.height / 2);
        await page.mouse.down();
        await page.mouse.move(boite.x + boite.width / 2 + 24, boite.y + boite.height / 2 + 18, { steps: 6 });
        await page.mouse.up();
        await page.waitForTimeout(60);
    };
    await glisser();
    await poserCompteur('untangle', 'untangle.passeport', 'gestes', 18);
    await glisser();
    assert.equal(await tampon('untangle'), false, 'tampon donné trop tôt');
    await glisser();
    assert.equal(await tampon('untangle'), true, 'tampon manquant au seuil');
});

// ── Laser & Miroirs : vingt rotations, ou le cristal ────────────────────────

await verifier('Lasers — 19 rotations ne donnent rien, la vingtième donne le tampon', async () => {
    await ouvrir('Lasers', '[data-mirror-index]');
    // Un miroir verrouillé ne tourne pas, et ne doit pas compter : on en prend
    // un libre. Deux rotations du même ramènent la grille à son état de départ,
    // donc la partie ne se gagne pas en route.
    const libre = page.locator('[data-mirror-index]:not(.mirror--locked)').first();
    await libre.waitFor();
    const tourner = async () => {
        await fermerDialogues();
        await libre.click({ force: true });
        await page.waitForTimeout(60);
    };
    await tourner();
    await tourner();
    await poserCompteur('lasers', 'laser-mirror:passeport', 'rotations', 17);
    await tourner();
    await tourner();
    assert.equal(await tampon('laser-mirror'), false, 'tampon donné trop tôt');
    await tourner();
    assert.equal(await tampon('laser-mirror'), true, 'tampon manquant au seuil');
});

// ── Dames : vingt coups, ou une partie gagnée ───────────────────────────────

await verifier('Dames — le vingtième coup du joueur donne le tampon', async () => {
    await ouvrir('Dames', '.case.depart');
    await poserCompteur('dames', 'dames.passeport', 'coups', 19);
    await page.locator('.case.depart').first().click({ force: true });
    await page.locator('.case.cible').first().waitFor();
    await page.locator('.case.cible').first().click({ force: true });
    await page.waitForTimeout(600);
    assert.equal(await tampon('Dames'), true, 'tampon manquant au seuil');
});

// ── Diamants : vingt échanges, ou le défi du jour ───────────────────────────

await verifier('Diamants — le vingtième échange donne le tampon', async () => {
    await ouvrir('Diamants', '.grille .pierre');
    await poserCompteur('diamants', 'diamants:passeport', 'echanges', 19);
    assert.equal(await tampon('diamants'), false);
    // Le moteur refuse les échanges qui n'alignent rien — et un refus ne doit
    // justement pas compter. On lit le plateau tel qu'il est affiché et on
    // cherche un échange qui aligne vraiment, avant de le jouer au clic.
    const echange = await page.evaluate(() => {
        const grille = document.querySelector('.grille');
        const colonnes = getComputedStyle(grille).gridTemplateColumns.split(' ').length;
        const cases = [...grille.querySelectorAll('.case')];
        const gemmes = cases.map(c => c.querySelector('.pierre')?.dataset.gemme ?? null);
        const lignes = gemmes.length / colonnes;
        const aligne = (tableau, index) => {
            const type = tableau[index];
            if (!type) return false;
            const x = index % colonnes, y = Math.floor(index / colonnes);
            let h = 1;
            for (let i = x - 1; i >= 0 && tableau[y * colonnes + i] === type; i--) h++;
            for (let i = x + 1; i < colonnes && tableau[y * colonnes + i] === type; i++) h++;
            let v = 1;
            for (let j = y - 1; j >= 0 && tableau[j * colonnes + x] === type; j--) v++;
            for (let j = y + 1; j < lignes && tableau[j * colonnes + x] === type; j++) v++;
            return h >= 3 || v >= 3;
        };
        for (let i = 0; i < gemmes.length; i++) {
            for (const j of [i + 1, i + colonnes]) {
                if (j >= gemmes.length) continue;
                if (j === i + 1 && j % colonnes === 0) continue;      // pas de saut de ligne
                if (!gemmes[i] || !gemmes[j]) continue;
                const essai = [...gemmes];
                [essai[i], essai[j]] = [essai[j], essai[i]];
                if (aligne(essai, i) || aligne(essai, j)) return [i, j];
            }
        }
        return null;
    });
    assert.ok(echange, 'aucun échange alignant sur ce plateau');
    const cases = page.locator('.grille .case');
    await cases.nth(echange[0]).click({ force: true });
    await cases.nth(echange[1]).click({ force: true });
    await page.waitForTimeout(700);
    assert.equal(await tampon('diamants'), true, 'l’échange n’a pas compté');
});

// ── Motamorphose : dix mots, ou la chaîne ───────────────────────────────────

await verifier('Motamorphose — le dixième mot accepté donne le tampon', async () => {
    await ouvrir('Motamorphose', '#saisie-mot');
    await poserCompteur('motamorphose', 'motamorphose:passeport', 'mots', 9);
    // Un mot vraiment accepté : on demande un indice au jeu, puis on le saisit.
    // Le dictionnaire se charge d'abord, le bouton reste désactivé jusque-là.
    await page.locator('#indice:not([disabled])').waitFor();
    await page.locator('#indice').click();
    await page.waitForTimeout(300);
    const propose = await page.locator('#erreur').textContent();
    const mot = (propose.match(/«\s*([A-Za-zÀ-ÿ]+)\s*»/) ?? [])[1];
    assert.ok(mot, `aucun indice lisible : ${propose}`);
    await page.locator('#saisie-mot').fill(mot);
    await page.locator('#formulaire-mot').evaluate(f => f.requestSubmit());
    await page.waitForTimeout(250);
    assert.equal(await tampon('motamorphose'), true, 'tampon manquant au seuil');
});

// ── Snake : vingt fruits, ou un record ──────────────────────────────────────

const TICK_SNAKE = 145;        // départMs de la vitesse Normal, à score 0
const scoreSnake = () => page.locator('#hud-score').textContent().then(x => Number(x.trim()) || 0);
const finieSnake = () => page.locator('#dialogue-fin[open]').count().then(n => n > 0);

const ouvrirSnakeSansMurs = async qui => {
    await page.goto(`${base}/Snake/?profil=${qui}`);
    await page.locator('.passeport-ruban a').waitFor();
    await page.locator('#cadre-plateau').waitFor();
    await page.locator('#bouton-reglages').click();
    await page.locator('#choix-variante [data-valeur="sans-murs"]').click();
    await fermerDialogues();
    await page.waitForTimeout(300);
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(400);
};

// Un peigne : une ligne entière, puis un cran plus bas. Un serpent qui a grandi
// finit par se mordre — on relance alors une partie et on continue. Le compteur
// du passeport tient la journée, toutes parties confondues.
const chasserUnFruit = async () => {
    for (let essai = 0; essai < 4; essai++) {
        if (await finieSnake()) {
            await fermerDialogues();
            await page.locator('#bouton-nouvelle').click({ force: true });
            await fermerDialogues();
            await page.waitForTimeout(250);
            await page.keyboard.press('ArrowRight');
            await page.waitForTimeout(400);
        }
        const depart = await scoreSnake();
        for (let ligne = 0; ligne < 21; ligne++) {
            await page.keyboard.press('ArrowRight');
            // 26 cases pour un plateau de 20 : la ligne est couverte en entier
            // même si le compte à rebours et les virages font glisser d'un cran.
            // À 22, il manquait deux colonnes par tour et la chasse pouvait
            // demander trente tours au lieu de vingt.
            await page.waitForTimeout(26 * TICK_SNAKE);
            if (await scoreSnake() > depart) return true;
            if (await finieSnake()) break;                    // mordu : on relance
            await page.keyboard.press('ArrowDown');
            await page.waitForTimeout(TICK_SNAKE + 40);
        }
    }
    return false;
};

await verifier('Snake — 19 fruits ne donnent rien, le vingtième donne le tampon', async () => {
    await ouvrirSnakeSansMurs(profil);
    await poserCompteur('snake', 'snake.passeport', 'fruits', 18);
    // Un record déjà haut pour cette variante : une partie qui se termine ne le
    // battra pas, et le tampon ne pourra venir que de l'effort. Sans cela, le
    // serpent meurt parfois en route et gagne le tampon par la réussite — ce
    // qui est juste, mais ne mesure plus le seuil.
    await page.evaluate(() => Passeport.stockageJeu('snake').setItem('snake.records',
        JSON.stringify({ schema: 1, donnees: { 'sans-murs|normal':
            { meilleurScore: 99, longueurMax: 4, dureeMaxMs: 0, parties: 1, fruits: 0 } } })));
    assert.ok(await chasserUnFruit(), 'aucun fruit mangé');
    assert.equal(await tampon('snake'), false, 'tampon donné trop tôt');     // le 19e
    assert.ok(await chasserUnFruit(), 'deuxième fruit manqué');
    assert.equal(await tampon('snake'), true, 'tampon manquant au seuil');   // le 20e
});

await verifier('Snake — un record battu donne le tampon, sans attendre le seuil', async () => {
    // Sur un profil neuf, le record de cette variante est à zéro : le premier
    // fruit le bat. C'est la fin de partie qui le pèse — on se mord donc la
    // queue, trois quarts de tour d'affilée, un par pas.
    await page.goto(`${base}/HUB/`);
    const cadet = await page.evaluate(() => Passeport.coffre.creerProfil({ nom: 'Noé' }).id);
    await ouvrirSnakeSansMurs(cadet);
    assert.ok(await chasserUnFruit(), 'aucun fruit mangé');
    assert.equal(await tampon('snake', cadet), false, 'un fruit seul ne vaut pas le seuil');
    // Des quarts de tour serrés, répétés jusqu'à la morsure : un seul tour de
    // 2×2 suffit en théorie, mais deux touches tombées dans le même pas
    // élargissent la boucle et le serpent s'en sort.
    const virages = ['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'];
    for (let i = 0; i < 16 && !(await finieSnake()); i++) {
        await page.keyboard.press(virages[i % 4]);
        await page.waitForTimeout(TICK_SNAKE + 25);
    }
    await page.waitForTimeout(600);
    assert.equal(await finieSnake(), true, 'la partie ne s’est pas terminée');
    assert.equal(await tampon('snake', cadet), true, 'aucun tampon après un record battu');
});

// ── Maze for Adventurers : 150 mètres, ou le trésor ─────────────────────────

// Le héros se pilote par `input.virtual`, le chemin des commandes tactiles :
// maintenir une flèche au clavier marcherait aussi, mais on ne saurait pas
// quand un mur arrête le pas. `?debug` expose l'état interne du jeu, qui dit
// les murs de la cellule courante — c'est la seule façon de marcher vraiment
// sans tâtonner.
const ouvrirMaze = async (qui, suite = '') => {
    await page.goto(`${base}/Maze_For_Adventurers/?profil=${qui}&debug${suite}`);
    await page.locator('.passeport-ruban a').waitFor();
    await page.waitForFunction(() => globalThis.mfa?.game);
    if (!suite) {
        // Menu, puis écran des règles : deux fois « Espace », comme au clavier.
        for (let i = 0; i < 2; i++) { await page.keyboard.press('Space'); await page.waitForTimeout(150); }
    }
    await page.waitForFunction(() => mfa.game.screen === 'play');
};

const metresMaze = () => page.evaluate(() => {
    const brut = Passeport.stockageJeu('maze').getItem('maze.passeport');
    return brut ? JSON.parse(brut).metres : null;
});

/** Marche au moins `n` cases, en choisissant à chaque pas une direction sans mur. */
const marcherMaze = n => page.evaluate(async cases => {
    const attendre = ms => new Promise(r => setTimeout(r, ms));
    const depart = mfa.game.totalTraveled;
    const limite = Date.now() + 30000;
    while (mfa.game.totalTraveled - depart < cases && mfa.game.screen === 'play' && Date.now() < limite) {
        const { maze, hero } = mfa.game.level;
        const libres = [0, 1, 2, 3].filter(d => !maze.hasWall(hero.i, hero.j, d));
        mfa.input.virtual.direction = libres[Math.floor(Math.random() * libres.length)] ?? null;
        await attendre(50);
    }
    mfa.input.virtual.direction = null;
    return mfa.game.totalTraveled - depart;
}, n);

await verifier('Maze — sous 150 mètres rien, au passage du seuil le tampon', async () => {
    await ouvrirMaze(profil);
    assert.equal(await tampon('maze-for-adventurers'), false);
    await poserCompteur('maze', 'maze.passeport', 'metres', 138);
    assert.ok(await marcherMaze(6) >= 6, 'le héros n’a pas marché');
    const avant = await metresMaze();
    assert.ok(avant > 138 && avant < 150, `compteur inattendu : ${avant}`);
    assert.equal(await tampon('maze-for-adventurers'), false, 'tampon donné sous le seuil');
    await marcherMaze(150 - avant + 2);
    assert.ok(await metresMaze() >= 150, 'le compteur n’a pas franchi 150');
    assert.equal(await tampon('maze-for-adventurers'), true, 'tampon manquant au seuil');
});

await verifier('Maze — le profil et les mètres survivent au rechargement', async () => {
    const avant = await metresMaze();
    await page.reload();
    await page.locator('.passeport-ruban a').waitFor();
    assert.equal(new URL(page.url()).searchParams.get('profil'), profil, 'profil perdu dans l’adresse');
    assert.equal(await metresMaze(), avant, 'compteur perdu au rechargement');
    assert.equal(await page.evaluate(() => localStorage.getItem('maze.passeport')), null);
    assert.equal(await page.evaluate(() => localStorage.getItem('mfa.muted')), null);
});

await verifier('Maze — le mode invité est resté celui d’avant le raccordement', async () => {
    // `?profil=` vide : sans lui, le coffre reprend le dernier profil choisi.
    // C'est ce que `liaison.js` écrit dans les liens quand personne n'est connecté.
    await page.goto(`${base}/Maze_For_Adventurers/?profil=&debug`);
    await page.locator('.passeport-ruban').waitFor();
    assert.match(await page.locator('.passeport-ruban').textContent(), /Mode invité/);
    await page.waitForFunction(() => globalThis.mfa?.game);
    for (let i = 0; i < 2; i++) { await page.keyboard.press('Space'); await page.waitForTimeout(150); }
    await page.waitForFunction(() => mfa.game.screen === 'play');
    await marcherMaze(8);
    // Aucun compteur nulle part, et le réglage du son reste celui de l'appareil.
    assert.equal(await page.evaluate(() => localStorage.getItem('maze.passeport')), null);
    // La barre empile une commande que la boucle de jeu traite à l'image suivante.
    await page.locator('[data-action="son"]').click();
    await page.waitForFunction(() => localStorage.getItem('mfa.muted') === '1');
    await page.evaluate(() => localStorage.removeItem('mfa.muted'));
});

await verifier('Maze — le trésor trouvé donne le tampon sans les 150 mètres', async () => {
    await page.goto(`${base}/HUB/`);
    const cadet = await page.evaluate(() => Passeport.coffre.creerProfil({ nom: 'Hugo' }).id);
    // Un donjon « petit · promenade » : deux niveaux, aucun minotaure. `?niveau=2`
    // ouvre directement celui du trésor, une grille de 10×10 — 45 mètres de plus
    // court chemin, loin des 150 du seuil d'effort.
    await ouvrirMaze(cadet, '&graine=oubliette-482&taille=petit&difficulte=promenade&niveau=2');
    assert.equal(await page.evaluate(() => mfa.game.level.exitKind), 'treasure');
    // Vers la sortie par le plus court chemin : distances en largeur d'abord,
    // puis on descend la pente à chaque pas.
    const fin = await page.evaluate(async () => {
        const attendre = ms => new Promise(r => setTimeout(r, ms));
        const DELTA = [[0, -1], [1, 0], [0, 1], [-1, 0]];
        const limite = Date.now() + 90000;
        while (mfa.game.screen === 'play' && Date.now() < limite) {
            const { maze, hero, exit } = mfa.game.level;
            const n = maze.n;
            const dist = new Int32Array(n * n).fill(-1);
            dist[exit.j * n + exit.i] = 0;
            let file = [[exit.i, exit.j]];
            while (file.length) {
                const suivante = [];
                for (const [i, j] of file) {
                    for (let d = 0; d < 4; d++) {
                        if (maze.hasWall(i, j, d)) continue;
                        const x = i + DELTA[d][0], y = j + DELTA[d][1];
                        if (x < 0 || y < 0 || x >= n || y >= n || dist[y * n + x] >= 0) continue;
                        dist[y * n + x] = dist[j * n + i] + 1;
                        suivante.push([x, y]);
                    }
                }
                file = suivante;
            }
            let choix = null, proche = dist[hero.j * n + hero.i];
            for (let d = 0; d < 4; d++) {
                if (maze.hasWall(hero.i, hero.j, d)) continue;
                const v = dist[(hero.j + DELTA[d][1]) * n + hero.i + DELTA[d][0]];
                if (v >= 0 && v < proche) { proche = v; choix = d; }
            }
            mfa.input.virtual.direction = choix;
            await attendre(40);
        }
        mfa.input.virtual.direction = null;
        return mfa.game.screen;
    });
    assert.equal(fin, 'victory', `le trésor n’a pas été atteint (écran ${fin})`);
    assert.equal(await tampon('maze-for-adventurers', cadet), true, 'aucun tampon après le trésor');
    const metres = await metresMaze();
    assert.ok(metres < 150, `le tampon vient de l’effort, pas du trésor : ${metres} m`);
    // Rechargement : pas de second tampon, et le profil est toujours là.
    await page.reload();
    await page.locator('.passeport-ruban a').waitFor();
    assert.equal(new URL(page.url()).searchParams.get('profil'), cadet);
});

// ── Le compte est bon : dix calculs, ou le compte trouvé ────────────────────

const sessionCompte = () => page.evaluate(() =>
    JSON.parse(Passeport.stockageJeu('compte-est-bon').getItem('compte-est-bon.session')).donnees);

// Un calcul qui ne tombe pas sur la cible : l'effort doit se mesurer seul.
const calculerSansTrouver = async () => {
    const { tirage, partie } = await sessionCompte();
    const pleines = partie.cases.map((c, k) => (c ? k : -1)).filter(k => k >= 0);
    const paire = pleines.flatMap(a => pleines.map(b => [a, b]))
        .find(([a, b]) => a !== b && partie.cases[a].valeur + partie.cases[b].valeur !== tirage.cible);
    assert.ok(paire, 'plus de calcul possible sur ce tirage');
    await page.locator(`.plaque[data-case="${paire[0]}"]`).click();
    await page.locator('.operateur[data-op="+"]').click();
    await page.locator(`.plaque[data-case="${paire[1]}"]`).click();
    await page.waitForTimeout(80);
};

await verifier('Le compte est bon — 9 calculs ne donnent rien, le dixième donne le tampon', async () => {
    await ouvrir('Le-Compte-Est-Bon', '.plaque');
    await calculerSansTrouver();                        // un vrai calcul, compté 1
    await poserCompteur('compte-est-bon', 'compte-est-bon.passeport', 'calculs', 8);
    await calculerSansTrouver();                        // le 9e
    assert.equal(await tampon('le-compte-est-bon'), false, 'tampon donné trop tôt');
    await calculerSansTrouver();                        // le 10e
    assert.equal(await tampon('le-compte-est-bon'), true, 'tampon manquant au seuil');
});

await verifier('Le compte est bon — le profil et le tirage survivent au rechargement, l’invité reste vide', async () => {
    const lignes = await page.locator('#calculs li:not(.attente)').count();
    await page.reload();
    await page.locator('.plaque').first().waitFor();
    assert.equal(new URL(page.url()).searchParams.get('profil'), profil);
    assert.equal(await page.locator('#calculs li:not(.attente)').count(), lignes);
    assert.equal(await page.evaluate(() => localStorage.getItem('compte-est-bon.session')), null);
    assert.equal(await page.evaluate(() => localStorage.getItem('compte-est-bon.passeport')), null);
});

await verifier('Le compte est bon — un compte trouvé donne le tampon sans les dix calculs', async () => {
    await page.goto(`${base}/HUB/`);
    const joueur = await page.evaluate(() => Passeport.coffre.creerProfil({ nom: 'Sacha' }).id);
    await page.goto(`${base}/Le-Compte-Est-Bon/?seed=passeport&niveau=doux&profil=${joueur}`);
    await page.locator('.passeport-ruban a').waitFor();
    const { tirage } = await sessionCompte();
    for (const { a, op, b } of tirage.solution) {
        const { partie } = await sessionCompte();
        const i = partie.cases.findIndex(c => c?.valeur === a);
        const j = partie.cases.findIndex((c, k) => k !== i && c?.valeur === b);
        await page.locator(`.plaque[data-case="${i}"]`).click();
        await page.locator(`.operateur[data-op="${op}"]`).click();
        await page.locator(`.plaque[data-case="${j}"]`).click();
        await page.waitForTimeout(80);
    }
    await page.locator('#dialogue-fin[open]').waitFor();
    assert.equal(await tampon('le-compte-est-bon', joueur), true, 'aucun tampon après le compte trouvé');
    const calculs = await page.evaluate(() => JSON.parse(Passeport.stockageJeu('compte-est-bon').getItem('compte-est-bon.passeport')).calculs);
    assert.ok(calculs < 10, `le tampon vient du compte, pas de l’effort : ${calculs} calculs`);
});

// ── La Ruche : dix mots, ou le grade de Butineuse ───────────────────────────

const rucheOuverte = () => page.evaluate(() => {
    const espace = Passeport.stockageJeu('ruche');
    const cle = JSON.parse(espace.getItem('ruche.courante')).donnees;
    return JSON.parse(espace.getItem('ruche.ruches')).donnees[cle];
});
const taperMot = async mot => {
    await page.keyboard.type(mot);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(80);
};

await verifier('La Ruche — 9 mots ne donnent rien, le dixième donne le tampon', async () => {
    await ouvrir('La-Ruche', '.alveole');
    // Les mots les plus courts : quelques points, loin du grade de Butineuse,
    // pour que le tampon ne puisse venir que de l'effort.
    const { ruche } = await rucheOuverte();
    const courts = [...ruche.mots].sort((a, b) => a.length - b.length).slice(0, 3);
    await taperMot(courts[0]);                          // un vrai mot, compté 1
    await poserCompteur('ruche', 'ruche.passeport', 'mots', 8);
    await taperMot(courts[1]);                          // le 9e
    assert.equal(await tampon('la-ruche'), false, 'tampon donné trop tôt');
    await taperMot(courts[2]);                          // le 10e
    assert.equal(await tampon('la-ruche'), true, 'tampon manquant au seuil');
});

await verifier('La Ruche — le profil et la récolte survivent au rechargement, l’invité reste vide', async () => {
    await page.reload();
    await page.locator('.alveole').first().waitFor();
    assert.equal(new URL(page.url()).searchParams.get('profil'), profil);
    assert.equal(await page.locator('#compte-trouves').textContent(), '3 mots');
    assert.equal(await page.evaluate(() => localStorage.getItem('ruche.ruches')), null);
    assert.equal(await page.evaluate(() => localStorage.getItem('ruche.passeport')), null);
});

await verifier('La Ruche — passer Butineuse donne le tampon sans les dix mots', async () => {
    await page.goto(`${base}/HUB/`);
    const joueur = await page.evaluate(() => Passeport.coffre.creerProfil({ nom: 'Maé' }).id);
    await page.goto(`${base}/La-Ruche/?seed=passeport&niveau=petite&profil=${joueur}`);
    await page.locator('.passeport-ruban a').waitFor();
    const { ruche } = await rucheOuverte();
    // Les mots les plus longs d'abord : Butineuse (18 % des points) tombe vite.
    const longs = [...ruche.mots].sort((a, b) => b.length - a.length);
    let tapes = 0;
    while (!(await tampon('la-ruche', joueur)) && tapes < longs.length) await taperMot(longs[tapes++]);
    assert.equal(await tampon('la-ruche', joueur), true, 'aucun tampon après Butineuse');
    assert.ok(tapes < 10, `le tampon vient du grade, pas de l’effort : ${tapes} mots`);
    const { progression } = await rucheOuverte();
    assert.ok(progression.score >= Math.round(0.18 * ruche.total), `score ${progression.score} sur ${ruche.total}`);
});

// ── Un second profil n'hérite de rien ───────────────────────────────────────

await verifier('un second profil ne récupère ni compteur ni tampon', async () => {
    await page.goto(`${base}/HUB/`);
    const autre = await page.evaluate(() => Passeport.coffre.creerProfil({ nom: 'Lou' }).id);
    await page.goto(`${base}/2048/?profil=${autre}`);
    await page.locator('.tuile').first().waitFor();
    assert.equal(await page.evaluate(() => Passeport.stockageJeu('2048').getItem('2048.passeport')), null);
    assert.equal(await tampon('2048', autre), false);
});

console.log(`\n${faits.length} vérifications réussies. Erreurs de page : ${erreurs.length}`);
if (erreurs.length) console.log(erreurs.join('\n'));

await navigateur.close();
serveur.close();
process.exit(erreurs.length ? 1 : 0);
