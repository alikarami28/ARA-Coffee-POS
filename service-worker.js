// service-worker.js - PWA Service Worker
const CACHE_NAME = 'ara-coffee-v2';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/login.html',
    '/admin.html',
    '/orders.html',
    '/reports.html',
    '/settings.html',
    '/manifest.json',
    '/css/style.css',
    '/css/pos.css',
    '/css/admin.css',
    '/css/reports.css',
    '/css/print.css',
    '/js/storage.js',
    '/js/models.js',
    '/js/auth.js',
    '/js/ui.js',
    '/js/cart.js',
    '/js/products.js',
    '/js/orders.js',
    '/js/reports.js',
    '/js/print.js',
    '/js/backup.js',
    '/js/github.js',
    '/js/app.js',
    '/assets/images/logo-placeholder.png',
    '/assets/images/icon-192x192.png',
    '/assets/images/icon-512x512.png'
];

// Install event
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Caching files');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('Service Worker: Clearing old cache');
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});

// Fetch event
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                // Return cached response if available
                if (cachedResponse) {
                    return cachedResponse;
                }

                // Clone the request
                const fetchRequest = event.request.clone();

                return fetch(fetchRequest)
                    .then((response) => {
                        // Check if valid response
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Clone the response
                        const responseToCache = response.clone();

                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    })
                    .catch(() => {
                        // Return offline page for navigation requests
                        if (event.request.mode === 'navigate') {
                            return caches.match('/index.html');
                        }
                        return new Response('Offline - محتوای آفلاین', {
                            status: 503,
                            statusText: 'Service Unavailable'
                        });
                    });
            })
    );
});

// Background sync
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-backup') {
        event.waitUntil(
            // Perform background sync
            self.clients.matchAll().then((clients) => {
                clients.forEach(client => {
                    client.postMessage({
                        type: 'SYNC_BACKUP',
                        message: 'Performing background sync'
                    });
                });
            })
        );
    }
});

// Push notifications
self.addEventListener('push', (event) => {
    const options = {
        body: event.data ? event.data.text() : 'اعلان جدید',
        icon: '/assets/images/icon-192x192.png',
        badge: '/assets/images/icon-192x192.png'
    };

    event.waitUntil(
        self.registration.showNotification('ARA Coffee', options)
    );
});