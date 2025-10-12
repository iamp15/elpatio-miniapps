/**
 * Aplicacion principal de depositos - Version modular
 */

import { TelegramAuth } from "./js/auth.js";
import { UI } from "./js/ui.js";
import { TransactionManager } from "./js/transactions.js";
import { API } from "./js/api.js";
import { MESSAGES, APP_STATES, TRANSACTION_CONFIG } from "./js/config.js";

class DepositApp {
  constructor() {
    this.isInitialized = false;
    this.userData = null;
    this.currentBalance = 0;
  }

  /**
   * Inicializar la aplicacion
   */
  async init() {
    if (this.isInitialized) return;

    try {
      window.visualLogger.info("🚀 Iniciando aplicación de depósitos...");

      // Configurar WebSocket
      this.setupWebSocket();

      // Configurar callbacks de autenticacion
      TelegramAuth.setCallbacks({
        onUserDataLoaded: this.handleUserDataLoaded.bind(this),
        onError: this.handleAuthError.bind(this),
      });

      // Configurar callbacks de transacciones
      TransactionManager.setCallbacks({
        onTransactionCreated: this.handleTransactionCreated.bind(this),
        onTransactionUpdated: this.handleTransactionUpdated.bind(this),
        onTransactionCompleted: this.handleTransactionCompleted.bind(this),
        onTransactionError: this.handleTransactionError.bind(this),
        onTransactionTimeout: this.handleTransactionTimeout.bind(this),
      });

      // Configurar event listeners de la UI
      UI.setupEventListeners({
        onDepositSubmit: this.handleDepositSubmit.bind(this),
        onPaymentConfirmationSubmit:
          this.handlePaymentConfirmationSubmit.bind(this),
        onPaymentDone: this.handlePaymentDone.bind(this),
        onBackToBank: this.handleBackToBank.bind(this),
        onCloseApp: this.handleCloseApp.bind(this),
        onRetry: this.handleRetry.bind(this),
        onCloseError: this.handleCloseError.bind(this),
        onAmountChange: this.handleAmountChange.bind(this),
        onCancelTransaction: this.handleCancelTransaction.bind(this),
      });

      // Hacer disponibles las instancias globalmente para uso en HTML
      window.transactionManager = TransactionManager;
      window.depositApp = this;

      // Inicializar autenticacion de Telegram con timeout
      await this.initWithTimeout();

      this.isInitialized = true;
      window.visualLogger.success(
        "✅ Aplicación de depósitos inicializada correctamente"
      );
    } catch (error) {
      window.visualLogger.error(
        `Error inicializando la aplicación: ${error.message}`
      );
      UI.showErrorScreen(
        "Error de Inicializacion",
        "No se pudo inicializar la aplicacion. Por favor, recarga la pagina."
      );
    }
  }

  /**
   * Configurar WebSocket
   */
  setupWebSocket() {
    // Configurar callbacks del WebSocket client
    window.depositoWebSocket.setCallbacks({
      onDepositoCompletado: this.handleDepositoCompletado.bind(this),
      onPagoConfirmado: this.handlePagoConfirmado.bind(this),
      onSolicitudAceptada: this.handleSolicitudAceptada.bind(this),
      onSolicitudCreada: this.handleSolicitudCreada.bind(this),
      onError: this.handleWebSocketError.bind(this),
      // Callbacks de recuperación
      onTransactionRecovered: this.handleTransactionRecovered.bind(this),
      onReconnectionSuccessful: this.handleReconnectionSuccessful.bind(this),
      onParticipantDisconnected: this.handleParticipantDisconnected.bind(this),
      onParticipantReconnected: this.handleParticipantReconnected.bind(this),
    });

    // Configurar callbacks de WebSocket
    window.depositoWebSocket.on("onConnect", () => {
      window.visualLogger.websocket("✅ WebSocket conectado");
    });

    window.depositoWebSocket.on("onDisconnect", (reason) => {
      window.visualLogger.websocket(`❌ WebSocket desconectado: ${reason}`);
    });

    // Agregar callback para errores de conexión
    window.depositoWebSocket.socket?.on("connect_error", (error) => {
      window.visualLogger.error(
        `❌ Error de conexión WebSocket: ${error.message}`
      );
    });

    window.depositoWebSocket.on("onAuthResult", (result) => {
      if (result.success) {
        window.visualLogger.success(
          `🔐 Autenticación WebSocket exitosa: ${result.user.nombre}`
        );
      } else {
        window.visualLogger.error(
          `🔐 Error de autenticación WebSocket: ${result.message}`
        );
      }
    });

    // Los callbacks ya están configurados arriba con setCallbacks()

    // Conectar WebSocket
    window.visualLogger.info("🔌 Iniciando conexión WebSocket...");
    window.depositoWebSocket.connect();
  }

  /**
   * Inicializar Telegram Web App
   */
  async initWithTimeout() {
    try {
      await TelegramAuth.init();
    } catch (error) {
      console.error("Error inicializando Telegram Web App:", error);
      throw error;
    }
  }

  /**
   * Manejar datos de usuario cargados
   */
  async handleUserDataLoaded(userData) {
    try {
      this.userData = userData;
      console.log("Datos de usuario cargados:", userData);

      // Autenticar con WebSocket
      this.authenticateWithWebSocket(userData);

      // Cargar saldo del usuario
      await this.loadUserBalance();

      // Mostrar pantalla principal
      UI.showMainScreen();
    } catch (error) {
      console.error("Error cargando datos del usuario:", error);
      UI.showErrorScreen(
        "Error de Usuario",
        "No se pudieron cargar los datos del usuario"
      );
    }
  }

  /**
   * Autenticar con WebSocket
   */
  authenticateWithWebSocket(userData) {
    if (window.depositoWebSocket.isConnected) {
      const telegramId = userData.id.toString();
      const initData = TelegramAuth.getInitData();

      window.visualLogger.info(`🔐 Autenticando con WebSocket: ${telegramId}`);
      window.depositoWebSocket.authenticateJugador(telegramId, initData);
    } else {
      window.visualLogger.warning(
        "WebSocket no conectado, reintentando en 2 segundos..."
      );
      setTimeout(() => {
        this.authenticateWithWebSocket(userData);
      }, 2000);
    }
  }

  /**
   * Manejar solicitud aceptada via WebSocket
   */
  handleSolicitudAceptada(data) {
    try {
      window.visualLogger.success(
        "✅ Solicitud aceptada, mostrando datos bancarios"
      );

      // Actualizar transacción actual con datos del cajero
      if (this.currentTransaction) {
        this.currentTransaction.cajero = data.cajero;
        this.currentTransaction.estado = "en_proceso";

        // Actualizar en TransactionManager también
        TransactionManager.setCurrentTransaction(this.currentTransaction);
      }

      // Actualizar datos bancarios en la UI
      UI.updateBankInfo({
        banco: data.cajero.datosPago.banco,
        telefono: data.cajero.datosPago.telefono,
        cedula: `${data.cajero.datosPago.cedula.prefijo}-${data.cajero.datosPago.cedula.numero}`,
        monto: data.monto,
      });

      // Mostrar pantalla de datos bancarios
      UI.showBankInfoScreen();
    } catch (error) {
      window.visualLogger.error(
        `Error manejando solicitud aceptada: ${error.message}`
      );
    }
  }

  /**
   * Manejar solicitud creada via WebSocket
   */
  handleSolicitudCreada(data) {
    try {
      // Establecer transacción activa para sistema de recuperación
      window.depositoWebSocket.setActiveTransaction(data.transaccionId);

      window.visualLogger.transaction(
        `📋 Solicitud creada: ${data.transaccionId}`
      );

      // Guardar la transacción actual
      this.currentTransaction = {
        _id: data.transaccionId,
        referencia: data.referencia,
        monto: data.monto,
        estado: data.estado,
      };

      // También guardar en TransactionManager para métodos que lo usen
      TransactionManager.setCurrentTransaction(this.currentTransaction);

      // Actualizar UI con información de la transacción
      UI.updateWaitingTransaction(this.currentTransaction);

      // Mostrar pantalla de espera
      UI.showWaitingScreen();
    } catch (error) {
      window.visualLogger.error(
        `Error manejando solicitud creada: ${error.message}`
      );
    }
  }

  /**
   * Manejar pago confirmado via WebSocket
   */
  handlePagoConfirmado(data) {
    try {
      window.visualLogger.success(
        "💳 Pago confirmado, esperando verificación del cajero"
      );

      // Usar los datos del pago guardados
      if (this.paymentData) {
        // Actualizar información de pago registrado
        UI.updateRegisteredInfo(this.paymentData);
      } else if (this.currentTransaction) {
        // Fallback: usar la transacción actual
        const paymentData = {
          monto: this.currentTransaction.monto,
          infoPago: {
            fechaPago: new Date(),
            numeroReferencia: "-",
          },
        };
        UI.updateRegisteredInfo(paymentData);
      }

      // Mostrar pantalla de pago registrado
      UI.showPaymentRegisteredScreen();
    } catch (error) {
      window.visualLogger.error(
        `Error manejando pago confirmado: ${error.message}`
      );
    }
  }

  /**
   * Manejar depósito completado via WebSocket
   */
  handleDepositoCompletado(data) {
    try {
      // Limpiar transacción activa (ya completada)
      window.depositoWebSocket.clearActiveTransaction();

      window.visualLogger.success("🎉 [APP] handleDepositoCompletado llamado");
      window.visualLogger.info("🎉 [APP] Datos recibidos:", data);

      // Actualizar saldo
      window.visualLogger.info("🎉 [APP] Actualizando saldo del usuario...");
      this.loadUserBalance();

      // Mostrar confirmación final
      window.visualLogger.info(
        "🎉 [APP] Actualizando información final y mostrando pantalla..."
      );
      UI.updateFinalInfo(data);
      UI.showConfirmationScreen();

      window.visualLogger.success(
        "🎉 [APP] Depósito completado procesado exitosamente"
      );
    } catch (error) {
      window.visualLogger.error(
        `❌ [APP] Error manejando depósito completado: ${error.message}`
      );
      console.error("❌ [APP] Stack trace:", error);
    }
  }

  /**
   * Manejar errores de WebSocket
   */
  handleWebSocketError(error) {
    window.visualLogger.error(`❌ Error WebSocket: ${error.message || error}`);
  }

  /**
   * Manejar error de autenticacion
   */
  handleAuthError(error) {
    console.error("Error de autenticacion:", error);
    UI.showErrorScreen("Error de Autenticacion", error.message);
  }

  /**
   * Cargar saldo del usuario
   */
  async loadUserBalance() {
    try {
      const telegramId = TelegramAuth.getTelegramId();
      const response = await API.getJugadorSaldo(telegramId);

      if (response.ok) {
        const data = await response.json();
        this.currentBalance = data.saldo || 0;
        UI.updateBalance(this.currentBalance);
        window.visualLogger.info(`💰 Saldo cargado: ${this.currentBalance} Bs`);
      } else {
        window.visualLogger.warning(
          "No se pudo cargar el saldo, usando valor por defecto"
        );
        this.currentBalance = 0;
        UI.updateBalance(this.currentBalance);
      }
    } catch (error) {
      window.visualLogger.error(`Error cargando saldo: ${error.message}`);
      this.currentBalance = 0;
      UI.updateBalance(this.currentBalance);
    }
  }

  /**
   * Manejar envio del formulario de deposito
   */
  async handleDepositSubmit(e) {
    e.preventDefault();

    try {
      const formData = UI.getDepositFormData();
      const validation = UI.validateDepositForm(formData);

      if (!validation.valid) {
        UI.showErrorScreen("Error de Validacion", validation.message);
        return;
      }

      // Verificar si WebSocket está conectado y autenticado
      if (
        !window.depositoWebSocket.isConnected ||
        !window.depositoWebSocket.isAuthenticated
      ) {
        window.visualLogger.error("❌ WebSocket no conectado o no autenticado");
        window.visualLogger.info("🔄 Intentando reconectar...");

        // Intentar reconectar
        window.depositoWebSocket.connect();

        UI.showErrorScreen(
          "Error de Conexión",
          "No hay conexión WebSocket activa. Intentando reconectar..."
        );
        return;
      }

      // Crear solicitud de depósito via WebSocket
      const depositoData = {
        monto: TransactionManager.convertToCents(formData.amount),
        descripcion: `Depósito de ${formData.amount} Bs`,
        metodoPago: "pago_movil",
      };

      window.visualLogger.transaction(
        `💰 Enviando solicitud de depósito via WebSocket: ${depositoData.monto} centavos`
      );
      window.depositoWebSocket.solicitarDeposito(depositoData);

      // Mostrar pantalla de espera
      UI.showWaitingScreen();
    } catch (error) {
      console.error("Error creando solicitud de deposito:", error);
      UI.showErrorScreen("Error de Deposito", error.message);
    }
  }

  /**
   * Manejar transaccion creada
   */
  async handleTransactionCreated(transaction) {
    try {
      // Actualizar UI con informacion de la transaccion
      UI.updateWaitingTransaction(transaction);

      // Mostrar pantalla de espera
      UI.showWaitingScreen();

      // WebSocket manejará las actualizaciones en tiempo real
      console.log("Transaccion creada, esperando notificaciones WebSocket");
    } catch (error) {
      console.error("Error manejando transaccion creada:", error);
      UI.showErrorScreen(
        "Error de Transaccion",
        "Error al procesar la transaccion"
      );
    }
  }

  /**
   * Manejar transaccion actualizada
   */
  async handleTransactionUpdated(transaction) {
    try {
      console.log("Transaccion actualizada:", transaction.estado);

      // Actualizar UI segun el estado
      switch (transaction.estado) {
        case "en_proceso":
          // Mostrar datos bancarios
          const bankData = TransactionManager.getBankData();
          if (bankData) {
            UI.updateBankInfo(bankData);
            UI.showBankInfoScreen();
          }
          break;

        case "confirmada":
          // Mostrar confirmacion final
          UI.updateFinalInfo(transaction);
          UI.showConfirmationScreen();
          break;

        case "cancelada":
        case "expirada":
          // Mostrar error
          UI.showErrorScreen(
            "Transaccion Cancelada",
            "La transaccion ha sido cancelada o ha expirado"
          );
          break;
      }
    } catch (error) {
      console.error("Error manejando transaccion actualizada:", error);
    }
  }

  /**
   * Manejar transaccion completada
   */
  async handleTransactionCompleted(transaction) {
    try {
      console.log("Transaccion completada:", transaction);

      // Actualizar saldo
      await this.loadUserBalance();

      // Mostrar confirmacion final
      UI.updateFinalInfo(transaction);
      UI.showConfirmationScreen();
    } catch (error) {
      console.error("Error manejando transaccion completada:", error);
    }
  }

  /**
   * Manejar error de transaccion
   */
  handleTransactionError(error) {
    console.error("Error en transaccion:", error);
    UI.showErrorScreen("Error de Transaccion", error.message);
  }

  /**
   * Manejar timeout de transaccion
   */
  async handleTransactionTimeout(transaccionId) {
    try {
      console.log("Timeout de transaccion:", transaccionId);

      // Cancelar transaccion por timeout
      await TransactionManager.cancelTransactionByTimeout(transaccionId);

      UI.showErrorScreen(
        "Tiempo Agotado",
        "La transaccion ha expirado. Por favor, intenta nuevamente."
      );
    } catch (error) {
      console.error("Error manejando timeout:", error);
    }
  }

  /**
   * Manejar confirmacion de pago
   */
  async handlePaymentConfirmationSubmit(e) {
    e.preventDefault();

    try {
      const formData = UI.getPaymentConfirmationFormData();
      window.visualLogger.info("🔍 [DEBUG] Raw formData:", formData);
      const validation = UI.validatePaymentConfirmationForm(formData);

      if (!validation.valid) {
        UI.showErrorScreen("Error de Validacion", validation.message);
        return;
      }

      // Verificar si WebSocket está conectado y autenticado
      if (
        !window.depositoWebSocket.isConnected ||
        !window.depositoWebSocket.isAuthenticated
      ) {
        window.visualLogger.error("❌ WebSocket no conectado o no autenticado");
        window.visualLogger.info("🔄 Intentando reconectar...");

        // Intentar reconectar
        window.depositoWebSocket.connect();

        UI.showErrorScreen(
          "Error de Conexión",
          "No hay conexión WebSocket activa. Intentando reconectar..."
        );
        return;
      }

      // Validar que tenemos una transacción actual
      if (!this.currentTransaction || !this.currentTransaction._id) {
        throw new Error("No hay transacción activa para confirmar");
      }

      // Confirmar pago via WebSocket
      const paymentData = {
        transaccionId: this.currentTransaction._id,
        datosPago: {
          banco: formData.bank,
          telefono: formData.phone,
          referencia: formData.reference,
          fecha: formData.date,
          monto: TransactionManager.convertToCents(formData.amount),
        },
      };

      window.visualLogger.transaction(
        `💳 Confirmando pago via WebSocket: ${paymentData.datosPago.banco} - ${paymentData.datosPago.referencia}`
      );

      console.log("🔍 [DEBUG] Enviando paymentData:", paymentData);
      window.depositoWebSocket.confirmarPagoJugador(paymentData);

      // Actualizar información final con datos del formulario
      const finalTransactionData = {
        ...this.currentTransaction,
        infoPago: {
          fechaPago: formData.date,
          numeroReferencia: formData.reference,
          bancoOrigen: formData.bank,
          telefonoOrigen: formData.phone,
        },
        estado: "en_proceso",
      };

      // Guardar los datos del pago para usar en la pantalla de pago registrado
      this.paymentData = finalTransactionData;

      window.visualLogger.info(
        "🔍 [DEBUG] finalTransactionData:",
        finalTransactionData
      );
      window.visualLogger.info("🔍 [DEBUG] formData.date:", formData.date);
      UI.updateFinalInfo(finalTransactionData);
      UI.showConfirmationScreen();
    } catch (error) {
      console.error("Error confirmando pago:", error);
      UI.showErrorScreen("Error de Confirmacion", error.message);
    }
  }

  /**
   * Manejar boton "Ya realice el pago"
   */
  handlePaymentDone() {
    UI.showPaymentConfirmationScreen();
  }

  /**
   * Manejar boton "Volver"
   */
  handleBackToBank() {
    UI.showBankInfoScreen();
  }

  /**
   * Manejar cierre de aplicacion
   */
  handleCloseApp() {
    TelegramAuth.closeApp();
  }

  /**
   * Manejar reintento
   */
  async handleRetry() {
    try {
      // Limpiar transaccion actual
      TransactionManager.clearCurrentTransaction();

      // Volver a la pantalla principal
      UI.showMainScreen();

      // Recargar saldo
      await this.loadUserBalance();
    } catch (error) {
      console.error("Error en reintento:", error);
    }
  }

  /**
   * Manejar cancelación de transacción
   */
  async handleCancelTransaction() {
    try {
      // Obtener transacción actual
      const currentTransaction = TransactionManager.getCurrentTransaction();

      if (!currentTransaction || !currentTransaction._id) {
        window.visualLogger.error("No hay transacción activa para cancelar");
        return;
      }

      // Mostrar modal de confirmación profesional
      const confirmed = await UI.showConfirmModal(
        "¿Cancelar depósito?",
        "¿Estás seguro que deseas cancelar esta solicitud de depósito? Esta acción no se puede deshacer."
      );

      if (!confirmed) {
        window.visualLogger.info("Cancelación abortada por el usuario");
        return;
      }

      window.visualLogger.info("Cancelando transacción...");

      // Llamar al API para cancelar
      const response = await API.cancelarTransaccion(
        currentTransaction._id,
        "Cancelada por el usuario"
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.mensaje || "Error cancelando transacción");
      }

      const data = await response.json();

      window.visualLogger.success("Transacción cancelada exitosamente");

      // Limpiar transacción activa
      TransactionManager.clearCurrentTransaction();
      window.depositoWebSocket.clearActiveTransaction();

      // Volver a pantalla principal
      UI.showMainScreen();

      // Recargar saldo
      await this.loadUserBalance();
    } catch (error) {
      window.visualLogger.error(
        `Error cancelando transacción: ${error.message}`
      );
      
      // Mostrar modal de error en lugar de alert
      await UI.showConfirmModal(
        "Error al cancelar",
        `No se pudo cancelar la transacción: ${error.message}`
      );
    }
  }

  /**
   * Manejar cierre de error
   */
  handleCloseError() {
    UI.showMainScreen();
  }

  /**
   * Manejar cambio de monto
   */
  handleAmountChange(e) {
    const amount = parseFloat(e.target.value) || 0;
    const amountCents = TransactionManager.convertToCents(amount);

    // Actualizar campo de centavos (si existe)
    const amountCentsInput = document.getElementById("amount-cents");
    if (amountCentsInput) {
      amountCentsInput.value = amountCents;
    }
  }

  /**
   * Manejar recuperación de transacción
   */
  handleTransactionRecovered(data) {
    window.visualLogger.success("🔄 [APP] handleTransactionRecovered LLAMADO");
    window.visualLogger.debug("Data recibida", data);
    window.visualLogger.debug("Estado", data.estado);
    window.visualLogger.debug("Monto", data.monto);
    window.visualLogger.debug("Cajero", data.cajero);

    window.visualLogger.success(
      "¡Conexión recuperada! Continuando con tu depósito..."
    );

    // Establecer la transacción activa recuperada
    window.depositoWebSocket.setActiveTransaction(data.transaccionId);
    window.visualLogger.info(`Transacción activa: ${data.transaccionId}`);

    // Guardar transacción en ambos lugares para consistencia
    this.currentTransaction = {
      _id: data.transaccionId,
      estado: data.estado,
      monto: data.monto,
      cajero: data.cajero,
      infoPago: data.infoPago,
    };
    TransactionManager.setCurrentTransaction(this.currentTransaction);

    // Restaurar UI según el estado de la transacción
    window.visualLogger.info(`Restaurando UI desde estado: ${data.estado}`);
    this.restoreUIFromState(data.estado, data);
    window.visualLogger.success("Restauración de UI completada");
  }

  /**
   * Manejar reconexión exitosa
   */
  handleReconnectionSuccessful(data) {
    console.log("✅ Reconexión exitosa:", data);
    const numTransacciones = data.transaccionesRecuperadas?.length || 0;

    if (numTransacciones > 0) {
      window.visualLogger.success(
        `¡Reconexión exitosa! ${numTransacciones} transacción(es) recuperada(s)`
      );
    } else {
      window.visualLogger.success("¡Reconexión exitosa!");
    }
  }

  /**
   * Manejar desconexión de participante
   */
  handleParticipantDisconnected(data) {
    console.log("⚠️ Participante desconectado:", data);

    if (data.tipo === "cajero") {
      window.visualLogger.warn(
        "El cajero se desconectó temporalmente. Esperando reconexión..."
      );
    }
  }

  /**
   * Manejar reconexión de participante
   */
  handleParticipantReconnected(data) {
    console.log("✅ Participante reconectado:", data);

    if (data.tipo === "cajero") {
      window.visualLogger.success("El cajero se reconectó. Continuando...");
    }
  }

  /**
   * Restaurar UI desde estado de transacción
   */
  restoreUIFromState(estado, data) {
    console.log(`🔄 [RESTORE] Restaurando UI desde estado: ${estado}`);
    console.log(`🔄 [RESTORE] Data completa:`, data);

    switch (estado) {
      case "pendiente":
        // Transacción pendiente, mostrar pantalla de espera
        console.log("🔄 [RESTORE] Mostrando pantalla de espera (pendiente)");
        UI.showWaitingScreen();
        window.visualLogger.info(
          "Esperando que un cajero acepte tu solicitud..."
        );
        break;

      case "en_proceso":
        window.visualLogger.info("🔄 [RESTORE] Procesando estado en_proceso");
        window.visualLogger.debug("Cajero existe", !!data.cajero);
        window.visualLogger.debug(
          "datosPago existe",
          !!(data.cajero && data.cajero.datosPago)
        );

        // Cajero aceptó, mostrar datos bancarios
        if (data.cajero && data.cajero.datosPago) {
          window.visualLogger.info("🔄 Cajero y datos disponibles");

          const bankInfo = {
            banco: data.cajero.datosPago.banco || "N/A",
            telefono: data.cajero.datosPago.telefono || "N/A",
            cedula: data.cajero.datosPago.cedula
              ? `${data.cajero.datosPago.cedula.prefijo}-${data.cajero.datosPago.cedula.numero}`
              : "N/A",
            monto: data.monto / 100, // Convertir centavos a bolívares
          };

          window.visualLogger.debug("Datos bancarios", bankInfo);

          // Actualizar datos bancarios en la UI usando el método correcto
          window.visualLogger.info("🔄 Actualizando datos bancarios...");
          UI.updateBankInfo(bankInfo);

          window.visualLogger.info(
            "🔄 Mostrando pantalla de datos bancarios..."
          );

          // Mostrar pantalla de datos bancarios
          UI.showBankInfoScreen();
          window.visualLogger.success(
            "✅ Pantalla de datos bancarios mostrada"
          );
        } else {
          window.visualLogger.warning("⚠️ Cajero sin datos disponibles");
          window.visualLogger.debug("data.cajero completo", data.cajero);
          UI.showWaitingScreen();
        }
        break;

      case "realizada":
        // Usuario ya confirmó pago, esperando verificación
        UI.showPaymentRegisteredScreen();
        window.visualLogger.info(
          "Tu pago fue registrado. Esperando verificación del cajero..."
        );
        break;

      case "confirmada":
      case "completada":
        // Transacción completada
        if (data.saldoNuevo !== undefined) {
          this.currentBalance = data.saldoNuevo;
          UI.updateBalance(data.saldoNuevo);
        }
        UI.showConfirmationScreen();
        window.visualLogger.success("¡Depósito completado exitosamente!");
        break;

      case "rechazada":
        // Transacción rechazada
        UI.showErrorScreen("Tu depósito fue rechazado");
        window.visualLogger.error("Tu depósito fue rechazado");
        break;

      default:
        console.log(`Estado no manejado para restauración: ${estado}`);
        window.visualLogger.warn(
          `Estado desconocido: ${estado}, volviendo a pantalla principal`
        );
        UI.showMainScreen();
    }
  }

  /**
   * Obtener datos del usuario (para uso global)
   */
  getUserData() {
    return this.userData;
  }

  /**
   * Obtener saldo actual (para uso global)
   */
  getCurrentBalance() {
    return this.currentBalance;
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

// Crear instancia unica de la aplicacion
const app = new DepositApp();

// Inicializar la aplicacion cuando se carga el DOM
document.addEventListener("DOMContentLoaded", () => {
  app.init();
});

// Funciones globales para uso en HTML
window.copyToClipboard = async function (elementId) {
  const success = await UI.copyElementToClipboard(elementId);
  if (success) {
    console.log("Texto copiado al portapapeles");
  } else {
    console.error("Error copiando al portapapeles");
  }
};

window.copyAllBankData = async function () {
  const success = await UI.copyAllBankData();
  if (success) {
    console.log("Todos los datos bancarios copiados");
  } else {
    console.error("Error copiando datos bancarios");
  }
};

// Exportar para uso en otros modulos si es necesario
export default app;
