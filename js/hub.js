/* Le hub assemble l'interface. Les règles et les écritures restent dans le
 * module commun, utilisé aussi par les jeux et testé sans navigateur. */
const VERSION = '1.0.1';
const P = globalThis.Passeport;
const coffre = P.coffre;
const $ = id => document.getElementById(id);
let actif = P.profilId || '';
let theme = 'geo';
let filtre = 'tous';
let jeux = [];
let importPrepare = null;
let aArchiver = '';
const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
const souvenirs = [
    [5, '🌱', 'Graine de curiosité'], [10, '🪁', 'Cerf-volant des idées'],
    [15, '🌈', 'Arc-en-ciel magique'], [20, '🧸', 'Copain de voyage'],
    [25, '🚀', 'Fusée des découvertes'], [30, '🏰', 'Château des savoirs'],
    [50, '🦄', 'Licorne des aventures'], [100, '🌟', 'Constellation des curieux']
];
const element = (tag, texte, classe) => {
    const e = document.createElement(tag);
    if (texte !== undefined) e.textContent = texte;
    if (classe) e.className = classe;
    return e;
};
// Un coffre peut contenir un jeu raccordé par une version plus récente.
const nomDuJeu = id => P.JEUX[id]?.nom || jeux.find(j => j.id === id)?.nom || id;
function signaler(message) { $('alerte-stockage').textContent = message; $('alerte-stockage').hidden = false; }
function essayer(action, sortie = 'parent-erreur') {
    try { if (!coffre) throw new Error('Le stockage de ce navigateur est indisponible.'); action(); }
    catch (e) { if (sortie === 'alerte-stockage') signaler(e.message); else $(sortie).textContent = e.message; }
}
function ouvrir(id) { for (const d of document.querySelectorAll('dialog[open]')) d.close(); $(id).showModal(); }
function lienJeu(jeu, mission = false) {
    const url = new URL(local && jeu.dossier ? `../${jeu.dossier}/` : jeu.url, location.href);
    if (jeu.passeport?.connecte) {
        url.searchParams.set('profil', actif);
        if (mission) url.searchParams.set('mission', 'passeport');
    }
    return url.href;
}
function option(valeur, nom) { const o = element('option', nom); o.value = valeur; return o; }
function afficherProfils() {
    const profils = coffre?.profils() ?? [];
    if (!profils.some(p => p.id === actif)) actif = '';
    $('profil-actif').replaceChildren(option('', 'Mode invité'), ...profils.map(p => option(p.id, `${p.avatar} ${p.nom}`)));
    $('profil-actif').value = actif;
}
function afficherPasseport() {
    const p = coffre?.profil(actif);
    $('bienvenue').hidden = Boolean(p);
    for (const id of ['passeport', 'semaine', 'missions-section']) $(id).hidden = !p;
    document.documentElement.dataset.palette = p?.palette || 'lavande';
    $('couleur-barre').content = ({ lavande: '#f8f5ff', peche: '#fff7f0', menthe: '#f2faf5' })[p?.palette || 'lavande'];
    if (!p) return;
    const bilan = coffre.bilan(actif);
    $('salutation').textContent = `Coucou, ${p.nom} !`;
    $('compagnon').textContent = p.avatar;
    $('themes-passeport').replaceChildren(...Object.entries(P.THEMES).map(([id, t]) => {
        const b = element('button', undefined, 'xp-theme'); b.type = 'button'; b.dataset.theme = id;
        b.setAttribute('aria-pressed', String(id === theme));
        const icone = element('span', t.emoji); icone.setAttribute('aria-hidden', 'true'); b.append(icone, document.createTextNode(t.nom));
        b.addEventListener('click', () => { theme = id; afficherPasseport(); $('themes-passeport').querySelector(`[data-theme="${id}"]`).focus(); }); return b;
    }));
    $('theme-titre').textContent = P.THEMES[theme].titre;
    const tampons = bilan.themes[theme];
    $('theme-total').textContent = `${tampons.length} tampon${tampons.length > 1 ? 's' : ''}`;
    $('ouvrir-tampons').hidden = !tampons.length;
    const derniers = tampons.slice(0, 4);
    $('tampons').replaceChildren(...Array.from({ length: 4 }, (_, i) => {
        const a = derniers[i];
        const e = element('div', undefined, 'xp-stamp' + (a ? '' : ' xp-future'));
        const icone = element('b', a ? P.THEMES[theme].emoji : '✧'); icone.setAttribute('aria-hidden', 'true');
        const jour = a ? a.jour.slice(8) + '/' + a.jour.slice(5, 7) : 'À venir';
        e.append(icone, element('span', jour));
        e.setAttribute('aria-label', a ? `${P.THEMES[theme].nom}, ${a.jour}, ${nomDuJeu(a.jeu)}` : 'Une prochaine découverte'); return e;
    }));
    const relies = jeux.filter(j => j.passeport?.theme === theme && j.passeport.connecte);
    $('theme-detail').textContent = relies.length
        ? tampons.length ? 'Un souvenir par thème et par jour. Tous restent dans ton carnet.' : 'Ton premier tampon t’attend : essaie une mission !'
        : 'Les jeux de ce thème restent en accès libre. Leurs tampons arriveront avec leur raccordement au passeport.';
    $('semaine-total').textContent = `${bilan.joursSemaine} jour${bilan.joursSemaine > 1 ? 's' : ''} sur ${p.objectif}`;
    $('jours').replaceChildren(...bilan.semaine.map((j, i) => {
        const li = element('li');
        if (j.aujourdHui) li.setAttribute('aria-current', 'date');
        li.setAttribute('aria-label', `${j.jour}${j.valide ? ', journée validée' : ', sans validation'}${j.aujourdHui ? ', aujourd’hui' : ''}`);
        li.append(element('span', j.valide ? '★' : j.aujourdHui ? '✧' : '·', 'xp-day' + (j.valide ? ' xp-done' : '')), element('span', ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'][i])); return li;
    }));
    $('semaine-message').textContent = bilan.objectifAtteint
        ? 'Ton objectif est atteint ! Tes découvertes restent acquises. Profite de ta semaine à ton rythme.'
        : 'Une mission dans ' + p.activites.map(nomDuJeu).join(' ou ') + ' valide ta journée, même avec des erreurs.';
    const suivant = souvenirs.find(([seuil]) => seuil > bilan.joursTotal);
    $('ouvrir-souvenirs').textContent = suivant ? `Mes souvenirs · prochain à ${suivant[0]} jours ✨` : 'Mes souvenirs ✨';
    const missions = jeux.filter(j => j.passeport?.connecte && p.activites.includes(j.id));
    $('missions').replaceChildren(...missions.map(jeu => {
        const a = element('article', undefined, 'xp-mission');
        const info = element('div', undefined, 'xp-mission-info');
        info.append(element('h3', jeu.passeport.mission), element('p', jeu.passeport.consigne, 'xp-small'));
        const accomplie = bilan.themes[jeu.passeport.theme].some(a => a.jour === P.jourLocal() && a.jeu === jeu.id);
        if (accomplie) info.append(element('p', '★ Tampon du jour dans ton carnet !', 'mission-accomplie'));
        const lien = element('a', accomplie ? 'Rejouer pour le plaisir' : 'C’est parti !'); lien.href = lienJeu(jeu, true);
        const icone = element('span', P.THEMES[jeu.passeport.theme].emoji, 'xp-mission-icon'); icone.setAttribute('aria-hidden', 'true');
        a.append(icone, info, lien); return a;
    }));
}
function afficherCatalogue() {
    $('filtres').replaceChildren(...[['tous', { nom: 'Tous les jeux' }], ...Object.entries(P.THEMES)].map(([id, t]) => {
        const b = element('button', t.nom); b.type = 'button'; b.setAttribute('aria-pressed', String(id === filtre));
        b.addEventListener('click', () => { filtre = id; afficherCatalogue(); }); return b;
    }));
    const selection = jeux.filter(j => filtre === 'tous' || j.passeport?.theme === filtre);
    $('grille').replaceChildren(...selection.map(jeu => {
        const li = element('li', undefined, 'carte');
        const icone = element('span', jeu.emoji || '🎮', 'carte-icone'); icone.setAttribute('aria-hidden', 'true');
        const lien = element('a', 'Jouer →', 'bouton-jouer'); lien.href = lienJeu(jeu);
        li.append(icone, element('h3', jeu.nom), element('p', jeu.description));
        if (jeu.passeport?.connecte) li.append(element('span', 'Tampon ' + P.THEMES[jeu.passeport.theme].nom, 'etiquette-tampon'));
        li.append(lien); return li;
    }));
    if (!selection.length) $('grille').append(element('li', 'Aucun jeu dans cette catégorie pour le moment.'));
    $('grille').setAttribute('aria-busy', 'false');
}
function rafraichir() {
    try { afficherProfils(); afficherPasseport(); } catch (e) { signaler(e.message); }
    afficherCatalogue();
}
function formulaireProfil(p = null) {
    $('profil-id').value = p?.id || '';
    $('profil-nom').value = p?.nom || '';
    $('profil-palette').value = p?.palette || 'lavande';
    $('profil-titre').textContent = p ? 'Personnaliser mon passeport' : 'Un nouveau passeport';
    $('profil-enregistrer').textContent = p ? 'Enregistrer' : 'C’est parti !';
    $('profil-erreur').textContent = '';
    $('avatars').replaceChildren(...P.AVATARS.map((avatar, i) => {
        const l = element('label', undefined, 'choix-avatar');
        const input = element('input'); input.type = 'radio'; input.name = 'avatar'; input.value = avatar; input.checked = avatar === (p?.avatar || P.AVATARS[0]);
        input.setAttribute('aria-label', ['Renard', 'Panda', 'Chat', 'Grenouille', 'Lapin', 'Ours', 'Koala', 'Licorne'][i]);
        l.append(input, element('span', avatar)); return l;
    }));
    ouvrir('dialogue-profil'); $('profil-nom').focus();
}
function remplirParent() {
    const p = coffre.profil($('parent-profil').value);
    $('formulaire-parent').hidden = !p;
    for (const id of ['personnaliser', 'reprendre-ancien', 'archiver']) $(id).disabled = !p;
    if (p) {
        $('objectif').value = p.objectif;
        $('activites-parent').replaceChildren(...Object.entries(P.JEUX).map(([id, jeu]) => {
            const l = element('label'); l.className = 'choix-activite'; const input = element('input');
            input.type = 'checkbox'; input.name = 'activite'; input.value = id; input.checked = p.activites.includes(id);
            l.append(input, document.createTextNode(jeu.nom)); return l;
        }));
    }
    $('archives').replaceChildren(...coffre.profils(true).filter(p => p.archive).map(p => {
        const b = element('button', `Réactiver ${p.avatar} ${p.nom}`); b.type = 'button';
        b.addEventListener('click', () => essayer(() => { coffre.modifierProfil(p.id, { archive: false }); rafraichir(); ouvrirParent(p.id); })); return b;
    }));
}
function ouvrirParent(id = actif) {
    $('parent-erreur').textContent = '';
    let profils = [];
    try { profils = coffre?.profils() || []; } catch (e) { $('parent-erreur').textContent = e.message; }
    $('parent-profil').replaceChildren(...profils.map(p => option(p.id, `${p.avatar} ${p.nom}`)));
    if (profils.some(p => p.id === id)) $('parent-profil').value = id;
    if (coffre) try { remplirParent(); } catch (e) {
        $('formulaire-parent').hidden = true;
        for (const id of ['personnaliser', 'reprendre-ancien', 'archiver']) $(id).disabled = true;
        $('parent-erreur').textContent = e.message;
    }
    ouvrir('dialogue-parent');
}
function choisir(id) {
    coffre.choisir(id); actif = id;
    const url = new URL(location.href); url.searchParams.delete('profil'); history.replaceState(null, '', url);
    rafraichir();
}
function telecharger() {
    const { texte, ignorees } = coffre.preparerExport();
    const url = URL.createObjectURL(new Blob([texte], { type: 'application/json' }));
    const lien = element('a'); lien.href = url; lien.download = `passeports-${P.jourLocal()}.json`;
    document.body.append(lien); lien.click(); lien.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
    $('import-erreur').textContent = (ignorees.length
        ? `Export proposé, sans ${ignorees.length} donnée(s) illisible(s) restée(s) sur cet appareil. `
        : 'Export proposé. ') + 'Vérifie que le fichier est bien conservé dans tes fichiers.';
}
for (const b of document.querySelectorAll('[data-fermer]')) b.addEventListener('click', () => b.closest('dialog').close());
$('version').textContent = VERSION;
$('premier-profil').addEventListener('click', () => formulaireProfil());
$('ajouter-profil').addEventListener('click', () => formulaireProfil());
$('profil-actif').addEventListener('change', e => essayer(() => choisir(e.target.value), 'alerte-stockage'));
$('formulaire-profil').addEventListener('submit', e => {
    e.preventDefault(); essayer(() => {
        const valeurs = { nom: $('profil-nom').value.trim(), avatar: document.querySelector('input[name=avatar]:checked').value, palette: $('profil-palette').value };
        const id = $('profil-id').value;
        const p = id ? coffre.modifierProfil(id, valeurs) : coffre.creerProfil(valeurs);
        if (!id || id === actif) choisir(p.id); else rafraichir();
        $('dialogue-profil').close();
    }, 'profil-erreur');
});
$('ouvrir-parent').addEventListener('click', () => essayer(() => ouvrirParent(), 'alerte-stockage'));
$('parent-profil').addEventListener('change', () => essayer(remplirParent));
$('formulaire-parent').addEventListener('submit', e => {
    e.preventDefault(); essayer(() => {
        const cochees = [...document.querySelectorAll('input[name=activite]:checked')].map(i => i.value);
        if (!cochees.length) throw new Error('Choisis au moins une activité pour valider les journées.');
        const id = $('parent-profil').value;
        // Les activités qu'une version plus récente a ajoutées ne sont pas affichées ici : on les garde.
        const inconnues = coffre.profil(id).activites.filter(j => !Object.hasOwn(P.JEUX, j));
        coffre.modifierProfil(id, { objectif: Number($('objectif').value), activites: [...cochees, ...inconnues] });
        rafraichir(); $('parent-erreur').textContent = 'Objectif enregistré.';
    });
});
$('personnaliser').addEventListener('click', () => essayer(() => formulaireProfil(coffre.profil($('parent-profil').value))));
$('exporter').addEventListener('click', () => essayer(telecharger, 'import-erreur'));
$('importer').addEventListener('change', async e => {
    importPrepare = null; $('apercu-import').hidden = true; $('import-erreur').textContent = '';
    const fichier = e.target.files[0]; if (!fichier) return;
    try {
        if (fichier.size > 4000000) throw new Error('Le fichier dépasse 4 Mo.');
        const texte = await fichier.text(); importPrepare = coffre.preparerImport(texte);
        $('import-detail').textContent = `${importPrepare.profils.length} profil(s) : ${importPrepare.profils.map(p => p.nom).join(', ')}. ${importPrepare.tampons} activité(s) enregistrée(s).`;
        $('apercu-import').hidden = false;
    } catch (erreur) { $('import-erreur').textContent = erreur.message; }
    e.target.value = '';
});
$('annuler-import').addEventListener('click', () => { importPrepare = null; $('apercu-import').hidden = true; });
$('confirmer-import').addEventListener('click', () => essayer(() => {
    if (!importPrepare) return;
    coffre.restaurer(importPrepare.texte); importPrepare = null; actif = coffre.lire('actif') || '';
    $('apercu-import').hidden = true; $('import-erreur').textContent = 'Sauvegarde restaurée. Rouvre les jeux pour reprendre avec ce coffre.';
    $('alerte-stockage').hidden = true; rafraichir(); ouvrirParent(actif);
}, 'import-erreur'));
$('proteger-stockage').addEventListener('click', async () => {
    try {
        if (!navigator.storage?.persist) { $('statut-persistance').textContent = 'Ce navigateur ne propose pas cette protection. Garde une sauvegarde dans un fichier.'; return; }
        const accord = await navigator.storage.persisted() || await navigator.storage.persist();
        $('statut-persistance').textContent = accord ? 'Conservation accordée par le navigateur. Un effacement manuel reste possible : garde aussi un fichier de sauvegarde.' : 'Protection non accordée. Le passeport fonctionne ; conserve une sauvegarde dans un fichier.';
    } catch { $('statut-persistance').textContent = 'La protection n’a pas pu être activée. Le fichier de sauvegarde reste disponible.'; }
});
$('reprendre-ancien').addEventListener('click', () => essayer(() => {
    const n = coffre.reprendreAncien($('parent-profil').value);
    $('parent-erreur').textContent = `${n} donnée(s) copiée(s). Les anciennes données sont conservées.`;
}));
$('archiver').addEventListener('click', () => essayer(() => {
    aArchiver = $('parent-profil').value; const p = coffre.profil(aArchiver);
    $('archive-message').textContent = `Le passeport de ${p.nom} sera masqué. Tu pourras le réactiver depuis l’espace parent.`;
    $('archive-nom').value = ''; $('archive-erreur').textContent = ''; ouvrir('dialogue-archive');
}));
$('formulaire-archive').addEventListener('submit', e => {
    e.preventDefault(); essayer(() => {
        const p = coffre.profil(aArchiver);
        if ($('archive-nom').value.trim() !== p.nom) throw new Error('Le prénom ou pseudo doit être recopié exactement.');
        coffre.modifierProfil(p.id, { archive: true });
        if (actif === p.id) choisir(''); else rafraichir();
        ouvrirParent();
    }, 'archive-erreur');
});
$('ouvrir-souvenirs').addEventListener('click', () => essayer(() => {
    const b = coffre.bilan(actif);
    $('souvenirs-message').textContent = `${b.joursTotal} journée(s) de découvertes ! Tes souvenirs restent acquis, même si tu fais une pause.`;
    $('souvenirs-liste').replaceChildren(...souvenirs.map(([seuil, emoji, nom]) => {
        const e = element('div', undefined, 'souvenir'); e.dataset.acquis = String(b.joursTotal >= seuil);
        e.append(element('span', b.joursTotal >= seuil ? emoji : '✧'), element('strong', nom), element('p', b.joursTotal >= seuil ? 'Dans ta collection !' : `À ${seuil} jours d’apprentissage`)); return e;
    })); ouvrir('dialogue-souvenirs');
}));
$('ouvrir-tampons').addEventListener('click', () => essayer(() => {
    const tampons = coffre.bilan(actif).themes[theme];
    $('tampons-titre').textContent = P.THEMES[theme].nom + ' · tous mes tampons';
    $('tampons-historique').replaceChildren(...tampons.map(a => {
        const li = element('li', undefined, 'tampon-historique');
        const date = new Date(a.jour + 'T12:00:00');
        li.append(element('span', P.THEMES[theme].emoji), element('strong', date.toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' })), element('small', nomDuJeu(a.jeu)));
        return li;
    }));
    ouvrir('dialogue-tampons');
}, 'alerte-stockage'));
$('catalogue-basculer').addEventListener('click', () => {
    const contenu = $('catalogue-contenu'); contenu.hidden = !contenu.hidden;
    $('catalogue-basculer').setAttribute('aria-expanded', String(!contenu.hidden));
    $('catalogue-basculer').textContent = contenu.hidden ? 'Voir tous les jeux ↓' : 'Replier ↑';
});
window.addEventListener('passeport-erreur', e => signaler(e.detail));
window.addEventListener('storage', e => {
    if (e.key?.startsWith('collection.')) { try { rafraichir(); } catch (erreur) { signaler(erreur.message); } }
});
document.addEventListener('visibilitychange', () => { if (!document.hidden) try { rafraichir(); } catch (e) { signaler(e.message); } });
window.addEventListener('pageshow', () => { try { rafraichir(); } catch (e) { signaler(e.message); } });
// Une page laissée ouverte traverse aussi minuit et le changement de semaine.
setInterval(() => { if (!document.hidden) try { afficherPasseport(); } catch (e) { signaler(e.message); } }, 60000);
try { afficherProfils(); afficherPasseport(); } catch (e) { signaler(e.message); }
if (P.avertissement) signaler(P.avertissement);
try {
    const reponse = await fetch('jeux.json', { cache: 'no-cache' });
    if (!reponse.ok) throw new Error('Catalogue indisponible');
    const data = await reponse.json(); jeux = data.jeux;
    if (!Array.isArray(jeux)) throw new Error('Catalogue invalide');
    rafraichir();
} catch {
    $('grille').replaceChildren(element('li', 'Le catalogue n’a pas pu être chargé. Réessaie quand le réseau revient. Tes profils sont conservés.'));
    $('grille').setAttribute('aria-busy', 'false');
}
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
