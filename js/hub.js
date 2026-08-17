/**
 * Construit la grille du hub a partir de jeux.json.
 * Aucun nom de jeu n'est ecrit en dur : ajouter un jeu = ajouter une entree JSON.
 */

const grille = document.getElementById("grille");

/** Cree la vignette : l'icone du jeu, avec repli sur l'emoji si elle ne charge pas. */
function creerVignette(jeu) {
    const vignette = document.createElement("div");
    vignette.className = "vignette";

    const repli = () => {
        vignette.textContent = jeu.emoji || "🎮";
    };

    if (!jeu.icone) {
        repli();
        return vignette;
    }

    const img = document.createElement("img");
    img.src = jeu.icone;
    img.alt = "";
    img.loading = "lazy";
    img.addEventListener("error", repli, { once: true });
    vignette.appendChild(img);

    return vignette;
}

function creerCarte(jeu) {
    const carte = document.createElement("li");
    carte.className = "carte";
    if (jeu.couleur) {
        carte.style.setProperty("--accent", jeu.couleur);
    }

    const corps = document.createElement("div");
    corps.className = "carte-corps";

    const texte = document.createElement("div");
    texte.className = "carte-texte";

    const titre = document.createElement("h2");
    const lien = document.createElement("a");
    lien.href = jeu.url;
    lien.textContent = jeu.nom;
    titre.appendChild(lien);
    texte.appendChild(titre);

    if (jeu.description) {
        const desc = document.createElement("p");
        desc.textContent = jeu.description;
        texte.appendChild(desc);
    }

    if (Array.isArray(jeu.tags) && jeu.tags.length > 0) {
        const tags = document.createElement("ul");
        tags.className = "tags";
        for (const tag of jeu.tags) {
            const li = document.createElement("li");
            li.textContent = tag;
            tags.appendChild(li);
        }
        texte.appendChild(tags);
    }

    corps.append(creerVignette(jeu), texte);

    const pied = document.createElement("div");
    pied.className = "carte-pied";

    const jouer = document.createElement("span");
    jouer.className = "jouer";
    jouer.textContent = "Jouer →";
    pied.appendChild(jouer);

    if (jeu.depot) {
        const depot = document.createElement("a");
        depot.className = "depot";
        depot.href = jeu.depot;
        depot.textContent = "code source";
        depot.rel = "noopener";
        pied.appendChild(depot);
    }

    carte.append(corps, pied);
    return carte;
}

function afficherErreur(message, astuce) {
    grille.replaceChildren();
    const li = document.createElement("li");
    li.className = "erreur";
    li.append(message);
    if (astuce) {
        const code = document.createElement("code");
        code.textContent = astuce;
        li.append(document.createElement("br"), code);
    }
    grille.appendChild(li);
}

async function demarrer() {
    let donnees;

    try {
        const reponse = await fetch("jeux.json", { cache: "no-cache" });
        if (!reponse.ok) {
            throw new Error(`HTTP ${reponse.status}`);
        }
        donnees = await reponse.json();
    } catch (err) {
        // Cas le plus frequent en local : page ouverte en file://, ou fetch est bloque.
        const enLocal = location.protocol === "file:";
        afficherErreur(
            enLocal
                ? "Ouvre la page via un petit serveur local, pas en double-cliquant sur le fichier."
                : `Impossible de charger jeux.json (${err.message}).`,
            enLocal ? "python3 -m http.server 8000" : null
        );
        grille.setAttribute("aria-busy", "false");
        return;
    }

    if (donnees.titre) {
        document.getElementById("titre").textContent = donnees.titre;
        document.title = donnees.titre;
    }
    if (donnees.sousTitre) {
        document.getElementById("sous-titre").textContent = donnees.sousTitre;
    }

    const jeux = Array.isArray(donnees.jeux) ? donnees.jeux : [];
    grille.replaceChildren(...jeux.map(creerCarte));
    grille.setAttribute("aria-busy", "false");
}

demarrer();
