// Réseau d'abord. Le cache de ce hub ne purge jamais celui d'un autre jeu.
const CACHE = 'hub-gaming-1.12.0';
const COQUILLE = [
    'index.html',
    'jeux.json',
    'manifest.webmanifest',
    'js/hub.js',
    'js/missions.js',
    'js/rappels.js',
    'css/style.css',
    'commun/liaison.js',
    'commun/passeport.css',
    'commun/passeport.js',
    'assets/fonts/Fredoka-500.woff2',
    'assets/fonts/Nunito-400.woff2',
    'assets/fonts/Nunito-700.woff2',
    'assets/fonts/Nunito-800.woff2',
    'assets/fonts/fredoka-OFL.txt',
    'assets/fonts/nunito-OFL.txt',
    'assets/icon.svg',
    'assets/icon-180.png',
    'assets/icon-192.png',
    'assets/icon-512.png',
];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(COQUILLE)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(noms => Promise.all(noms.filter(n => n.startsWith('hub-gaming-') && n !== CACHE).map(n => caches.delete(n)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
    const url = new URL(e.request.url);
    if (e.request.method !== 'GET' || url.origin !== location.origin || !url.pathname.startsWith(new URL('./', location.href).pathname)) return;
    e.respondWith(fetch(e.request).then(reponse => {
        if (reponse.ok) { const copie = reponse.clone(); e.waitUntil(caches.open(CACHE).then(c => c.put(e.request, copie))); }
        return reponse;
    }).catch(async () => {
        const cache = await caches.open(CACHE);
        return await cache.match(e.request) || (e.request.mode === 'navigate' ? await cache.match('index.html') : Response.error());
    }));
});
