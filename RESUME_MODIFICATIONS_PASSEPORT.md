# Résumé des modifications — Hub et passeport des jeux

Date : 14 septembre 2026.

Le hub devient le point d’entrée d’un passeport personnel de découvertes.
Chaque enfant possède son profil, ses tampons et sa progression, conservés
sur l’appareil. Le catalogue de 17 jeux reste accessible.

## 1. Nouvelle interface du hub

- Univers graphique pastel et kawaii : formes arrondies, ombres douces,
  compagnon illustré et couleurs personnalisables.
- Polices sans serif Fredoka et Nunito embarquées dans le dépôt, avec leurs
  licences : aucun chargement depuis un CDN.
- Passeport au centre de l’accueil, objectif hebdomadaire, missions et accès
  aux souvenirs ; catalogue filtrable et repliable en dessous.
- Trois palettes : lavande, pêche et menthe, compatibles avec le mode sombre.
- Mise en page adaptée aux téléphones, tablettes et ordinateurs ; navigation
  clavier, dialogues natifs et prise en compte des mouvements réduits.
- Manifeste d’installation, icônes et service worker propres au hub.

## 2. Règles du passeport

Un passeport commun aux jeux, avec cinq thèmes : **Géographie, Nombres, Mots,
Logique et Aventure**.

- Dix réponses réellement essayées dans un jeu raccordé donnent un tampon.
  Les erreurs comptent ; une visite, une ouverture ou un délai expiré seul
  ne donnent rien.
- Un tampon par thème et par date ; au maximum une journée pédagogique
  validée par date, même si plusieurs jeux sont joués.
- Objectif de quatre jours par semaine par défaut, réglable de deux à sept
  jours dans l’espace parent. La semaine commence le lundi.
- Le parent choisit les activités qui valident une journée. Un jeu raccordé
  non sélectionné peut donner son tampon, sans valider la journée pédagogique.
- Les absences ne suppriment ni les tampons ni les souvenirs acquis.
- Souvenirs débloqués après 5, 10, 15, 20, 25, 30, 50 et 100 journées
  d’apprentissage.
- Affichage des missions déjà accomplies et historique complet des tampons
  de chaque thème.

Les règles utilisent la date locale de l’appareil. Ce système encourage
la régularité sans remise à zéro punitive de la collection.

## 3. Profils et protection des données

- Création d’un profil avec prénom ou pseudo, avatar et palette.
- Identifiant stable : changer le prénom conserve la progression.
- Séparation des données d’apprentissage, préférences et statistiques des
  deux jeux raccordés, en plus de la séparation des tampons.
- Un onglet de jeu reste lié au profil qui l’a ouvert, même si un autre enfant
  est choisi dans le hub. Les liens de configuration et de scores conservent
  aussi cette association.
- Archivage réversible des profils, sans suppression de leurs données.
- Copie locale de secours par entrée, signalement des écritures refusées
  et protection des données issues d’une version plus récente.
- Export JSON de tous les profils, y compris archivés, avec leurs tampons et
  les données des jeux raccordés.
- Import avec validation, aperçu et confirmation explicite du remplacement.
  Les données sont préparées dans un nouveau coffre avant bascule : un import
  invalide ou interrompu par manque de place conserve le coffre courant.
- Demande facultative de conservation du stockage auprès du navigateur.
- Les anciennes données restent disponibles en mode invité. Leur copie vers
  un profil est explicite et ne remplace pas ses données déjà présentes.

Tout repose sur **localStorage**, sans compte, backend ni synchronisation.
L’espace parent est un outil de gestion, pas un contrôle d’accès sécurisé.
Le fonctionnement sur un appareil repose sur l’usage du même navigateur ou
de la même application installée ; aucun verrouillage matériel n’est ajouté.
Un fichier exporté peut être restauré manuellement sur un autre appareil.

**La copie locale ne protège pas contre l’effacement des données du navigateur
ou la perte de l’appareil.** Il faut conserver un export en dehors de cet
espace de stockage. La protection proposée par le navigateur peut être refusée.

## 4. Jeux raccordés dans cette première version

| Projet | Version | Modifications principales |
| --- | --- | --- |
| Hub | 1.0.0 | Interface, profils, passeport, missions, collections, sauvegardes et installation |
| Géo Trouve-Tout | 1.3.0 | Tampon Géographie après dix réponses, données par profil, compteur conservé lors d’une reprise, bandeau de retour au passeport |
| Multiplication | 2.5.0 | Tampon Nombres après dix réponses, configuration et révisions par profil, scores et navigation associés au bon enfant |

Dans Multiplication, la mise en page a aussi été ajustée pour le téléphone
en paysage avec clavier ouvert. Les champs des scores, notamment ceux issus
d’une sauvegarde importée, sont affichés comme du texte et non comme du HTML.

**Seuls Géo Trouve-Tout et Multiplication attribuent des tampons à ce stade.**
Les quinze autres jeux sont classés dans le catalogue et restent jouables,
avec leur fonctionnement existant. Les thèmes non raccordés l’indiquent.

## 5. Architecture et maintenance

- `commun/passeport.js` : règles, coffre versionné et adaptateurs de stockage.
- `commun/liaison.js` et `commun/passeport.css` : bandeau partagé et maintien
  du profil dans la navigation.
- Les trois fichiers sont embarqués dans chaque jeu raccordé pour fonctionner
  hors ligne. Leur source est dans le hub ; `scripts/distribuer.mjs` distribue
  et vérifie les copies.
- `jeux.json` porte les thèmes, les missions et l’état des raccordements.
  Le script d’ajout des jeux préserve ces métadonnées.
- Ajout des tests du passeport, des vérifications structurelles, d’un parcours
  navigateur et d’une CI GitHub Actions pour le hub.
- Documentation des sauvegardes, de la récupération, du développement local
  et du raccordement de nouveaux jeux dans les README.
- Mise à jour de la convention locale de la collection. Ce fichier se trouve
  à la racine `Jeux_Pages`, hors des dépôts Git ; les décisions concernant
  le passeport sont également consignées dans la documentation du hub.

## 6. Correction du cache hors ligne de la collection

Une anomalie existante faisait supprimer par un jeu les caches des autres
jeux de la même origine. Les purges sont désormais limitées au préfixe du jeu.

En plus des deux jeux raccordés, cette correction concerne **2048, Architecte,
Dames, Démineur, Diamants, Lasers, Mosaïcomino, Motamorphose, Polyominos,
Slitherlink, Snake, Solitaire, SUTOM et Untangle**. Leurs modifications portent
uniquement sur cette purge dans `sw.js`.

Au total, le travail touche **17 dépôts** : le hub, les deux jeux raccordés
et quatorze autres jeux. Le hub et les jeux étant publiés séparément, leurs
modifications doivent être poussées dans leurs dépôts respectifs.

## 7. Vérifications réalisées

- 13 tests du coffre et des règles : dates civiles, absences, profils séparés,
  archivage, quotas, corruption, versions et restauration atomique.
- Syntaxe, identifiants de l’interface, catalogue, versions et précache du hub.
- Vérification de l’identité des copies du module commun.
- Tests existants des 16 jeux modifiés : réussis.
- Activation simulée des 17 service workers : les caches des voisins sont
  conservés et les anciennes versions du jeu sont nettoyées.
- Parcours réel sous WebKit : création et changement de profils, dix réponses
  dans Géo avec rechargement à mi-parcours, victoire dans Multiplication,
  scores, export du fichier puis restauration, archivage et récupération
  après corruption du coffre.
- Stockage interdit et texte hostile dans une sauvegarde : erreurs signalées
  et absence d’interprétation HTML des descriptions de scores.
- Hub et deux jeux ouverts avec le serveur coupé : fonctionnement hors ligne
  vérifié après leur premier chargement.
- Affichage du hub vérifié à 320, 390, 768 et 1 280 pixels, ainsi qu’en sombre.
- 457 contrôles de mise en page de Multiplication : réussis, clavier virtuel
  simulé compris.
- Aucun appel externe ni erreur JavaScript observé dans le parcours WebKit.

L’installation et le clavier sur un **véritable iPhone** restent à vérifier
sur l’appareil cible ; les essais automatisés ne remplacent pas ce contrôle.
