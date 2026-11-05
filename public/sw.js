// RoadReady service worker: makes the site installable and usable with a weak connection.
//
//   Pages (navigations)   network first, cached copy when offline. Never a stale page while
//                         online, so a new release can't load files that no longer exist.
//   /assets/* (hashed)    cache first: the file name changes whenever the content does.
//   Icons, manifest       stale-while-revalidate.
//   Map tiles             cache first, capped at MAX_TILES entries.
//   API, auth, payments   never touched: always straight to the network, never cached.

const VERSION = 'v2';
const SHELL_CACHE = `roadready-shell-${VERSION}`;
const ASSET_CACHE = `roadready-assets-${VERSION}`;
const TILE_CACHE = 'roadready-map-tiles-v2';
const MAX_TILES = 1500;

const SHELL = ['/', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL))
      .catch(() => { /* install anyway; the shell is cached on the next visit */ })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  const keep = new Set([SHELL_CACHE, ASSET_CACHE, TILE_CACHE]);
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const isTile = (url) =>
  url.hostname.endsWith('cartocdn.com') ||
  url.hostname.endsWith('tile.openstreetmap.org') ||
  url.pathname.endsWith('.pbf');

async function trimTiles(cache) {
  const keys = await cache.keys();
  if (keys.length <= MAX_TILES) return;
  await Promise.all(keys.slice(0, keys.length - MAX_TILES).map((k) => cache.delete(k)));
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return; // writes (logging hours, payments...) go straight to the network

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  // Map tiles (cross-origin) — cache first, bounded.
  if (isTile(url)) {
    event.respondWith(
      caches.open(TILE_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response.ok) {
            cache.put(request, response.clone()).then(() => trimTiles(cache));
          }
          return response;
        } catch {
          return new Response(null, { status: 504, statusText: 'Tile offline' });
        }
      })
    );
    return;
  }

  // Everything else that isn't ours (Supabase, Stripe, fonts, routing...) is left alone.
  if (!sameOrigin) return;
  // Our API and the owner dashboard are never cached (personal and live data).
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin')) return;

  // Pages: network first so users always get the current release; offline falls back to the cache.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && url.pathname === '/') {
            const copy = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put('/', copy));
          }
          return response;
        })
        .catch(async () => (await caches.match(request)) || (await caches.match('/')) || Response.error())
    );
    return;
  }

  // Hashed build files never change: cache first.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.open(ASSET_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })
    );
    return;
  }

  // Icons, manifest and other small static files: serve cached, refresh in the background.
  event.respondWith(
    caches.open(SHELL_CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached || Response.error());
      return cached || network;
    })
  );
});
