import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NIVEAUX, PAS_LIBRE, INSIGNE_SEUIL, niveauMascotte, insignesDeTheme, parole } from '../js/mascotte.js';

const ordre = ['geo', 'nombres', 'mots', 'logique', 'aventure'];

test('un passeport vide a déjà une mascotte de niveau 1, sans objet', () => {
    const m = niveauMascotte({ tampons: 0 });
    assert.equal(m.niveau, 1);
    assert.equal(m.seuil, 0);
    assert.deepEqual(m.gains, []);
    assert.equal(m.gain, null);
    assert.equal(m.suivant.seuil, 3);
    assert.equal(m.restant, 3);
    assert.equal(m.avance, 0);
});

test('chaque palier donne son objet, et les précédents restent dans la besace', () => {
    for (const [rang, p] of NIVEAUX.entries()) {
        const m = niveauMascotte({ tampons: p.seuil });
        assert.equal(m.niveau, rang + 1, `seuil ${p.seuil}`);
        assert.equal(m.grade, p.grade);
        assert.equal(m.gains.length, rang === 0 ? 0 : rang);
        assert.equal(m.gain?.id, p.gain?.id);
        // Un tampon avant le seuil, le niveau n'est pas encore là.
        if (p.seuil > 0) assert.equal(niveauMascotte({ tampons: p.seuil - 1 }).niveau, rang);
    }
});

test('les objets ont des identifiants et des noms distincts', () => {
    const gains = NIVEAUX.filter(p => p.gain).map(p => p.gain);
    assert.equal(new Set(gains.map(g => g.id)).size, gains.length);
    assert.equal(new Set(gains.map(g => g.nom)).size, gains.length);
    for (const g of gains) for (const champ of ['id', 'emoji', 'nom', 'mien', 'place']) assert.ok(g[champ], `${g.id}.${champ}`);
    // Les seuils montent, sinon deux niveaux se chevauchent.
    for (let i = 1; i < NIVEAUX.length; i++) assert.ok(NIVEAUX[i].seuil > NIVEAUX[i - 1].seuil);
});

test('au-delà du dernier objet, le compteur continue tous les cinquante tampons', () => {
    const dernier = NIVEAUX.length;
    const plafond = NIVEAUX.at(-1).seuil;
    const legende = niveauMascotte({ tampons: plafond + PAS_LIBRE });
    assert.equal(legende.niveau, dernier + 1);
    assert.equal(legende.seuil, plafond + PAS_LIBRE);
    assert.equal(legende.gain, null);
    assert.equal(legende.gains.length, dernier - 1, 'les objets gagnés restent acquis');
    assert.equal(legende.suivant.seuil, plafond + 2 * PAS_LIBRE);
    assert.equal(legende.suivant.gain, null);
    // Juste avant, le niveau ne bouge pas.
    assert.equal(niveauMascotte({ tampons: plafond + PAS_LIBRE - 1 }).niveau, dernier);
    assert.equal(niveauMascotte({ tampons: plafond + 10 * PAS_LIBRE }).niveau, dernier + 10);
});

test('la jauge avance dans le palier courant, sans jamais le dépasser', () => {
    for (const tampons of [0, 1, 2, 3, 9, 15, 74, 100, 149, 300]) {
        const m = niveauMascotte({ tampons });
        assert.ok(m.avance >= 0 && m.avance < 1, `avance à ${tampons} tampons : ${m.avance}`);
        assert.ok(m.restant >= 1, `restant à ${tampons} tampons`);
        assert.equal(m.seuil + Math.round(m.avance * (m.suivant.seuil - m.seuil)), tampons);
    }
    assert.equal(niveauMascotte({ tampons: 2 }).avance, 2 / 3);
});

test('un total abîmé ne casse pas la mascotte', () => {
    for (const tampons of [undefined, null, NaN, -5, 4.7, Infinity, 'douze']) {
        const m = niveauMascotte({ tampons });
        assert.ok(m.niveau >= 1);
        assert.ok(Number.isInteger(m.tampons) && m.tampons >= 0);
    }
    assert.equal(niveauMascotte({ tampons: 4.7 }).niveau, 2);
    assert.equal(niveauMascotte().niveau, 1);
});

test('un insigne par page du passeport, à dix tampons dedans', () => {
    const insignes = insignesDeTheme({ tampons: { geo: 12, mots: INSIGNE_SEUIL, logique: 3 }, ordre });
    assert.deepEqual(insignes.map(i => i.theme), ordre, 'dans l’ordre des pages');
    assert.deepEqual(insignes.filter(i => i.acquis).map(i => i.theme), ['geo', 'mots']);
    assert.equal(insignes.find(i => i.theme === 'logique').restant, 7);
    assert.equal(insignes.find(i => i.theme === 'aventure').tampons, 0);
    assert.equal(insignes.find(i => i.theme === 'geo').restant, 0);
});

test('la mascotte dit bonjour tant qu’elle ne sait rien faire d’autre', () => {
    const m = niveauMascotte({ tampons: 0 });
    // Ni le prochain objet, ni les pages oubliées, ni l'objectif : trop tôt.
    assert.equal(parole(m, { themesSansTampon: ['Mots'], joursRestants: 2 }), NIVEAUX[0].parole);
    assert.equal(parole(niveauMascotte({ tampons: 3 }), {}), NIVEAUX[1].parole);
});

test('dès le niveau 3, elle annonce son prochain objet quand il est à portée', () => {
    const proche = niveauMascotte({ tampons: 8 }); // niveau 3, sac à dos à 10
    assert.equal(parole(proche, { themesSansTampon: ['Mots'] }), 'Encore 2 tampons et j’ai mon sac à dos !');
    assert.equal(parole(niveauMascotte({ tampons: 9 }), {}), 'Encore 1 tampon et j’ai mon sac à dos !');
    // Loin du palier, elle garde sa fierté du moment.
    assert.equal(parole(niveauMascotte({ tampons: 6 }), {}), NIVEAUX[2].parole);
    // Au niveau 2, elle ne sait pas encore annoncer.
    assert.equal(parole(niveauMascotte({ tampons: 5 }), {}), NIVEAUX[1].parole);
    // Passé le dernier objet, il n'y a plus rien à annoncer.
    const legende = niveauMascotte({ tampons: NIVEAUX.at(-1).seuil + PAS_LIBRE - 1 });
    assert.equal(parole(legende, {}), NIVEAUX.at(-1).parole);
});

test('dès le niveau 5, elle signale une page sans tampon du jour', () => {
    const m = niveauMascotte({ tampons: 17 }); // niveau 5, palier suivant à 21
    assert.equal(parole(m, { themesSansTampon: ['Mots', 'Logique'] }), 'On n’a pas encore ouvert la page Mots aujourd’hui !');
    // Toutes les pages tamponnées : elle revient à sa ligne de niveau.
    assert.equal(parole(m, { themesSansTampon: [] }), NIVEAUX[4].parole);
    // Un objet à portée passe devant : c'est la nouvelle du jour.
    assert.equal(parole(niveauMascotte({ tampons: 19 }), { themesSansTampon: ['Mots'] }), 'Encore 2 tampons et j’ai ma lanterne !');
});

test('dès le niveau 8, elle suit l’objectif de la semaine', () => {
    const m = niveauMascotte({ tampons: 45 }); // niveau 8, palier suivant à 55
    assert.equal(parole(m, { joursRestants: 2 }), 'Il reste 2 journées à valider pour ton objectif.');
    assert.equal(parole(m, { joursRestants: 1 }), 'Il reste 1 journée à valider pour ton objectif.');
    // Objectif atteint ou retiré : joursRestants vaut 0.
    assert.equal(parole(m, { joursRestants: 0 }), NIVEAUX[7].parole);
    // Une page oubliée reste plus urgente que l'objectif.
    assert.equal(parole(m, { themesSansTampon: ['Géographie'], joursRestants: 2 }), 'On n’a pas encore ouvert la page Géographie aujourd’hui !');
    // Avant le niveau 8, l'objectif ne se dit pas.
    assert.equal(parole(niveauMascotte({ tampons: 31 }), { joursRestants: 2 }), NIVEAUX[6].parole);
});

test('chaque palier a une parole, et elle est différente des autres', () => {
    const paroles = NIVEAUX.map(p => p.parole);
    assert.ok(paroles.every(Boolean));
    assert.equal(new Set(paroles).size, paroles.length);
    assert.ok(parole(niveauMascotte({ tampons: 1000 }), {}).length > 0);
});
