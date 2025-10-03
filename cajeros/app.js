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
    this.processedTransactions = new Set(); // Para evitar duplicados
  }

  /**
   * Inicializar la aplicación
   */
  async init() {
    if (this.isInitialized) return;

    try {
      console.log("🚀 Iniciando aplicación de cajeros...");

      // Configurar WebSocket
      this.setupWebSocket();

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
      console.error("Error inicializando la aplicación:", error);
      UI.showError("Error al inicializar la aplicación");
    }
  }

  /**
   * Configurar WebSocket
   */
  setupWebSocket() {
    // Configurar callbacks de WebSocket
    window.cajeroWebSocket.on("onConnect", () => {
      console.log("✅ WebSocket conectado");
    });

    window.cajeroWebSocket.on("onDisconnect", (reason) => {
      console.log(`❌ WebSocket desconectado: ${reason}`);
    });

    window.cajeroWebSocket.on("onAuthResult", (result) => {
      if (result.success) {
        console.log(
          `🔐 Autenticación WebSocket exitosa: ${result.user.nombre}`
        );
      } else {
        console.error(`🔐 Error de autenticación WebSocket: ${result.message}`);
      }
    });

    window.cajeroWebSocket.on("onNuevaSolicitudDeposito", (data) => {
      console.log("💰 Nueva solicitud de depósito recibida");
      this.handleNuevaSolicitudDeposito(data);
    });

    window.cajeroWebSocket.on("onError", (error) => {
      console.error(`❌ Error WebSocket: ${error.message || error}`);
    });

    // Agregar callback para errores de conexión
    window.cajeroWebSocket.socket?.on("connect_error", (error) => {
      console.error(`❌ Error de conexión WebSocket: ${error.message}`);
    });

    // Conectar WebSocket
    console.log("🔌 Iniciando conexión WebSocket...");
    window.cajeroWebSocket.connect();
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
      console.log(`✅ Login exitoso: ${cajeroInfo.nombreCompleto}`);

      // Autenticar con WebSocket
      this.authenticateWithWebSocket(cajeroInfo);

      // Actualizar UI con información del cajero
      UI.updateCajeroDisplay(cajeroInfo);

      // Cargar transacciones pendientes
      await this.loadTransactions();

      // Mostrar dashboard
      UI.showDashboard();
    } catch (error) {
      console.error(`Error después del login exitoso: ${error.message}`);
      UI.showError("Error al cargar datos del dashboard");
    }
  }

  /**
   * Autenticar con WebSocket
   */
  authenticateWithWebSocket(cajeroInfo) {
    if (window.cajeroWebSocket.isConnected) {
      const token = Auth.getToken();

      console.log(
        `🔐 Autenticando con WebSocket: ${cajeroInfo.nombreCompleto}`
      );
      window.cajeroWebSocket.authenticateCajero(token);
    } else {
      console.warn("WebSocket no conectado, reintentando en 2 segundos...");
      setTimeout(() => {
        this.authenticateWithWebSocket(cajeroInfo);
      }, 2000);
    }
  }

  /**
   * Manejar nueva solicitud de depósito via WebSocket
   */
  handleNuevaSolicitudDeposito(data) {
    try {
      // Usar transaccionId como identificador único para evitar duplicados
      const transactionId = data.transaccionId || data.jugadorId + '_' + data.monto;
      
      // Verificar si ya procesamos esta transacción
      if (this.processedTransactions.has(transactionId)) {
        console.log(`🔄 Transacción ya procesada: ${transactionId}`);
        return;
      }
      
      // Marcar como procesada
      this.processedTransactions.add(transactionId);
      
      // Los datos del WebSocket pueden no incluir información completa del jugador
      const jugadorNombre =
        data.jugador?.nombre ||
        data.jugador?.nickname ||
        `Jugador ${data.jugadorId}`;
      const montoBs = (data.monto / 100).toFixed(2); // Convertir centavos a bolívares

      console.log(`📋 Nueva solicitud: ${jugadorNombre} - ${montoBs} Bs`);

      // Actualizar UI con la nueva solicitud
      // TODO: Implementar addNewTransaction o usar método existente
      console.log("📋 Datos de solicitud recibidos:", data);

      // Mostrar notificación
      UI.showAlert(`Nueva solicitud de ${jugadorNombre} - ${montoBs} Bs`);
    } catch (error) {
      console.error(`Error manejando nueva solicitud: ${error.message}`);
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
      const { API } = await import("./js/api.js");
      const response = await API.getTransaccionDetalle(transaccionId, token);
      if (response.ok) {
        const data = await response.json();
        window.transactionManager.showTransactionDetailsModal(data.transaccion);
      } else {
        console.error(
          "Error obteniendo detalles de transacción:",
          response.status
        );
      }
    } catch (error) {
      console.error("Error obteniendo detalles de transacción:", error);
    }
  }
};

// Exportar para uso en otros módulos si es necesario
export default app;
