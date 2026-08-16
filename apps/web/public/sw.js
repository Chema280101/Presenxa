// AsistControl PWA Service Worker v1.2 — Push Notifications & Offline Caching
const CACHE_NAME = "asistcontrol-pwa-v1.2";
const STATIC_ASSETS = [
  "/app",
  "/api/icon/192",
  "/api/icon/512",
  "/icon",
  "/manifest.webmanifest",
];

// Install Event — pre-cache core shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("[SW] Pre-caching non-fatal warning:", err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event — clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch Event — Network-first for dynamic navigation, Cache-first for icons/static
self.addEventListener("fetch", (event) => {
  // Only handle HTTP/HTTPS GET requests
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  // Skip Next.js internals, hot-reload, chunks & background APIs
  if (
    url.pathname.startsWith("/_next/") ||
    url.pathname.startsWith("/api/geo") ||
    url.pathname.startsWith("/api/auth") ||
    url.pathname.startsWith("/api/notifications")
  ) {
    return;
  }

  // Static images and icons — Cache First with Network Fallback
  if (url.pathname.startsWith("/api/icon") || url.pathname.endsWith(".png") || url.pathname.endsWith(".svg")) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
            }
            return networkResponse;
          })
          .catch(() => new Response("", { status: 404, statusText: "Not Found" }));
      })
    );
    return;
  }

  // Navigation requests — Network First with Cache Fallback
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) return cachedResponse;
          const appShell = await caches.match("/app");
          return (
            appShell ||
            new Response("AsistControl Offline - Reconectando...", {
              headers: { "Content-Type": "text/html; charset=utf-8" },
            })
          );
        })
    );
    return;
  }

  // General fallback for all other assets
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch(async () => {
        return new Response(null, { status: 503, statusText: "Service Unavailable" });
      });
    })
  );
});

// ─────────────────────────────────────────────────────────────
// Push Notifications (Web Push API / VAPID)
// ─────────────────────────────────────────────────────────────

self.addEventListener("push", (event) => {
  let data = {
    title: "AsistControl",
    body: "Nueva actualización de control de asistencia",
    icon: "/api/icon/192",
    badge: "/icon",
    tag: "asistcontrol-alert",
    url: "/app",
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || "/api/icon/192",
    badge: data.badge || "/icon",
    tag: data.tag || "asistcontrol-alert",
    vibrate: [200, 100, 200],
    data: {
      url: data.url || "/app",
      ...data.data,
    },
    actions: [
      { action: "open", title: "Ver Alerta" },
      { action: "close", title: "Cerrar" },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "close") return;

  const targetUrl = event.notification.data?.url || "/app";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if (client.url.includes(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
