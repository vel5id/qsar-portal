// Service Worker for QSAR Portal
// Caches Pyodide and static assets for faster loading

const CACHE_NAME = 'qsar-portal-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/assets/images/favicon.png'
];

const PYODIDE_CACHE = 'pyodide-v1';
const PYODIDE_CDN = 'https://cdn.jsdelivr.net/pyodide/';

// Install: cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME && key !== PYODIDE_CACHE)
                    .map(key => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch: cache-first for Pyodide, network-first for others
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    // Cache Pyodide files aggressively (they're immutable)
    if (url.href.includes(PYODIDE_CDN)) {
        event.respondWith(
            caches.open(PYODIDE_CACHE).then(cache => {
                return cache.match(event.request).then(response => {
                    if (response) {
                        return response; // Return from cache
                    }
                    return fetch(event.request).then(networkResponse => {
                        // Cache Pyodide files for next time
                        if (networkResponse.ok) {
                            cache.put(event.request, networkResponse.clone());
                        }
                        return networkResponse;
                    });
                });
            })
        );
        return;
    }
    
    // Network-first for other requests
    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Cache successful responses
                if (response.ok && event.request.method === 'GET') {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // Fallback to cache
                return caches.match(event.request);
            })
    );
});
