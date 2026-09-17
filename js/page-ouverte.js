/* La page du passeport ouverte d'office : celle du dernier tampon. Une
 * enfant qui trouvait la page Géographie vide concluait que ses tampons du
 * jour manquaient, alors qu'ils étaient rangés dans Mots.
 *
 * Un tampon ne porte que sa date, pas son heure. Deux tampons du même jour ne
 * se départagent donc qu'en retenant, sur l'appareil, les pages déjà montrées
 * ce jour-là : le tampon que le hub n'a pas encore vu est le plus récent.
 * Une fonction pure, testée sans navigateur. */

/** `themes` : pour chaque page, ses tampons du plus récent au plus ancien
 * (`bilan.themes`) ; `ordre` : les pages dans l'ordre du passeport ;
 * `memoire` : `{ jour, vues }` rendu par l'appel précédent, ou null.
 *
 * Renvoie `page` (null sans aucun tampon), la `memoire` à conserver, et
 * `nouvelle` : vrai quand un tampon pas encore montré vient d'apparaître. */
export function pageDuDernierTampon({ themes, ordre, memoire = null }) {
    const dernier = page => themes[page]?.[0]?.jour;
    const jour = ordre.map(dernier).filter(Boolean).sort().at(-1);
    if (!jour) return { page: null, memoire: null, nouvelle: false };
    const duJour = ordre.filter(page => dernier(page) === jour);
    const vues = memoire?.jour === jour && Array.isArray(memoire.vues) ? memoire.vues.filter(page => duJour.includes(page)) : [];
    const nouvelles = duJour.filter(page => !vues.includes(page));
    const toutes = [...vues, ...nouvelles];
    return { page: toutes.at(-1), memoire: { jour, vues: toutes }, nouvelle: nouvelles.length > 0 };
}
