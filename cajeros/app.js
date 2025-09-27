/**
 * Aplicación principal de cajeros - Versión modular
 */

import { Auth } from "./js/auth.js";
import { UI } from "./js/ui.js";
import { TransactionManager } from "./js/transactions.js";
import { MESSAGES } from "./js/config.js";

class CajerosApp {
  constructor() {
    this.isInitialized = false;
  }

  /**
   * Inicializar la aplicación
   */
  async init() {
    if (this.isInitialized) return;

    try {
      // Configurar callbacks de autenticación
      Auth.setCallbacks({
        onLoginSuccess: this.handleLoginSuccess.bind(this),
        onTokenExpired: this.handleTokenExpired.bind(this),
      });

      // Configurar callbacks de transacciones
      TransactionManager.setCallbacks({
        onTransactionAssigned: this.handleTransactionAssigned.bind(this),
        onTransactionError: this.handleTransactionError.bind(this),
      });

      // Configurar event listeners de la UI
      UI.setupEventListeners({
        onLogin: this.handleLogin.bind(this),
        onLogout: this.handleLogout.bind(this),
        onRefresh: this.handleRefresh.bind(this),
        onTabSwitch: this.handleTabSwitch.bind(this),
      });

      // Inicializar autenticación
      await Auth.init();

      // Hacer disponibles las instancias globalmente para uso en HTML
      window.transactionManager = TransactionManager;
      window.CajerosApp = this;

      this.isInitialized = true;
      console.log("✅ Aplicación de cajeros inicializada correctamente");
    } catch (error) {
      console.error("❌ Error inicializando la aplicación:", error);
      UI.showError("Error al inicializar la aplicación");
    }
  }

  /**
   * Manejar el envío del formulario de login
   */
  async handleLogin(e) {
    e.preventDefault();

    const formData = UI.getLoginFormData();
    if (!formData) {
      UI.showError(MESSAGES.ERROR.INCOMPLETE_FIELDS);
      return;
    }

    UI.setLoading(true);
    UI.hideError();

    try {
      await Auth.login(formData.email, formData.password);
    } catch (error) {
      console.error("Error en login:", error);
      UI.showError(error.message);
    } finally {
      UI.setLoading(false);
    }
  }

  /**
   * Manejar login exitoso
   */
  async handleLoginSuccess(cajeroInfo) {
    try {
      // Actualizar UI con información del cajero
      UI.updateCajeroDisplay(cajeroInfo);

      // Cargar transacciones pendientes
      await this.loadTransactions();

      // Mostrar dashboard
      UI.showDashboard();

      console.log("✅ Login exitoso para:", cajeroInfo.email);
    } catch (error) {
      console.error("Error después del login exitoso:", error);
      UI.showError("Error al cargar datos del dashboard");
    }
  }

  /**
   * Manejar logout
   */
  handleLogout() {
    // Limpiar sesión en Auth
    Auth.logout();

    // Actualizar UI
    UI.showLoginScreen();

    // Limpiar transacciones
    TransactionManager.clearTransactions();

    console.log("👋 Usuario cerró sesión");
  }

  /**
   * Manejar expiración de token
   */
  handleTokenExpired() {
    UI.showLoginScreen();
    TransactionManager.clearTransactions();
    UI.showError("Tu sesión ha expirado. Por favor, inicia sesión nuevamente.");
    console.log("⏰ Token expirado");
  }

  /**
   * Manejar refresh de transacciones
   */
  async handleRefresh() {
    if (Auth.isAuthenticated()) {
      await this.loadTransactions();
    }
  }

  /**
   * Manejar cambio de pestaña
   */
  handleTabSwitch(tabName) {
    TransactionManager.switchTab(tabName);
    console.log(`🔄 Cambiando a pestaña: ${tabName}`);
  }

  /**
   * Cargar transacciones pendientes
   */
  async loadTransactions() {
    const token = Auth.getToken();
    if (token) {
      await TransactionManager.loadTransactions(token);
    }
  }

  /**
   * Manejar transacción asignada
   */
  async handleTransactionAssigned() {
    // Recargar la lista de transacciones
    await this.loadTransactions();
  }

  /**
   * Manejar error en transacción
   */
  handleTransactionError(error) {
    console.error("Error en transacción:", error);
    // Aquí se podría implementar lógica adicional para manejar errores específicos
  }

  /**
   * Obtener token actual (para uso global)
   */
  getToken() {
    return Auth.getToken();
  }

  /**
   * Obtener información del cajero (para uso global)
   */
  getCajeroInfo() {
    return Auth.getCajeroInfo();
  }

  /**
   * Verificar si está autenticado (para uso global)
   */
  isAuthenticated() {
    return Auth.isAuthenticated();
  }

  /**
   * Obtener instancia de UI (para uso global)
   */
  getUI() {
    return UI;
  }

  /**
   * Obtener instancia de TransactionManager (para uso global)
   */
  getTransactionManager() {
    return TransactionManager;
  }
}

// Crear instancia única de la aplicación
const app = new CajerosApp();

// Inicializar la aplicación cuando se carga el DOM
document.addEventListener("DOMContentLoaded", () => {
  app.init();
});

// Funciones globales para uso en HTML
window.acceptTransaction = async (transaccionId) => {
  const token = app.getToken();
  if (token && window.transactionManager) {
    await window.transactionManager.acceptTransaction(transaccionId, token);
  }
};

window.refreshTransactions = async () => {
  const token = app.getToken();
  if (token && window.transactionManager) {
    await window.transactionManager.loadTransactions(token);
  }
};

window.closeTransactionDetails = () => {
  app.getUI().closeTransactionDetailsModal();
};

window.viewTransactionDetails = async (transaccionId) => {
  const token = app.getToken();
  if (token && window.transactionManager) {
    try {
      // Importar API dinámicamente
      const { API } = await import('./js/api.js');
      const response = await API.getTransaccionDetalle(transaccionId, token);
      if (response.ok) {
        const data = await response.json();
        window.transactionManager.showTransactionDetailsModal(data.transaccion);
      } else {
        console.error("Error obteniendo detalles de transacción:", response.status);
      }
    } catch (error) {
      console.error("Error obteniendo detalles de transacción:", error);
    }
  }
};

// Exportar para uso en otros módulos si es necesario
export default app;
