import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pageDuDernierTampon } from '../js/page-ouverte.js';

const ordre = ['geo', 'nombres', 'mots', 'logique', 'aventure'];
// Les tampons de chaque page, du plus récent au plus ancien, comme bilan.themes.
const tampons = pages => Object.fromEntries(ordre.map(page => [page, (pages[page] ?? []).map(jour => ({ jour }))]));

test('sans tampon, aucune page n’est imposée', () => {
    assert.deepEqual(pageDuDernierTampon({ themes: tampons({}), ordre }), { page: null, memoire: null, nouvelle: false });
});

test('la page du tampon le plus récent, quel que soit l’ordre du passeport', () => {
    const themes = tampons({ geo: ['2026-09-10'], mots: ['2026-09-17', '2026-09-16'], logique: ['2026-09-15'] });
    const { page, memoire, nouvelle } = pageDuDernierTampon({ themes, ordre });
    assert.equal(page, 'mots');
    assert.deepEqual(memoire, { jour: '2026-09-17', vues: ['mots'] });
    assert.equal(nouvelle, true);
});

test('le même jour, le tampon pas encore montré passe devant', () => {
    // Le hub a montré Mots ; la partie suivante donne le tampon Géographie.
    const memoire = { jour: '2026-09-17', vues: ['mots'] };
    const themes = tampons({ geo: ['2026-09-17'], mots: ['2026-09-17'] });
    const suite = pageDuDernierTampon({ themes, ordre, memoire });
    assert.equal(suite.page, 'geo');
    assert.equal(suite.nouvelle, true);
    assert.deepEqual(suite.memoire.vues, ['mots', 'geo']);
    // Rien de neuf ensuite : on reste sur la dernière page découverte.
    const calme = pageDuDernierTampon({ themes, ordre, memoire: suite.memoire });
    assert.equal(calme.page, 'geo');
    assert.equal(calme.nouvelle, false);
});

test('la mémoire d’un autre jour, ou abîmée, est oubliée', () => {
    const themes = tampons({ nombres: ['2026-09-18'] });
    for (const memoire of [{ jour: '2026-09-17', vues: ['mots'] }, { jour: '2026-09-18', vues: 'mots' }, { jour: '2026-09-18' }, {}]) {
        const { page, memoire: suite, nouvelle } = pageDuDernierTampon({ themes, ordre, memoire });
        assert.equal(page, 'nombres');
        assert.deepEqual(suite, { jour: '2026-09-18', vues: ['nombres'] });
        assert.equal(nouvelle, true);
    }
});

test('une page retenue qui n’a plus de tampon ce jour-là (sauvegarde restaurée) est ignorée', () => {
    const themes = tampons({ logique: ['2026-09-17'] });
    const { page, memoire, nouvelle } = pageDuDernierTampon({ themes, ordre, memoire: { jour: '2026-09-17', vues: ['logique', 'mots'] } });
    assert.equal(page, 'logique');
    assert.deepEqual(memoire.vues, ['logique']);
    assert.equal(nouvelle, false);
});
