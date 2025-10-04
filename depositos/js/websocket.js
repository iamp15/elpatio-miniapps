/**
 * Módulo WebSocket para la app de depósitos
 */

class DepositoWebSocket {
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
      onDepositoAtendido: null,
      onDepositoConfirmado: null,
      onDepositoRechazado: null,
      onNuevaSolicitudDeposito: null,
      onSolicitudAceptada: null,
      onVerificarPago: null,
      onDepositoCompletado: null,
      onSolicitudCreada: null,
      onPagoConfirmado: null,
      onError: null,
    };
  }

  /**
   * Configurar callbacks
   */
  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
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
    // En Telegram Web App, siempre usar Railway (producción)
    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    const socketUrl = isLocalhost
      ? "http://localhost:3001"
      : "https://elpatio-backend-production.up.railway.app";

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
      console.log("📡 Socket ID:", this.socket.id);
      console.log("📡 Transport:", this.socket.io.engine.transport.name);
      this.isConnected = true;
      this.reconnectAttempts = 0; // Resetear intentos de reconexión
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
      // Filtrar por target: solo procesar si es para jugador
      if (data.target === "jugador" && this.callbacks.onDepositoRechazado) {
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
      console.log("🎉 [WebSocket] Evento deposito-completado recibido:", data);
      console.log("🎉 [WebSocket] data.target:", data.target);
      console.log("🎉 [WebSocket] this.callbacks.onDepositoCompletado:", this.callbacks.onDepositoCompletado);
      
      // Filtrar por target: solo procesar si es para jugador
      if (data.target === "jugador") {
        console.log("🎉 [WebSocket] Target es jugador, verificando callback...");
        if (this.callbacks.onDepositoCompletado) {
          console.log("🎉 [WebSocket] Ejecutando callback onDepositoCompletado");
          this.callbacks.onDepositoCompletado(data);
        } else {
          console.error("❌ [WebSocket] Callback onDepositoCompletado no está configurado");
        }
      } else {
        console.log("🎉 [WebSocket] Target no es jugador, ignorando evento");
      }
    });

    this.socket.on("solicitud-creada", (data) => {
      console.log("✅ Solicitud de depósito creada:", data);
      if (this.callbacks.onSolicitudCreada) {
        this.callbacks.onSolicitudCreada(data);
      }
    });

    this.socket.on("pago-confirmado", (data) => {
      console.log("💳 Pago confirmado:", data);
      // Filtrar por target: solo procesar si es para jugador
      if (data.target === "jugador" && this.callbacks.onPagoConfirmado) {
        this.callbacks.onPagoConfirmado(data);
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
window.depositoWebSocket = new DepositoWebSocket();

// Exportar para uso en módulos
if (typeof module !== "undefined" && module.exports) {
  module.exports = DepositoWebSocket;
}
