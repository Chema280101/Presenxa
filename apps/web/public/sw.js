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
    url.pathname.startsWith("/api/attendance/scan")
  ) {
    return;
  }

  // Network-first for dynamic routes, cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }

        // Return offline fallback for navigation requests
        if (request.mode === "navigate") {
          const appShell = await caches.match("/app");
          if (appShell) return appShell;
        }

        return new Response("Presenxa Offline - Reconectando...", {
          status: 503,
          statusText: "Service Unavailable",
          headers: new Headers({ "Content-Type": "text/plain; charset=utf-8" }),
        });
      })
  );
});

// ─────────────────────────────────────────────────────────────
// Push Notifications (Web Push API / VAPID)
// ─────────────────────────────────────────────────────────────

self.addEventListener("push", (event) => {
  let data = {
    title: "Presenxa",
    body: "Nueva actualización de control de asistencia",
    icon: "/brand/isotipo-secundario.svg",
    badge: "/brand/isotipo-secundario.svg",
    tag: "presenxa-alert",
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
    icon: data.icon || "/brand/isotipo-secundario.svg",
    badge: data.badge || "/brand/isotipo-secundario.svg",
    tag: data.tag || "presenxa-alert",
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
