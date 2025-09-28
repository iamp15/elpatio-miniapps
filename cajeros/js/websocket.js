/**
 * Módulo WebSocket para la app de cajeros
 */

class CajeroWebSocket {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.isAuthenticated = false;
    this.userData = null;
    this.callbacks = {
      onConnect: null,
      onDisconnect: null,
      onAuthResult: null,
      onNuevaSolicitudDeposito: null,
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

    this.socket.on("nueva-solicitud-deposito", (data) => {
      console.log("💰 Nueva solicitud de depósito:", data);
      if (this.callbacks.onNuevaSolicitudDeposito) {
        this.callbacks.onNuevaSolicitudDeposito(data);
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

    console.log("🔐 Autenticando cajero");
    this.socket.emit("authenticate-cajero", {
      token,
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

    console.log("🏦 Atendiendo depósito:", { jugadorSocketId, depositoData });
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
window.cajeroWebSocket = new CajeroWebSocket();

// Exportar para uso en módulos
if (typeof module !== "undefined" && module.exports) {
  module.exports = CajeroWebSocket;
}
