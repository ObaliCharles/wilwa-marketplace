const CACHE_VERSION = "wilwa-shell-v3";
const APP_SHELL = ["/", "/offline", "/manifest.webmanifest", "/images/wilwa-icon.png", "/images/wilwa-launch-screen.png", "/icons/wilwa-192.png", "/icons/wilwa-512.png", "/icons/wilwa-512-maskable.png", "/favicon.ico"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("wilwa-") && key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never put authenticated, personalized, checkout, or API traffic in a
  // shared cache. Those requests always use the network.
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/") || /^(\/cart|\/checkout|\/my-orders|\/inbox|\/wishlist|\/address-book|\/add-address|\/payment-methods|\/order-placed|\/track-order|\/admin|\/dashboard|\/seller|\/sign-in|\/sign-up)/.test(url.pathname)) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline"))
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || /\.(?:css|js|woff2?|png|jpg|jpeg|webp|avif|svg|ico)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request).then((response) => {
          if (response.ok) caches.open(CACHE_VERSION).then((cache) => cache.put(request, response.clone()));
          return response;
        });
        return cached || network;
      })
    );
  }
});
