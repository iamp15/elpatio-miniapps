/**
 * Módulo de gestión de notificaciones persistentes
 * Maneja la visualización y eliminación de notificaciones
 */

import { API } from "./api.js";

class NotificationListManager {
  constructor() {
    this.notificaciones = [];
    this.isLoading = false;
    this.initialized = false;
  }

  /**
   * Inicializar el gestor de notificaciones
   */
  init() {
    if (this.initialized) return;

    // Configurar event listeners
    this.setupEventListeners();
    this.initialized = true;
  }

  /**
   * Configurar event listeners
   */
  setupEventListeners() {
    // Botón para abrir pantalla de notificaciones
    const notificationsBtn = document.getElementById("notifications-btn");
    if (notificationsBtn) {
      notificationsBtn.addEventListener("click", () => {
        this.showNotificationsScreen();
      });
    }

    // Botón para volver al dashboard
    const backBtn = document.getElementById("back-to-dashboard-btn");
    if (backBtn) {
      backBtn.addEventListener("click", () => {
        this.hideNotificationsScreen();
      });
    }
  }

  /**
   * Cargar notificaciones desde el backend
   */
  async loadNotifications(token) {
    if (this.isLoading) return;

    this.isLoading = true;
    this.showLoadingState();

    try {
      const response = await API.getNotificaciones(token, 10);

      if (!response.ok) {
        throw new Error("Error al cargar notificaciones");
      }

      const data = await response.json();
      this.notificaciones = data.notificaciones || [];

      console.log(`📬 Notificaciones cargadas: ${this.notificaciones.length}`);

      this.renderNotifications();
    } catch (error) {
      console.error("❌ Error cargando notificaciones:", error);
      this.showErrorState();
    } finally {
      this.isLoading = false;
      this.hideLoadingState();
    }
  }

  /**
   * Mostrar estado de carga
   */
  showLoadingState() {
    const loadingElement = document.getElementById("loading-notifications");
    if (loadingElement) {
      loadingElement.style.display = "block";
    }
  }

  /**
   * Ocultar estado de carga
   */
  hideLoadingState() {
    const loadingElement = document.getElementById("loading-notifications");
    if (loadingElement) {
      loadingElement.style.display = "none";
    }
  }

  /**
   * Mostrar estado de error
   */
  showErrorState() {
    const noNotificationsElement = document.getElementById("no-notifications");
    if (noNotificationsElement) {
      noNotificationsElement.querySelector("h4").textContent =
        "Error al cargar notificaciones";
      noNotificationsElement.querySelector("p").textContent =
        "Intenta recargar la página";
      noNotificationsElement.style.display = "block";
    }
  }

  /**
   * Renderizar notificaciones en la interfaz
   */
  renderNotifications() {
    const listElement = document.getElementById("notifications-list");
    const noNotificationsElement = document.getElementById("no-notifications");

    if (!listElement) return;

    // Limpiar lista actual
    listElement.innerHTML = "";

    // Si no hay notificaciones, mostrar mensaje
    if (this.notificaciones.length === 0) {
      listElement.style.display = "none";
      if (noNotificationsElement) {
        noNotificationsElement.style.display = "block";
      }
      return;
    }

    // Ocultar mensaje de "no hay notificaciones"
    listElement.style.display = "flex";
    if (noNotificationsElement) {
      noNotificationsElement.style.display = "none";
    }

    // Renderizar cada notificación
    this.notificaciones.forEach((notificacion) => {
      const card = this.createNotificationCard(notificacion);
      listElement.appendChild(card);
    });
  }

  /**
   * Crear card de notificación
   */
  createNotificationCard(notificacion) {
    const card = document.createElement("div");
    card.className = `notification-card ${notificacion.tipo}`;
    card.dataset.notificationId = notificacion._id;

    // Obtener icono según tipo
    const icon = this.getNotificationIcon(notificacion.tipo);

    // Formatear fecha
    const fecha = this.formatDate(notificacion.createdAt);

    card.innerHTML = `
      <div class="notification-header">
        <span class="notification-icon">${icon}</span>
        <div class="notification-title-wrapper">
          <h4 class="notification-title">${notificacion.titulo}</h4>
          <span class="notification-time">${fecha}</span>
        </div>
        <button class="notification-delete" onclick="window.notificationListManager.deleteNotification('${
          notificacion._id
        }')" title="Eliminar">
          ×
        </button>
      </div>
      <div class="notification-body">
        <p class="notification-message">${notificacion.mensaje}</p>
        ${this.renderNotificationData(notificacion.datos)}
      </div>
    `;

    return card;
  }

  /**
   * Renderizar datos adicionales de la notificación
   */
  renderNotificationData(datos) {
    if (!datos || Object.keys(datos).length === 0) {
      return "";
    }

    let html = '<div class="notification-data">';

    // Mostrar monto si existe
    if (datos.monto) {
      html += `
        <div class="notification-data-item">
          <span class="notification-data-label">Monto:</span>
          <span>${(datos.monto / 100).toFixed(2)} Bs</span>
        </div>
      `;
    }

    // Mostrar nombre de jugador si existe
    if (datos.jugadorNombre) {
      html += `
        <div class="notification-data-item">
          <span class="notification-data-label">Jugador:</span>
          <span>${datos.jugadorNombre}</span>
        </div>
      `;
    }

    // Mostrar referencia si existe
    if (datos.referencia) {
      html += `
        <div class="notification-data-item">
          <span class="notification-data-label">Referencia:</span>
          <span>${datos.referencia}</span>
        </div>
      `;
    }

    html += "</div>";
    return html;
  }

  /**
   * Obtener icono según tipo de notificación
   */
  getNotificationIcon(tipo) {
    const icons = {
      inicio_sesion: "🚪",
      nueva_solicitud: "💰",
      solicitud_asignada: "📋",
      pago_realizado: "💳",
      transaccion_completada: "✅",
      sesion_cerrada: "🔒",
    };
    return icons[tipo] || "🔔";
  }

  /**
   * Formatear fecha de manera legible
   */
  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;

    // Menos de 1 minuto
    if (diff < 60000) {
      return "Hace un momento";
    }

    // Menos de 1 hora
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `Hace ${minutes} minuto${minutes > 1 ? "s" : ""}`;
    }

    // Menos de 1 día
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `Hace ${hours} hora${hours > 1 ? "s" : ""}`;
    }

    // Menos de 7 días
    if (diff < 604800000) {
      const days = Math.floor(diff / 86400000);
      return `Hace ${days} día${days > 1 ? "s" : ""}`;
    }

    // Fecha completa
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  /**
   * Eliminar una notificación
   */
  async deleteNotification(notificationId) {
    try {
      // Obtener token
      const token = window.CajerosApp?.getToken();
      if (!token) {
        console.error("No hay token disponible");
        return;
      }

      const response = await API.deleteNotificacion(notificationId, token);

      if (!response.ok) {
        throw new Error("Error al eliminar notificación");
      }

      console.log(`🗑️ Notificación eliminada: ${notificationId}`);

      // Eliminar de la lista local
      this.notificaciones = this.notificaciones.filter(
        (n) => n._id !== notificationId
      );

      // Re-renderizar
      this.renderNotifications();

      // Mostrar mensaje de éxito
      if (window.notificationManager) {
        window.notificationManager.success(
          "Notificación eliminada",
          "La notificación ha sido eliminada correctamente"
        );
      }
    } catch (error) {
      console.error("❌ Error eliminando notificación:", error);

      // Mostrar mensaje de error
      if (window.notificationManager) {
        window.notificationManager.error(
          "Error",
          "No se pudo eliminar la notificación"
        );
      }
    }
  }

  /**
   * Mostrar pantalla de notificaciones
   */
  async showNotificationsScreen() {
    // Ocultar dashboard
    const dashboardScreen = document.getElementById("dashboard-screen");
    if (dashboardScreen) {
      dashboardScreen.classList.remove("active");
    }

    // Mostrar pantalla de notificaciones
    const notificationsScreen = document.getElementById("notifications-screen");
    if (notificationsScreen) {
      notificationsScreen.classList.add("active");
    }

    // Cargar notificaciones
    const token = window.CajerosApp?.getToken();
    if (token) {
      await this.loadNotifications(token);
    }
  }

  /**
   * Ocultar pantalla de notificaciones
   */
  hideNotificationsScreen() {
    // Mostrar dashboard
    const dashboardScreen = document.getElementById("dashboard-screen");
    if (dashboardScreen) {
      dashboardScreen.classList.add("active");
    }

    // Ocultar pantalla de notificaciones
    const notificationsScreen = document.getElementById("notifications-screen");
    if (notificationsScreen) {
      notificationsScreen.classList.remove("active");
    }
  }

  /**
   * Agregar una nueva notificación a la lista
   * Útil cuando llega una notificación via WebSocket
   */
  addNotification(notificacion) {
    // Agregar al inicio de la lista
    this.notificaciones.unshift(notificacion);

    // Limitar a 10 notificaciones
    if (this.notificaciones.length > 10) {
      this.notificaciones = this.notificaciones.slice(0, 10);
    }

    // Re-renderizar si la pantalla está visible
    const notificationsScreen = document.getElementById("notifications-screen");
    if (
      notificationsScreen &&
      notificationsScreen.classList.contains("active")
    ) {
      this.renderNotifications();
    }
  }
}

// Crear instancia global
const notificationListManager = new NotificationListManager();
window.notificationListManager = notificationListManager;

export default notificationListManager;
