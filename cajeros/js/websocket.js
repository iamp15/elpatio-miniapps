/**
 * Módulo WebSocket para la app de cajeros
 * @version 0.9.0
 */

class CajeroWebSocket {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.isAuthenticated = false;
    this.userData = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10; // Más intentos
    this.reconnectDelay = 1000; // Menos delay
    this.activeTransactionRooms = new Set(); // Track active transaction rooms
    this.lastAuthToken = null; // Store token for re-authentication
    this.callbacks = {
      onConnect: null,
      onDisconnect: null,
      onAuthResult: null,
      onNuevaSolicitudDeposito: null,
      onVerificarPago: null,
      onDepositoCompletado: null,
      onDepositoRechazado: null,
      onTransaccionCanceladaPorJugador: null,
      onTransaccionCanceladaPorTimeout: null,
      onNuevaNotificacion: null,
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
      : "https://elpatio-backend.fly.dev";

    // Conectando a WebSocket

    // Importar Socket.IO dinámicamente
    if (typeof io === "undefined") {
      console.error("Socket.IO no está cargado");
      return;
    }

    this.socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      timeout: 30000, // Más tiempo para conectar
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      maxReconnectionAttempts: 10,
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

      // Re-autenticar automáticamente si tenemos token guardado
      // Esto maneja tanto la conexión inicial como las reconexiones
      if (this.lastAuthToken && !this.isAuthenticated) {
        console.log("🔐 [RECOVERY] Re-autenticando cajero automáticamente...");
        setTimeout(() => {
          this.reauthenticateAndRejoinRooms();
        }, 500);
      }

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

    // Reconexión automática de Socket.IO
    this.socket.on("reconnect", (attemptNumber) => {
      console.log(`🔄 Reconectado automáticamente (intento ${attemptNumber})`);
      this.isConnected = true;
      this.reconnectAttempts = 0; // Resetear contador manual

      // Re-autenticar y re-unirse a rooms
      setTimeout(() => {
        this.reauthenticateAndRejoinRooms();
      }, 500);
    });

    this.socket.on("reconnect_attempt", (attemptNumber) => {
      console.log(`🔄 Intento de reconexión automática ${attemptNumber}`);
    });

    this.socket.on("reconnect_error", (error) => {
      console.error("❌ Error en reconexión automática:", error);
    });

    this.socket.on("reconnect_failed", () => {
      console.error(
        "❌ Falló la reconexión automática, iniciando reconexión manual"
      );
      this.attemptReconnect();
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

      if (result.success) {
        console.log("✅ [AUTH] Cajero autenticado:", result.user?.nombre);

        // Si hay información de recuperación, procesarla
        if (result.recovery && result.recovery.transactionsRecovered) {
          console.log(
            `🔄 [RECOVERY] ${result.recovery.transactionsRecovered.length} transacciones recuperadas automáticamente`
          );
        }
      } else {
        console.error(
          "❌ [AUTH] Autenticación de cajero fallida:",
          result.message
        );
      }

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

    this.socket.on("transaccion-cancelada-por-timeout", (data) => {
      console.log("⏱️ Transacción cancelada por timeout:", data);
      if (this.callbacks.onTransaccionCanceladaPorTimeout) {
        this.callbacks.onTransaccionCanceladaPorTimeout(data);
      }
    });

    this.socket.on("error", (error) => {
      console.error("❌ Error en WebSocket:", error);
      if (this.callbacks.onError) {
        this.callbacks.onError(error);
      }
    });

    // Evento de nueva notificación
    this.socket.on("nuevaNotificacion", (data) => {
      console.log("🔔 Nueva notificación recibida via WebSocket:", data);
      if (this.callbacks.onNuevaNotificacion) {
        this.callbacks.onNuevaNotificacion(data);
      }
    });

    // Evento de transacción cancelada por jugador
    this.socket.on("transaccion-cancelada-por-jugador", (data) => {
      console.log(
        "❌ [CANCELACION] Evento recibido - Jugador canceló transacción"
      );
      console.log("❌ [CANCELACION] Data completa:", data);
      console.log("❌ [CANCELACION] TransaccionId:", data.transaccionId);
      console.log(
        "❌ [CANCELACION] Callback existe:",
        !!this.callbacks.onTransaccionCanceladaPorJugador
      );

      if (this.callbacks.onTransaccionCanceladaPorJugador) {
        console.log("❌ [CANCELACION] Ejecutando callback...");
        this.callbacks.onTransaccionCanceladaPorJugador(data);
      } else {
        console.error("❌ [CANCELACION] Callback NO está configurado!");
      }
    });

    // Nuevos eventos de recuperación
    this.socket.on("transaction-state-recovered", (data) => {
      console.log("✅ [RECOVERY] Estado de transacción recuperado:", data);
      // El cajero puede ver el estado actual de transacciones recuperadas
    });

    this.socket.on("reconnection-successful", (data) => {
      console.log("✅ [RECOVERY] Reconexión exitosa:", data);
      // Notificar al cajero que se recuperaron transacciones
    });

    this.socket.on("participant-disconnected", (data) => {
      console.log("⚠️ [RECOVERY] Participante desconectado:", data);
      if (data.tipo === "jugador") {
        console.log(
          `⚠️ Jugador desconectado en transacción ${data.transaccionId}`
        );
        // El cajero puede mostrar un indicador de que el jugador se desconectó
      }
    });

    this.socket.on("participant-reconnected", (data) => {
      console.log("✅ [RECOVERY] Participante reconectado:", data);
      if (data.tipo === "jugador") {
        console.log(
          `✅ Jugador reconectado en transacción ${data.transaccionId}`
        );
        // El cajero puede ocultar el indicador de desconexión
      }
    });

    this.socket.on("participant-disconnected-timeout", (data) => {
      console.log("❌ [RECOVERY] Participante no pudo reconectar:", data);
      if (data.tipo === "jugador") {
        console.log(
          `❌ Jugador no reconectó en transacción ${data.transaccionId}`
        );
        // El cajero debe verificar el estado de la transacción manualmente
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

    // Guardar token para reconexión
    this.lastAuthToken = token;

    console.log("🔐 Autenticando cajero...");
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

    // Trackear room de transacción
    this.activeTransactionRooms.add(transaccionId);

    console.log("✅ Aceptando solicitud:", { transaccionId, transaccionData });
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
   * Rechazar pago (verificación de pago) con estructura mejorada
   */
  rechazarPagoCajero(transaccionId, motivoRechazo) {
    if (!this.isConnected || !this.isAuthenticated) {
      console.error("No hay conexión o no está autenticado");
      return;
    }
    
    console.log("❌ Rechazando pago:", { transaccionId, motivoRechazo });
    
    // Soportar tanto el formato antiguo (string) como el nuevo (objeto)
    const motivoData = typeof motivoRechazo === 'string' 
      ? { descripcionDetallada: motivoRechazo, categoria: 'otro' }
      : motivoRechazo;
    
    this.socket.emit("verificar-pago-cajero", {
      transaccionId,
      accion: "rechazar",
      motivoRechazo: motivoData,
      motivo: motivoData.descripcionDetallada, // Mantener compatibilidad
    });
  }

  /**
   * Referir transacción a administrador
   */
  referirAAdmin(transaccionId, descripcion) {
    if (!this.isConnected || !this.isAuthenticated) {
      console.error("No hay conexión o no está autenticado");
      return;
    }
    
    console.log("⚠️ Refiriendo a admin:", { transaccionId, descripcion });
    this.socket.emit("referir-a-admin", {
      transaccionId,
      descripcion,
    });
  }

  /**
   * Ajustar monto de depósito
   */
  ajustarMontoDeposito(transaccionId, montoReal, razon) {
    if (!this.isConnected || !this.isAuthenticated) {
      console.error("No hay conexión o no está autenticado");
      return;
    }
    
    console.log("💰 Ajustando monto:", { transaccionId, montoReal, razon });
    this.socket.emit("ajustar-monto-deposito", {
      transaccionId,
      montoReal,
      razon,
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

      // Después de conectar, re-autenticar y re-unirse a rooms
      setTimeout(() => {
        this.reauthenticateAndRejoinRooms();
      }, 1000);
    }, this.reconnectDelay);
  }

  /**
   * Re-autenticar y re-unirse a rooms después de reconexión
   */
  reauthenticateAndRejoinRooms() {
    if (!this.isConnected) {
      console.log("⚠️ No hay conexión para re-autenticación");
      return;
    }

    // Re-autenticar si tenemos token guardado
    if (this.lastAuthToken) {
      console.log("🔐 Re-autenticando después de reconexión...");
      this.authenticateCajero(this.lastAuthToken);

      // Re-unirse a rooms de transacciones activas
      setTimeout(() => {
        this.rejoinTransactionRooms();
      }, 500);
    }
  }

  /**
   * Re-unirse a rooms de transacciones activas
   */
  rejoinTransactionRooms() {
    if (this.activeTransactionRooms.size === 0) {
      console.log("📋 No hay rooms de transacciones activas para re-unirse");
      return;
    }

    console.log(
      `🔄 Re-uniéndose a ${this.activeTransactionRooms.size} rooms de transacciones...`
    );

    for (const transaccionId of this.activeTransactionRooms) {
      console.log(`📋 Re-uniéndose a room de transacción: ${transaccionId}`);
      this.socket.emit("unirse-room-transaccion", { transaccionId });
    }
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
