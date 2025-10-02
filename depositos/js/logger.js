/**
 * Módulo de logging visual para la app de depósitos
 * Permite ver logs en tiempo real sin necesidad de consola del navegador
 */

class VisualLogger {
  constructor() {
    this.logsContainer = null;
    this.debugPanel = null;
    this.isCollapsed = false;
    this.maxLogs = 100; // Máximo número de logs a mantener
    this.init();
  }

  /**
   * Inicializar el sistema de logging
   */
  init() {
    // Esperar a que el DOM esté listo
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupLogger());
    } else {
      this.setupLogger();
    }
  }

  /**
   * Configurar el logger
   */
  setupLogger() {
    this.logsContainer = document.getElementById('logs-container');
    this.debugPanel = document.getElementById('debug-panel');
    
    if (!this.logsContainer || !this.debugPanel) {
      console.warn('Logger: No se encontraron los elementos del panel de logs');
      return;
    }

    // Configurar event listeners
    this.setupEventListeners();
    
    // Log inicial
    this.log('Sistema de logging inicializado', 'info');
  }

  /**
   * Configurar event listeners
   */
  setupEventListeners() {
    // Toggle panel
    const toggleBtn = document.getElementById('toggle-logs-btn');
    const clearBtn = document.getElementById('clear-logs-btn');
    const header = this.debugPanel.querySelector('.debug-header');

    if (toggleBtn) {
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.togglePanel();
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.clearLogs();
      });
    }

    if (header) {
      header.addEventListener('click', () => {
        this.togglePanel();
      });
    }
  }

  /**
   * Alternar visibilidad del panel
   */
  togglePanel() {
    this.isCollapsed = !this.isCollapsed;
    this.debugPanel.classList.toggle('collapsed', this.isCollapsed);
    
    const toggleBtn = document.getElementById('toggle-logs-btn');
    if (toggleBtn) {
      toggleBtn.textContent = this.isCollapsed ? '📋' : '📋';
    }
  }

  /**
   * Limpiar todos los logs
   */
  clearLogs() {
    if (this.logsContainer) {
      this.logsContainer.innerHTML = '';
      this.log('Logs limpiados', 'info');
    }
  }

  /**
   * Agregar un log
   */
  log(message, type = 'info') {
    if (!this.logsContainer) return;

    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type}`;
    logEntry.textContent = `[${timestamp}] ${message}`;

    // Agregar al inicio del contenedor
    this.logsContainer.insertBefore(logEntry, this.logsContainer.firstChild);

    // Limitar número de logs
    this.limitLogs();

    // Auto-scroll si el panel está expandido
    if (!this.isCollapsed) {
      this.logsContainer.scrollTop = 0;
    }
  }

  /**
   * Limitar número de logs
   */
  limitLogs() {
    const logs = this.logsContainer.children;
    if (logs.length > this.maxLogs) {
      // Remover logs antiguos
      for (let i = logs.length - 1; i >= this.maxLogs; i--) {
        this.logsContainer.removeChild(logs[i]);
      }
    }
  }

  /**
   * Log de información
   */
  info(message) {
    this.log(message, 'info');
  }

  /**
   * Log de éxito
   */
  success(message) {
    this.log(message, 'success');
  }

  /**
   * Log de advertencia
   */
  warning(message) {
    this.log(message, 'warning');
  }

  /**
   * Log de error
   */
  error(message) {
    this.log(message, 'error');
  }

  /**
   * Log de WebSocket
   */
  websocket(message) {
    this.log(message, 'websocket');
  }

  /**
   * Log de transacción
   */
  transaction(message) {
    this.log(message, 'transaction');
  }

  /**
   * Log con objeto (para debugging)
   */
  debug(message, obj = null) {
    let logMessage = message;
    if (obj) {
      logMessage += `: ${JSON.stringify(obj, null, 2)}`;
    }
    this.log(logMessage, 'info');
  }
}

// Crear instancia global
window.visualLogger = new VisualLogger();

// Exportar para uso en módulos
if (typeof module !== "undefined" && module.exports) {
  module.exports = VisualLogger;
}
