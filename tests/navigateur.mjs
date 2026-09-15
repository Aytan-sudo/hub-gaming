// Parcours réels sous WebKit, avec le serveur de toute la collection sur une
// même origine. L'installation iOS sur écran d'accueil reste un contrôle manuel.
import { webkit, devices } from '../../OUTILS/node_modules/playwright/index.mjs';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const racine = fileURLToPath(new URL('../../', import.meta.url));
const captures = join(tmpdir(), 'hub-passeport-captures');
await mkdir(captures, { recursive: true });
const types = { '.html':'text/html', '.js':'text/javascript', '.json':'application/json', '.webmanifest':'application/manifest+json', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.ttf':'font/ttf', '.woff2':'font/woff2', '.webp':'image/webp', '.mp3':'audio/mpeg' };
let horsLigne = false;
let requetesCoupees = 0;
const serveur = createServer(async (req,res) => {
    if (horsLigne) { requetesCoupees++; req.socket.destroy(); return; }
    let chemin = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (chemin.endsWith('/')) chemin += 'index.html';
    const fichier = resolve(racine, '.' + chemin);
    if (!fichier.startsWith(racine)) { res.writeHead(403); res.end(); return; }
    try { const data=await readFile(fichier);res.writeHead(200,{'Content-Type':types[extname(fichier)]||'application/octet-stream'});res.end(data); }
    catch { res.writeHead(404);res.end('Absent'); }
});
await new Promise(r => serveur.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${serveur.address().port}`;
const browser=await webkit.launch();
try {
    const contexte=await browser.newContext({viewport:{width:390,height:844},colorScheme:'light',timezoneId:'Europe/Paris'});
    const page=await contexte.newPage();const erreurs=[];const externes=[];
    page.on('pageerror',e=>erreurs.push(e.message));
    page.on('request',r=>{if(!r.url().startsWith(base)&&!r.url().startsWith('data:'))externes.push(r.url());});
    await page.goto(base+'/HUB/');await page.locator('#grille .carte').first().waitFor();
    assert.equal(await page.locator('#grille .carte').count(),17);
    await page.locator('#premier-profil').click();await page.locator('#profil-nom').fill('Camille');await page.locator('#profil-enregistrer').click();
    await page.locator('#passeport:visible').waitFor();
    assert.equal(await page.locator('#theme-total').textContent(),'0 tampon');
    const camille=await page.evaluate(()=>Passeport.coffre.lire('actif'));
    await page.locator('#ajouter-profil').click();await page.locator('#profil-nom').fill('Noé');await page.locator('#profil-enregistrer').click();
    const noe=await page.evaluate(()=>Passeport.coffre.lire('actif'));
    await page.locator('#profil-actif').selectOption(camille);
    const geo=await page.locator('#missions a[href*="Geo-Trouve-Tout"]').getAttribute('href');
    await page.goto(geo);await page.locator('#choix button').first().waitFor();
    assert.match(await page.locator('.passeport-ruban a').textContent(),/Camille/);
    for(let i=0;i<10;i++) {
        await page.locator('#choix button:enabled').first().click();
        await page.waitForTimeout(850);
        if(await page.locator('#verdict-suivant').isVisible()) await page.locator('#verdict-suivant').click();
        if(i===4) { await page.reload();await page.locator('#choix button').first().waitFor(); }
    }
    await page.locator('#dialogue-fin[open]').waitFor();
    const geoBilan=await page.evaluate(id=>Passeport.coffre.bilan(id),camille);
    assert.equal(geoBilan.themes.geo.length,1);
    assert.equal(geoBilan.joursTotal,1);
    await page.goto(base+'/HUB/');
    assert.equal(await page.locator('#theme-total').textContent(),'1 tampon');
    await page.locator('#ouvrir-tampons').click();
    assert.equal(await page.locator('#tampons-historique li').count(),1);
    await page.locator('#dialogue-tampons [data-fermer]').click();
    assert.equal(await page.locator('#missions .mission-accomplie').count(),1);
    const maths=await page.locator('#missions a[href*="html_multiplication"]').getAttribute('href');
    await page.goto(maths);await page.locator('#start-btn').click();
    for(let i=0;i<10;i++) {
        const a=Number(await page.locator('#num-a').textContent()), b=Number(await page.locator('#num-b').textContent());
        const operation=await page.locator('#operator').textContent();
        await page.locator('#answer-input').fill(String(operation==='+'?a+b:a*b));
        await page.locator('#answer-form').evaluate(f=>f.requestSubmit());
    }
    assert.match(await page.locator('.passeport-ruban').textContent(),/Tampon gagné/);
    assert.equal(await page.evaluate(id=>Passeport.coffre.bilan(id).joursTotal,camille),1);
    assert.equal(await page.evaluate(id=>Passeport.coffre.bilan(id).themes.nombres.length,camille),1);
    for(let i=10;i<30;i++) {
        const a=Number(await page.locator('#num-a').textContent()), b=Number(await page.locator('#num-b').textContent());
        const operation=await page.locator('#operator').textContent();
        await page.locator('#answer-input').fill(String(operation==='+'?a+b:a*b));
        await page.locator('#answer-form').evaluate(f=>f.requestSubmit());
    }
    await page.locator('#screen-victory:visible').waitFor();
    await page.goto(base+'/html_multiplication/highscores.html?profil='+camille);
    assert.equal(await page.locator('.score-player').first().textContent(),'Camille');
    // Une sauvegarde peut contenir du texte hostile dans d'autres champs
    // que le nom : aucune description de score ne doit devenir du HTML.
    await page.evaluate(()=>{
        const s=JSON.parse(Passeport.stockageJeu('multiplication').getItem('highscores'));
        s[0].timerDuration='<img src=x onerror="window.injection=true">';
        Passeport.stockageJeu('multiplication').setItem('highscores',JSON.stringify(s));
    });
    await page.reload();assert.equal(await page.locator('.score-meta img').count(),0);
    await page.evaluate(()=>{
        const s=JSON.parse(Passeport.stockageJeu('multiplication').getItem('highscores'));s[0].timerDuration=15;
        Passeport.stockageJeu('multiplication').setItem('highscores',JSON.stringify(s));
        Passeport.coffre.choisir(Passeport.coffre.profils().find(p=>p.nom==='Noé').id);
    });
    await page.locator('#back-button').click();
    await page.locator('#start-btn').waitFor();
    assert.equal(await page.evaluate(()=>Passeport.profilId),camille);
    await page.goto(base+'/html_multiplication/config.html?profil='+camille);
    assert.equal(await page.locator('#player-options input:checked').inputValue(),'profil');
    assert.match(await page.locator('#player-options').textContent(),/Camille/);
    // SUTOM : dix mots acceptés par le dictionnaire, sur plusieurs parties si besoin, donnent le tampon Mots.
    await page.goto(base+'/HUB/');await page.locator('#profil-actif').selectOption(camille);
    assert.equal(await page.locator('#missions .xp-mission').count(),5);
    const sutom=await page.locator('#missions a[href*="Sutom"]').getAttribute('href');
    await page.goto(sutom);await page.locator('.key').first().waitFor();
    assert.match(await page.locator('.passeport-ruban').textContent(),/Camille.*un mot trouvé ou 10 essais/);
    // L'option « lettres modifiables » permet de retaper un mot entier à chaque essai.
    await page.evaluate(()=>Passeport.stockageJeu('sutom').setItem('sutom.settings',JSON.stringify({freeInput:true,sound:false,vibration:false})));
    await page.reload();await page.locator('.key').first().waitFor();
    if(await page.locator('#help-dialog[open]').count()) await page.locator('#help-dialog [data-close]').click();
    const lexiques={};
    for(let n=0;n<10;n++) {
        if(await page.locator('#end-dialog[open]').count()) { await page.locator('#replay-button').click();await page.waitForTimeout(300); }
        const solution=await page.evaluate(()=>JSON.parse(Passeport.stockageJeu('sutom').getItem('sutom.game')).solution);
        lexiques[solution.length]??=(await page.evaluate(l=>fetch(`data/lexique-${l}.txt`).then(r=>r.text()),solution.length)).split('\n');
        const mot=lexiques[solution.length].filter(m=>m&&m[0]===solution[0]&&m!==solution)[n];
        for(let i=0;i<mot.length;i++) await page.keyboard.press('Backspace');
        await page.keyboard.type(mot.slice(1).toLowerCase());await page.keyboard.press('Enter');
        await page.waitForFunction(k=>JSON.parse(Passeport.stockageJeu('sutom').getItem('sutom.passeport'))?.words===k,n+1);
        await page.waitForTimeout(2600); // révélation de la ligne
        if(n===4) { await page.reload();await page.locator('.key').first().waitFor(); }
    }
    await page.locator('.passeport-ruban[data-gagne]').waitFor();
    assert.match(await page.locator('.passeport-ruban').textContent(),/Tampon gagné/);
    assert.equal(await page.evaluate(id=>Passeport.coffre.bilan(id).themes.mots.length,camille),1);
    assert.equal(new URL(page.url()).searchParams.get('profil'),camille);
    assert.equal(await page.evaluate(()=>localStorage.getItem('sutom.stats')),null);
    // Démineur : le bandeau et les préférences suivent le passeport de l'enfant.
    await page.goto(base+'/Demineur/?profil='+camille);await page.locator('#grille').waitFor();
    assert.match(await page.locator('.passeport-ruban').textContent(),/Camille.*une grille déminée ou 10 parties/);
    assert.equal(await page.evaluate(()=>Passeport.stockageJeu('demineur')!==null&&localStorage.getItem('demineur.preferences')===null),true);
    // Slitherlink : trente traits posés donnent le tampon Logique, et une boucle fermée le donne aussi.
    await page.goto(base+'/Slitherlink/?profil='+camille);await page.locator('.cible').first().waitFor();
    assert.match(await page.locator('.passeport-ruban').textContent(),/Camille.*une boucle fermée ou 30 traits/);
    for(let i=0;i<30;i++) await page.locator('.cible').nth(i*2).click({force:true});
    await page.waitForFunction(()=>JSON.parse(Passeport.stockageJeu('slitherlink').getItem('slitherlink.passeport')||'{}').traits===30);
    await page.locator('.passeport-ruban[data-gagne]').waitFor();
    assert.equal(await page.evaluate(id=>Passeport.coffre.bilan(id).themes.logique.length,camille),1);
    const resolue=await page.evaluate(async()=>{
        const {genererSur}=await import('./js/generateur.js');const {creerHasard}=await import('./js/hasard.js');const {encoderLien}=await import('./js/codage.js');
        const g=genererSur(5,5,creerHasard(42),{niveau:1});return encoderLien(g,g.solution);
    });
    await page.goto(base+'/Slitherlink/?profil='+noe+resolue);await page.locator('.cible').first().waitFor();
    await page.waitForFunction(id=>Passeport.coffre.bilan(id).themes.logique.length===1,noe);
    await page.goto(base+'/HUB/');await page.locator('#profil-actif').selectOption(noe);
    assert.equal(await page.locator('#theme-total').textContent(),'0 tampon');
    await page.goto(base+'/Geo-Trouve-Tout/?profil='+noe);
    const souvenirsNoe=await page.evaluate(()=>Passeport.stockageJeu('geo').getItem('geo.memoire'));
    assert.equal(souvenirsNoe,null);
    // Un onglet conserve son enfant même quand le hub choisit quelqu'un d'autre.
    const autre=await contexte.newPage();await autre.goto(base+'/HUB/');
    await autre.locator('#profil-actif').selectOption(camille);
    assert.equal(await page.evaluate(()=>Passeport.profilId),noe);
    await autre.close();
    await page.goto(base+'/HUB/');await page.locator('#profil-actif').selectOption(camille);
    await page.locator('#ouvrir-admin').click();await page.locator('#personnaliser').click();
    await page.locator('#profil-nom').fill('Camille ✨');await page.locator('#profil-palette').selectOption('menthe');await page.locator('#profil-enregistrer').click();
    assert.equal(await page.evaluate(id=>Passeport.coffre.bilan(id).joursTotal,camille),1);
    await page.locator('#ouvrir-admin').click();
    const telechargement=page.waitForEvent('download');await page.locator('#exporter').click();const download=await telechargement;
    const sauvegarde=join(captures,'passeports.json');await download.saveAs(sauvegarde);
    await page.locator('#archiver').click();await page.locator('#archive-nom').fill('Camille ✨');await page.locator('#formulaire-archive button[type=submit]').click();
    await page.locator('#importer').setInputFiles(sauvegarde);await page.locator('#apercu-import:visible').waitFor();await page.locator('#confirmer-import').click();
    assert.equal(await page.evaluate(id=>Passeport.coffre.profil(id).archive,camille),false);
    assert.equal(await page.evaluate(id=>Passeport.coffre.bilan(id).joursTotal,camille),1);
    await page.locator('#dialogue-admin [data-fermer]').click();
    // Retour à la palette validée pour les captures de référence.
    await page.evaluate(id=>Passeport.coffre.modifierProfil(id,{palette:'lavande'}),camille);await page.reload();
    await page.locator('#catalogue-basculer').click();
    for(const largeur of [320,390,768,1280]) {
        await page.setViewportSize({width:largeur,height:900});
        const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
        assert.equal(overflow,false,'Débordement à '+largeur+' px');
        await page.screenshot({path:join(captures,`hub-${largeur}.png`),fullPage:true});
    }
    await page.emulateMedia({colorScheme:'dark'});
    await page.screenshot({path:join(captures,'hub-sombre.png'),fullPage:true});
    await page.emulateMedia({colorScheme:'light'});
    await page.setViewportSize({width:390,height:844});
    await page.locator('#ouvrir-admin').click();
    await page.screenshot({path:join(captures,'espace-admin.png')});
    await page.locator('#dialogue-admin [data-fermer]').click();
    await page.locator('#catalogue-basculer').click();
    await page.screenshot({path:join(captures,'hub-catalogue.png'),fullPage:true});
    // Le hub ne contacte ni CDN ni service de suivi.
    assert.deepEqual(externes,[]);
    // Coexistence des caches et réouverture hors ligne avec le même profil.
    await page.evaluate(()=>navigator.serviceWorker.ready);
    const cachesAvant=await page.evaluate(()=>caches.keys());
    assert.ok(cachesAvant.some(n=>n.startsWith('hub-gaming-')));
    assert.ok(cachesAvant.some(n=>n.startsWith('geo-trouve-tout-')));
    assert.ok(cachesAvant.some(n=>n.startsWith('multiplication-v')));
    assert.ok(cachesAvant.some(n=>n.startsWith('sutom-')));
    // Une coupure du serveur laisse le service worker traiter l'échec réseau.
    // setOffline de WebKit interrompt aussi ses navigations avant interception.
    horsLigne=true;await page.reload();await page.locator('#passeport:visible').waitFor();
    assert.match(await page.locator('#salutation').textContent(),/Camille/);
    await page.goto(base+'/Geo-Trouve-Tout/?profil='+camille);await page.locator('#choix button').first().waitFor();
    await page.goto(base+'/html_multiplication/?profil='+camille);await page.locator('#start-btn').waitFor();
    await page.goto(base+'/Sutom/?profil='+camille);await page.locator('.passeport-ruban a').waitFor();
    assert.match(await page.locator('.passeport-ruban a').textContent(),/Camille/);
    assert.ok(requetesCoupees>0,'Le réseau a réellement été coupé');
    assert.deepEqual(erreurs,[]);
    horsLigne=false;
    // Une interdiction du stockage doit laisser les jeux accessibles, sans
    // annoncer qu'un nouveau profil a été enregistré.
    const interdit=await browser.newContext();
    await interdit.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Stockage interdit','SecurityError');}}));
    const invite=await interdit.newPage();const erreursInvite=[];
    invite.on('pageerror',e=>erreursInvite.push(e.message));
    await invite.goto(base+'/HUB/');await invite.locator('#grille .carte').first().waitFor();
    assert.equal(await invite.locator('#grille .carte').count(),17);
    assert.match(await invite.locator('#alerte-stockage').textContent(),/indisponible/);
    await invite.locator('#premier-profil').click();await invite.locator('#profil-nom').fill('Test');await invite.locator('#profil-enregistrer').click();
    assert.match(await invite.locator('#profil-erreur').textContent(),/indisponible/);
    assert.deepEqual(erreursInvite,[]);await interdit.close();
    // Un adulte : ton sobre et sans objectif, sans rien changer au passeport ludique d'un enfant.
    await page.goto(base+'/HUB/');await page.locator('#ajouter-profil').click();
    await page.locator('#profil-nom').fill('Alex');await page.locator('#profil-ton').selectOption('sobre');await page.locator('#profil-enregistrer').click();
    await page.locator('#passeport:visible').waitFor();
    assert.equal(await page.locator('#salutation').textContent(),'Bonjour Alex');
    assert.equal(await page.locator('.xp-mochi').isVisible(),false);
    assert.equal(await page.locator('[data-texte="missions-titre"]').textContent(),'Au programme');
    assert.equal(await page.locator('#missions .xp-mission h3').first().textContent(),'Mots');
    await page.locator('#ouvrir-admin').click();await page.locator('#objectif').selectOption('0');
    await page.locator('#formulaire-admin button[type=submit]').click();
    assert.match(await page.locator('#admin-erreur').textContent(),/Objectif retiré/);
    await page.locator('#dialogue-admin [data-fermer]').click();
    assert.match(await page.locator('#semaine-total').textContent(),/cette semaine$/);
    assert.match(await page.locator('#semaine-message').textContent(),/^Sans objectif/);
    const alex=await page.evaluate(()=>Passeport.coffre.lire('actif'));
    assert.deepEqual(await page.evaluate(id=>{const p=Passeport.coffre.profil(id);return [p.ton,p.sansObjectif,p.objectif];},alex),['sobre',true,4]);
    await page.locator('#passeport').screenshot({path:join(captures,'hub-sobre-passeport.png')});
    await page.locator('#semaine').screenshot({path:join(captures,'hub-sobre-semaine.png')});
    await page.locator('#ouvrir-admin').click();await page.locator('#objectif').selectOption('3');
    await page.locator('#formulaire-admin button[type=submit]').click();await page.locator('#dialogue-admin [data-fermer]').click();
    assert.match(await page.locator('#semaine-total').textContent(),/sur 3$/);
    await page.locator('#profil-actif').selectOption(camille);
    assert.match(await page.locator('#salutation').textContent(),/^Coucou, Camille/);
    assert.equal(await page.locator('.xp-mochi').isVisible(),true);
    assert.equal(await page.locator('[data-texte="missions-titre"]').textContent(),'On part où aujourd’hui ?');
    assert.deepEqual(erreurs,[]);
    // Sur iPhone dans Safari : installer d'abord, transférer un passeport existant, rappeler l'export.
    const iphone=await browser.newContext({...devices['iPhone 15'],timezoneId:'Europe/Paris'});
    const ios=await iphone.newPage();const erreursIos=[];ios.on('pageerror',e=>erreursIos.push(e.message));
    await ios.goto(base+'/HUB/');await ios.locator('#installation:visible').waitFor();
    assert.equal(await ios.locator('#premier-profil').textContent(),'Continuer sans installer');
    assert.equal(await ios.locator('#rappels').isHidden(),true);
    await ios.screenshot({path:join(captures,'ios-accueil.png'),fullPage:true});
    await ios.evaluate(()=>{
        const c=Passeport.coffre,p=c.creerProfil({nom:'Iris'});
        for(const recul of [2,4,6]) { const jour=Passeport.jourLocal(new Date(Date.now()-recul*86400000)); c.ecrire(`activite/${p.id}/${jour}/geo-trouve-tout`,{profil:p.id,jour,jeu:'geo-trouve-tout',theme:'geo',pedagogique:true}); }
    });
    await ios.reload();await ios.locator('#rappel-installation:visible').waitFor();
    assert.equal(await ios.locator('#rappel-sauvegarde').isHidden(),true);
    await ios.locator('#rappel-installation').screenshot({path:join(captures,'ios-rappel-installation.png')});
    await ios.locator('#rappel-installation-plus-tard').click();await ios.locator('#rappel-sauvegarde:visible').waitFor();
    assert.match(await ios.locator('#rappel-sauvegarde-texte').textContent(),/^3 journées/);
    await ios.locator('#rappel-sauvegarde').screenshot({path:join(captures,'ios-rappel-sauvegarde.png')});
    const exportIos=ios.waitForEvent('download');await ios.locator('#rappel-sauvegarde-exporter').click();await exportIos;
    assert.match(await ios.locator('#rappel-sauvegarde-statut').textContent(),/Export proposé/);
    await ios.reload();await ios.locator('#passeport:visible').waitFor();
    assert.equal(await ios.locator('#rappels').isHidden(),true);
    await ios.locator('#ouvrir-admin').click();assert.match(await ios.locator('#statut-sauvegarde').textContent(),/aujourd’hui/);
    await iphone.close();
    // L'app installée sur iOS a son propre stockage : l'accueil explique comment y ramener un passeport.
    const app=await browser.newContext({...devices['iPhone 15']});
    await app.addInitScript(()=>Object.defineProperty(navigator,'standalone',{get:()=>true}));
    const appIos=await app.newPage();appIos.on('pageerror',e=>erreursIos.push(e.message));
    await appIos.goto(base+'/HUB/');await appIos.locator('#installation-app:visible').waitFor();
    assert.equal(await appIos.locator('#installation').isHidden(),true);
    assert.equal(await appIos.locator('#premier-profil').textContent(),'Créer mon passeport ✨');
    assert.deepEqual(erreursIos,[]);await app.close();
    // Une double corruption reste récupérable depuis l'espace administrateur.
    await page.goto(base+'/HUB/');
    await page.evaluate(()=>{localStorage.setItem('collection.coffre.v1','{illisible');localStorage.setItem('collection.coffre.v1.secours','{illisible');});
    await page.reload();await page.locator('#ouvrir-admin').click();
    await page.locator('#importer').setInputFiles(sauvegarde);await page.locator('#apercu-import:visible').waitFor();await page.locator('#confirmer-import').click();
    assert.equal(await page.evaluate(id=>Passeport.coffre.bilan(id).joursTotal,camille),1);
    assert.deepEqual(erreurs,[]);
    console.log(JSON.stringify({profils:'création, séparation, renommage et archivage vérifiés',jeux:'Géo (reprise comprise), Multiplication, SUTOM (deux parties, rechargement compris) : 10 réponses réelles ; Slitherlink : 30 traits puis une boucle résolue',sauvegarde:'export et restauration depuis le fichier téléchargé',horsLigne:'hub et trois jeux',largeurs:[320,390,768,1280],erreurs,externes,captures},null,2));
    await contexte.close();
} finally { await browser.close();await new Promise(r=>serveur.close(r)); }
