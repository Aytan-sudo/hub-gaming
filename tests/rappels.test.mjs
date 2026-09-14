import { test } from 'node:test';
import assert from 'node:assert/strict';
import { etatSauvegarde, contexteInstallation, ajouterJours, enPause } from '../js/rappels.js';
const activites = (...jours) => ['actif', 'profil/identifiant-1', ...jours.map(j => `activite/identifiant-1/${j}/geo-trouve-tout`), 'jeu/identifiant-1/geo/geo.stats'];
test('premier rappel dès trois journées de tampons jamais sauvegardées', () => {
    assert.equal(etatSauvegarde({ cles: activites(), derniere: null, aujourdHui: '2026-09-14' }).rappel, false);
    assert.equal(etatSauvegarde({ cles: activites('2026-09-10', '2026-09-12'), derniere: null, aujourdHui: '2026-09-14' }).rappel, false);
    // Deux tampons le même jour ne font qu'une journée.
    const cles = [...activites('2026-09-10', '2026-09-12'), 'activite/identifiant-2/2026-09-12/html_multiplication'];
    assert.equal(etatSauvegarde({ cles, derniere: null, aujourdHui: '2026-09-14' }).journees, 2);
    assert.deepEqual(etatSauvegarde({ cles: activites('2026-09-10', '2026-09-12', '2026-09-14'), derniere: 'abîmé', aujourdHui: '2026-09-14' }),
        { derniere: null, depuis: null, journees: 3, rappel: true });
});
test('ensuite tous les quatorze jours, seulement s’il y a du nouveau', () => {
    const cles = activites('2026-08-01', '2026-08-20', '2026-08-31', '2026-09-02');
    assert.equal(etatSauvegarde({ cles, derniere: '2026-08-31', aujourdHui: '2026-09-13' }).rappel, false);
    assert.deepEqual(etatSauvegarde({ cles, derniere: '2026-08-31', aujourdHui: '2026-09-14' }), { derniere: '2026-08-31', depuis: 14, journees: 1, rappel: true });
    assert.equal(etatSauvegarde({ cles, derniere: '2026-09-02', aujourdHui: '2026-12-25' }).rappel, false);
});
test('installation proposée d’abord sur iOS, invitation ailleurs si le navigateur la permet', () => {
    const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1';
    assert.equal(contexteInstallation({ userAgent: iphone }), 'ios');
    assert.equal(contexteInstallation({ userAgent: iphone, autonome: true }), 'app-ios');
    // iPadOS se présente comme un Mac, mais tactile.
    assert.equal(contexteInstallation({ userAgent: 'Macintosh', plateforme: 'MacIntel', pointsTactiles: 5 }), 'ios');
    assert.equal(contexteInstallation({ userAgent: 'Macintosh', plateforme: 'MacIntel', pointsTactiles: 0 }), null);
    assert.equal(contexteInstallation({ userAgent: 'Android Chrome', invite: true }), 'invite');
    assert.equal(contexteInstallation({ userAgent: 'Android Chrome', autonome: true }), 'app');
});
test('« Plus tard » met le rappel en pause jusqu’à la date choisie', () => {
    assert.equal(ajouterJours('2026-12-28', 7), '2027-01-04');
    assert.equal(enPause(ajouterJours('2026-09-14', 7), '2026-09-20'), true);
    assert.equal(enPause('2026-09-21', '2026-09-21'), false);
    assert.equal(enPause(null, '2026-09-21'), false);
});
