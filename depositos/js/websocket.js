/**
 * Módulo WebSocket para la app de depósitos
 * @version 0.9.0
 */

class DepositoWebSocket {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.isAuthenticated = false;
    this.isAuthenticating = false; // Flag para evitar múltiples autenticaciones simultáneas
    this.userData = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5; // Reducido para evitar spam de conexiones
    this.reconnectDelay = 2000; // Aumentado para dar tiempo entre reconexiones

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
      onMontoAjustado: null,
      onSessionReplaced: null, // Nuevo: cuando otra conexión reemplaza la sesión
      onError: null,
      // Nuevos callbacks para recuperación
      onTransactionRecovered: null,
      onReconnectionSuccessful: null,
      onParticipantDisconnected: null,
      onParticipantReconnected: null,
      // Callback para timeout
      onTransaccionCanceladaPorTimeout: null,
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
    // Si ya hay un socket conectado, no crear otro
    if (this.socket && this.isConnected) {
      console.log("🔗 [WebSocket] Ya hay una conexión activa, reutilizando...");
      return;
    }

    // Desconectar socket anterior si existe (importante para evitar conexiones duplicadas)
    if (this.socket) {
      console.log("🔄 [WebSocket] Cerrando conexión anterior antes de reconectar...");
      this.socket.disconnect();
      this.socket = null;
    }

    // Resetear flags de estado
    this.isConnected = false;
    this.isAuthenticated = false;
    this.isAuthenticating = false;

    // Detectar URL del servidor
    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    const socketUrl = isLocalhost
      ? "http://localhost:3001"
      : "https://elpatio-backend.fly.dev";

    console.log(`🔗 [WebSocket] Conectando a ${socketUrl}...`);

    // Importar Socket.IO dinámicamente
    if (typeof io === "undefined") {
      console.error("❌ [WebSocket] Socket.IO no está cargado");
      return;
    }

    // IMPORTANTE: No usar forceNew para permitir reutilización de conexiones
    this.socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      timeout: 30000,
      // forceNew: REMOVIDO - causaba múltiples conexiones
      reconnection: true,
      reconnectionAttempts: 5, // Reducido para evitar spam
      reconnectionDelay: 2000, // Aumentado para dar tiempo entre intentos
      reconnectionDelayMax: 10000,
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
        if (eventName === "transaction-state-recovered") {
          window.visualLogger.success(
            "🎯 EVENTO TRANSACTION-STATE-RECOVERED RECIBIDO"
          );
          if (args[0]) {
            window.visualLogger.debug("Estado", args[0].estado);
            window.visualLogger.debug("Cajero", args[0].cajero);
          }
        }
      }
    });

    this.socket.on("connect", () => {
      console.log(`✅ [WebSocket] Conectado al servidor (socket.id: ${this.socket.id})`);
      console.log("📡 Transport:", this.socket.io.engine.transport.name);
      this.isConnected = true;
      this.reconnectAttempts = 0; // Resetear intentos de reconexión

      // Re-autenticar automáticamente si tenemos datos guardados
      // IMPORTANTE: Verificar isAuthenticating para evitar múltiples auth simultáneas
      if (this.lastInitData && !this.isAuthenticated && !this.isAuthenticating) {
        console.log("🔐 [RECOVERY] Re-autenticando automáticamente...");
        this.reauthenticateAndRecover();
      }

      if (this.callbacks.onConnect) {
        this.callbacks.onConnect();
      }
    });

    this.socket.on("disconnect", (reason) => {
      console.log(`❌ [WebSocket] Desconectado: ${reason}`);
      this.isConnected = false;
      this.isAuthenticated = false;
      this.isAuthenticating = false; // Resetear flag de autenticación
      if (this.callbacks.onDisconnect) {
        this.callbacks.onDisconnect(reason);
      }
    });

    // Manejar reconexión automática de Socket.IO - ÚNICO mecanismo de reconexión
    this.socket.on("reconnect", (attemptNumber) => {
      console.log(`🔄 [WebSocket] Reconectado automáticamente (intento ${attemptNumber})`);
      this.isConnected = true;
      this.reconnectAttempts = 0;

      // Re-autenticar automáticamente (sin delay, el flag evita duplicados)
      if (!this.isAuthenticating) {
        this.reauthenticateAndRecover();
      }
    });

    this.socket.on("reconnect_attempt", (attemptNumber) => {
      console.log(`🔄 [WebSocket] Intento de reconexión automática ${attemptNumber}`);
    });

    this.socket.on("reconnect_error", (error) => {
      console.error("❌ [WebSocket] Error en reconexión automática:", error.message);
    });

    this.socket.on("reconnect_failed", () => {
      console.error("❌ [WebSocket] Falló la reconexión automática después de todos los intentos");
      // NO llamar a attemptReconnect() - dejar que Socket.IO maneje esto
    });

    this.socket.on("connect_error", (error) => {
      console.error("❌ [WebSocket] Error de conexión:", error.message);
      // NO llamar a attemptReconnect() - Socket.IO ya tiene su propio mecanismo
    });

    this.socket.on("auth-result", (result) => {
      console.log("🔐 Resultado de autenticación:", result);
      // Resetear flag de autenticación
      this.isAuthenticating = false;
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
    
    // Evento de sesión reemplazada (otra conexión tomó la sesión)
    this.socket.on("session-replaced", (data) => {
      console.log("⚠️ [SESSION] Sesión reemplazada por otra conexión:", data);
      
      // Marcar como no autenticado para evitar conflictos
      this.isAuthenticated = false;
      this.isAuthenticating = false;
      
      // Notificar a la UI si hay callback configurado
      if (this.callbacks.onSessionReplaced) {
        this.callbacks.onSessionReplaced(data);
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

    this.socket.on("transaccion-en-revision", (data) => {
      console.log("⏳ Transacción en revisión:", data);
      if (this.callbacks.onTransaccionEnRevision) {
        this.callbacks.onTransaccionEnRevision(data);
      }
    });

    this.socket.on("transaccion-cancelada-por-timeout", (data) => {
      if (window.visualLogger) {
        window.visualLogger.warning(
          `⏱️ Transacción cancelada por inactividad (${data.tiempoTranscurrido} minutos)`
        );
      }

      if (this.callbacks.onTransaccionCanceladaPorTimeout) {
        this.callbacks.onTransaccionCanceladaPorTimeout(data);
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

    this.socket.on("monto-ajustado", (data) => {
      console.log("💰 [WebSocket] Evento monto-ajustado recibido:", data);
      if (window.visualLogger) {
        window.visualLogger.info(
          "💰 [WebSocket] Evento monto-ajustado recibido:",
          data
        );
      }

      // Filtrar por target: solo procesar si es para jugador o no tiene target
      if (!data.target || data.target === "jugador") {
        if (this.callbacks.onMontoAjustado) {
          this.callbacks.onMontoAjustado(data);
        } else {
          console.warn(
            "⚠️ [WebSocket] Callback onMontoAjustado no está configurado"
          );
        }
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

    // Evento cuando la transacción ya finalizó
    this.socket.on("transaction-already-finished", (data) => {
      console.log(
        `ℹ️ [RECOVERY] Transacción ya finalizada (${data.estado}):`,
        data
      );

      if (window.visualLogger) {
        window.visualLogger.info(
          `ℹ️ Transacción ya finalizada: ${data.estado}`
        );
        window.visualLogger.info("No se recupera, limpiando estado local");
      }

      this.clearActiveTransaction();

      // Si está cancelada o rechazada, mostrar misma pantalla que timeout (persiste hasta que el usuario cierre)
      if (
        data.estado === "cancelada" ||
        data.estado === "rechazada"
      ) {
        if (this.callbacks.onTransaccionCanceladaPorTimeout) {
          this.callbacks.onTransaccionCanceladaPorTimeout({
            mensaje: data.mensaje || "La transacción ya ha finalizado.",
          });
        }
      } else if (window.UI && window.UI.showMainScreen) {
        window.UI.showMainScreen();
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
   * Solicitar revisión administrativa de una transacción rechazada
   */
  solicitarRevisionAdmin(transaccionId, motivo) {
    if (!this.isConnected || !this.isAuthenticated) {
      console.error("No hay conexión o no está autenticado");
      return;
    }

    console.log("📞 Solicitando revisión admin para transacción:", transaccionId);
    this.socket.emit("solicitar-revision-admin", {
      transaccionId,
      motivo: motivo || "El jugador solicita revisión del depósito rechazado",
    });
  }

  /**
   * Autenticar como jugador
   */
  authenticateJugador(telegramId, initData) {
    if (!this.isConnected) {
      console.error("❌ [WebSocket] No hay conexión WebSocket");
      return;
    }

    // Evitar múltiples autenticaciones simultáneas
    if (this.isAuthenticating) {
      console.log("⚠️ [WebSocket] Ya hay una autenticación en progreso, ignorando...");
      return;
    }

    // Si ya está autenticado con los mismos datos, no re-autenticar
    if (this.isAuthenticated && this.lastInitData?.telegramId === telegramId) {
      console.log("✅ [WebSocket] Ya autenticado, saltando re-autenticación...");
      return;
    }

    // Guardar datos para posible reconexión
    this.lastInitData = { telegramId, initData };
    this.isAuthenticating = true;

    console.log("🔐 [WebSocket] Autenticando jugador:", telegramId);
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

    if (window.visualLogger) {
      window.visualLogger.info(
        `📋 [RECOVERY] Limpiando transacción activa: ${this.activeTransactionId}`
      );
    }

    this.activeTransactionId = null;

    // También limpiar de TransactionManager si existe
    if (window.TransactionManager) {
      window.TransactionManager.setCurrentTransaction(null);
    }
  }

  /**
   * Re-autenticar y recuperar después de reconexión
   */
  reauthenticateAndRecover() {
    if (!this.isConnected) {
      console.log("⚠️ [RECOVERY] No hay conexión para re-autenticación");
      return;
    }

    // Evitar múltiples re-autenticaciones simultáneas
    if (this.isAuthenticating) {
      console.log("⚠️ [RECOVERY] Ya hay una autenticación en progreso");
      return;
    }

    // Si ya está autenticado, solo re-unirse a rooms
    if (this.isAuthenticated) {
      console.log("✅ [RECOVERY] Ya autenticado, re-uniéndose a rooms...");
      if (this.activeTransactionId) {
        this.rejoinTransactionRoom();
      }
      return;
    }

    if (!this.lastInitData) {
      console.log("⚠️ [RECOVERY] No hay datos guardados para re-autenticación");
      return;
    }

    console.log("🔐 [RECOVERY] Re-autenticando después de reconexión...");
    const { telegramId, initData } = this.lastInitData;
    this.authenticateJugador(telegramId, initData);

    // Si hay transacción activa, intentar re-unirse al room después de autenticar
    if (this.activeTransactionId) {
      setTimeout(() => {
        this.rejoinTransactionRoom();
      }, 500);
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
   * NOTA: Este método ahora solo se usa como fallback.
   * Socket.IO maneja la reconexión automáticamente.
   */
  attemptReconnect() {
    // Si ya está conectado o Socket.IO está manejando la reconexión, no hacer nada
    if (this.isConnected || (this.socket && this.socket.connected)) {
      console.log("⚠️ [WebSocket] Ya hay una conexión activa o en progreso");
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("❌ [WebSocket] Máximo número de intentos de reconexión alcanzado");
      return;
    }

    this.reconnectAttempts++;
    console.log(
      `🔄 [WebSocket] Intento de reconexión manual ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`
    );

    // Solo reconectar si no hay socket o está completamente desconectado
    if (!this.socket) {
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay);
    }
  }

  /**
   * Desconectar
   */
  disconnect() {
    if (this.socket) {
      console.log("🔌 [WebSocket] Desconectando...");
      this.socket.disconnect();
      this.socket = null;
    }
    // Resetear todos los estados
    this.isConnected = false;
    this.isAuthenticated = false;
    this.isAuthenticating = false;
    this.userData = null;
    this.reconnectAttempts = 0;
    // NO limpiar lastInitData para poder reconectar más tarde si es necesario
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
