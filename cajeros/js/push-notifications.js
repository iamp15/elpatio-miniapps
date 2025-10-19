/**
 * Módulo de Browser Notifications
 * Maneja las notificaciones del navegador usando la Notifications API
 */

class BrowserNotifications {
  constructor() {
    this.permission = "default";
    this.serviceWorkerRegistration = null;
    this.isSupported = "Notification" in window;
  }

  /**
   * Inicializar el sistema de notificaciones del navegador
   */
  async init() {
    if (!this.isSupported) {
      console.warn("⚠️ Las notificaciones del navegador no están soportadas");
      return false;
    }

    // Obtener permiso actual
    this.permission = Notification.permission;
    console.log(`🔔 Permiso de notificaciones: ${this.permission}`);

    // Registrar service worker
    try {
      await this.registerServiceWorker();
    } catch (error) {
      console.error("❌ Error registrando service worker:", error);
    }

    return true;
  }

  /**
   * Registrar service worker
   */
  async registerServiceWorker() {
    if (!("serviceWorker" in navigator)) {
      console.warn("⚠️ Service Workers no están soportados");
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register("./sw.js", {
        scope: "./",
      });

      this.serviceWorkerRegistration = registration;
      console.log("✅ Service Worker registrado:", registration.scope);

      return registration;
    } catch (error) {
      console.error("❌ Error registrando service worker:", error);
      return null;
    }
  }

  /**
   * Solicitar permiso para notificaciones
   */
  async requestPermission() {
    if (!this.isSupported) {
      console.warn("⚠️ Las notificaciones del navegador no están soportadas");
      return "denied";
    }

    if (this.permission === "granted") {
      return "granted";
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;

      console.log(`🔔 Permiso de notificaciones: ${permission}`);

      if (permission === "granted") {
        console.log("✅ Permiso de notificaciones concedido");
      } else if (permission === "denied") {
        console.log("❌ Permiso de notificaciones denegado");
      }

      return permission;
    } catch (error) {
      console.error("❌ Error solicitando permiso:", error);
      return "denied";
    }
  }

  /**
   * Verificar si la webapp está enfocada
   */
  isAppFocused() {
    return !document.hidden;
  }

  /**
   * Mostrar notificación del navegador
   * Solo se muestra si la app NO está enfocada
   */
  async showBrowserNotification(titulo, mensaje, opciones = {}) {
    // Verificar soporte
    if (!this.isSupported) {
      console.warn("⚠️ Las notificaciones del navegador no están soportadas");
      return null;
    }

    // Verificar permiso
    if (this.permission !== "granted") {
      console.log("⚠️ No hay permiso para mostrar notificaciones");
      return null;
    }

    // Solo mostrar si la app NO está enfocada
    if (this.isAppFocused()) {
      console.log("ℹ️ App enfocada, no se muestra notificación del navegador");
      return null;
    }

    try {
      // Opciones de la notificación
      const notificationOptions = {
        body: mensaje,
        icon: opciones.icon || "/assets/logo.png",
        badge: opciones.badge || "/assets/logo.png",
        tag: opciones.tag || "cajero-notification",
        requireInteraction: opciones.requireInteraction || false,
        vibrate: opciones.vibrate || [200, 100, 200],
        data: opciones.data || {},
        ...opciones,
      };

      // Crear notificación
      const notification = new Notification(titulo, notificationOptions);

      console.log("🔔 Notificación del navegador mostrada:", titulo);

      // Event listeners para la notificación
      notification.onclick = () => {
        console.log("👆 Click en notificación del navegador");
        window.focus();
        notification.close();

        // Si hay un callback, ejecutarlo
        if (opciones.onClick) {
          opciones.onClick();
        }
      };

      notification.onerror = (error) => {
        console.error("❌ Error en notificación:", error);
      };

      notification.onclose = () => {
        console.log("🔕 Notificación cerrada");
      };

      // Auto-cerrar después de un tiempo (opcional)
      if (opciones.autoClose !== false) {
        setTimeout(() => {
          notification.close();
        }, opciones.duration || 5000);
      }

      return notification;
    } catch (error) {
      console.error("❌ Error mostrando notificación del navegador:", error);
      return null;
    }
  }

  /**
   * Mostrar notificación para evento crítico
   * Solo para: nueva solicitud y pago realizado
   */
  async showCriticalNotification(tipo, datos) {
    const notificaciones = {
      nueva_solicitud: {
        titulo: "💰 Nueva solicitud de depósito",
        mensaje: datos.mensaje || "Tienes una nueva solicitud de depósito",
        tag: "nueva-solicitud",
        requireInteraction: true,
      },
      pago_realizado: {
        titulo: "💳 Pago realizado",
        mensaje:
          datos.mensaje || "Un jugador ha confirmado el pago de su depósito",
        tag: "pago-realizado",
        requireInteraction: true,
      },
    };

    const config = notificaciones[tipo];
    if (!config) {
      console.log(`ℹ️ Tipo de notificación no crítica: ${tipo}`);
      return null;
    }

    return this.showBrowserNotification(config.titulo, config.mensaje, config);
  }

  /**
   * Verificar si hay permiso
   */
  hasPermission() {
    return this.permission === "granted";
  }

  /**
   * Verificar si las notificaciones están soportadas
   */
  isNotificationSupported() {
    return this.isSupported;
  }
}

// Crear instancia global
const browserNotifications = new BrowserNotifications();
window.browserNotifications = browserNotifications;

export default browserNotifications;
