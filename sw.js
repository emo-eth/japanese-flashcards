const CACHE = "kana-v6";
const ASSETS = [
  "./",
  "./index.html",
  "./css/app.css",
  "./js/app.js",
  "./js/engine.js",
  "./js/kana.js",
  "./js/storage.js",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(async () => {
          if (req.mode === "navigate") return caches.match("./index.html");
          return Response.error();
        });
    })
  );
});
