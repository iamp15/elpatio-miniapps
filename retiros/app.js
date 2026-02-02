/**
 * Aplicación principal de retiros
 */

import { TelegramAuth } from "./js/auth.js";
import { UI } from "./js/ui.js";
import { TransactionManager } from "./js/transactions.js";
import { API } from "./js/api.js";
import {
  MESSAGES,
  API_CONFIG,
  TRANSACTION_CONFIG,
  BANKS,
} from "./js/config.js";

class RetiroApp {
  constructor() {
    this.isInitialized = false;
    this.userData = null;
    this.currentBalance = 0;
    this.montoMinimo = 1;
    this.pendingRetiroData = null;
  }

  async init() {
    if (this.isInitialized) return;

    try {
      if (window.visualLogger) {
        window.visualLogger.info("Iniciando aplicación de retiros...");
      }

      window.retiroWebSocket.connect();

      TelegramAuth.setCallbacks({
        onUserDataLoaded: this.handleUserDataLoaded.bind(this),
        onError: this.handleAuthError.bind(this),
      });

      window.retiroWebSocket.setCallbacks({
        onConnect: () => {
          if (window.visualLogger) window.visualLogger.websocket("Conectado");
        },
        onDisconnect: (reason) => {
          if (window.visualLogger) window.visualLogger.websocket(`Desconectado: ${reason}`);
        },
        onAuthResult: this.handleAuthResult.bind(this),
        onSolicitudCreada: this.handleSolicitudCreada.bind(this),
        onSolicitudAceptada: this.handleSolicitudAceptada.bind(this),
        onRetiroCompletado: this.handleRetiroCompletado.bind(this),
        onTransaccionCanceladaPorTimeout: this.handleTimeout.bind(this),
        onError: this.handleWebSocketError.bind(this),
      });

      UI.setupEventListeners({
        onRetiroSubmit: this.handleRetiroSubmit.bind(this),
        onDataPaymentSubmit: this.handleDataPaymentSubmit.bind(this),
        onCancelTransaction: this.handleCancelTransaction.bind(this),
        onCloseApp: this.handleCloseApp.bind(this),
        onRetry: this.handleRetry.bind(this),
        onCloseError: this.handleCloseError.bind(this),
      });

      window.transactionManager = TransactionManager;
      window.retiroApp = this;

      await this.cargarConfiguracion();
      await TelegramAuth.init();

      this.isInitialized = true;
      if (window.visualLogger) {
        window.visualLogger.success("Aplicación inicializada");
      }
    } catch (error) {
      if (window.visualLogger) {
        window.visualLogger.error(`Error init: ${error.message}`);
      }
      UI.showErrorScreen("Error de Inicialización", error.message);
    }
  }

  async cargarConfiguracion() {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/config/retiros`);
      if (response.ok) {
        const data = await response.json();
        if (data.ok && data.configuracion) {
          this.montoMinimo = data.configuracion.retiro_monto_minimo || 1;
          UI.updateMontoMinimo(this.montoMinimo);
        }
      }
    } catch (error) {
      this.montoMinimo = 1;
      UI.updateMontoMinimo(1);
    }
  }

  async handleUserDataLoaded(userData) {
    this.userData = userData;
    await this.loadUserBalance();
    this.authenticateWebSocket(userData);
    UI.showMainScreen();
  }

  authenticateWebSocket(userData) {
    if (window.retiroWebSocket.isConnected) {
      const telegramId = userData.id.toString();
      const initData = TelegramAuth.getInitData();
      window.retiroWebSocket.authenticateJugador(telegramId, initData);
    } else {
      setTimeout(() => this.authenticateWebSocket(userData), 2000);
    }
  }

  handleAuthResult(result) {
    if (result.success && !window.retiroWebSocket.activeTransactionId) {
      UI.showMainScreen();
    }
  }

  handleRetiroSubmit(e) {
    e.preventDefault();
    const formData = UI.getRetiroFormData();
    const validation = UI.validateRetiroForm(
      formData,
      this.montoMinimo,
      this.currentBalance
    );
    if (!validation.valid) {
      UI.showErrorScreen("Error de Validación", validation.message);
      return;
    }
    this.pendingRetiroData = formData;
    UI.showDataPaymentScreen();
  }

  handleDataPaymentSubmit(e) {
    e.preventDefault();
    const formData = UI.getDataPaymentFormData();
    const validation = UI.validateDataPaymentForm(formData);
    if (!validation.valid) {
      UI.showErrorScreen("Error de Validación", validation.message);
      return;
    }

    if (
      !window.retiroWebSocket.isConnected ||
      !window.retiroWebSocket.isAuthenticated
    ) {
      UI.showErrorScreen("Error", "No hay conexión. Revisa tu internet.");
      return;
    }

    const retiroData = {
      monto: TransactionManager.convertToCents(this.pendingRetiroData.amount),
      metodoPago: "pago_movil",
      descripcion: `Retiro de ${this.pendingRetiroData.amount} Bs`,
      datosPago: {
        banco: formData.banco,
        telefono: formData.telefono,
        cedula: formData.cedula,
      },
    };

    window.retiroWebSocket.solicitarRetiro(retiroData);
    this.currentTransaction = {
      _id: null,
      monto: retiroData.monto,
      estado: "pendiente",
    };
    TransactionManager.setCurrentTransaction(this.currentTransaction);
    UI.updateWaitingTransaction(this.currentTransaction);
    UI.showWaitingScreen();
  }

  handleSolicitudCreada(data) {
    window.retiroWebSocket.setActiveTransaction(data.transaccionId);
    this.currentTransaction = {
      _id: data.transaccionId,
      monto: data.monto,
      estado: data.estado,
    };
    TransactionManager.setCurrentTransaction(this.currentTransaction);
    UI.updateWaitingTransaction(this.currentTransaction);
    UI.showWaitingScreen();
  }

  handleSolicitudAceptada(data) {
    this.currentTransaction = {
      ...this.currentTransaction,
      cajero: data.cajero,
      estado: "en_proceso",
    };
    TransactionManager.setCurrentTransaction(this.currentTransaction);
    UI.updateInProcessInfo(data);
    UI.showInProcessScreen();
  }

  handleRetiroCompletado(data) {
    window.retiroWebSocket.clearActiveTransaction();
    this.loadUserBalance();
    UI.updateCompletedInfo(data);
    UI.showCompletedScreen();
  }

  handleTimeout(data) {
    this.currentTransaction = null;
    TransactionManager.clearCurrentTransaction();
    window.retiroWebSocket.clearActiveTransaction();
    UI.showErrorScreen("Tiempo Agotado", data.mensaje || "La solicitud fue cancelada por inactividad.");
    setTimeout(() => {
      UI.showMainScreen();
      this.loadUserBalance();
    }, 4000);
  }

  handleWebSocketError(error) {
    if (window.visualLogger) {
      window.visualLogger.error(`WebSocket: ${error.message || error}`);
    }
    UI.showErrorScreen("Error", error.message || "Error de conexión");
  }

  handleAuthError(error) {
    UI.showErrorScreen("Error de Autenticación", error.message);
  }

  async loadUserBalance() {
    try {
      const telegramId = TelegramAuth.getTelegramId();
      if (!telegramId) {
        this.currentBalance = 0;
        UI.updateBalance(0);
        return;
      }
      const response = await API.getJugadorSaldo(telegramId);
      if (response.ok) {
        const data = await response.json();
        this.currentBalance = data.saldo || 0;
        UI.updateBalance(this.currentBalance);
      } else {
        this.currentBalance = 0;
        UI.updateBalance(0);
      }
    } catch (error) {
      this.currentBalance = 0;
      UI.updateBalance(0);
    }
  }

  async handleCancelTransaction() {
    const currentTransaction = TransactionManager.getCurrentTransaction();
    if (!currentTransaction?._id) return;

    const confirmed = await UI.showConfirmModal(
      "¿Cancelar retiro?",
      "¿Estás seguro que deseas cancelar esta solicitud?"
    );

    if (!confirmed) return;

    try {
      const response = await API.cancelarTransaccion(currentTransaction._id);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.mensaje || "Error al cancelar");
      }
      TransactionManager.clearCurrentTransaction();
      window.retiroWebSocket.clearActiveTransaction();
      UI.showMainScreen();
      await this.loadUserBalance();
    } catch (error) {
      UI.showErrorScreen("Error", error.message);
    }
  }

  handleCloseApp() {
    TelegramAuth.closeApp();
  }

  async handleRetry() {
    TransactionManager.clearCurrentTransaction();
    window.retiroWebSocket.clearActiveTransaction();
    UI.showMainScreen();
    await this.loadUserBalance();
  }

  handleCloseError() {
    UI.showMainScreen();
  }
}

const app = new RetiroApp();

document.addEventListener("DOMContentLoaded", () => {
  app.init();
});

export default app;
