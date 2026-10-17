// Service worker : application disponible hors ligne (cache de l'ensemble des fichiers).
// Modifier VERSION à chaque publication (même valeur que js/version.js) pour que les postes se mettent à jour.
const VERSION = "1.3.0";
const CACHE = `regard-maconnerie-${VERSION}`;
const FILES = [
  "./", "index.html", "manifest.webmanifest", "css/app.css",
  "js/app.js", "js/engine.js", "js/report.js", "js/tables.js", "js/inputs.js", "js/version.js", "js/xlsx-import.js",
  "lib/xlsx.full.min.js",
  "icons/favicon.svg", "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png", "icons/apple-touch-icon.png",
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith("regard-maconnerie-") && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request)));
});
