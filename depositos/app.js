/**
 * Aplicacion principal de depositos - Version modular
 */

import { TelegramAuth } from "./js/auth.js";
import { UI } from "./js/ui.js";
import { TransactionManager } from "./js/transactions.js";
import { API } from "./js/api.js";
import { MESSAGES, APP_STATES, TRANSACTION_CONFIG } from "./js/config.js";

class DepositApp {
  constructor() {
    this.isInitialized = false;
    this.userData = null;
    this.currentBalance = 0;
  }

  /**
   * Inicializar la aplicacion
   */
  async init() {
    if (this.isInitialized) return;

    try {
      console.log("Iniciando aplicacion de depositos...");

      // Configurar WebSocket
      this.setupWebSocket();

      // Configurar callbacks de autenticacion
      TelegramAuth.setCallbacks({
        onUserDataLoaded: this.handleUserDataLoaded.bind(this),
        onError: this.handleAuthError.bind(this),
      });

      // Configurar callbacks de transacciones
      TransactionManager.setCallbacks({
        onTransactionCreated: this.handleTransactionCreated.bind(this),
        onTransactionUpdated: this.handleTransactionUpdated.bind(this),
        onTransactionCompleted: this.handleTransactionCompleted.bind(this),
        onTransactionError: this.handleTransactionError.bind(this),
        onTransactionTimeout: this.handleTransactionTimeout.bind(this),
      });

      // Configurar event listeners de la UI
      UI.setupEventListeners({
        onDepositSubmit: this.handleDepositSubmit.bind(this),
        onPaymentConfirmationSubmit:
          this.handlePaymentConfirmationSubmit.bind(this),
        onPaymentDone: this.handlePaymentDone.bind(this),
        onBackToBank: this.handleBackToBank.bind(this),
        onCloseApp: this.handleCloseApp.bind(this),
        onRetry: this.handleRetry.bind(this),
        onCloseError: this.handleCloseError.bind(this),
        onAmountChange: this.handleAmountChange.bind(this),
      });

      // Hacer disponibles las instancias globalmente para uso en HTML
      window.transactionManager = TransactionManager;
      window.depositApp = this;

      // Inicializar autenticacion de Telegram con timeout
      await this.initWithTimeout();

      this.isInitialized = true;
      console.log("Aplicacion de depositos inicializada correctamente");
    } catch (error) {
      console.error("Error inicializando la aplicacion:", error);
      UI.showErrorScreen(
        "Error de Inicializacion",
        "No se pudo inicializar la aplicacion. Por favor, recarga la pagina."
      );
    }
  }

  /**
   * Configurar WebSocket
   */
  setupWebSocket() {
    // Configurar callbacks de WebSocket
    window.depositoWebSocket.on("onConnect", () => {
      console.log("✅ WebSocket conectado");
    });

    window.depositoWebSocket.on("onDisconnect", (reason) => {
      console.log("❌ WebSocket desconectado:", reason);
    });

    window.depositoWebSocket.on("onAuthResult", (result) => {
      console.log("🔐 Resultado autenticación WebSocket:", result);
    });

    window.depositoWebSocket.on("onSolicitudAceptada", (data) => {
      console.log("✅ Solicitud aceptada via WebSocket:", data);
      this.handleSolicitudAceptada(data);
    });

    window.depositoWebSocket.on("onDepositoCompletado", (data) => {
      console.log("🎉 Depósito completado via WebSocket:", data);
      this.handleDepositoCompletado(data);
    });

    window.depositoWebSocket.on("onError", (error) => {
      console.error("❌ Error WebSocket:", error);
    });

    // Conectar WebSocket
    window.depositoWebSocket.connect();
  }

  /**
   * Inicializar Telegram Web App
   */
  async initWithTimeout() {
    try {
      await TelegramAuth.init();
    } catch (error) {
      console.error("Error inicializando Telegram Web App:", error);
      throw error;
    }
  }

  /**
   * Manejar datos de usuario cargados
   */
  async handleUserDataLoaded(userData) {
    try {
      this.userData = userData;
      console.log("Datos de usuario cargados:", userData);

      // Autenticar con WebSocket
      this.authenticateWithWebSocket(userData);

      // Cargar saldo del usuario
      await this.loadUserBalance();

      // Mostrar pantalla principal
      UI.showMainScreen();
    } catch (error) {
      console.error("Error cargando datos del usuario:", error);
      UI.showErrorScreen(
        "Error de Usuario",
        "No se pudieron cargar los datos del usuario"
      );
    }
  }

  /**
   * Autenticar con WebSocket
   */
  authenticateWithWebSocket(userData) {
    if (window.depositoWebSocket.isConnected) {
      const telegramId = userData.id.toString();
      const initData = TelegramAuth.getInitData();
      
      console.log("🔐 Autenticando con WebSocket:", telegramId);
      window.depositoWebSocket.authenticateJugador(telegramId, initData);
    } else {
      console.warn("WebSocket no conectado, reintentando en 2 segundos...");
      setTimeout(() => {
        this.authenticateWithWebSocket(userData);
      }, 2000);
    }
  }

  /**
   * Manejar solicitud aceptada via WebSocket
   */
  handleSolicitudAceptada(data) {
    try {
      console.log("✅ Solicitud aceptada, mostrando datos bancarios");
      
      // Actualizar datos bancarios en la UI
      UI.updateBankInfo({
        banco: data.cajero.datosPago.banco,
        telefono: data.cajero.datosPago.telefono,
        cedula: `${data.cajero.datosPago.cedula.prefijo}-${data.cajero.datosPago.cedula.numero}`,
        monto: data.monto
      });

      // Mostrar pantalla de datos bancarios
      UI.showBankInfoScreen();
    } catch (error) {
      console.error("Error manejando solicitud aceptada:", error);
    }
  }

  /**
   * Manejar depósito completado via WebSocket
   */
  handleDepositoCompletado(data) {
    try {
      console.log("🎉 Depósito completado, actualizando saldo");
      
      // Actualizar saldo
      this.loadUserBalance();
      
      // Mostrar confirmación final
      UI.updateFinalInfo(data);
      UI.showConfirmationScreen();
    } catch (error) {
      console.error("Error manejando depósito completado:", error);
    }
  }

  /**
   * Manejar error de autenticacion
   */
  handleAuthError(error) {
    console.error("Error de autenticacion:", error);
    UI.showErrorScreen("Error de Autenticacion", error.message);
  }

  /**
   * Cargar saldo del usuario
   */
  async loadUserBalance() {
    try {
      const telegramId = TelegramAuth.getTelegramId();
      const response = await API.getJugadorSaldo(telegramId);

      if (response.ok) {
        const data = await response.json();
        this.currentBalance = data.saldo || 0;
        UI.updateBalance(this.currentBalance);
        console.log("Saldo cargado:", this.currentBalance);
      } else {
        console.warn("No se pudo cargar el saldo, usando valor por defecto");
        this.currentBalance = 0;
        UI.updateBalance(this.currentBalance);
      }
    } catch (error) {
      console.error("Error cargando saldo:", error);
      this.currentBalance = 0;
      UI.updateBalance(this.currentBalance);
    }
  }

  /**
   * Manejar envio del formulario de deposito
   */
  async handleDepositSubmit(e) {
    e.preventDefault();

    try {
      const formData = UI.getDepositFormData();
      const validation = UI.validateDepositForm(formData);

      if (!validation.valid) {
        UI.showErrorScreen("Error de Validacion", validation.message);
        return;
      }

      // Verificar si WebSocket está conectado y autenticado
      if (!window.depositoWebSocket.isConnected || !window.depositoWebSocket.isAuthenticated) {
        UI.showErrorScreen("Error de Conexión", "No hay conexión WebSocket activa. Por favor, recarga la página.");
        return;
      }

      // Crear solicitud de depósito via WebSocket
      const depositoData = {
        monto: TransactionManager.convertToCents(formData.amount),
        descripcion: `Depósito de ${formData.amount} Bs`,
        metodoPago: "pago_movil"
      };

      console.log("💰 Enviando solicitud de depósito via WebSocket:", depositoData);
      window.depositoWebSocket.solicitarDeposito(depositoData);

      // Mostrar pantalla de espera
      UI.showWaitingScreen();

    } catch (error) {
      console.error("Error creando solicitud de deposito:", error);
      UI.showErrorScreen("Error de Deposito", error.message);
    }
  }

  /**
   * Manejar transaccion creada
   */
  async handleTransactionCreated(transaction) {
    try {
      // Actualizar UI con informacion de la transaccion
      UI.updateWaitingTransaction(transaction);

      // Mostrar pantalla de espera
      UI.showWaitingScreen();

      // Iniciar polling para verificar estado
      TransactionManager.startPolling(transaction._id);

      console.log("Transaccion creada, iniciando polling");
    } catch (error) {
      console.error("Error manejando transaccion creada:", error);
      UI.showErrorScreen(
        "Error de Transaccion",
        "Error al procesar la transaccion"
      );
    }
  }

  /**
   * Manejar transaccion actualizada
   */
  async handleTransactionUpdated(transaction) {
    try {
      console.log("Transaccion actualizada:", transaction.estado);

      // Actualizar UI segun el estado
      switch (transaction.estado) {
        case "en_proceso":
          // Mostrar datos bancarios
          const bankData = TransactionManager.getBankData();
          if (bankData) {
            UI.updateBankInfo(bankData);
            UI.showBankInfoScreen();
          }
          break;

        case "confirmada":
          // Mostrar confirmacion final
          UI.updateFinalInfo(transaction);
          UI.showConfirmationScreen();
          break;

        case "cancelada":
        case "expirada":
          // Mostrar error
          UI.showErrorScreen(
            "Transaccion Cancelada",
            "La transaccion ha sido cancelada o ha expirado"
          );
          break;
      }
    } catch (error) {
      console.error("Error manejando transaccion actualizada:", error);
    }
  }

  /**
   * Manejar transaccion completada
   */
  async handleTransactionCompleted(transaction) {
    try {
      console.log("Transaccion completada:", transaction);

      // Actualizar saldo
      await this.loadUserBalance();

      // Mostrar confirmacion final
      UI.updateFinalInfo(transaction);
      UI.showConfirmationScreen();
    } catch (error) {
      console.error("Error manejando transaccion completada:", error);
    }
  }

  /**
   * Manejar error de transaccion
   */
  handleTransactionError(error) {
    console.error("Error en transaccion:", error);
    UI.showErrorScreen("Error de Transaccion", error.message);
  }

  /**
   * Manejar timeout de transaccion
   */
  async handleTransactionTimeout(transaccionId) {
    try {
      console.log("Timeout de transaccion:", transaccionId);

      // Cancelar transaccion por timeout
      await TransactionManager.cancelTransactionByTimeout(transaccionId);

      UI.showErrorScreen(
        "Tiempo Agotado",
        "La transaccion ha expirado. Por favor, intenta nuevamente."
      );
    } catch (error) {
      console.error("Error manejando timeout:", error);
    }
  }

  /**
   * Manejar confirmacion de pago
   */
  async handlePaymentConfirmationSubmit(e) {
    e.preventDefault();

    try {
      const formData = UI.getPaymentConfirmationFormData();
      const validation = UI.validatePaymentConfirmationForm(formData);

      if (!validation.valid) {
        UI.showErrorScreen("Error de Validacion", validation.message);
        return;
      }

      // Verificar si WebSocket está conectado y autenticado
      if (!window.depositoWebSocket.isConnected || !window.depositoWebSocket.isAuthenticated) {
        UI.showErrorScreen("Error de Conexión", "No hay conexión WebSocket activa. Por favor, recarga la página.");
        return;
      }

      // Confirmar pago via WebSocket
      const paymentData = {
        banco: formData.bank,
        telefono: formData.phone,
        referencia: formData.reference,
        fecha: formData.date,
        monto: TransactionManager.convertToCents(formData.amount),
      };

      console.log("💳 Confirmando pago via WebSocket:", paymentData);
      window.depositoWebSocket.confirmarPagoJugador(paymentData);

      // Mostrar pantalla de confirmación
      UI.showConfirmationScreen();

    } catch (error) {
      console.error("Error confirmando pago:", error);
      UI.showErrorScreen("Error de Confirmacion", error.message);
    }
  }

  /**
   * Manejar boton "Ya realice el pago"
   */
  handlePaymentDone() {
    UI.showPaymentConfirmationScreen();
  }

  /**
   * Manejar boton "Volver"
   */
  handleBackToBank() {
    UI.showBankInfoScreen();
  }

  /**
   * Manejar cierre de aplicacion
   */
  handleCloseApp() {
    TelegramAuth.closeApp();
  }

  /**
   * Manejar reintento
   */
  async handleRetry() {
    try {
      // Limpiar transaccion actual
      TransactionManager.clearCurrentTransaction();

      // Volver a la pantalla principal
      UI.showMainScreen();

      // Recargar saldo
      await this.loadUserBalance();
    } catch (error) {
      console.error("Error en reintento:", error);
    }
  }

  /**
   * Manejar cierre de error
   */
  handleCloseError() {
    UI.showMainScreen();
  }

  /**
   * Manejar cambio de monto
   */
  handleAmountChange(e) {
    const amount = parseFloat(e.target.value) || 0;
    const amountCents = TransactionManager.convertToCents(amount);

    // Actualizar campo de centavos (si existe)
    const amountCentsInput = document.getElementById("amount-cents");
    if (amountCentsInput) {
      amountCentsInput.value = amountCents;
    }
  }

  /**
   * Obtener datos del usuario (para uso global)
   */
  getUserData() {
    return this.userData;
  }

  /**
   * Obtener saldo actual (para uso global)
   */
  getCurrentBalance() {
    return this.currentBalance;
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

// Crear instancia unica de la aplicacion
const app = new DepositApp();

// Inicializar la aplicacion cuando se carga el DOM
document.addEventListener("DOMContentLoaded", () => {
  app.init();
});

// Funciones globales para uso en HTML
window.copyToClipboard = async function (elementId) {
  const success = await UI.copyElementToClipboard(elementId);
  if (success) {
    console.log("Texto copiado al portapapeles");
  } else {
    console.error("Error copiando al portapapeles");
  }
};

window.copyAllBankData = async function () {
  const success = await UI.copyAllBankData();
  if (success) {
    console.log("Todos los datos bancarios copiados");
  } else {
    console.error("Error copiando datos bancarios");
  }
};

// Exportar para uso en otros modulos si es necesario
export default app;
