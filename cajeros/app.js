/**
 * Aplicación principal de cajeros - Versión modular
 * @version 0.10.1
 */

import { Auth } from "./js/auth.js";
import { UI } from "./js/ui.js";
import { TransactionManager } from "./js/transactions.js";
import { MESSAGES, API_CONFIG } from "./js/config.js";
import "./js/notifications.js"; // Importar sistema de notificaciones toast
import notificationListManager from "./js/notification-manager.js"; // Importar gestor de notificaciones persistentes
import browserNotifications from "./js/push-notifications.js"; // Importar notificaciones del navegador

// Constante de versión
const APP_VERSION = "0.10.1"; // Alpha - Sistema de notificaciones push (fixes WebSocket y SW)

class CajerosApp {
  constructor() {
    this.isInitialized = false;
    this.processedTransactions = new Set(); // Para evitar duplicados
    this.version = APP_VERSION;
  }

  /**
   * Inicializar la aplicación
   */
  async init() {
    if (this.isInitialized) return;

    try {
      console.log(
        `🚀 Iniciando aplicación de cajeros v${this.version} [ALPHA]...`
      );

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

      // Inicializar sistema de notificaciones
      await this.initNotifications();

      // Hacer disponibles las instancias globalmente para uso en HTML
      window.transactionManager = TransactionManager;
      window.CajerosApp = this;
      window.API_CONFIG = API_CONFIG;

      this.isInitialized = true;
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
      // WebSocket conectado
    });

    window.cajeroWebSocket.on("onDisconnect", (reason) => {
      console.log(`❌ WebSocket desconectado: ${reason}`);
    });

    window.cajeroWebSocket.on("onAuthResult", (result) => {
      if (!result.success) {
        console.error(`🔐 Error de autenticación WebSocket: ${result.message}`);
      }
    });

    window.cajeroWebSocket.on("onNuevaSolicitudDeposito", (data) => {
      console.log("💰 Nueva solicitud de depósito recibida");
      this.handleNuevaSolicitudDeposito(data);
    });

    window.cajeroWebSocket.on("onVerificarPago", (data) => {
      console.log("🔍 Solicitud de verificación de pago recibida");
      this.handleVerificarPago(data);
    });

    window.cajeroWebSocket.on("onDepositoCompletado", (data) => {
      console.log("✅ Depósito completado recibido");
      this.handleDepositoCompletado(data);
    });

    window.cajeroWebSocket.on("onDepositoRechazado", (data) => {
      console.log("❌ Depósito rechazado recibido");
      this.handleDepositoRechazado(data);
    });

    window.cajeroWebSocket.on("onTransaccionCanceladaPorJugador", (data) => {
      console.log("❌ Jugador canceló transacción");
      this.handleTransaccionCanceladaPorJugador(data);
    });

    window.cajeroWebSocket.on("onTransaccionCanceladaPorTimeout", (data) => {
      console.log("⏱️ Transacción cancelada por timeout");
      this.handleTransaccionCanceladaPorTimeout(data);
    });

    // Listener para notificaciones persistentes
    window.cajeroWebSocket.on("onNuevaNotificacion", (data) => {
      console.log("🔔 Nueva notificación recibida:", data);
      this.handleNuevaNotificacion(data);
    });

    window.cajeroWebSocket.on("onError", (error) => {
      console.error(`❌ Error WebSocket: ${error.message || error}`);
      // Limpiar el estado de procesamiento en caso de error
      UI.processingPayment = null;
    });

    // Agregar callback para errores de conexión
    window.cajeroWebSocket.socket?.on("connect_error", (error) => {
      console.error(`❌ Error de conexión WebSocket: ${error.message}`);
    });

    // Conectar WebSocket
    window.cajeroWebSocket.connect();
  }

  /**
   * Inicializar sistema de notificaciones
   */
  async initNotifications() {
    try {
      console.log("🔔 Iniciando sistema de notificaciones...");

      // Inicializar gestor de notificaciones persistentes
      notificationListManager.init();

      // Inicializar notificaciones del navegador
      await browserNotifications.init();

      // Solicitar permisos de notificación (opcional, se puede hacer en login)
      // await browserNotifications.requestPermission();

      console.log("✅ Sistema de notificaciones iniciado");
    } catch (error) {
      console.error("❌ Error iniciando sistema de notificaciones:", error);
    }
  }

  /**
   * Manejar nueva notificación via WebSocket
   */
  handleNuevaNotificacion(data) {
    try {
      const { tipo, titulo, mensaje, transaccionId } = data;

      console.log(`🔔 Notificación recibida - Tipo: ${tipo}`);

      // Mostrar notificación toast
      if (window.notificationManager) {
        window.notificationManager.info(titulo, mensaje);
      }

      // Mostrar notificación del navegador para eventos críticos
      // Solo si la app NO está enfocada
      if (tipo === "nueva_solicitud" || tipo === "pago_realizado") {
        browserNotifications.showCriticalNotification(tipo, {
          mensaje,
          transaccionId,
        });
      }

      // Agregar a la lista de notificaciones persistentes
      // (opcional, si queremos actualizar en tiempo real)
      // notificationListManager.addNotification(data);
    } catch (error) {
      console.error("❌ Error manejando nueva notificación:", error);
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
      // Autenticar con WebSocket
      this.authenticateWithWebSocket(cajeroInfo);

      // Actualizar UI con información del cajero
      UI.updateCajeroDisplay(cajeroInfo);

      // Cargar transacciones pendientes
      await this.loadTransactions();

      // Mostrar dashboard
      UI.showDashboard();

      // Solicitar permisos de notificación (solo se hace una vez)
      try {
        await browserNotifications.requestPermission();
      } catch (error) {
        console.log("No se pudo solicitar permiso de notificaciones:", error);
      }

      // Crear notificación local de inicio de sesión
      if (window.notificationManager) {
        window.notificationManager.success(
          "Sesión iniciada",
          `Bienvenido ${cajeroInfo.nombreCompleto || cajeroInfo.email}`
        );
      }
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
      window.cajeroWebSocket.authenticateCajero(token);
    } else {
      setTimeout(() => {
        this.authenticateWithWebSocket(cajeroInfo);
      }, 2000);
    }
  }

  /**
   * Manejar nueva solicitud de depósito via WebSocket
   */
  async handleNuevaSolicitudDeposito(data) {
    try {
      // Usar transaccionId como identificador único para evitar duplicados
      const transactionId =
        data.transaccionId || data.jugadorId + "_" + data.monto;

      // Verificar si ya procesamos esta transacción
      if (this.processedTransactions.has(transactionId)) {
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

      // Forzar actualización de la lista de transacciones
      await this.loadTransactions();

      // Marcar la transacción como nueva (si tiene transaccionId)
      if (data.transaccionId) {
        this.markTransactionAsNew(data.transaccionId);
      }
    } catch (error) {
      console.error(`Error manejando nueva solicitud: ${error.message}`);
    }
  }

  /**
   * Manejar solicitud de verificación de pago
   */
  handleVerificarPago(data) {
    try {
      console.log("🔍 [VERIFICAR-PAGO] Evento recibido:", data);
      console.log("🔍 [VERIFICAR-PAGO] Abriendo modal automáticamente...");

      // PRIMERO actualizar la lista para que muestre el nuevo estado
      this.loadTransactions();

      // LUEGO mostrar el pop-up de verificación (con un pequeño delay para que no se interrumpa)
      setTimeout(() => {
        UI.showVerificarPagoPopup(data);
        console.log("🔍 [VERIFICAR-PAGO] Modal abierto correctamente");
      }, 300);
    } catch (error) {
      console.error("❌ Error manejando verificación de pago:", error);
    }
  }

  /**
   * Manejar depósito completado
   */
  handleDepositoCompletado(data) {
    try {
      // Limpiar el estado de procesamiento
      UI.processingPayment = null;

      // Mostrar pop-up de depósito completado
      UI.showDepositoCompletadoPopup(data);

      // Actualizar la lista de transacciones
      this.loadTransactions();
    } catch (error) {
      console.error("Error manejando depósito completado:", error);
    }
  }

  /**
   * Manejar depósito rechazado
   */
  handleDepositoRechazado(data) {
    try {
      // Limpiar el estado de procesamiento
      UI.processingPayment = null;

      // Mostrar pop-up de depósito rechazado
      UI.showDepositoRechazadoPopup(data);

      // Actualizar la lista de transacciones
      this.loadTransactions();
    } catch (error) {
      console.error("Error manejando depósito rechazado:", error);
    }
  }

  /**
   * Manejar transacción cancelada por jugador
   */
  handleTransaccionCanceladaPorJugador(data) {
    try {
      console.log("❌ [CANCELACION] Procesando cancelación:", data);

      // Actualizar las listas de transacciones (la transacción cancelada desaparecerá)
      this.loadTransactions();

      console.log("✅ [CANCELACION] Listas actualizadas");
    } catch (error) {
      console.error("Error manejando cancelación por jugador:", error);
    }
  }

  /**
   * Manejar cancelación de transacción por timeout
   */
  handleTransaccionCanceladaPorTimeout(data) {
    try {
      console.log("⏱️ [TIMEOUT] Procesando cancelación por timeout:", data);
      console.log(
        `⏱️ [TIMEOUT] Transacción ${data.transaccionId} cancelada por inactividad (${data.tiempoTranscurrido} minutos)`
      );

      // Actualizar las listas de transacciones (la transacción cancelada desaparecerá)
      this.loadTransactions();

      // Opcional: Mostrar notificación al cajero si está viendo esa transacción
      console.log("✅ [TIMEOUT] Listas actualizadas");
    } catch (error) {
      console.error("Error manejando cancelación por timeout:", error);
    }
  }

  /**
   * Marcar transacción como nueva con etiqueta visual
   */
  markTransactionAsNew(transactionId) {
    try {
      // Buscar el elemento de la transacción en el DOM
      const transactionElement = document.querySelector(
        `[data-transaction-id="${transactionId}"]`
      );

      if (transactionElement) {
        // Agregar clase CSS para destacar como nueva
        transactionElement.classList.add("transaction-new");

        // Agregar etiqueta "NUEVA" en una esquina
        const newLabel = document.createElement("div");
        newLabel.className = "new-transaction-label";
        newLabel.textContent = "NUEVA";
        newLabel.style.cssText = `
          position: absolute;
          top: 8px;
          right: 8px;
          background: #ff4444;
          color: white;
          padding: 2px 6px;
          border-radius: 10px;
          font-size: 10px;
          font-weight: bold;
          z-index: 10;
          animation: pulse 2s infinite;
        `;

        // Asegurar que el contenedor tenga posición relativa
        transactionElement.style.position = "relative";
        transactionElement.appendChild(newLabel);

        // Remover la etiqueta después de 10 segundos
        setTimeout(() => {
          if (newLabel.parentNode) {
            newLabel.parentNode.removeChild(newLabel);
          }
          transactionElement.classList.remove("transaction-new");
        }, 10000);

        // Transacción marcada como nueva
      }
    } catch (error) {
      console.error(`Error marcando transacción como nueva: ${error.message}`);
    }
  }

  /**
   * Manejar logout
   */
  handleLogout() {
    // Crear notificación de cierre de sesión
    if (window.notificationManager) {
      window.notificationManager.info(
        "Sesión cerrada",
        "Has cerrado sesión correctamente"
      );
    }

    // Limpiar sesión en Auth
    Auth.logout();

    // Actualizar UI
    UI.showLoginScreen();

    // Limpiar transacciones
    TransactionManager.clearTransactions();
  }

  /**
   * Manejar expiración de token
   */
  handleTokenExpired() {
    UI.showLoginScreen();
    TransactionManager.clearTransactions();
    UI.showError("Tu sesión ha expirado. Por favor, inicia sesión nuevamente.");
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

window.verifyPayment = async (transaccionId) => {
  const token = app.getToken();
  if (!token || !window.transactionManager) return;

  try {
    // Obtener detalles de la transacción
    const { API } = await import("./js/api.js");
    const response = await API.getTransaccionDetalle(transaccionId, token);

    if (response.ok) {
      const result = await response.json();
      const transaccion = result.transaccion;

      // Formatear datos para el popup de verificación
      const data = {
        transaccionId: transaccion._id,
        monto: transaccion.monto,
        jugador: {
          nombre:
            transaccion.jugadorId?.nickname ||
            transaccion.jugadorId?.firstName ||
            "Usuario",
        },
        datosPago: {
          banco: transaccion.infoPago?.bancoOrigen || "-",
          referencia: transaccion.infoPago?.numeroReferencia || "-",
          telefono: transaccion.infoPago?.telefonoOrigen || "-",
          fecha: transaccion.infoPago?.fechaPago || "-",
          monto: transaccion.monto,
        },
      };

      // Mostrar popup de verificación
      app.getUI().showVerificarPagoPopup(data);
    } else {
      console.error("Error obteniendo transacción:", response.status);
    }
  } catch (error) {
    console.error("Error en verifyPayment:", error);
  }
};

// Exportar para uso en otros módulos si es necesario
export default app;
