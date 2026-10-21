const CACHE_NAME = "taxi-local-v3-shell-2";
const FILES = ["./", "./index.html", "./styles.css", "./app.js", "./config.js", "./manifest.webmanifest"];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  const isAppConfig = url.pathname.endsWith("/config.js") || url.pathname.endsWith("/app.js") || url.pathname.endsWith("/index.html");
  if (isAppConfig) {
    event.respondWith(fetch(event.request, {cache:"no-store"}).then(response => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
      }
      return response;
    }).catch(() => caches.match(event.request)));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).catch(() => caches.match("./index.html"))));
});