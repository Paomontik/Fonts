// ============================
// ✅ Service Worker PRO para Blogger (PWA)
// ============================

const CACHE_VERSION = "v3";
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;

const OFFLINE_URL = "/offline.html";

// Archivos críticos iniciales
const PRECACHE_ASSETS = [
  OFFLINE_URL
];

// ============================
// ✅ INSTALACIÓN
// ============================
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// ============================
// ✅ ACTIVACIÓN
// ============================
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== STATIC_CACHE && key !== DYNAMIC_CACHE) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// ============================
// ✅ FETCH INTELIGENTE (TIPO APP)
// ============================
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // ✅ FUENTES → Cache First
  if (req.destination === "font") {
    event.respondWith(cacheFirst(req));
    return;
  }

  // ✅ IMÁGENES → Cache First
  if (req.destination === "image") {
    event.respondWith(cacheFirst(req));
    return;
  }

  // ✅ HTML → Network First + Offline
  if (req.headers.get("accept")?.includes("text/html")) {
    event.respondWith(networkFirst(req));
    return;
  }

  // ✅ TODO LO DEMÁS → Stale While Revalidate
  event.respondWith(staleWhileRevalidate(req));
});

// ============================
// ✅ ESTRATEGIAS
// ============================

async function cacheFirst(req) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cached = await cache.match(req);
  if (cached) return cached;

  const fresh = await fetch(req);
  cache.put(req, fresh.clone());
  return fresh;
}

async function networkFirst(req) {
  const cache = await caches.open(DYNAMIC_CACHE);
  try {
    const fresh = await fetch(req);
    cache.put(req, fresh.clone());
    return fresh;
  } catch (e) {
    const cached = await cache.match(req);
    return cached || caches.match(OFFLINE_URL);
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cached = await cache.match(req);
  const fetchPromise = fetch(req).then((fresh) => {
    cache.put(req, fresh.clone());
    return fresh;
  });
  return cached || fetchPromise;
}