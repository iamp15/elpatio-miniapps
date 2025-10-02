/**
 * Módulo WebSocket para la app de depósitos
 */

class DepositoWebSocket {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.isAuthenticated = false;
    this.userData = null;
    this.callbacks = {
      onConnect: null,
      onDisconnect: null,
      onAuthResult: null,
      onDepositoAtendido: null,
      onDepositoConfirmado: null,
      onDepositoRechazado: null,
      onNuevaSolicitudDeposito: null,
      onSolicitudAceptada: null,
      onVerificarPago: null,
      onDepositoCompletado: null,
      onError: null,
    };
  }

  /**
   * Conectar al servidor WebSocket
   */
  connect() {
    if (this.socket && this.isConnected) {
      console.log("Ya hay una conexión activa");
      return;
    }

    // Detectar URL del servidor
    const isRailway = window.location.hostname.includes("railway.app");
    const socketUrl = isRailway
      ? "https://elpatio-backend-production.up.railway.app"
      : "http://localhost:3001";

    console.log("Conectando a WebSocket:", socketUrl);

    // Importar Socket.IO dinámicamente
    if (typeof io === "undefined") {
      console.error("Socket.IO no está cargado");
      return;
    }

    this.socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      timeout: 20000,
      forceNew: true,
    });

    this.setupEventHandlers();
  }

  /**
   * Configurar manejadores de eventos
   */
  setupEventHandlers() {
    this.socket.on("connect", () => {
      console.log("✅ Conectado al servidor WebSocket");
      this.isConnected = true;
      if (this.callbacks.onConnect) {
        this.callbacks.onConnect();
      }
    });

    this.socket.on("disconnect", (reason) => {
      console.log("❌ Desconectado del servidor WebSocket:", reason);
      this.isConnected = false;
      this.isAuthenticated = false;
      if (this.callbacks.onDisconnect) {
        this.callbacks.onDisconnect(reason);
      }
    });

    this.socket.on("auth-result", (result) => {
      console.log("🔐 Resultado de autenticación:", result);
      this.isAuthenticated = result.success;
      this.userData = result.success ? result.user : null;
      if (this.callbacks.onAuthResult) {
        this.callbacks.onAuthResult(result);
      }
    });

    this.socket.on("deposito-atendido", (data) => {
      console.log("🏦 Depósito atendido:", data);
      if (this.callbacks.onDepositoAtendido) {
        this.callbacks.onDepositoAtendido(data);
      }
    });

    this.socket.on("deposito-confirmado", (data) => {
      console.log("✅ Depósito confirmado:", data);
      if (this.callbacks.onDepositoConfirmado) {
        this.callbacks.onDepositoConfirmado(data);
      }
    });

    this.socket.on("deposito-rechazado", (data) => {
      console.log("❌ Depósito rechazado:", data);
      if (this.callbacks.onDepositoRechazado) {
        this.callbacks.onDepositoRechazado(data);
      }
    });

    // Eventos del sistema de depósitos WebSocket
    this.socket.on("nueva-solicitud-deposito", (data) => {
      console.log("💰 Nueva solicitud de depósito:", data);
      if (this.callbacks.onNuevaSolicitudDeposito) {
        this.callbacks.onNuevaSolicitudDeposito(data);
      }
    });

    this.socket.on("solicitud-aceptada", (data) => {
      console.log("✅ Solicitud aceptada:", data);
      if (this.callbacks.onSolicitudAceptada) {
        this.callbacks.onSolicitudAceptada(data);
      }
    });

    this.socket.on("verificar-pago", (data) => {
      console.log("🔍 Verificar pago:", data);
      if (this.callbacks.onVerificarPago) {
        this.callbacks.onVerificarPago(data);
      }
    });

    this.socket.on("deposito-completado", (data) => {
      console.log("🎉 Depósito completado:", data);
      if (this.callbacks.onDepositoCompletado) {
        this.callbacks.onDepositoCompletado(data);
      }
    });

    this.socket.on("error", (error) => {
      console.error("❌ Error en WebSocket:", error);
      if (this.callbacks.onError) {
        this.callbacks.onError(error);
      }
    });
  }

  /**
   * Autenticar como jugador
   */
  authenticateJugador(telegramId, initData) {
    if (!this.isConnected) {
      console.error("No hay conexión WebSocket");
      return;
    }

    console.log("🔐 Autenticando jugador:", telegramId);
    this.socket.emit("auth-jugador", {
      telegramId,
      initData,
    });
  }

  /**
   * Solicitar depósito
   */
  solicitarDeposito(depositoData) {
    if (!this.isConnected || !this.isAuthenticated) {
      console.error("No hay conexión o no está autenticado");
      return;
    }

    console.log("💰 Solicitando depósito:", depositoData);
    this.socket.emit("solicitar-deposito", depositoData);
  }

  /**
   * Confirmar pago del jugador
   */
  confirmarPagoJugador(paymentData) {
    if (!this.isConnected || !this.isAuthenticated) {
      console.error("No hay conexión o no está autenticado");
      return;
    }

    console.log("💳 Confirmando pago:", paymentData);
    this.socket.emit("confirmar-pago-jugador", paymentData);
  }

  /**
   * Desconectar
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.isAuthenticated = false;
      this.userData = null;
    }
  }

  /**
   * Configurar callbacks
   */
  on(event, callback) {
    if (this.callbacks.hasOwnProperty(event)) {
      this.callbacks[event] = callback;
    } else {
      console.warn("Evento no reconocido:", event);
    }
  }

  /**
   * Obtener estado de conexión
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      isAuthenticated: this.isAuthenticated,
      userData: this.userData,
    };
  }
}

// Crear instancia global
window.depositoWebSocket = new DepositoWebSocket();

// Exportar para uso en módulos
if (typeof module !== "undefined" && module.exports) {
  module.exports = DepositoWebSocket;
}
