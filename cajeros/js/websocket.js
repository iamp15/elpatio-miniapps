/**
 * Módulo WebSocket para la app de cajeros
 * @version 0.9.0
 */

class CajeroWebSocket {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.isAuthenticated = false;
    this.isAuthenticating = false; // Flag para evitar múltiples autenticaciones simultáneas
    this.userData = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5; // Reducido para evitar spam de conexiones
    this.reconnectDelay = 2000; // Aumentado para dar tiempo entre reconexiones
    this.activeTransactionRooms = new Set(); // Track active transaction rooms
    this.lastAuthToken = null; // Store token for re-authentication
    this.processingTransactions = new Set(); // Track transactions being processed to prevent double submission
    this.completedTransactions = new Set(); // Track completed transactions to prevent re-submission
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
      onMontoAjustado: null,
      onSessionReplaced: null, // Nuevo: cuando otra conexión reemplaza la sesión
      onError: null,
    };
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
    console.log("🔧 [WebSocket] Configurando event handlers...");
    
    this.socket.on("connect", () => {
      console.log(`✅ [WebSocket] Conectado al servidor (socket.id: ${this.socket.id})`);
      this.isConnected = true;
      this.reconnectAttempts = 0; // Resetear intentos de reconexión

      // Re-autenticar automáticamente si tenemos token guardado
      // IMPORTANTE: Verificar isAuthenticating para evitar múltiples auth simultáneas
      if (this.lastAuthToken && !this.isAuthenticated && !this.isAuthenticating) {
        console.log("🔐 [RECOVERY] Re-autenticando cajero automáticamente...");
        this.reauthenticateAndRejoinRooms();
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

    // Reconexión automática de Socket.IO - ÚNICO mecanismo de reconexión
    this.socket.on("reconnect", (attemptNumber) => {
      console.log(`🔄 [WebSocket] Reconectado automáticamente (intento ${attemptNumber})`);
      this.isConnected = true;
      this.reconnectAttempts = 0;

      // Re-autenticar y re-unirse a rooms (sin delay, el flag evita duplicados)
      if (!this.isAuthenticating) {
        this.reauthenticateAndRejoinRooms();
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
      // El usuario puede refrescar la página si necesita reconectar
    });

    this.socket.on("connect_error", (error) => {
      console.error("❌ [WebSocket] Error de conexión:", error.message);
      // NO llamar a attemptReconnect() - Socket.IO ya tiene su propio mecanismo
      // Esto evita crear múltiples conexiones en paralelo
    });

    this.socket.on("auth-result", (result) => {
      // Resetear flag de autenticación
      this.isAuthenticating = false;
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
      if (data.target === "cajero") {
        // Limpiar estado de procesamiento cuando se completa
        if (data.transaccionId) {
          this.clearProcessingTransaction(data.transaccionId);
          // Marcar como completada para prevenir re-envíos
          this.completedTransactions.add(data.transaccionId);
          // Limpiar después de 5 minutos para evitar acumulación de memoria
          setTimeout(() => {
            this.completedTransactions.delete(data.transaccionId);
          }, 5 * 60 * 1000);
        }
        if (this.callbacks.onDepositoCompletado) {
          this.callbacks.onDepositoCompletado(data);
        }
      }
    });

    this.socket.on("deposito-rechazado", (data) => {
      // Filtrar por target: solo procesar si es para cajero
      if (data.target === "cajero") {
        // Limpiar estado de procesamiento cuando se rechaza
        if (data.transaccionId) {
          this.clearProcessingTransaction(data.transaccionId);
          // También marcar como completada (rechazada) para prevenir re-envíos
          this.completedTransactions.add(data.transaccionId);
          setTimeout(() => {
            this.completedTransactions.delete(data.transaccionId);
          }, 5 * 60 * 1000);
        }
        if (this.callbacks.onDepositoRechazado) {
          this.callbacks.onDepositoRechazado(data);
        }
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
      // Limpiar estado de procesamiento en caso de error
      // Si el error tiene transaccionId, limpiar solo esa transacción
      // Si no, limpiar todas (por seguridad en caso de error de conexión)
      if (error.transaccionId) {
        this.clearProcessingTransaction(error.transaccionId);
      } else {
        // En caso de error general, limpiar todas las transacciones en proceso
        this.processingTransactions.clear();
      }
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

    // Evento de monto ajustado
    this.socket.on("monto-ajustado", (data) => {
      console.log("💰 [WebSocket] Evento monto-ajustado recibido:", data);
      console.log("💰 [WebSocket] Callback onMontoAjustado existe:", !!this.callbacks.onMontoAjustado);
      console.log("💰 [WebSocket] Socket conectado:", this.isConnected);
      console.log("💰 [WebSocket] Socket autenticado:", this.isAuthenticated);
      if (this.callbacks.onMontoAjustado) {
        console.log("💰 [WebSocket] Ejecutando callback onMontoAjustado");
        this.callbacks.onMontoAjustado(data);
      } else {
        console.warn(
          "⚠️ [WebSocket] Callback onMontoAjustado no está configurado"
        );
      }
    });
    
    // Log para confirmar que el listener está configurado
    console.log("✅ [WebSocket] Listener 'monto-ajustado' configurado");

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
      
      // NO intentar reconectar automáticamente - la nueva sesión tiene prioridad
      // El usuario debe refrescar la página si quiere volver a conectar
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
      } else if (data.tipo === "cajero") {
        // Ignorar eventos sobre cajeros (no deberían recibirse después del fix del backend)
        console.log(
          `⚠️ [RECOVERY] Ignorando evento de desconexión de cajero (no debería recibirse)`
        );
      }
    });

    this.socket.on("participant-reconnected", (data) => {
      console.log("✅ [RECOVERY] Participante reconectado:", data);
      if (data.tipo === "jugador") {
        console.log(
          `✅ Jugador reconectado en transacción ${data.transaccionId}`
        );
        // El cajero puede ocultar el indicador de desconexión
      } else if (data.tipo === "cajero") {
        // Ignorar eventos sobre cajeros (no deberían recibirse después del fix del backend)
        console.log(
          `⚠️ [RECOVERY] Ignorando evento de reconexión de cajero (no debería recibirse)`
        );
      }
    });

    this.socket.on("participant-disconnected-timeout", (data) => {
      console.log("❌ [RECOVERY] Participante no pudo reconectar:", data);
      if (data.tipo === "jugador") {
        console.log(
          `❌ Jugador no reconectó en transacción ${data.transaccionId}`
        );
        // El cajero debe verificar el estado de la transacción manualmente
      } else if (data.tipo === "cajero") {
        // Ignorar eventos sobre cajeros (no deberían recibirse después del fix del backend)
        // Si se recibe, podría ser un timer que expiró antes de la reconexión exitosa
        console.log(
          `⚠️ [RECOVERY] Ignorando evento de timeout de cajero (posible condición de carrera ya resuelta)`
        );
      }
    });
  }

  /**
   * Autenticar como cajero
   */
  authenticateCajero(token) {
    if (!this.isConnected) {
      console.error("❌ [WebSocket] No hay conexión WebSocket");
      return;
    }

    // Evitar múltiples autenticaciones simultáneas
    if (this.isAuthenticating) {
      console.log("⚠️ [WebSocket] Ya hay una autenticación en progreso, ignorando...");
      return;
    }

    // Si ya está autenticado con el mismo token, no re-autenticar
    if (this.isAuthenticated && this.lastAuthToken === token) {
      console.log("✅ [WebSocket] Ya autenticado, saltando re-autenticación...");
      return;
    }

    // Guardar token para reconexión
    this.lastAuthToken = token;
    this.isAuthenticating = true;

    console.log("🔐 [WebSocket] Autenticando cajero...");
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
    // PROTECCIÓN 1: Verificar si ya se está procesando esta transacción
    if (this.processingTransactions.has(transaccionId)) {
      console.warn(
        `⚠️ [WebSocket] BLOQUEADO: Transacción ${transaccionId} ya está siendo procesada`
      );
      return false;
    }

    // PROTECCIÓN 2: Verificar si ya se completó esta transacción
    if (this.completedTransactions && this.completedTransactions.has(transaccionId)) {
      console.warn(
        `⚠️ [WebSocket] BLOQUEADO: Transacción ${transaccionId} ya fue completada`
      );
      return false;
    }

    // PROTECCIÓN 3: Verificar conexión
    if (!this.isConnected || !this.isAuthenticated) {
      console.error("❌ [WebSocket] No hay conexión o no está autenticado");
      return false;
    }

    // Marcar como procesando ANTES de enviar
    this.processingTransactions.add(transaccionId);

    // Generar ID único para este intento de envío
    const requestId = `${transaccionId}-${Date.now()}`;

    console.log("✅ [WebSocket] Enviando evento verificar-pago-cajero:", {
      transaccionId,
      accion: "confirmar",
      notas,
      requestId,
    });

    // Usar volatile.emit para evitar reintentos automáticos de Socket.IO
    // Esto previene que Socket.IO reenvíe el evento si no recibe ACK
    this.socket.volatile.emit("verificar-pago-cajero", {
      transaccionId,
      accion: "confirmar",
      notas,
      requestId, // ID único para rastrear duplicados en el backend
    });

    return true;
  }

  /**
   * Limpiar estado de procesamiento de una transacción
   */
  clearProcessingTransaction(transaccionId) {
    this.processingTransactions.delete(transaccionId);
  }

  /**
   * Rechazar pago (verificación de pago) con estructura simplificada
   */
  rechazarPagoCajero(transaccionId, motivoRechazo) {
    if (!this.isConnected || !this.isAuthenticated) {
      console.error("No hay conexión o no está autenticado");
      return;
    }
    
    console.log("❌ Rechazando pago:", { transaccionId, motivoRechazo });
    
    // Estructura simplificada: solo descripcionDetallada e imagenRechazoUrl
    const motivoData = typeof motivoRechazo === 'string' 
      ? { descripcionDetallada: motivoRechazo }
      : motivoRechazo;
    
    this.socket.emit("verificar-pago-cajero", {
      transaccionId,
      accion: "rechazar",
      motivoRechazo: motivoData,
      motivo: motivoData.descripcionDetallada, // Mantener para compatibilidad con backend
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
   * Re-autenticar y re-unirse a rooms después de reconexión
   */
  reauthenticateAndRejoinRooms() {
    if (!this.isConnected) {
      console.log("⚠️ [WebSocket] No hay conexión para re-autenticación");
      return;
    }

    // Evitar múltiples re-autenticaciones simultáneas
    if (this.isAuthenticating) {
      console.log("⚠️ [WebSocket] Ya hay una autenticación en progreso");
      return;
    }

    // Si ya está autenticado, solo re-unirse a rooms
    if (this.isAuthenticated) {
      console.log("✅ [WebSocket] Ya autenticado, re-uniéndose a rooms...");
      this.rejoinTransactionRooms();
      return;
    }

    // Re-autenticar si tenemos token guardado
    if (this.lastAuthToken) {
      console.log("🔐 [WebSocket] Re-autenticando después de reconexión...");
      this.authenticateCajero(this.lastAuthToken);

      // Re-unirse a rooms de transacciones activas después de autenticar
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
    // NO limpiar lastAuthToken para poder reconectar más tarde si es necesario
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
