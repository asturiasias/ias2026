// Service Worker — 2ª Jornada IA y Transformación Digital en Salud
// Sube este número cada vez que cambies index.html u otros archivos cacheados,
// para que los usuarios reciban la versión nueva en su próxima visita.
const CACHE_VERSION = "v4";
const PRECACHE = `jornada-ia-salud-precache-${CACHE_VERSION}`;
const RUNTIME = `jornada-ia-salud-runtime-${CACHE_VERSION}`;

// Archivos que garantizamos disponibles offline desde la primera visita,
// sin depender de que el usuario haya navegado antes por esa sección.
// El programa (agenda Día 1/Día 2) va embebido en index.html, así que con
// cachearlo a él ya se cubre. Lo demás (fotos de ponentes, PDF del programa,
// fuentes) se cachea "sobre la marcha" la primera vez que se piden, así la
// instalación nunca falla por un archivo puntual que falte.
const PRECACHE_URLS = [
  "index.html",
  "manifest.json",
  "data/ponentes.json",
  "imagenes/icons/icon-192.png",
  "imagenes/icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(PRECACHE).then((cache) => cache.addAll(PRECACHE_URLS))
    // Nota: NO llamamos a self.skipWaiting() aquí a propósito. Así, cuando haya
    // una versión nueva, se queda "esperando" hasta que la propia página (tras
    // avisar al usuario con el aviso de actualización) le da permiso explícito
    // mediante el mensaje SKIP_WAITING. Esto evita que a alguien se le actualice
    // el contenido a media lectura sin avisar.
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
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
