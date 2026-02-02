/**
 * Módulo de logging visual para la app de retiros
 * Permite ver logs en tiempo real sin necesidad de consola del navegador
 */

class VisualLogger {
  constructor() {
    this.logsContainer = null;
    this.debugPanel = null;
    this.isCollapsed = false;
    this.maxLogs = 100;
    this.init();
  }

  init() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.setupLogger());
    } else {
      this.setupLogger();
    }
  }

  setupLogger() {
    this.logsContainer = document.getElementById("logs-container");
    this.debugPanel = document.getElementById("debug-panel");

    if (!this.logsContainer || !this.debugPanel) {
      console.warn("Logger: No se encontraron los elementos del panel de logs");
      return;
    }

    const toggleBtn = document.getElementById("toggle-logs-btn");
    const clearBtn = document.getElementById("clear-logs-btn");
    const header = this.debugPanel?.querySelector(".debug-header");

    if (toggleBtn) {
      toggleBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.togglePanel();
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.clearLogs();
      });
    }

    if (header) {
      header.addEventListener("click", () => this.togglePanel());
    }

    this.log("Sistema de logging inicializado", "info");
  }

  togglePanel() {
    this.isCollapsed = !this.isCollapsed;
    this.debugPanel?.classList.toggle("collapsed", this.isCollapsed);
  }

  clearLogs() {
    if (this.logsContainer) {
      this.logsContainer.innerHTML = "";
      this.log("Logs limpiados", "info");
    }
  }

  log(message, type = "info") {
    if (!this.logsContainer) return;

    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement("div");
    logEntry.className = `log-entry ${type}`;
    logEntry.textContent = `[${timestamp}] ${message}`;

    this.logsContainer.insertBefore(logEntry, this.logsContainer.firstChild);

    const logs = this.logsContainer.children;
    if (logs.length > this.maxLogs) {
      for (let i = logs.length - 1; i >= this.maxLogs; i--) {
        this.logsContainer.removeChild(logs[i]);
      }
    }

    if (!this.isCollapsed) {
      this.logsContainer.scrollTop = 0;
    }
  }

  info(message) {
    this.log(message, "info");
  }

  success(message) {
    this.log(message, "success");
  }

  warning(message) {
    this.log(message, "warning");
  }

  error(message) {
    this.log(message, "error");
  }

  websocket(message) {
    this.log(message, "websocket");
  }

  transaction(message) {
    this.log(message, "transaction");
  }

  debug(message, obj = null) {
    let logMessage = message;
    if (obj) {
      logMessage += `: ${JSON.stringify(obj, null, 2)}`;
    }
    this.log(logMessage, "info");
  }
}

window.visualLogger = new VisualLogger();
