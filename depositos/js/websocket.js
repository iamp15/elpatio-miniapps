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
    this.maxReconnectAttempts = 10; // Más intentos
    this.reconnectDelay = 1000; // Menos delay

    // Sistema de recuperación de transacciones
    this.activeTransactionId = null; // Transacción activa actual
    this.lastInitData = null; // Datos de autenticación para reconexión

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
      // Nuevos callbacks para recuperación
      onTransactionRecovered: null,
      onReconnectionSuccessful: null,
      onParticipantDisconnected: null,
      onParticipantReconnected: null,
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
    // Log para todos los eventos que llegan
    this.socket.onAny((eventName, ...args) => {
      console.log(`🔍 [WebSocket] Evento recibido: ${eventName}`, args);
      
      // También mostrar en el panel visual
      if (window.visualLogger) {
        window.visualLogger.websocket(`📡 Evento: ${eventName}`);
        
        // Si es el evento de recuperación, mostrar detalles importantes
        if (eventName === 'transaction-state-recovered') {
          window.visualLogger.success('🎯 EVENTO TRANSACTION-STATE-RECOVERED RECIBIDO');
          if (args[0]) {
            window.visualLogger.debug('Estado', args[0].estado);
            window.visualLogger.debug('Cajero', args[0].cajero);
          }
        }
      }
    });

    this.socket.on("connect", () => {
      console.log("✅ Conectado al servidor WebSocket");
      console.log("📡 Socket ID:", this.socket.id);
      console.log("📡 Transport:", this.socket.io.engine.transport.name);
      this.isConnected = true;
      this.reconnectAttempts = 0; // Resetear intentos de reconexión

      // Re-autenticar automáticamente si tenemos datos guardados
      // Esto maneja tanto la conexión inicial como las reconexiones
      if (this.lastInitData && !this.isAuthenticated) {
        console.log("🔐 [RECOVERY] Re-autenticando automáticamente...");
        setTimeout(() => {
          this.reauthenticateAndRecover();
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

    // Manejar reconexión automática de Socket.IO
    this.socket.on("reconnect", (attemptNumber) => {
      console.log(`🔄 Reconectado automáticamente (intento ${attemptNumber})`);
      this.isConnected = true;
      this.reconnectAttempts = 0;

      // Re-autenticar automáticamente
      setTimeout(() => {
        this.reauthenticateAndRecover();
      }, 500);
    });

    this.socket.on("reconnect_attempt", (attemptNumber) => {
      console.log(`🔄 Intento de reconexión automática ${attemptNumber}`);
    });

    this.socket.on("reconnect_error", (error) => {
      console.error("❌ Error en reconexión automática:", error);
    });

    this.socket.on("reconnect_failed", () => {
      console.error("❌ Falló la reconexión automática");
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

      if (result.success) {
        console.log(
          "✅ [AUTH] Autenticación exitosa para:",
          result.user?.nombre
        );

        // Si hay información de recuperación, procesarla
        if (result.recovery && result.recovery.transactionsRecovered) {
          console.log(
            `🔄 [RECOVERY] ${result.recovery.transactionsRecovered.length} transacciones recuperadas automáticamente`
          );
        }
      } else {
        console.error("❌ [AUTH] Autenticación fallida:", result.message);
      }

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
      console.log(
        "🎉 [WebSocket] this.callbacks.onDepositoCompletado:",
        this.callbacks.onDepositoCompletado
      );

      // Logs visuales
      if (window.visualLogger) {
        window.visualLogger.info(
          "🎉 [WebSocket] Evento deposito-completado recibido:",
          data
        );
        window.visualLogger.info("🎉 [WebSocket] data.target:", data.target);
        window.visualLogger.info(
          "🎉 [WebSocket] Callback configurado:",
          !!this.callbacks.onDepositoCompletado
        );
      }

      // Filtrar por target: solo procesar si es para jugador
      if (data.target === "jugador") {
        console.log(
          "🎉 [WebSocket] Target es jugador, verificando callback..."
        );
        if (window.visualLogger) {
          window.visualLogger.info(
            "🎉 [WebSocket] Target es jugador, verificando callback..."
          );
        }

        if (this.callbacks.onDepositoCompletado) {
          console.log(
            "🎉 [WebSocket] Ejecutando callback onDepositoCompletado"
          );
          if (window.visualLogger) {
            window.visualLogger.success(
              "🎉 [WebSocket] Ejecutando callback onDepositoCompletado"
            );
          }
          this.callbacks.onDepositoCompletado(data);
        } else {
          console.error(
            "❌ [WebSocket] Callback onDepositoCompletado no está configurado"
          );
          if (window.visualLogger) {
            window.visualLogger.error(
              "❌ [WebSocket] Callback onDepositoCompletado no está configurado"
            );
          }
        }
      } else {
        console.log("🎉 [WebSocket] Target no es jugador, ignorando evento");
        if (window.visualLogger) {
          window.visualLogger.warn(
            "🎉 [WebSocket] Target no es jugador, ignorando evento"
          );
        }
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

    // Nuevos eventos de recuperación
    this.socket.on("transaction-state-recovered", (data) => {
      console.log("✅ [RECOVERY] Estado de transacción recuperado:", data);

      if (window.visualLogger) {
        window.visualLogger.success("✅ [RECOVERY] Evento recibido");
        window.visualLogger.debug("TransaccionId", data.transaccionId);
        window.visualLogger.debug("Estado", data.estado);
        window.visualLogger.debug("Monto", data.monto);
        window.visualLogger.debug("Cajero existe", !!data.cajero);
        if (data.cajero) {
          window.visualLogger.debug("Cajero nombre", data.cajero.nombre);
          window.visualLogger.debug("Cajero datosPago", data.cajero.datosPago);
        }
        window.visualLogger.debug(
          "Callback configurado",
          !!this.callbacks.onTransactionRecovered
        );
      }

      if (this.callbacks.onTransactionRecovered) {
        console.log("✅ [RECOVERY] Ejecutando callback onTransactionRecovered");
        if (window.visualLogger) {
          window.visualLogger.info("✅ Ejecutando callback de recuperación");
        }
        this.callbacks.onTransactionRecovered(data);
      } else {
        console.error(
          "❌ [RECOVERY] Callback onTransactionRecovered NO está configurado"
        );
        if (window.visualLogger) {
          window.visualLogger.error("❌ Callback NO configurado");
        }
      }
    });

    this.socket.on("reconnection-successful", (data) => {
      console.log("✅ [RECOVERY] Reconexión exitosa:", data);
      if (window.visualLogger) {
        window.visualLogger.success(
          `Reconexión exitosa. ${
            data.transaccionesRecuperadas?.length || 0
          } transacciones recuperadas`
        );
      }
      if (this.callbacks.onReconnectionSuccessful) {
        this.callbacks.onReconnectionSuccessful(data);
      }
    });

    this.socket.on("participant-disconnected", (data) => {
      console.log("⚠️ [RECOVERY] Participante desconectado:", data);
      if (data.tipo === "cajero" && window.visualLogger) {
        window.visualLogger.warn("El cajero se desconectó temporalmente...");
      }
      if (this.callbacks.onParticipantDisconnected) {
        this.callbacks.onParticipantDisconnected(data);
      }
    });

    this.socket.on("participant-reconnected", (data) => {
      console.log("✅ [RECOVERY] Participante reconectado:", data);
      if (data.tipo === "cajero" && window.visualLogger) {
        window.visualLogger.success("El cajero se reconectó");
      }
      if (this.callbacks.onParticipantReconnected) {
        this.callbacks.onParticipantReconnected(data);
      }
    });

    this.socket.on("participant-disconnected-timeout", (data) => {
      console.log("❌ [RECOVERY] Participante no pudo reconectar:", data);
      if (data.tipo === "cajero" && window.visualLogger) {
        window.visualLogger.error(
          "El cajero no pudo reconectar. La transacción necesita verificación manual"
        );
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

    // Guardar datos para posible reconexión
    this.lastInitData = { telegramId, initData };

    console.log("🔐 Autenticando jugador:", telegramId);
    this.socket.emit("auth-jugador", {
      telegramId,
      initData,
    });
  }

  /**
   * Establecer transacción activa (para tracking de recuperación)
   */
  setActiveTransaction(transaccionId) {
    this.activeTransactionId = transaccionId;
    console.log(
      `📋 [RECOVERY] Transacción activa establecida: ${transaccionId}`
    );
  }

  /**
   * Limpiar transacción activa
   */
  clearActiveTransaction() {
    console.log(
      `📋 [RECOVERY] Limpiando transacción activa: ${this.activeTransactionId}`
    );
    this.activeTransactionId = null;
  }

  /**
   * Re-autenticar y recuperar después de reconexión
   */
  reauthenticateAndRecover() {
    if (!this.isConnected) {
      console.log("⚠️ [RECOVERY] No hay conexión para re-autenticación");
      return;
    }

    if (!this.lastInitData) {
      console.log("⚠️ [RECOVERY] No hay datos guardados para re-autenticación");
      return;
    }

    console.log("🔐 [RECOVERY] Re-autenticando después de reconexión...");
    const { telegramId, initData } = this.lastInitData;
    this.authenticateJugador(telegramId, initData);

    // Si hay transacción activa, intentar re-unirse al room
    if (this.activeTransactionId) {
      setTimeout(() => {
        this.rejoinTransactionRoom();
      }, 1000);
    }
  }

  /**
   * Re-unirse a room de transacción
   */
  rejoinTransactionRoom() {
    if (!this.activeTransactionId) {
      console.log("📋 [RECOVERY] No hay transacción activa para re-unirse");
      return;
    }

    if (!this.isConnected || !this.isAuthenticated) {
      console.log(
        "⚠️ [RECOVERY] No conectado/autenticado para re-unirse a room"
      );
      return;
    }

    console.log(
      `🔄 [RECOVERY] Re-uniéndose a room de transacción: ${this.activeTransactionId}`
    );
    this.socket.emit("unirse-room-transaccion", {
      transaccionId: this.activeTransactionId,
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
