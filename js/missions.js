/* Les missions du jour. Une carte par jeu tenait avec deux ou trois jeux
 * raccordés ; à neuf, la colonne des missions faisait trois fois la hauteur du
 * passeport. On propose donc au plus trois cartes, une par thème — un thème est
 * une page du passeport — et le reste tient dans une liste repliée.
 * Des fonctions pures, testées sans navigateur. */
export const MISSIONS_MAX = 3;

/** Les cartes du jour. `jeux` : les jeux raccordés du profil, dans l'ordre du
 * catalogue ; `faits` : les identifiants des jeux qui ont déjà donné leur
 * tampon aujourd'hui ; `jour` : un numéro de jour entier.
 *
 * - Les thèmes sans tampon aujourd'hui passent devant les thèmes déjà faits.
 * - L'ordre des thèmes tourne d'un cran par jour : avec plus de thèmes que de
 *   cartes, aucun n'est durablement relégué.
 * - Dans un thème à plusieurs jeux, le jeu proposé tourne aussi chaque jour ;
 *   si l'un d'eux a déjà donné son tampon, c'est lui que la carte montre. */
export function missionsDuJour({ jeux, faits = new Set(), jour = 0, max = MISSIONS_MAX }) {
    const themes = [...new Set(jeux.map(jeu => jeu.passeport.theme))];
    if (!themes.length) return [];
    const decalage = ((jour % themes.length) + themes.length) % themes.length;
    const cartes = [...themes.slice(decalage), ...themes.slice(0, decalage)].map(theme => {
        const duTheme = jeux.filter(jeu => jeu.passeport.theme === theme);
        const joue = duTheme.find(jeu => faits.has(jeu.id));
        const rang = ((jour % duTheme.length) + duTheme.length) % duTheme.length;
        return { theme, jeu: joue ?? duTheme[rang], fait: Boolean(joue) };
    });
    return [...cartes.filter(carte => !carte.fait), ...cartes.filter(carte => carte.fait)].slice(0, max);
}

/** Tous les jeux à tampon du profil pour la liste repliée, rangés par page du
 * passeport (`ordreThemes`), puis dans l'ordre du catalogue. */
export function toutesLesMissions({ jeux, ordreThemes }) {
    const rangTheme = theme => {
        const rang = ordreThemes.indexOf(theme);
        return rang < 0 ? ordreThemes.length : rang;
    };
    return jeux
        .map((jeu, rang) => ({ jeu, rang }))
        .sort((a, b) => rangTheme(a.jeu.passeport.theme) - rangTheme(b.jeu.passeport.theme) || a.rang - b.rang)
        .map(({ jeu }) => jeu);
}
