// Service Worker — 2ª Jornada IA y Transformación Digital en Salud
// Sube este número cada vez que cambies index.html u otros archivos cacheados,
// para que los usuarios reciban la versión nueva en su próxima visita.
const CACHE_VERSION = "v1";
const PRECACHE = `jornada-ia-salud-precache-${CACHE_VERSION}`;
const RUNTIME = `jornada-ia-salud-runtime-${CACHE_VERSION}`;

// Solo se precachean los archivos que sabemos que existen siempre.
// Todo lo demás (fotos, PDF, fuentes) se cachea "sobre la marcha" la primera
// vez que se pide, así la instalación nunca falla por un archivo que falte.
const PRECACHE_URLS = [
  "index.html",
  "manifest.json",
  "imagenes/icons/icon-192.png",
  "imagenes/icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(PRECACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== PRECACHE && key !== RUNTIME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  // Navegación (cargar la página): red primero, con fallback a caché para offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((res) => res || caches.match("index.html")))
    );
    return;
  }

  // Resto de recursos (imágenes, PDF, fuentes): caché primero, red como respaldo.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(RUNTIME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
    })
  );
});
