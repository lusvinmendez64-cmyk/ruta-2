// sw.js - Service Worker con Auto-Update Forzado
const CACHE_NAME = 'ruta-marijose-v14-final'; // <--- CAMBIA ESTO EN FUTURAS ACTUALIZACIONES
const urlsToCache = [
  './',
  './index.html',
  './css/estilos.css',
  './js/app.js',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap'
];

// 1. INSTALACIÓN: Descarga los archivos nuevos
self.addEventListener('install', event => {
  self.skipWaiting(); // <--- TRUCO: Fuerza la activación inmediata sin esperar a cerrar pestañas
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Abriendo caché nueva');
        return cache.addAll(urlsToCache);
      })
  );
});

// 2. ACTIVACIÓN: Borra cachés viejas para liberar espacio y evitar conflictos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Borrando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim(); // <--- TRUCO: Toma control de la página inmediatamente
});

// 3. INTERCEPTOR: Sirve la App desde caché para velocidad, o red si hay internet
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Devuelve caché si existe, si no, va a internet
        return response || fetch(event.request);
      })
  );
});
