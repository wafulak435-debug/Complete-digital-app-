const CACHE_NAME = "zion-reads-v2";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/theological_studies_payload.json"
];

// Install Event
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Pre-caching Core Offline Resources...");
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn("[Service Worker] Pre-cache warning: ", err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[Service Worker] Cleaning old cache:", key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event (Network-First with Cache Fallback for maximum speed, Cache-First for static large PDFs)
self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);

  // Never cache Vite dev server modules, HMR internals, or backend API routes
  if (
    requestUrl.pathname.startsWith("/node_modules/") ||
    requestUrl.pathname.startsWith("/src/") ||
    requestUrl.pathname.startsWith("/@") ||
    requestUrl.pathname.startsWith("/api/")
  ) {
    return;
  }

  // If fetching a PDF, use Cache-First to save data and instantly render from Service Worker Offline storage
  const isPdf = event.request.url.endsWith(".pdf") || 
                requestUrl.pathname.endsWith(".pdf") || 
                requestUrl.href.includes("pdf") || 
                requestUrl.pathname.includes("/testfiles/resources/pdf/");

  if (isPdf && event.request.method === "GET") {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          console.log("[Service Worker] Offline cached PDF loaded:", event.request.url);
          return cachedResponse;
        }

        return fetch(event.request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            console.log("[Service Worker] Caching PDF in Service Worker database:", event.request.url);
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        }).catch((err) => {
          console.error("[Service Worker] PDF fetch offline failure:", err);
          return new Response("Offline preview not cached. Please view this PDF online to store it offline.", {
            status: 503,
            statusText: "Service Worker Offline PDF Cache Missing"
          });
        });
      })
    );
    return;
  }

  // Default Network-First fallback logic
  if (event.request.method === "GET") {
    const isHttpOrHttps = requestUrl.protocol === "http:" || requestUrl.protocol === "https:";
    if (!isHttpOrHttps) {
      return; // Do not intercept non-http requests like chrome-extension
    }

    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            return cached || new Response("Offline content unavailable", { status: 400 });
          });
        })
    );
  }
});
