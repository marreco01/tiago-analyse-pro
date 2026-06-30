const CACHE_NAME = "analyse-pro-v1";
const CORE_ASSETS = ["/", "/dashboard", "/favicon.png", "/apple-touch-icon.png", "/manifest.webmanifest"];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)).catch(() => undefined));
  self.skipWaiting();
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))));
  self.clients.claim();
});
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET" || event.request.url.includes("/api/")) return;
  event.respondWith(fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)).catch(() => undefined);
    return response;
  }).catch(() => caches.match(event.request).then(match => match || caches.match("/"))));
});
