import { test } from 'node:test';
import assert from 'node:assert/strict';
import { missionsDuJour, toutesLesMissions, MISSIONS_MAX } from '../js/missions.js';

const jeu = (id, theme) => ({ id, passeport: { theme, connecte: true } });
// L'ordre du catalogue actuel : un thème Mots, un Nombres, six Logique, un Géographie.
const catalogue = [
    jeu('sutom', 'mots'), jeu('html_multiplication', 'nombres'), jeu('demineur', 'logique'), jeu('solitaire', 'logique'),
    jeu('polyominos', 'logique'), jeu('mosaicomino', 'logique'), jeu('slitherlink', 'logique'), jeu('architecte', 'logique'),
    jeu('geo-trouve-tout', 'geo')
];
const ids = cartes => cartes.map(carte => carte.jeu.id);
const themes = cartes => cartes.map(carte => carte.theme);

test('trois cartes au plus, jamais deux du même thème', () => {
    for (let jour = 0; jour < 30; jour++) {
        const cartes = missionsDuJour({ jeux: catalogue, jour });
        assert.equal(cartes.length, MISSIONS_MAX);
        assert.equal(new Set(themes(cartes)).size, cartes.length);
    }
    assert.equal(missionsDuJour({ jeux: catalogue.slice(0, 2), jour: 5 }).length, 2);
    assert.deepEqual(missionsDuJour({ jeux: [], jour: 5 }), []);
});

test('les thèmes et les jeux d’un même thème tournent chaque jour', () => {
    const vusThemes = new Set(), vusLogique = new Set();
    for (let jour = 20300; jour < 20330; jour++) {
        const cartes = missionsDuJour({ jeux: catalogue, jour });
        for (const carte of cartes) vusThemes.add(carte.theme);
        const logique = cartes.find(carte => carte.theme === 'logique');
        if (logique) vusLogique.add(logique.jeu.id);
    }
    assert.deepEqual([...vusThemes].sort(), ['geo', 'logique', 'mots', 'nombres']);
    assert.equal(vusLogique.size, 6, 'chacun des six jeux de logique finit par être proposé');
    // Le même jour donne toujours les mêmes cartes.
    assert.deepEqual(ids(missionsDuJour({ jeux: catalogue, jour: 20345 })), ids(missionsDuJour({ jeux: catalogue, jour: 20345 })));
});

test('un thème déjà tamponné aujourd’hui cède sa place, et montre le jeu joué s’il reste de la place', () => {
    const jour = 20346;
    const avant = missionsDuJour({ jeux: catalogue, jour });
    const premier = avant[0];
    const apres = missionsDuJour({ jeux: catalogue, jour, faits: new Set([premier.jeu.id]) });
    assert.ok(!themes(apres).includes(premier.theme), 'avec quatre thèmes, le thème fait sort des trois cartes');
    assert.ok(apres.every(carte => !carte.fait));
    // Deux thèmes seulement : le thème fait reste, en dernier, avec le jeu réellement joué.
    const deux = [jeu('demineur', 'logique'), jeu('solitaire', 'logique'), jeu('sutom', 'mots')];
    const cartes = missionsDuJour({ jeux: deux, jour, faits: new Set(['solitaire']) });
    assert.deepEqual(cartes.map(c => [c.theme, c.jeu.id, c.fait]), [['mots', 'sutom', false], ['logique', 'solitaire', true]]);
});

test('la liste complète range les jeux par page du passeport, puis dans l’ordre du catalogue', () => {
    const liste = toutesLesMissions({ jeux: catalogue, ordreThemes: ['geo', 'nombres', 'mots', 'logique', 'aventure'] });
    assert.deepEqual(liste.map(j => j.id), ['geo-trouve-tout', 'html_multiplication', 'sutom', 'demineur', 'solitaire', 'polyominos', 'mosaicomino', 'slitherlink', 'architecte']);
    // Un thème inconnu (version plus récente) passe en fin de liste sans rien casser.
    assert.equal(toutesLesMissions({ jeux: [jeu('x', 'sciences'), jeu('sutom', 'mots')], ordreThemes: ['mots'] })[1].id, 'x');
});
