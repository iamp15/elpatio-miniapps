/**
 * Sistema de notificaciones toast para la aplicación de cajeros
 */

class NotificationManager {
  constructor() {
    this.container = document.getElementById('toast-container');
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
    const {
      duration = 4000,
      closable = true,
      autoClose = true
    } = options;

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
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.dataset.toastId = id;

    const icon = this.getIcon(type);
    
    toast.innerHTML = `
      <div class="toast-icon">${icon}</div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
      ${closable ? '<button class="toast-close" onclick="window.notificationManager.remove(' + id + ')">&times;</button>' : ''}
      <div class="toast-progress"></div>
    `;

    return toast;
  }

  /**
   * Obtener icono según el tipo
   */
  getIcon(type) {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    return icons[type] || icons.info;
  }

  /**
   * Remover notificación
   */
  remove(toastId) {
    const toast = this.toasts.get(toastId);
    if (!toast) return;

    toast.classList.add('slide-out');
    
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
   * Métodos de conveniencia para cada tipo
   */
  success(title, message, options = {}) {
    return this.show('success', title, message, options);
  }

  error(title, message, options = {}) {
    return this.show('error', title, message, options);
  }

  warning(title, message, options = {}) {
    return this.show('warning', title, message, options);
  }

  info(title, message, options = {}) {
    return this.show('info', title, message, options);
  }
}

// Crear instancia global
window.notificationManager = new NotificationManager();

export default window.notificationManager;
