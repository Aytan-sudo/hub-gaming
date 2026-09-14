/* Rappels du hub : installer l'app sur l'écran d'accueil et exporter
 * régulièrement. Des fonctions pures, testées sans navigateur. */
export const RAPPEL_SAUVEGARDE_JOURS = 14;
export const PREMIER_RAPPEL_JOURNEES = 3;

function numero(iso) {
    if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return NaN;
    const [a, m, j] = iso.split('-').map(Number);
    return Date.UTC(a, m - 1, j) / 86400000;
}
export const ajouterJours = (iso, n) => new Date((numero(iso) + n) * 86400000).toISOString().slice(0, 10);
export const enPause = (jusquA, aujourdHui) => Number.isFinite(numero(jusquA)) && aujourdHui < jusquA;

/** Journées de tampons que la dernière sauvegarde exportée depuis cet appareil n'emporte pas.
 * Un rappel dès la 3e journée jamais sauvegardée, puis tous les 14 jours s'il y a du nouveau. */
export function etatSauvegarde({ cles, derniere, aujourdHui }) {
    const date = Number.isFinite(numero(derniere)) ? derniere : null;
    const journees = new Set(cles.filter(k => k.startsWith('activite/')).map(k => k.split('/')[2])
        .filter(jour => Number.isFinite(numero(jour)) && (!date || jour > date))).size;
    const depuis = date ? numero(aujourdHui) - numero(date) : null;
    const rappel = journees > 0 && (date ? depuis >= RAPPEL_SAUVEGARDE_JOURS : journees >= PREMIER_RAPPEL_JOURNEES);
    return { derniere: date, depuis, journees, rappel };
}

/** Sur iOS, l'app de l'écran d'accueil a son propre stockage, séparé de Safari,
 * et échappe à l'effacement après 7 jours sans visite : on l'installe avant de
 * créer un passeport. Ailleurs, l'app partage le stockage du navigateur. */
export function contexteInstallation({ userAgent = '', plateforme = '', pointsTactiles = 0, autonome = false, invite = false }) {
    const ios = /iPhone|iPad|iPod/.test(userAgent) || (plateforme === 'MacIntel' && pointsTactiles > 1);
    if (autonome) return ios ? 'app-ios' : 'app';
    if (ios) return 'ios';
    return invite ? 'invite' : null;
}
