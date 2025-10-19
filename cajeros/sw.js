/**
 * Service Worker para notificaciones del navegador
 * Versión simple para Browser Notifications API
 */

const CACHE_NAME = "cajeros-notifications-v1";

// Instalación del service worker
self.addEventListener("install", (event) => {
  console.log("🔧 Service Worker instalado");
  self.skipWaiting();
});

// Activación del service worker
self.addEventListener("activate", (event) => {
  console.log("✅ Service Worker activado");
  event.waitUntil(self.clients.claim());
});

// Listener para notificaciones push (para futuro Web Push completo)
self.addEventListener("push", (event) => {
  console.log("📬 Notificación push recibida");

  const data = event.data ? event.data.json() : {};
  const title = data.title || "El Patio - Cajeros";
  const options = {
    body: data.body || data.message || "Nueva notificación",
    icon: data.icon || "/assets/logo.png",
    badge: data.badge || "/assets/logo.png",
    tag: data.tag || "default",
    requireInteraction: false,
    vibrate: [200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Listener para click en notificación
self.addEventListener("notificationclick", (event) => {
  console.log("👆 Click en notificación");

  event.notification.close();

  // Abrir o enfocar la webapp
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Si hay una ventana abierta, enfocarla
        for (const client of clientList) {
          if ("focus" in client) {
            return client.focus();
          }
        }

        // Si no hay ventana abierta, abrir una nueva
        if (clients.openWindow) {
          return clients.openWindow("/");
        }
      })
  );
});

// Manejo básico de fetch (opcional, para cache futuro)
self.addEventListener("fetch", (event) => {
  // Por ahora, solo pasar las peticiones sin cachear
  event.respondWith(fetch(event.request));
});
