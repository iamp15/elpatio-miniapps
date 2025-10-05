/**
 * Sistema de notificaciones toast para la aplicación de cajeros
 */

class NotificationManager {
  constructor() {
    this.container = document.getElementById("toast-container");
    this.toasts = new Map(); // Para rastrear toasts activos
    this.nextId = 1;
  }

  /**
   * Mostrar notificación toast
   * @param {string} type - Tipo de notificación: 'success', 'error', 'warning', 'info'
   * @param {string} title - Título de la notificación
   * @param {string} message - Mensaje de la notificación
   * @param {Object} options - Opciones adicionales
   */
  show(type, title, message, options = {}) {
    const { duration = 4000, closable = true, autoClose = true } = options;

    const toastId = this.nextId++;
    const toast = this.createToast(toastId, type, title, message, closable);

    this.container.appendChild(toast);
    this.toasts.set(toastId, toast);

    // Auto-cerrar después del tiempo especificado
    if (autoClose) {
      setTimeout(() => {
        this.remove(toastId);
      }, duration);
    }

    return toastId;
  }

  /**
   * Crear elemento toast
   */
  createToast(id, type, title, message, closable) {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.dataset.toastId = id;

    const icon = this.getIcon(type);

    toast.innerHTML = `
      <div class="toast-icon">${icon}</div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
      ${
        closable
          ? '<button class="toast-close" onclick="window.notificationManager.remove(' +
            id +
            ')">&times;</button>'
          : ""
      }
      <div class="toast-progress"></div>
    `;

    return toast;
  }

  /**
   * Obtener icono según el tipo
   */
  getIcon(type) {
    const icons = {
      success: "✅",
      error: "❌",
      warning: "⚠️",
      info: "ℹ️",
    };
    return icons[type] || icons.info;
  }

  /**
   * Remover notificación
   */
  remove(toastId) {
    const toast = this.toasts.get(toastId);
    if (!toast) return;

    toast.classList.add("slide-out");

    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
      this.toasts.delete(toastId);
    }, 300);
  }

  /**
   * Limpiar todas las notificaciones
   */
  clear() {
    this.toasts.forEach((toast, id) => {
      this.remove(id);
    });
  }

  /**
   * Mostrar modal de confirmación
   * @param {string} title - Título del modal
   * @param {string} message - Mensaje de confirmación
   * @param {Object} options - Opciones del modal
   */
  confirm(title, message, options = {}) {
    const {
      confirmText = "Confirmar",
      cancelText = "Cancelar",
      type = "confirm", // 'confirm', 'danger'
      icon = "❓",
    } = options;

    return new Promise((resolve) => {
      const modalId = this.nextId++;
      const modal = this.createConfirmModal(
        modalId,
        title,
        message,
        confirmText,
        cancelText,
        type,
        icon,
        resolve
      );

      document.body.appendChild(modal);
      this.toasts.set(modalId, modal);
    });
  }

  /**
   * Crear modal de confirmación
   */
  createConfirmModal(
    id,
    title,
    message,
    confirmText,
    cancelText,
    type,
    icon,
    resolve
  ) {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.dataset.modalId = id;

    const confirmBtnClass =
      type === "danger" ? "modal-btn-danger" : "modal-btn-confirm";

    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <div class="modal-icon">${icon}</div>
          <div class="modal-title">${title}</div>
          <button class="modal-close" onclick="window.notificationManager.closeModal(${id}, false)">&times;</button>
        </div>
        <div class="modal-body">
          <div class="modal-message">${message}</div>
          <div class="modal-actions">
            <button class="modal-btn modal-btn-cancel" onclick="window.notificationManager.closeModal(${id}, false)">
              ${cancelText}
            </button>
            <button class="modal-btn ${confirmBtnClass}" onclick="window.notificationManager.closeModal(${id}, true)">
              ${confirmText}
            </button>
          </div>
        </div>
      </div>
    `;

    // Cerrar al hacer click en el overlay (fuera del modal)
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        this.closeModal(id, false);
      }
    });

    // Cerrar con tecla Escape
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        this.closeModal(id, false);
        document.removeEventListener("keydown", handleEscape);
      }
    };
    document.addEventListener("keydown", handleEscape);

    // Guardar la función resolve para usarla en closeModal
    overlay._resolve = resolve;
    overlay._handleEscape = handleEscape;

    return overlay;
  }

  /**
   * Cerrar modal de confirmación
   */
  closeModal(modalId, confirmed) {
    const modal = this.toasts.get(modalId);
    if (!modal) return;

    // Remover event listener de escape
    if (modal._handleEscape) {
      document.removeEventListener("keydown", modal._handleEscape);
    }

    // Ejecutar callback con el resultado
    if (modal._resolve) {
      modal._resolve(confirmed);
    }

    // Animar cierre
    const modalElement = modal.querySelector(".modal");
    modalElement.classList.add("closing");

    setTimeout(() => {
      if (modal.parentNode) {
        modal.parentNode.removeChild(modal);
      }
      this.toasts.delete(modalId);
    }, 300);
  }

  /**
   * Métodos de conveniencia para cada tipo
   */
  success(title, message, options = {}) {
    return this.show("success", title, message, options);
  }

  error(title, message, options = {}) {
    return this.show("error", title, message, options);
  }

  warning(title, message, options = {}) {
    return this.show("warning", title, message, options);
  }

  info(title, message, options = {}) {
    return this.show("info", title, message, options);
  }
}

// Crear instancia global
window.notificationManager = new NotificationManager();

export default window.notificationManager;
