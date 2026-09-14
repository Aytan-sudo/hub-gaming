import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const contexte = { module: { exports: {} } };
vm.runInNewContext(readFileSync(new URL('../commun/passeport.js', import.meta.url), 'utf8'), contexte);
const P = contexte.module.exports;
class Stockage {
    donnees = new Map(); limite = Infinity; panne = false;
    get length() { return this.donnees.size; }
    key(i) { return [...this.donnees.keys()][i] ?? null; }
    getItem(k) { return this.donnees.get(k) ?? null; }
    setItem(k, v) { if (this.panne || [...this.donnees.values()].join('').length + v.length > this.limite) throw new Error('Quota'); this.donnees.set(k, String(v)); }
    removeItem(k) { this.donnees.delete(k); }
}
function scenario() {
    const stockage = new Stockage(); let n = 0; let jour = new Date(2026, 8, 14, 12);
    const messages = [];
    const options = { stockage, maintenant: () => jour, uuid: () => `identifiant-${++n}`, signaler: m => messages.push(m) };
    return { stockage, options, coffre: P.creerCoffre(options), messages, avancer: (a,m,j) => { jour = new Date(a,m-1,j,12); } };
}
const note = (c, id, jeu = 'geo-trouve-tout', questions = 10) => c.noter({ profilId: id, jeu, questions });
test('profils stables, séparés et renommables sans perte', () => {
    const { coffre: c } = scenario(); const a=c.creerProfil({nom:'Émilie'}), b=c.creerProfil({nom:'Arthur'});
    note(c,a.id); c.modifierProfil(a.id,{nom:'Émy'});
    assert.equal(c.bilan(a.id).joursTotal,1); assert.equal(c.bilan(b.id).joursTotal,0); assert.equal(c.profil(a.id).nom,'Émy');
    const autre=P.creerCoffre(scenario().options); assert.equal(autre.profils().length,0);
});
test('une présence, 9 réponses ou une valeur invalide ne donnent rien', () => {
    const { coffre:c }=scenario(); const p=c.creerProfil({nom:'A'});
    for(const q of [0,9,NaN,Infinity,'10',10.5]) assert.equal(note(c,p.id,'geo-trouve-tout',q).gagne,false);
    assert.equal(note(c,p.id,'inconnu',10).gagne,false);
    assert.equal(note(c,'profil-absent').gagne,false);
    assert.equal(c.bilan(p.id).joursTotal,0);
});
test('plusieurs jeux et onglets : deux tampons, une seule journée', () => {
    const {coffre:c,options}=scenario(); const p=c.creerProfil({nom:'A'}); const onglet=P.creerCoffre(options);
    assert.equal(note(c,p.id).gagne,true); assert.equal(note(onglet,p.id).gagne,false);
    note(onglet,p.id,'html_multiplication'); const b=c.bilan(p.id);
    assert.equal(b.joursTotal,1); assert.equal(b.themes.geo.length,1); assert.equal(b.themes.nombres.length,1);
});
test('les absences et le changement de semaine conservent les acquis', () => {
    const s=scenario(),c=s.coffre,p=c.creerProfil({nom:'A'}); note(c,p.id);
    s.avancer(2026,9,16);note(c,p.id);assert.equal(c.bilan(p.id).joursSemaine,2);
    s.avancer(2026,10,5);assert.equal(c.bilan(p.id).joursSemaine,0);assert.equal(c.bilan(p.id).joursTotal,2);
    note(c,p.id);assert.equal(c.bilan(p.id).joursTotal,3);
});
test('jours civils exacts aux changements d’heure, d’année et en année bissextile',()=>{
    assert.equal(P.numeroJour('2026-03-30')-P.numeroJour('2026-03-29'),1);
    assert.equal(P.numeroJour('2026-10-26')-P.numeroJour('2026-10-25'),1);
    assert.equal(P.numeroJour('2027-01-01')-P.numeroJour('2026-12-31'),1);
    assert.equal(P.numeroJour('2028-03-01')-P.numeroJour('2028-02-28'),2);
    assert.ok(Number.isNaN(P.numeroJour('2026-02-29')));
});
test('les activités pédagogiques sont choisies par profil et figées au moment de jouer',()=>{
    const s=scenario(),c=s.coffre,p=c.creerProfil({nom:'A'});
    c.modifierProfil(p.id,{activites:['geo-trouve-tout'],objectif:3}); note(c,p.id,'html_multiplication');
    assert.equal(c.bilan(p.id).joursTotal,0); assert.equal(c.bilan(p.id).themes.nombres.length,1);
    c.modifierProfil(p.id,{activites:['html_multiplication']}); assert.equal(c.bilan(p.id).joursTotal,0);
    s.avancer(2026,9,15);note(c,p.id,'html_multiplication');assert.equal(c.bilan(p.id).joursTotal,1);
    assert.throws(()=>c.modifierProfil(p.id,{activites:[]}));
});
test('archivage réversible, aucun tampon nouveau pour le profil archivé',()=>{
    const {coffre:c}=scenario(),p=c.creerProfil({nom:'A'});note(c,p.id);
    c.modifierProfil(p.id,{archive:true});assert.equal(c.profils().length,0);assert.equal(c.profils(true).length,1);
    assert.equal(note(c,p.id,'html_multiplication').gagne,false);
    c.modifierProfil(p.id,{archive:false});assert.equal(c.bilan(p.id).joursTotal,1);
});
test('copie de secours utilisée après corruption, versions futures protégées',()=>{
    const {coffre:c,stockage,messages}=scenario(),p=c.creerProfil({nom:'A'});
    const k=`collection.v1.principal.profil/${p.id}`;stockage.setItem(k,'{cassé');
    assert.equal(c.profil(p.id).nom,'A');assert.ok(messages.length);
    stockage.setItem(k,JSON.stringify({v:2,valeur:p}));assert.throws(()=>c.profil(p.id),/récente/);
    assert.throws(()=>c.modifierProfil(p.id,{nom:'B'}));assert.equal(JSON.parse(stockage.getItem(k)).v,2);
});
test('écriture refusée : ni faux tampon, ni écrasement de profil',()=>{
    const {coffre:c,stockage}=scenario(),p=c.creerProfil({nom:'A'});stockage.panne=true;
    assert.throws(()=>note(c,p.id),/Enregistrement impossible/);assert.equal(c.bilan(p.id).joursTotal,0);
    assert.throws(()=>c.modifierProfil(p.id,{nom:'B'}));assert.equal(c.profil(p.id).nom,'A');
});
test('progression des jeux séparée, sauvegardée, et effacement sans résurrection',()=>{
    const {coffre:c}=scenario(),a=c.creerProfil({nom:'A'}),b=c.creerProfil({nom:'B'});
    const sa=c.stockageJeu('geo',a.id),sb=c.stockageJeu('geo',b.id);
    sa.setItem('geo.memoire','{"fiches":{"FR":[2,2,75,9]}}');assert.equal(sb.getItem('geo.memoire'),null);
    sa.setItem('geo.memoire','{"fiches":{"FR":[3,3,88,10]}}');sa.removeItem('geo.memoire');
    assert.equal(sa.getItem('geo.memoire'),null);
});
test('export/import complet, restauration atomique et ancien onglet bloqué',()=>{
    const {coffre:c,stockage}=scenario(),p=c.creerProfil({nom:'Élodie'});note(c,p.id);
    const jeu=c.stockageJeu('geo',p.id);jeu.setItem('geo.memoire','{"fiches":{"FR":[2,2,75,9]}}');
    const texte=c.exporter(); assert.equal(c.preparerImport(texte).profils.length,1);
    c.modifierProfil(p.id,{nom:'Après'});const avant=c.generation();c.restaurer(texte);
    assert.notEqual(c.generation(),avant);assert.equal(c.profil(p.id).nom,'Élodie');assert.equal(c.bilan(p.id).joursTotal,1);
    assert.equal(c.stockageJeu('geo',p.id).getItem('geo.memoire'),'{"fiches":{"FR":[2,2,75,9]}}');
    assert.throws(()=>jeu.setItem('geo.memoire','{"fiches":{}}'),/changé/);
    assert.ok(stockage.getItem(`collection.v1.${avant}.profil/${p.id}`));
});
test('import invalide ou à court de place : coffre actuel intact',()=>{
    const {coffre:c,stockage}=scenario(),p=c.creerProfil({nom:'A'});const texte=c.exporter(),avant=c.generation();
    for(const t of ['abc','{}',texte.replace('"version": 1','"version": 2')]) assert.throws(()=>c.restaurer(t));
    const f=JSON.parse(texte);f.donnees['jeu/profil-inconnu/geo/geo.stats']='{}';assert.throws(()=>c.restaurer(JSON.stringify(f)));
    stockage.limite=[...stockage.donnees.values()].join('').length+50;
    assert.throws(()=>c.restaurer(texte),/conservé/);assert.equal(c.generation(),avant);assert.equal(c.profil(p.id).nom,'A');
});
const brut = valeur => JSON.stringify({ v: 1, valeur });
test('un jeu raccordé par une version plus récente reste lisible, conservé et exporté',()=>{
    const s=scenario(),{coffre:c,stockage}=s,p=c.creerProfil({nom:'A'}),racine='collection.v1.principal.';
    const futur={...c.profil(p.id),activites:['geo-trouve-tout','mots-croises']};
    for(const suffixe of ['','.secours']) stockage.setItem(`${racine}profil/${p.id}${suffixe}`,brut(futur));
    stockage.setItem(`${racine}activite/${p.id}/2026-09-14/mots-croises`,brut({profil:p.id,jour:'2026-09-14',jeu:'mots-croises',theme:'mots',pedagogique:true}));
    stockage.setItem(`${racine}jeu/${p.id}/mots-croises/grille`,brut('{"essais":3}'));
    assert.equal(c.profil(p.id).nom,'A');assert.equal(c.bilan(p.id).joursTotal,1);assert.equal(c.bilan(p.id).themes.mots.length,1);
    assert.ok(c.stockageJeu('geo',p.id));assert.equal(c.stockageJeu('mots-croises',p.id),null);
    c.modifierProfil(p.id,{objectif:5});assert.deepEqual([...c.profil(p.id).activites],['geo-trouve-tout','mots-croises']);
    const texte=c.exporter();c.restaurer(texte);
    assert.equal(c.lire(`jeu/${p.id}/mots-croises/grille`),'{"essais":3}');assert.equal(c.bilan(p.id).themes.mots.length,1);
    // Un jeu connu garde son thème : Géo ne peut pas donner un tampon Mots.
    assert.equal(c.preparerImport(texte.replace('"theme": "mots"','"theme": "geo"')).tampons,1);
    const faux=JSON.parse(texte);faux.donnees[`activite/${p.id}/2026-09-13/geo-trouve-tout`]={profil:p.id,jour:'2026-09-13',jeu:'geo-trouve-tout',theme:'mots',pedagogique:true};
    assert.throws(()=>c.preparerImport(JSON.stringify(faux)),/invalides/);
});
test('une entrée illisible est mise de côté : listes, bilans et export continuent',()=>{
    const {coffre:c,stockage,messages}=scenario(),a=c.creerProfil({nom:'A'}),b=c.creerProfil({nom:'B'});
    note(c,a.id);note(c,b.id);c.stockageJeu('geo',b.id).setItem('geo.stats','{"x":1}');
    const casser=cle=>{for(const suffixe of ['','.secours']) stockage.setItem(`collection.v1.principal.${cle}${suffixe}`,'{cassé');};
    casser(`jeu/${b.id}/geo/geo.stats`);
    const {texte,ignorees}=c.preparerExport();
    assert.deepEqual([...ignorees],[`jeu/${b.id}/geo/geo.stats`]);assert.equal(c.preparerImport(texte).profils.length,2);assert.ok(messages.length);
    casser(`profil/${b.id}`);
    assert.deepEqual([...c.profils().map(p=>p.nom)],['A']);assert.equal(c.bilan(a.id).joursTotal,1);
    // B est actif : sans son profil, sa progression et le repère actif sortent du fichier pour qu'il reste restaurable.
    const partiel=c.preparerExport();
    assert.ok(partiel.ignorees.includes(`profil/${b.id}`));assert.ok(partiel.ignorees.includes(`activite/${b.id}/2026-09-14/geo-trouve-tout`));
    const apercu=c.preparerImport(partiel.texte);assert.equal(apercu.profils.length,1);assert.equal(JSON.parse(partiel.texte).donnees.actif,'');
    casser(`profil/${a.id}`);assert.throws(()=>c.exporter(),/Aucun passeport lisible/);
});
test('repère du coffre : sa copie suit le coffre courant, sans purge à l’aveugle',()=>{
    const s=scenario(),{coffre:c,stockage}=s,p=c.creerProfil({nom:'A'});note(c,p.id);
    const texte=c.exporter();c.restaurer(texte);const courant=c.generation();
    assert.equal(stockage.getItem('collection.coffre.v1.secours'),courant);assert.equal(stockage.getItem('collection.coffre.v1.precedent'),'principal');
    stockage.setItem('collection.coffre.v1','{abîmé');assert.equal(c.generation(),courant);
    // Données écrites par la 1.0.0 : « .secours » désignait le coffre d'avant l'import.
    stockage.setItem('collection.coffre.v1',courant);stockage.setItem('collection.coffre.v1.secours','principal');stockage.removeItem('collection.coffre.v1.precedent');
    P.creerCoffre(s.options);
    assert.equal(stockage.getItem('collection.coffre.v1.secours'),courant);assert.equal(stockage.getItem('collection.coffre.v1.precedent'),'principal');
    // Repère et copie illisibles : la restauration réussit, mais aucun coffre existant n'est effacé.
    stockage.setItem('collection.coffre.v1','{x');stockage.setItem('collection.coffre.v1.secours','{x');
    assert.throws(()=>c.generation(),/illisible/);c.restaurer(texte);
    assert.ok(stockage.getItem(`collection.v1.${courant}.profil/${p.id}`));assert.ok(stockage.getItem(`collection.v1.principal.profil/${p.id}`));
    assert.equal(c.bilan(p.id).joursTotal,1);
});
test('SUTOM : tampon Mots après dix mots, drapeaux JSON rangés dans le profil',()=>{
    const s=scenario(),{coffre:c}=s,p=c.creerProfil({nom:'A'});
    assert.ok(c.profil(p.id).activites.includes('sutom'));
    assert.equal(note(c,p.id,'sutom',9).gagne,false);
    const r=note(c,p.id,'sutom',10);assert.equal(r.gagne,true);assert.equal(r.activite.theme,'mots');assert.equal(c.bilan(p.id).themes.mots.length,1);
    const jeu=c.stockageJeu('sutom',p.id);jeu.setItem('sutom.help-seen','true');jeu.setItem('sutom.passeport','{"jour":"2026-09-14","essais":10}');
    assert.equal(jeu.getItem('sutom.help-seen'),'true');assert.throws(()=>jeu.setItem('sutom.stats','{cassé'));
    assert.equal(c.preparerImport(c.exporter()).profils.length,1);
});
test('anciennes données copiées explicitement, sans destruction ni overwrite',()=>{
    const {coffre:c,stockage}=scenario(),p=c.creerProfil({nom:'A'});
    stockage.setItem('geo.memoire','{"fiches":{"FR":[1,1,50,0]}}');
    stockage.setItem('stats:A:multiplication','{"2x3":{"correct":2}}');
    stockage.setItem('sutom.stats','{"played":4,"won":3}');stockage.setItem('sutom.help-seen','true');
    assert.equal(c.reprendreAncien(p.id),4);assert.equal(c.reprendreAncien(p.id),0);
    assert.equal(c.stockageJeu('sutom',p.id).getItem('sutom.help-seen'),'true');
    assert.ok(stockage.getItem('geo.memoire'));assert.ok(c.stockageJeu('multiplication',p.id).getItem('stats:profil:multiplication'));
});
