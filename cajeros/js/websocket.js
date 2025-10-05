/**
 * Módulo WebSocket para la app de cajeros
 */

class CajeroWebSocket {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.isAuthenticated = false;
    this.userData = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000;
    this.callbacks = {
      onConnect: null,
      onDisconnect: null,
      onAuthResult: null,
      onNuevaSolicitudDeposito: null,
      onVerificarPago: null,
      onDepositoCompletado: null,
      onDepositoRechazado: null,
      onError: null,
    };
  }

  /**
   * Conectar al servidor WebSocket
   */
  connect() {
    if (this.socket && this.isConnected) {
      return;
    }

    // Detectar URL del servidor
    // En producción, siempre usar Railway
    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    const socketUrl = isLocalhost
      ? "http://localhost:3001"
      : "https://elpatio-backend-production.up.railway.app";

    // Conectando a WebSocket

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
      this.isConnected = true;
      this.reconnectAttempts = 0; // Resetear intentos de reconexión
      if (this.callbacks.onConnect) {
        this.callbacks.onConnect();
      }
    });

    this.socket.on("disconnect", (reason) => {
      this.isConnected = false;
      this.isAuthenticated = false;
      if (this.callbacks.onDisconnect) {
        this.callbacks.onDisconnect(reason);
      }
    });

    this.socket.on("connect_error", (error) => {
      console.error("❌ Error de conexión WebSocket:", error);
      console.error("❌ Detalles del error:", {
        message: error.message,
        description: error.description,
        context: error.context,
        type: error.type,
      });

      // Intentar reconexión automática
      this.attemptReconnect();
    });

    this.socket.on("auth-result", (result) => {
      this.isAuthenticated = result.success;
      this.userData = result.success ? result.user : null;
      if (this.callbacks.onAuthResult) {
        this.callbacks.onAuthResult(result);
      }
    });

    this.socket.on("nueva-solicitud-deposito", (data) => {
      if (this.callbacks.onNuevaSolicitudDeposito) {
        this.callbacks.onNuevaSolicitudDeposito(data);
      }
    });

    this.socket.on("verificar-pago", (data) => {
      // Filtrar por target: solo procesar si es para cajero
      if (data.target === "cajero" && this.callbacks.onVerificarPago) {
        this.callbacks.onVerificarPago(data);
      }
    });

    this.socket.on("deposito-completado", (data) => {
      // Filtrar por target: solo procesar si es para cajero
      if (data.target === "cajero" && this.callbacks.onDepositoCompletado) {
        this.callbacks.onDepositoCompletado(data);
      }
    });

    this.socket.on("deposito-rechazado", (data) => {
      // Filtrar por target: solo procesar si es para cajero
      if (data.target === "cajero" && this.callbacks.onDepositoRechazado) {
        this.callbacks.onDepositoRechazado(data);
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
   * Autenticar como cajero
   */
  authenticateCajero(token) {
    if (!this.isConnected) {
      console.error("No hay conexión WebSocket");
      return;
    }

    // Autenticando cajero
    this.socket.emit("auth-cajero", {
      token,
    });
  }

  /**
   * Aceptar solicitud de depósito
   */
  aceptarSolicitud(transaccionId, transaccionData) {
    if (!this.isConnected || !this.isAuthenticated) {
      console.error("No hay conexión o no está autenticado");
      return;
    }

    // Aceptando solicitud
    this.socket.emit("aceptar-solicitud", {
      transaccionId,
      transaccionData,
    });
  }

  /**
   * Atender depósito
   */
  atenderDeposito(jugadorSocketId, depositoData) {
    if (!this.isConnected || !this.isAuthenticated) {
      console.error("No hay conexión o no está autenticado");
      return;
    }

    // Atendiendo depósito
    this.socket.emit("atender-deposito", {
      jugadorSocketId,
      ...depositoData,
    });
  }

  /**
   * Confirmar depósito
   */
  confirmarDeposito(jugadorSocketId, transaccionId) {
    if (!this.isConnected || !this.isAuthenticated) {
      console.error("No hay conexión o no está autenticado");
      return;
    }

    console.log("✅ Confirmando depósito:", { jugadorSocketId, transaccionId });
    this.socket.emit("confirmar-deposito", {
      jugadorSocketId,
      transaccionId,
    });
  }

  /**
   * Rechazar depósito
   */
  rechazarDeposito(jugadorSocketId, motivo) {
    if (!this.isConnected || !this.isAuthenticated) {
      console.error("No hay conexión o no está autenticado");
      return;
    }

    console.log("❌ Rechazando depósito:", { jugadorSocketId, motivo });
    this.socket.emit("rechazar-deposito", {
      jugadorSocketId,
      motivo,
    });
  }

  /**
   * Confirmar pago (verificación de pago)
   */
  confirmarPagoCajero(transaccionId, notas = null) {
    console.log(
      "🔍 [WebSocket] confirmarPagoCajero llamado para transacción:",
      transaccionId
    );
    console.log("🔍 [WebSocket] Estado conexión:", {
      isConnected: this.isConnected,
      isAuthenticated: this.isAuthenticated,
    });
    console.log("🔍 [WebSocket] Stack trace:", new Error().stack);

    if (!this.isConnected || !this.isAuthenticated) {
      console.error("No hay conexión o no está autenticado");
      return;
    }

    console.log("✅ [WebSocket] Enviando evento verificar-pago-cajero:", {
      transaccionId,
      accion: "confirmar",
      notas,
    });
    this.socket.emit("verificar-pago-cajero", {
      transaccionId,
      accion: "confirmar",
      notas,
    });
  }

  /**
   * Rechazar pago (verificación de pago)
   */
  rechazarPagoCajero(transaccionId, motivo) {
    if (!this.isConnected || !this.isAuthenticated) {
      console.error("No hay conexión o no está autenticado");
      return;
    }
    console.log("❌ Rechazando pago:", { transaccionId, motivo });
    this.socket.emit("verificar-pago-cajero", {
      transaccionId,
      accion: "rechazar",
      motivo,
    });
  }

  /**
   * Intentar reconexión automática
   */
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("❌ Máximo número de intentos de reconexión alcanzado");
      return;
    }

    this.reconnectAttempts++;
    console.log(
      `🔄 Intentando reconexión ${this.reconnectAttempts}/${this.maxReconnectAttempts} en ${this.reconnectDelay}ms...`
    );

    setTimeout(() => {
      this.connect();
    }, this.reconnectDelay);
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
      this.reconnectAttempts = 0;
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
window.cajeroWebSocket = new CajeroWebSocket();

// Exportar para uso en módulos
if (typeof module !== "undefined" && module.exports) {
  module.exports = CajeroWebSocket;
}
