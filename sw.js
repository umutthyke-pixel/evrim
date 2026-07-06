const CACHE_NAME = 'merge-evo-v1';
const ASSETS = [
    './',
    './index.html',
    './css/style.css',
    './js/data.js',
    './js/engine.js',
    './js/ui.js',
    './icon.svg',
    './manifest.json'
];

// Offline destek için dosyaları önbelleğe al
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS);
        })
    );
});

// Çevrimdışı çalışabilmesi için önce önbellekten oku
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});
