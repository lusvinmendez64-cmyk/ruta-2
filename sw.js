const CACHE_NAME = 'ruta-v12-cache'; // Actualizado a v12
const urlsToCache = [
  './',
  './index.html',
  './css/estilos.css',
  './js/app.js',
  './manifest.json'
];

// Instalación: Guarda los archivos nuevos
self.addEventListener('install', event => {
  self.skipWaiting(); // Fuerza la actualización inmediata
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

// Activación: Borra la versión 11 anterior para liberar espacio
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// Intercepción: Sirve los archivos guardados si no hay internet
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});