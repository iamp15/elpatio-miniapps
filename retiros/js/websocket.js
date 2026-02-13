/**
 * Módulo WebSocket para la app de retiros
 */

class RetiroWebSocket {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.isAuthenticated = false;
    this.isAuthenticating = false;
    this.lastInitData = null;
    this.activeTransactionId = null;
    this.callbacks = {
      onConnect: null,
      onDisconnect: null,
      onAuthResult: null,
      onSolicitudCreada: null,
      onSolicitudAceptada: null,
      onRetiroCompletado: null,
      onTransaccionCanceladaPorTimeout: null,
      onError: null,
    };
  }

  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  connect() {
    if (this.socket && this.isConnected) return;
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.isConnected = false;
    this.isAuthenticated = false;
    this.isAuthenticating = false;

    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    const socketUrl = isLocalhost
      ? "http://localhost:3001"
      : "https://elpatio-backend.fly.dev";

    if (window.visualLogger) {
      window.visualLogger.websocket(`Conectando a ${socketUrl}...`);
    }

    if (typeof io === "undefined") {
      console.error("Socket.IO no está cargado");
      return;
    }

    this.socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      timeout: 30000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
    });

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.socket.onAny((eventName, ...args) => {
      if (window.visualLogger) {
        window.visualLogger.websocket(`Evento: ${eventName}`);
      }
    });

    this.socket.on("connect", () => {
      this.isConnected = true;
      if (window.visualLogger) {
        window.visualLogger.websocket("Conectado al servidor");
      }
      if (this.lastInitData && !this.isAuthenticated && !this.isAuthenticating) {
        this.authenticateJugador(
          this.lastInitData.telegramId,
          this.lastInitData.initData
        );
      }
      if (this.callbacks.onConnect) this.callbacks.onConnect();
    });

    this.socket.on("disconnect", (reason) => {
      this.isConnected = false;
      this.isAuthenticated = false;
      this.isAuthenticating = false;
      if (window.visualLogger) {
        window.visualLogger.websocket(`Desconectado: ${reason}`);
      }
      if (this.callbacks.onDisconnect) this.callbacks.onDisconnect(reason);
    });

    this.socket.on("auth-result", (result) => {
      this.isAuthenticating = false;
      this.isAuthenticated = result.success;
      if (window.visualLogger) {
        window.visualLogger.websocket(
          result.success ? "Autenticación exitosa" : `Auth fallida: ${result.message}`
        );
      }
      if (this.callbacks.onAuthResult) this.callbacks.onAuthResult(result);
    });

    this.socket.on("solicitud-creada", (data) => {
      if (window.visualLogger) {
        window.visualLogger.transaction("Solicitud creada");
      }
      this.setActiveTransaction(data.transaccionId);
      if (this.callbacks.onSolicitudCreada) this.callbacks.onSolicitudCreada(data);
    });

    this.socket.on("solicitud-aceptada", (data) => {
      if (window.visualLogger) {
        window.visualLogger.success("Solicitud aceptada por cajero");
      }
      if (this.callbacks.onSolicitudAceptada) this.callbacks.onSolicitudAceptada(data);
    });

    this.socket.on("retiro-completado", (data) => {
      if (data.target === "jugador") {
        if (window.visualLogger) {
          window.visualLogger.success("Retiro completado");
        }
        this.clearActiveTransaction();
        if (this.callbacks.onRetiroCompletado) this.callbacks.onRetiroCompletado(data);
      }
    });

    this.socket.on("transaccion-cancelada-por-timeout", (data) => {
      this.clearActiveTransaction();
      if (this.callbacks.onTransaccionCanceladaPorTimeout) {
        this.callbacks.onTransaccionCanceladaPorTimeout(data);
      }
    });

    this.socket.on("transaction-already-finished", (data) => {
      this.clearActiveTransaction();
      if (data.target === "jugador" && (data.estado === "completada" || data.estado === "completada_con_ajuste")) {
        if (window.visualLogger) {
          window.visualLogger.success("Retiro completado (reconexión)");
        }
        if (this.callbacks.onRetiroCompletado) {
          this.callbacks.onRetiroCompletado({
            transaccionId: data.transaccionId,
            monto: data.monto,
            saldoNuevo: data.saldoNuevo,
            saldoAnterior: data.saldoAnterior,
            mensaje: data.mensaje || "¡Retiro completado exitosamente!",
          });
        }
      } else if (this.callbacks.onTransaccionCanceladaPorTimeout) {
        this.callbacks.onTransaccionCanceladaPorTimeout({ mensaje: data.mensaje });
      }
    });

    this.socket.on("error", (error) => {
      if (window.visualLogger) {
        window.visualLogger.error(`Error: ${error.message || error}`);
      }
      if (this.callbacks.onError) this.callbacks.onError(error);
    });
  }

  authenticateJugador(telegramId, initData) {
    if (!this.isConnected) return;
    if (this.isAuthenticating) return;
    if (this.isAuthenticated && this.lastInitData?.telegramId === telegramId) {
      return;
    }

    this.lastInitData = { telegramId, initData };
    this.isAuthenticating = true;

    if (window.visualLogger) {
      window.visualLogger.websocket("Autenticando jugador...");
    }

    this.socket.emit("auth-jugador", { telegramId, initData });
  }

  setActiveTransaction(transaccionId) {
    this.activeTransactionId = transaccionId;
  }

  clearActiveTransaction() {
    this.activeTransactionId = null;
    if (window.TransactionManager) {
      window.TransactionManager.clearCurrentTransaction();
    }
  }

  solicitarRetiro(datos) {
    if (!this.isConnected || !this.isAuthenticated) {
      console.error("No hay conexión o no está autenticado");
      return;
    }
    if (window.visualLogger) {
      window.visualLogger.transaction("Enviando solicitud de retiro...");
    }
    this.socket.emit("solicitar-retiro", datos);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.isAuthenticated = false;
    this.isAuthenticating = false;
  }
}

window.retiroWebSocket = new RetiroWebSocket();
