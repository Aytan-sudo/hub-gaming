/* La mascotte du passeport, et ce qu'elle gagne en montant de niveau.
 *
 * Un tampon vaut un pas : au plus un par thème et par jour, donc cinq le jour
 * le plus large. Les onze premiers paliers donnent chacun un objet, dessiné sur
 * le mochi de l'en-tête ; ensuite le niveau continue de monter tous les
 * cinquante tampons, sans nouvel objet — un compteur qui plafonne laisse croire
 * que le passeport est terminé.
 *
 * Le niveau se calcule, il ne se stocke pas : rien à migrer, et un passeport
 * déjà rempli arrive d'emblée au niveau que ses tampons méritent. Les paliers
 * de journées d'apprentissage qu'il remplace (5, 10, … 100 jours) étaient plus
 * lents et ne se voyaient nulle part sur la page.
 *
 * Des fonctions pures, testées sans navigateur.
 */

// Au-delà du dernier objet, un niveau de plus tous les cinquante tampons.
export const PAS_LIBRE = 50;
// Un insigne par thème : la page du passeport travaillée se porte sur le sac.
export const INSIGNE_SEUIL = 10;

// Chaque objet est dessiné en CSS sur le mochi ; l'emoji ne sert qu'à la
// fiche, où la liste doit se lire d'un coup d'œil.
const gain = (id, emoji, nom, mien, place) => ({ id, emoji, nom, mien, place });

export const NIVEAUX = [
    { seuil: 0, grade: 'Mochi tout neuf', parole: 'Coucou ! On part à l’aventure ?' },
    { seuil: 3, grade: 'Mochi emmitouflé', gain: gain('echarpe', '🧣', 'Une écharpe', 'mon écharpe', 'autour du cou'), parole: 'Avec mon écharpe, je ne crains plus le froid !' },
    { seuil: 6, grade: 'Mochi curieux', gain: gain('lunettes', '👓', 'Des lunettes', 'mes lunettes', 'sur le nez'), parole: 'Avec mes lunettes, je vois les petits détails.' },
    { seuil: 10, grade: 'Mochi en vadrouille', gain: gain('sac', '🎒', 'Un sac à dos', 'mon sac à dos', 'pour porter les insignes'), parole: 'Mon sac est prêt : j’y accroche nos insignes.' },
    { seuil: 15, grade: 'Mochi explorateur', gain: gain('chapeau', '👒', 'Un chapeau d’explorateur', 'mon chapeau', 'sur la tête'), parole: 'Chapeau sur la tête : on explore quoi, aujourd’hui ?' },
    { seuil: 21, grade: 'Mochi veilleur', gain: gain('lanterne', '🏮', 'Une lanterne', 'ma lanterne', 'au bout du bras'), parole: 'Ma lanterne éclaire même les énigmes sombres.' },
    { seuil: 28, grade: 'Mochi cape au vent', gain: gain('cape', '🧥', 'Une cape', 'ma cape', 'dans le dos'), parole: 'Ma cape claque au vent. On file !' },
    { seuil: 40, grade: 'Mochi bien accompagné', gain: gain('oiseau', '🐦', 'Un oiseau curieux', 'mon oiseau', 'sur l’épaule'), parole: 'Mon oiseau connaît tous les raccourcis.' },
    { seuil: 55, grade: 'Mochi ailé', gain: gain('ailes', '🪽', 'Des ailes', 'mes ailes', 'derrière les épaules'), parole: 'Mes ailes ont poussé : on va loin, maintenant.' },
    { seuil: 75, grade: 'Mochi couronné', gain: gain('couronne', '👑', 'Une couronne', 'ma couronne', 'sur la tête, à la place du chapeau'), parole: 'Couronné par tes tampons, rien que ça !' },
    { seuil: 100, grade: 'Mochi des constellations', gain: gain('etoiles', '✨', 'Une constellation', 'mes étoiles', 'tout autour'), parole: 'Cent tampons : notre constellation est au complet.' }
];

const DERNIER = NIVEAUX.length;
const PLAFOND = NIVEAUX[DERNIER - 1].seuil;
const LEGENDE = { grade: 'Mochi légendaire', parole: 'Plus rien à gagner, tout à explorer. On continue ?' };

/** Le palier d'un niveau, y compris au-delà du dernier objet. */
function palier(niveau) {
    if (niveau <= DERNIER) return NIVEAUX[niveau - 1];
    return { seuil: PLAFOND + (niveau - DERNIER) * PAS_LIBRE, ...LEGENDE };
}

/** L'état de la mascotte pour un total de tampons.
 *
 * Renvoie le `niveau` (1 au minimum), son `grade`, le `seuil` atteint, la
 * `parole` du palier, les `gains` déjà dans la besace, le palier `suivant`
 * (jamais nul : le compteur ne plafonne pas) et les tampons `restant` avant
 * lui. `avance` va de 0 à 1 dans le palier courant, pour la jauge. */
export function niveauMascotte({ tampons = 0 } = {}) {
    const total = Number.isFinite(tampons) ? Math.max(0, Math.trunc(tampons)) : 0;
    const niveau = total < PLAFOND
        ? NIVEAUX.filter(p => p.seuil <= total).length
        : DERNIER + Math.floor((total - PLAFOND) / PAS_LIBRE);
    const ici = palier(niveau);
    const apres = palier(niveau + 1);
    return {
        tampons: total, niveau, grade: ici.grade, seuil: ici.seuil, parole: ici.parole,
        gain: ici.gain ?? null,
        gains: NIVEAUX.filter(p => p.gain && p.seuil <= total).map(p => p.gain),
        suivant: { niveau: niveau + 1, seuil: apres.seuil, gain: apres.gain ?? null },
        restant: apres.seuil - total,
        avance: (total - ici.seuil) / (apres.seuil - ici.seuil)
    };
}

/** Les insignes de thème, dans l'ordre des pages du passeport. `tampons` :
 * le nombre de tampons par thème. L'emoji reste celui de la page du
 * passeport — un insigne, c'est la page travaillée. */
export function insignesDeTheme({ tampons = {}, ordre = [], seuil = INSIGNE_SEUIL } = {}) {
    return ordre.map(theme => {
        const n = tampons[theme] ?? 0;
        return { theme, tampons: n, acquis: n >= seuil, restant: Math.max(0, seuil - n) };
    });
}

/** Ce que la mascotte dit aujourd'hui. Son répertoire s'ouvre avec les
 * niveaux : d'abord sa seule fierté du moment, puis son prochain objet quand
 * il est à portée, puis les pages du passeport oubliées aujourd'hui, enfin
 * l'objectif de la semaine. `themesSansTampon` : les noms des pages sans
 * tampon du jour, dans l'ordre du passeport ; `joursRestants` : ce qui manque
 * à l'objectif de la semaine (0 s'il est atteint ou retiré). */
export function parole(etat, { themesSansTampon = [], joursRestants = 0 } = {}) {
    const { niveau, restant, suivant, parole: ligne } = etat;
    if (niveau >= 3 && suivant.gain && restant <= 3) {
        return `Encore ${restant} tampon${restant > 1 ? 's' : ''} et j’ai ${suivant.gain.mien} !`;
    }
    if (niveau >= 5 && themesSansTampon.length) {
        return `On n’a pas encore ouvert la page ${themesSansTampon[0]} aujourd’hui !`;
    }
    if (niveau >= 8 && joursRestants > 0) {
        return `Il reste ${joursRestants} journée${joursRestants > 1 ? 's' : ''} à valider pour ton objectif.`;
    }
    return ligne;
}
