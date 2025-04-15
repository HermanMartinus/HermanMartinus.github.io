// Service Worker for Bean Counter PWA
const CACHE_NAME = 'bean-counter-v1';
const BASE_PATH = self.location.pathname.replace('sw.js', '');

// This service worker doesn't cache anything as per requirements
// It only exists to make the app installable as a PWA

self.addEventListener('install', (event) => {
  self.skipWaiting();
  console.log('Service Worker installed');
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
  console.log('Service Worker activated');
});

// Network-first strategy - always try to get fresh content
self.addEventListener('fetch', (event) => {
  // Log the fetch request for debugging
  console.log('Fetch event for:', event.request.url);
  
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        console.log('Fetch failed, returning offline page');
        // If network request fails, return a simple offline message
        if (event.request.mode === 'navigate') {
          return new Response('<h1>You are offline</h1><p>Please check your internet connection.</p>', {
            headers: { 'Content-Type': 'text/html' }
          });
        }
        return new Response('Offline content unavailable');
      })
  );
}); 