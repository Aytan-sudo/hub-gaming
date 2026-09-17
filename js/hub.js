/* Le hub assemble l'interface. Les règles et les écritures restent dans le
 * module commun, utilisé aussi par les jeux et testé sans navigateur. */
import { etatSauvegarde, contexteInstallation, ajouterJours, enPause } from './rappels.js';
import { missionsDuJour, toutesLesMissions } from './missions.js';
import { pageDuDernierTampon } from './page-ouverte.js';
import { NIVEAUX, INSIGNE_SEUIL, niveauMascotte, insignesDeTheme, parole } from './mascotte.js';
const VERSION = '1.14.1';
const P = globalThis.Passeport;
const coffre = P.coffre;
const $ = id => document.getElementById(id);
let actif = P.profilId || '';
let theme = 'geo';
// Le profil dont la page ouverte a déjà été choisie : ensuite, seul un tampon neuf la change.
let pageChoisiePour = '';
let filtre = 'tous';
let jeux = [];
let importPrepare = null;
let aArchiver = '';
let inviteInstallation = null;
let toutesMissionsOuvertes = false;
// Préférences de cet appareil, hors du coffre : elles ne partent pas dans les sauvegardes.
const preference = {
    lire: nom => { try { return localStorage.getItem('collection.hub.' + nom); } catch { return null; } },
    ecrire: (nom, valeur) => { try { localStorage.setItem('collection.hub.' + nom, valeur); } catch { /* simple confort */ } }
};
const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
const compteTampons = n => `${n} tampon${n > 1 ? 's' : ''}`;
const element = (tag, texte, classe) => {
    const e = document.createElement(tag);
    if (texte !== undefined) e.textContent = texte;
    if (classe) e.className = classe;
    return e;
};
// Deux tons pour le même passeport : ludique pour les enfants, sobre pour les
// adultes. Seuls les mots et la mascotte changent, jamais les règles.
const TEXTES = {
    ludique: {
        'passeport-eyebrow': 'Mon passeport magique', 'passeport-sous-titre': 'Une petite aventure, plein de découvertes.',
        'semaine-titre': 'Ta semaine en étoiles', 'missions-titre': 'On part où aujourd’hui ?',
        'catalogue-titre': 'Tous tes terrains de jeu', 'catalogue-sous-titre': 'À toi de choisir la prochaine aventure.',
        'mascotte-titre': 'Ma mascotte',
        'mascotte-insignes-titre': 'Ses insignes de page',
        'mascotte-insignes-aide': `Un insigne par page du passeport, à ${INSIGNE_SEUIL} tampons dedans. Elle les accroche à son sac.`,
        'mascotte-gains-titre': 'Sa besace',
        salutation: nom => `Coucou, ${nom} !`,
        themeTampons: 'Un tampon par thème et par jour. Tous restent dans ton carnet, et ta mascotte grandit avec eux.', themeVide: 'Ton premier tampon t’attend : essaie une mission !',
        themeSansJeu: 'Les jeux de ce thème restent en accès libre. Leurs tampons arriveront avec leur raccordement au passeport.',
        objectifAtteint: 'Ton objectif est atteint ! Tes découvertes restent acquises. Profite de ta semaine à ton rythme.',
        consigneSemaine: jeux => jeux ? `Une mission dans ${jeux} valide ta journée, même avec des erreurs.` : 'Chaque mission valide ta journée, même avec des erreurs.',
        sansObjectif: jeux => jeux ? `Pas d’objectif cette semaine : chaque journée jouée dans ${jeux} s’allume ici.` : 'Pas d’objectif cette semaine : chaque journée de mission s’allume ici.',
        toutesMissions: n => `Toutes les missions (${n}) ↓`,
        mission: jeu => jeu.passeport.mission, jouer: 'C’est parti !', rejouer: 'Rejouer pour le plaisir', missionFaite: '★ Tampon du jour dans ton carnet !',
        boutonMascotte: m => `Ma mascotte · niveau ${m.niveau} ✨`,
        gradeMascotte: m => `Niveau ${m.niveau} · ${m.grade}`,
        messageMascotte: m => `${compteTampons(m.tampons)} dans ton passeport. ` + (m.suivant.gain
            ? `Encore ${compteTampons(m.restant)} et elle gagne ${m.suivant.gain.nom.toLowerCase()} !`
            : `Encore ${compteTampons(m.restant)} pour le niveau ${m.suivant.niveau} !`),
        gainIcone: (gain, niveau, acquis) => acquis ? gain.emoji : '✧',
        gainNom: gain => gain.nom,
        gainDetail: (gain, seuil, acquis) => acquis ? gain.place[0].toUpperCase() + gain.place.slice(1) : `À ${seuil} tampons`,
        insigneAcquis: n => compteTampons(n),
        insigneAVenir: restant => `Encore ${restant}`
    },
    sobre: {
        'passeport-eyebrow': 'Passeport', 'passeport-sous-titre': 'Tes tampons, thème par thème.',
        'semaine-titre': 'Ta semaine', 'missions-titre': 'Au programme',
        'catalogue-titre': 'Tous les jeux', 'catalogue-sous-titre': 'Le catalogue complet, en accès libre.',
        'mascotte-titre': 'Niveaux',
        'mascotte-insignes-titre': 'Insignes par page',
        'mascotte-insignes-aide': `Un insigne par page du passeport, à ${INSIGNE_SEUIL} tampons dedans.`,
        'mascotte-gains-titre': 'Paliers',
        salutation: nom => `Bonjour ${nom}`,
        themeTampons: 'Un tampon par thème et par jour, conservé dans le passeport.', themeVide: 'Pas encore de tampon dans ce thème.',
        themeSansJeu: 'Aucun jeu de ce thème ne donne encore de tampon ; tous restent jouables.',
        objectifAtteint: 'Objectif de la semaine atteint.',
        consigneSemaine: jeux => jeux ? `Une partie dans ${jeux} valide la journée.` : 'Une partie dans un jeu à tampon valide la journée.',
        sansObjectif: jeux => jeux ? `Sans objectif : les journées jouées dans ${jeux} s’affichent ici.` : 'Sans objectif : les journées jouées s’affichent ici.',
        toutesMissions: n => `Tous les jeux à tampon (${n}) ↓`,
        mission: jeu => P.THEMES[jeu.passeport.theme].nom, jouer: 'Jouer', rejouer: 'Rejouer', missionFaite: 'Tampon du jour obtenu',
        boutonMascotte: m => `Niveau ${m.niveau} · voir les paliers`,
        gradeMascotte: m => `Niveau ${m.niveau}`,
        messageMascotte: m => `${compteTampons(m.tampons)} au total. Niveau ${m.suivant.niveau} à ${m.suivant.seuil} tampons.`,
        gainIcone: (gain, niveau) => String(niveau),
        gainNom: (gain, niveau, seuil) => `Palier de ${seuil} tampons`,
        gainDetail: (gain, seuil, acquis) => acquis ? 'Atteint' : 'À venir',
        insigneAcquis: n => compteTampons(n),
        insigneAVenir: restant => `Encore ${restant}`
    }
};
const textes = p => TEXTES[p?.ton === 'sobre' ? 'sobre' : 'ludique'];
// Un coffre peut contenir un jeu raccordé par une version plus récente.
const nomDuJeu = id => P.JEUX[id]?.nom || jeux.find(j => j.id === id)?.nom || id;
function signaler(message) { $('alerte-stockage').textContent = message; $('alerte-stockage').hidden = false; }
function essayer(action, sortie = 'admin-erreur') {
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
// Le passeport s'ouvre sur la page du dernier tampon, et y revient quand un
// tampon neuf apparaît ; sinon, la page choisie à la main reste ouverte.
function ouvrirPageDuDernierTampon(id, bilan) {
    let memoire = null;
    try { memoire = JSON.parse(preference.lire('page.' + id)); } catch { /* mémoire illisible : on repart */ }
    const suivi = pageDuDernierTampon({ themes: bilan.themes, ordre: Object.keys(P.THEMES), memoire });
    if (pageChoisiePour !== id) theme = suivi.page ?? Object.keys(P.THEMES)[0];
    else if (suivi.nouvelle) theme = suivi.page;
    pageChoisiePour = id;
    // Écrire la même valeur ne réveille pas les autres onglets : pas de ping-pong.
    const texte = JSON.stringify(suivi.memoire);
    if (suivi.memoire && texte !== preference.lire('page.' + id)) preference.ecrire('page.' + id, texte);
}
function afficherPasseport() {
    const p = coffre?.profil(actif);
    $('bienvenue').hidden = Boolean(p);
    for (const id of ['passeport', 'semaine', 'missions-section']) $(id).hidden = !p;
    document.documentElement.dataset.palette = p?.palette || 'lavande';
    $('couleur-barre').content = ({ lavande: '#f8f5ff', peche: '#fff7f0', menthe: '#f2faf5' })[p?.palette || 'lavande'];
    const t = textes(p);
    $('xp-hub').dataset.ton = p?.ton === 'sobre' ? 'sobre' : 'ludique';
    for (const e of document.querySelectorAll('[data-texte]')) e.textContent = t[e.dataset.texte];
    if (!p) return;
    const bilan = coffre.bilan(actif);
    ouvrirPageDuDernierTampon(p.id, bilan);
    $('salutation').textContent = t.salutation(p.nom);
    $('compagnon').textContent = p.avatar;
    $('themes-passeport').replaceChildren(...Object.entries(P.THEMES).map(([id, page]) => {
        const b = element('button', undefined, 'xp-theme'); b.type = 'button'; b.dataset.theme = id;
        b.setAttribute('aria-pressed', String(id === theme));
        const icone = element('span', page.emoji); icone.setAttribute('aria-hidden', 'true'); b.append(icone, document.createTextNode(page.nom));
        // Les tampons des autres pages restent visibles : une page ouverte vide ne fait plus croire qu'il n'y en a aucun.
        const n = bilan.themes[id].length;
        b.setAttribute('aria-label', `${page.nom}, ${n} tampon${n > 1 ? 's' : ''}`);
        if (n) { const compte = element('span', String(n), 'xp-theme-compte'); compte.setAttribute('aria-hidden', 'true'); b.append(compte); }
        b.addEventListener('click', () => { theme = id; afficherPasseport(); $('themes-passeport').querySelector(`[data-theme="${id}"]`).focus(); }); return b;
    }));
    $('theme-titre').closest('.xp-collection').dataset.page = theme;
    $('theme-titre').textContent = p.ton === 'sobre' ? P.THEMES[theme].nom : P.THEMES[theme].titre;
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
    $('theme-detail').textContent = relies.length ? (tampons.length ? t.themeTampons : t.themeVide) : t.themeSansJeu;
    $('semaine-total').textContent = p.sansObjectif
        ? `${jours(bilan.joursSemaine)} cette semaine`
        : `${bilan.joursSemaine} jour${bilan.joursSemaine > 1 ? 's' : ''} sur ${p.objectif}`;
    $('jours').replaceChildren(...bilan.semaine.map((j, i) => {
        const li = element('li');
        if (j.aujourdHui) li.setAttribute('aria-current', 'date');
        li.setAttribute('aria-label', `${j.jour}${j.valide ? ', journée validée' : ', sans validation'}${j.aujourdHui ? ', aujourd’hui' : ''}`);
        li.append(element('span', j.valide ? '★' : j.aujourdHui ? '✧' : '·', 'xp-day' + (j.valide ? ' xp-done' : '')), element('span', ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'][i])); return li;
    }));
    // Au-delà de trois jeux, l'énumération tenait sur quatre lignes : on la tait.
    const liste = P.activitesDe(p);
    const activites = liste.length <= 3 ? new Intl.ListFormat('fr', { type: 'disjunction' }).format(liste.map(nomDuJeu)) : null;
    $('semaine-message').textContent = p.sansObjectif ? t.sansObjectif(activites)
        : bilan.objectifAtteint ? t.objectifAtteint : t.consigneSemaine(activites);
    // Missions du jour : trois cartes au plus, une par thème ; tous les jeux à
    // tampon restent à un geste, dans la liste repliée en dessous.
    const aJouer = jeux.filter(j => j.passeport?.connecte && P.THEMES[j.passeport.theme] && liste.includes(j.id));
    const aujourdHui = P.jourLocal();
    const faits = new Set(coffre.cles().filter(k => k.startsWith(`activite/${p.id}/${aujourdHui}/`)).map(k => k.split('/')[3]));
    $('missions').replaceChildren(...missionsDuJour({ jeux: aJouer, faits, jour: P.numeroJour(aujourdHui) }).map(({ jeu, fait }) => {
        const a = element('article', undefined, 'xp-mission');
        const info = element('div', undefined, 'xp-mission-info');
        info.append(element('h3', t.mission(jeu)), element('p', jeu.passeport.consigne, 'xp-small'));
        if (fait) info.append(element('p', t.missionFaite, 'mission-accomplie'));
        const lien = element('a', fait ? t.rejouer : t.jouer); lien.href = lienJeu(jeu, true);
        const icone = element('span', P.THEMES[jeu.passeport.theme].emoji, 'xp-mission-icon'); icone.setAttribute('aria-hidden', 'true');
        a.append(icone, info, lien); return a;
    }));
    const toutes = toutesLesMissions({ jeux: aJouer, ordreThemes: Object.keys(P.THEMES) });
    $('missions-basculer').hidden = toutes.length <= $('missions').children.length;
    $('missions-basculer').setAttribute('aria-expanded', String(toutesMissionsOuvertes));
    $('missions-basculer').textContent = toutesMissionsOuvertes ? 'Replier ↑' : t.toutesMissions(toutes.length);
    $('missions-toutes').hidden = !toutesMissionsOuvertes || $('missions-basculer').hidden;
    $('missions-toutes').replaceChildren(...toutes.map(jeu => {
        const li = element('li'); const lien = element('a', undefined, 'mission-ligne'); lien.href = lienJeu(jeu, true);
        if (faits.has(jeu.id)) lien.dataset.fait = 'true';
        const icone = element('span', P.THEMES[jeu.passeport.theme].emoji, 'mission-ligne-icone'); icone.setAttribute('aria-hidden', 'true');
        lien.append(icone, element('span', nomDuJeu(jeu.id), 'mission-ligne-nom'), element('span', faits.has(jeu.id) ? '★' : '→', 'mission-ligne-etat'));
        if (faits.has(jeu.id)) lien.setAttribute('aria-label', `${nomDuJeu(jeu.id)}, tampon du jour obtenu`);
        li.append(lien); return li;
    }));
    // La mascotte monte avec les tampons. Son niveau se calcule à chaque
    // affichage : rien n'est stocké, donc rien à migrer ni à réparer.
    const mascotte = niveauMascotte({ tampons: totalTampons(bilan) });
    habiller('mascotte-tenue', mascotte);
    remplirJauge('mascotte-jauge', mascotte);
    $('ouvrir-mascotte').textContent = t.boutonMascotte(mascotte);
    // Une page n'est « oubliée » que si un jeu du profil peut la tamponner aujourd'hui.
    const oubliees = Object.keys(P.THEMES).filter(id => bilan.themes[id][0]?.jour !== aujourdHui && aJouer.some(j => j.passeport.theme === id));
    const phrase = parole(mascotte, {
        themesSansTampon: oubliees.map(id => P.THEMES[id].nom),
        joursRestants: p.sansObjectif ? 0 : Math.max(0, p.objectif - bilan.joursSemaine)
    });
    // En ton sobre, pas de mascotte : sa bulle se tait aussi.
    $('mascotte-parole').textContent = phrase;
    $('mascotte-parole').hidden = p.ton === 'sobre' || !phrase;
}
const totalTampons = bilan => Object.values(bilan.themes).reduce((n, tampons) => n + tampons.length, 0);
// La tenue : un objet par palier gagné, dessiné en CSS. L'en-tête et le
// portrait de la fiche montrent la même bête, habillée par la même fonction.
function habiller(id, mascotte) {
    $(id).replaceChildren(...mascotte.gains.map(gain => {
        const e = element('span', undefined, 'xp-gain'); e.dataset.gain = gain.id; return e;
    }));
}
// La jauge d'un palier : sa part remplie se lit aussi bien dans l'en-tête que dans la fiche.
function remplirJauge(id, mascotte) { $(id).style.setProperty('--avance', `${Math.round(mascotte.avance * 100)}%`); }
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
const jours = n => `${n} jour${n > 1 ? 's' : ''}`;
const installation = () => contexteInstallation({
    userAgent: navigator.userAgent, plateforme: navigator.platform, pointsTactiles: navigator.maxTouchPoints,
    autonome: matchMedia('(display-mode: standalone)').matches || navigator.standalone === true, invite: Boolean(inviteInstallation)
});
function afficherInstallation() {
    const contexte = installation();
    $('installation').hidden = !['ios', 'invite'].includes(contexte);
    $('installation-etapes').hidden = contexte !== 'ios';
    $('installer').hidden = contexte !== 'invite';
    $('installation-app').hidden = contexte !== 'app-ios';
    $('installation-titre').textContent = contexte === 'ios' ? '📲 D’abord, installe l’app' : '📲 Installe l’app, si tu veux';
    $('installation-texte').textContent = contexte === 'ios'
        ? 'Sur l’écran d’accueil, ton passeport est bien gardé. Dans Safari, il peut s’effacer après 7 jours sans visite, et l’app ne voit pas ce qui est rangé dans Safari.'
        : 'Elle s’ouvre comme un jeu, même sans réseau, et garde le même passeport que ce navigateur.';
    // Sur iPhone, un passeport créé dans Safari resterait invisible depuis l'app installée ensuite.
    $('premier-profil').textContent = contexte === 'ios' ? 'Continuer sans installer' : 'Créer mon passeport ✨';
    $('premier-profil').classList.toggle('xp-primary', contexte !== 'ios');
}
function afficherRappels() {
    const aujourdHui = P.jourLocal();
    const installer = coffre.profils(true).length > 0 && installation() === 'ios' && !enPause(preference.lire('plus-tard-installation'), aujourdHui);
    const etat = etatSauvegarde({ cles: coffre.cles(), derniere: preference.lire('sauvegarde'), aujourdHui });
    // La carte d'installation commence par l'export : une seule carte à la fois.
    const sauvegarder = etat.rappel && !installer && !enPause(preference.lire('plus-tard-sauvegarde'), aujourdHui);
    if (sauvegarder && $('rappel-sauvegarde').hidden) $('rappel-sauvegarde-statut').textContent = '';
    $('rappel-installation').hidden = !installer;
    $('rappel-sauvegarde').hidden = !sauvegarder;
    $('rappels').hidden = !installer && !sauvegarder;
    if (sauvegarder) {
        $('rappel-sauvegarde-actions').hidden = false;
        $('rappel-sauvegarde-texte').textContent = etat.derniere
            ? `Dernière sauvegarde il y a ${jours(etat.depuis)}, et ${etat.journees} journée${etat.journees > 1 ? 's' : ''} de tampons depuis. Un fichier récent permet de tout retrouver si le téléphone est perdu ou vidé.`
            : `${etat.journees} journées ont déjà des tampons, et aucune sauvegarde n’a encore été exportée depuis cet appareil. Un fichier permet de tout retrouver si le téléphone est perdu ou vidé.`;
    }
}
function afficherStatutSauvegarde() {
    const derniere = preference.lire('sauvegarde');
    const depuis = derniere ? etatSauvegarde({ cles: [], derniere, aujourdHui: P.jourLocal() }).depuis : null;
    $('statut-sauvegarde').textContent = depuis === null
        ? 'Aucune sauvegarde exportée depuis cet appareil pour le moment.'
        : `Dernière sauvegarde exportée depuis cet appareil : ${new Date(derniere + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}${depuis ? ` (il y a ${jours(depuis)})` : ', aujourd’hui'}.`;
}
function rafraichir() {
    try { afficherProfils(); afficherPasseport(); } catch (e) { signaler(e.message); }
    try { afficherInstallation(); if (coffre) afficherRappels(); } catch (e) { signaler(e.message); }
    afficherCatalogue();
}
function formulaireProfil(p = null) {
    $('profil-id').value = p?.id || '';
    $('profil-nom').value = p?.nom || '';
    $('profil-palette').value = p?.palette || 'lavande';
    $('profil-ton').value = p?.ton === 'sobre' ? 'sobre' : 'ludique';
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
function remplirAdmin() {
    const p = coffre.profil($('admin-profil').value);
    $('formulaire-admin').hidden = !p;
    for (const id of ['personnaliser', 'reprendre-ancien', 'archiver']) $(id).disabled = !p;
    if (p) {
        $('objectif').value = p.sansObjectif ? '0' : String(p.objectif);
        $('activites-admin').replaceChildren(...Object.entries(P.JEUX).map(([id, jeu]) => {
            const l = element('label'); l.className = 'choix-activite'; const input = element('input');
            input.type = 'checkbox'; input.name = 'activite'; input.value = id; input.checked = P.activitesDe(p).includes(id);
            l.append(input, document.createTextNode(jeu.nom)); return l;
        }));
    }
    $('archives').replaceChildren(...coffre.profils(true).filter(p => p.archive).map(p => {
        const b = element('button', `Réactiver ${p.avatar} ${p.nom}`); b.type = 'button';
        b.addEventListener('click', () => essayer(() => { coffre.modifierProfil(p.id, { archive: false }); rafraichir(); ouvrirAdmin(p.id); })); return b;
    }));
}
function ouvrirAdmin(id = actif) {
    $('admin-erreur').textContent = '';
    afficherStatutSauvegarde();
    let profils = [];
    try { profils = coffre?.profils() || []; } catch (e) { $('admin-erreur').textContent = e.message; }
    $('admin-profil').replaceChildren(...profils.map(p => option(p.id, `${p.avatar} ${p.nom}`)));
    if (profils.some(p => p.id === id)) $('admin-profil').value = id;
    if (coffre) try { remplirAdmin(); } catch (e) {
        $('formulaire-admin').hidden = true;
        for (const id of ['personnaliser', 'reprendre-ancien', 'archiver']) $(id).disabled = true;
        $('admin-erreur').textContent = e.message;
    }
    ouvrir('dialogue-admin');
}
function choisir(id) {
    coffre.choisir(id); actif = id;
    const url = new URL(location.href); url.searchParams.delete('profil'); history.replaceState(null, '', url);
    rafraichir();
}
function telecharger(sortie = 'import-erreur') {
    const { texte, ignorees } = coffre.preparerExport();
    const url = URL.createObjectURL(new Blob([texte], { type: 'application/json' }));
    const lien = element('a'); lien.href = url; lien.download = `passeports-${P.jourLocal()}.json`;
    document.body.append(lien); lien.click(); lien.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
    preference.ecrire('sauvegarde', P.jourLocal());
    afficherStatutSauvegarde();
    $(sortie).textContent = (ignorees.length
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
        const valeurs = { nom: $('profil-nom').value.trim(), avatar: document.querySelector('input[name=avatar]:checked').value, palette: $('profil-palette').value, ton: $('profil-ton').value };
        const id = $('profil-id').value;
        const p = id ? coffre.modifierProfil(id, valeurs) : coffre.creerProfil(valeurs);
        if (!id || id === actif) choisir(p.id); else rafraichir();
        $('dialogue-profil').close();
    }, 'profil-erreur');
});
$('ouvrir-admin').addEventListener('click', () => essayer(() => ouvrirAdmin(), 'alerte-stockage'));
$('admin-profil').addEventListener('change', () => essayer(remplirAdmin));
$('formulaire-admin').addEventListener('submit', e => {
    e.preventDefault(); essayer(() => {
        const cochees = [...document.querySelectorAll('input[name=activite]:checked')].map(i => i.value);
        if (!cochees.length) throw new Error('Choisis au moins une activité pour valider les journées.');
        const id = $('admin-profil').value;
        // Les activités qu'une version plus récente a ajoutées ne sont pas affichées ici : on les garde.
        const p = coffre.profil(id), inconnues = p.activites.filter(j => !Object.hasOwn(P.JEUX, j));
        // Tous les jeux affichés ont été vus : un jeu décoché le reste. Les jeux d'une version plus récente restent à découvrir.
        const jeuxVus = [...new Set([...Object.keys(P.JEUX), ...(p.jeuxVus ?? []).filter(j => !Object.hasOwn(P.JEUX, j))])];
        // « Aucun objectif » garde le dernier nombre choisi, prêt si l'objectif revient.
        const objectif = Number($('objectif').value);
        coffre.modifierProfil(id, { ...(objectif ? { objectif, sansObjectif: false } : { sansObjectif: true }), activites: [...cochees, ...inconnues], jeuxVus });
        rafraichir(); $('admin-erreur').textContent = objectif ? 'Objectif enregistré.' : 'Objectif retiré : les journées jouées restent affichées.';
    });
});
$('personnaliser').addEventListener('click', () => essayer(() => formulaireProfil(coffre.profil($('admin-profil').value))));
$('exporter').addEventListener('click', () => essayer(() => telecharger(), 'import-erreur'));
$('rappel-installation-exporter').addEventListener('click', () => essayer(() => telecharger('rappel-installation-statut'), 'rappel-installation-statut'));
$('rappel-sauvegarde-exporter').addEventListener('click', () => essayer(() => {
    // La carte reste affichée pour sa confirmation ; elle disparaît au prochain rafraîchissement.
    telecharger('rappel-sauvegarde-statut'); $('rappel-sauvegarde-actions').hidden = true;
}, 'rappel-sauvegarde-statut'));
$('rappel-installation-plus-tard').addEventListener('click', () => { preference.ecrire('plus-tard-installation', ajouterJours(P.jourLocal(), 14)); rafraichir(); });
$('rappel-sauvegarde-plus-tard').addEventListener('click', () => { preference.ecrire('plus-tard-sauvegarde', ajouterJours(P.jourLocal(), 7)); rafraichir(); });
$('installer').addEventListener('click', async () => {
    const invite = inviteInstallation; if (!invite) return;
    inviteInstallation = null;
    try { await invite.prompt(); await invite.userChoice; } catch { /* le navigateur peut refuser */ }
    rafraichir();
});
// Chrome et Edge proposent leur propre fenêtre d'installation ; iOS n'en a pas.
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); inviteInstallation = e; rafraichir(); });
window.addEventListener('appinstalled', () => { inviteInstallation = null; rafraichir(); });
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
    $('alerte-stockage').hidden = true; rafraichir(); ouvrirAdmin(actif);
}, 'import-erreur'));
$('proteger-stockage').addEventListener('click', async () => {
    try {
        if (!navigator.storage?.persist) { $('statut-persistance').textContent = 'Ce navigateur ne propose pas cette protection. Garde une sauvegarde dans un fichier.'; return; }
        const accord = await navigator.storage.persisted() || await navigator.storage.persist();
        $('statut-persistance').textContent = accord ? 'Conservation accordée par le navigateur. Un effacement manuel reste possible : garde aussi un fichier de sauvegarde.' : 'Protection non accordée. Le passeport fonctionne ; conserve une sauvegarde dans un fichier.';
    } catch { $('statut-persistance').textContent = 'La protection n’a pas pu être activée. Le fichier de sauvegarde reste disponible.'; }
});
$('reprendre-ancien').addEventListener('click', () => essayer(() => {
    const n = coffre.reprendreAncien($('admin-profil').value);
    $('admin-erreur').textContent = `${n} donnée(s) copiée(s). Les anciennes données sont conservées.`;
}));
$('archiver').addEventListener('click', () => essayer(() => {
    aArchiver = $('admin-profil').value; const p = coffre.profil(aArchiver);
    $('archive-message').textContent = `Le passeport de ${p.nom} sera masqué. Tu pourras le réactiver depuis l’espace administrateur.`;
    $('archive-nom').value = ''; $('archive-erreur').textContent = ''; ouvrir('dialogue-archive');
}));
$('formulaire-archive').addEventListener('submit', e => {
    e.preventDefault(); essayer(() => {
        const p = coffre.profil(aArchiver);
        if ($('archive-nom').value.trim() !== p.nom) throw new Error('Le prénom ou pseudo doit être recopié exactement.');
        coffre.modifierProfil(p.id, { archive: true });
        if (actif === p.id) choisir(''); else rafraichir();
        ouvrirAdmin();
    }, 'archive-erreur');
});
// La fiche de la mascotte : son niveau, sa besace, ses insignes de page. Les
// objets à venir restent visibles en silhouette : on sait pourquoi on joue.
$('ouvrir-mascotte').addEventListener('click', () => essayer(() => {
    const b = coffre.bilan(actif), t = textes(b.profil);
    const mascotte = niveauMascotte({ tampons: totalTampons(b) });
    // Le portrait répond à « où est ma mascotte ? » : au niveau 1 elle n'a
    // encore aucun objet, et l'en-tête seul ne montrait rien de neuf.
    habiller('mascotte-tenue-fiche', mascotte);
    $('compagnon-fiche').textContent = b.profil.avatar;
    $('mascotte-portrait').hidden = b.profil.ton === 'sobre';
    $('mascotte-grade').textContent = t.gradeMascotte(mascotte);
    remplirJauge('mascotte-jauge-fiche', mascotte);
    $('mascotte-message').textContent = t.messageMascotte(mascotte);
    const compte = Object.fromEntries(Object.entries(b.themes).map(([id, tampons]) => [id, tampons.length]));
    $('mascotte-insignes').replaceChildren(...insignesDeTheme({ tampons: compte, ordre: Object.keys(P.THEMES) }).map(insigne => {
        const page = P.THEMES[insigne.theme];
        const e = element('div', undefined, 'mascotte-insigne'); e.dataset.acquis = String(insigne.acquis);
        const icone = element('span', page.emoji); icone.setAttribute('aria-hidden', 'true');
        e.append(icone, element('strong', page.nom), element('p', insigne.acquis ? t.insigneAcquis(insigne.tampons) : t.insigneAVenir(insigne.restant)));
        return e;
    }));
    $('mascotte-gains').replaceChildren(...NIVEAUX.filter(palier => palier.gain).map((palier, rang) => {
        const niveau = rang + 2; // le niveau 1 est le mochi tout neuf, sans objet
        const acquis = mascotte.tampons >= palier.seuil;
        const e = element('div', undefined, 'gain'); e.dataset.acquis = String(acquis);
        const icone = element('span', t.gainIcone(palier.gain, niveau, acquis)); icone.setAttribute('aria-hidden', 'true');
        e.append(icone, element('strong', t.gainNom(palier.gain, niveau, palier.seuil)), element('p', t.gainDetail(palier.gain, palier.seuil, acquis)));
        return e;
    }));
    ouvrir('dialogue-mascotte');
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
$('missions-basculer').addEventListener('click', () => {
    toutesMissionsOuvertes = !toutesMissionsOuvertes;
    try { afficherPasseport(); } catch (e) { signaler(e.message); }
    if (toutesMissionsOuvertes) $('missions-toutes').querySelector('a')?.focus();
});
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
setInterval(() => { if (!document.hidden) try { afficherPasseport(); if (coffre) afficherRappels(); } catch (e) { signaler(e.message); } }, 60000);
try { afficherProfils(); afficherPasseport(); } catch (e) { signaler(e.message); }
try { afficherInstallation(); if (coffre) afficherRappels(); } catch (e) { signaler(e.message); }
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
