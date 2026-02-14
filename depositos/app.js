/**
 * Aplicacion principal de depositos - Version modular
 * @version (leído dinámicamente desde package.json)
 */

import { TelegramAuth } from "./js/auth.js";
import { UI } from "./js/ui.js";
import { TransactionManager } from "./js/transactions.js";
import { API } from "./js/api.js";
import {
  MESSAGES,
  APP_STATES,
  TRANSACTION_CONFIG,
  API_CONFIG,
} from "./js/config.js";

// Función para obtener la versión dinámicamente desde window.APP_VERSION (inyectada por el servidor)
// Si no está disponible, usar versión por defecto
function getAppVersion() {
  let debugInfo = [];

  // Primero intentar leer desde window.APP_VERSION (inyectado por script)
  if (typeof window !== "undefined") {
    debugInfo.push(`window existe: SI`);
    if (window.APP_VERSION) {
      debugInfo.push(`window.APP_VERSION: ${window.APP_VERSION}`);
      if (window.visualLogger) {
        window.visualLogger.debug(
          `[DEBUG getAppVersion] Usando window.APP_VERSION: ${window.APP_VERSION}`
        );
      }
      return window.APP_VERSION;
    } else {
      debugInfo.push(`window.APP_VERSION: NO disponible`);
    }
  } else {
    debugInfo.push(`window existe: NO`);
  }

  // Si no está disponible, intentar leer desde un meta tag (siempre disponible en el DOM)
  if (typeof document !== "undefined") {
    debugInfo.push(`document existe: SI`);
    const metaVersion = document.querySelector('meta[name="app-version"]');
    if (metaVersion) {
      const metaContent = metaVersion.getAttribute("content");
      debugInfo.push(`meta tag encontrado: SI, content: ${metaContent}`);
      if (metaContent) {
        if (window.visualLogger) {
          window.visualLogger.debug(
            `[DEBUG getAppVersion] Usando meta tag: ${metaContent}`
          );
        }
        return metaContent;
      }
    } else {
      debugInfo.push(`meta tag encontrado: NO`);
    }
  } else {
    debugInfo.push(`document existe: NO`);
  }

  // Fallback al valor por defecto (que debería ser reemplazado por el servidor)
  debugInfo.push(`Usando fallback: 0.0.0`);
  if (window.visualLogger) {
    window.visualLogger.debug(`[DEBUG getAppVersion] ${debugInfo.join(", ")}`);
  }
  return "0.0.0";
}

class DepositApp {
  constructor() {
    this.isInitialized = false;
    this.userData = null;
    this.currentBalance = 0;
    // La versión se leerá cuando se inicialice la app, no cuando se carga el módulo
    this.version = null;
    this.montoMinimo = 1; // Valor por defecto, se actualiza al cargar configuración
    this.hasAmountAdjustment = false; // Rastrear si hubo un ajuste de monto
    this.pendingDepositoCompletadoData = null; // Guardar datos de depósito completado si hay ajuste pendiente
    this.isReconnecting = false; // Estado de reconexión en progreso
    this.reconnectAttempts = 0; // Contador de intentos de reconexión
    /** True mientras se muestra pantalla "Solicitud cancelada" por timeout; evita que auth/reconexión la reemplace */
    this.showingTimeoutOrRejectionScreen = false;
  }

  /**
   * Inicializar la aplicacion
   */
  async init() {
    if (this.isInitialized) return;

    try {
      // Leer la versión al inicializar (para asegurar que window.APP_VERSION esté disponible)
      if (!this.version) {
        if (window.visualLogger) {
          window.visualLogger.debug(
            `[DEBUG init] Llamando a getAppVersion()...`
          );
        }
        this.version = getAppVersion();
        // Log de depuración (temporal) para verificar que la versión se lee correctamente
        if (window.visualLogger) {
          window.visualLogger.debug(
            `[DEBUG init] Version final leida: ${this.version}`
          );
          window.visualLogger.debug(
            `[DEBUG init] window.APP_VERSION: ${
              window.APP_VERSION || "no disponible"
            }`
          );
          if (typeof document !== "undefined") {
            const metaVersion = document.querySelector(
              'meta[name="app-version"]'
            );
            window.visualLogger.debug(
              `[DEBUG init] meta tag: ${
                metaVersion
                  ? metaVersion.getAttribute("content")
                  : "no encontrado"
              }`
            );
          }
        }
      }

      window.visualLogger.info(
        `🚀 Iniciando aplicación de depósitos v${this.version} [ALPHA]...`
      );

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
        onContinueFromAdjusted: this.handleContinueFromAdjusted.bind(this),
        onContactAdmin: this.handleContactAdmin.bind(this),
      });

      // Hacer disponibles las instancias globalmente para uso en HTML
      window.transactionManager = TransactionManager;
      window.depositApp = this;

      // Cargar configuración del sistema
      await this.cargarConfiguracion();

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
      onDepositoRechazado: this.handleDepositoRechazado.bind(this),
      onTransaccionEnRevision: this.handleTransaccionEnRevision.bind(this),
      onPagoConfirmado: this.handlePagoConfirmado.bind(this),
      onSolicitudAceptada: this.handleSolicitudAceptada.bind(this),
      onSolicitudCreada: this.handleSolicitudCreada.bind(this),
      onMontoAjustado: this.handleMontoAjustado.bind(this),
      onError: this.handleWebSocketError.bind(this),
      // Callbacks de recuperación
      onTransactionRecovered: this.handleTransactionRecovered.bind(this),
      onReconnectionSuccessful: this.handleReconnectionSuccessful.bind(this),
      onParticipantDisconnected: this.handleParticipantDisconnected.bind(this),
      onParticipantReconnected: this.handleParticipantReconnected.bind(this),
      // Callback de timeout
      onTransaccionCanceladaPorTimeout:
        this.handleTransaccionCanceladaPorTimeout.bind(this),
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

        // Si estábamos reconectando, verificar si hay transacciones para recuperar
        if (this.isReconnecting) {
          // El backend puede enviar información de recuperación en result.recovery
          const hasRecovery =
            result.recovery &&
            result.recovery.transactionsRecovered &&
            result.recovery.transactionsRecovered.length > 0;

          if (!hasRecovery) {
            // Esperar un momento para ver si llega alguna transacción para recuperar
            setTimeout(() => {
              const hasActiveTransaction =
                window.depositoWebSocket.activeTransactionId ||
                TransactionManager.getCurrentTransaction() ||
                this.currentTransaction;

              if (!hasActiveTransaction && !this.showingTimeoutOrRejectionScreen) {
                this.isReconnecting = false;
                this.reconnectAttempts = 0;
                window.visualLogger.success(
                  "✅ Reconexión completada sin transacciones pendientes"
                );
                UI.showMainScreen();
              }
            }, 1500);
          }
          // Si hay recovery, handleTransactionRecovered se encargará de mostrar la pantalla correcta
        } else {
          // Si no estábamos reconectando y no hay transacción activa, mostrar pantalla principal
          const hasActiveTransaction =
            window.depositoWebSocket.activeTransactionId ||
            TransactionManager.getCurrentTransaction() ||
            this.currentTransaction;

          if (!hasActiveTransaction && !this.showingTimeoutOrRejectionScreen) {
            UI.showMainScreen();
          }
        }
      } else {
        window.visualLogger.error(
          `🔐 Error de autenticación WebSocket: ${result.message}`
        );

        // Si falla la autenticación y estábamos reconectando, mostrar error
        if (this.isReconnecting) {
          this.isReconnecting = false;
          this.reconnectAttempts = 0;
          UI.showErrorScreen(
            "Error de Autenticación",
            "No se pudo autenticar con el servidor. Por favor, recarga la página."
          );
        }
      }
    });

    // Los callbacks ya están configurados arriba con setCallbacks()

    // Conectar WebSocket
    window.visualLogger.info("🔌 Iniciando conexión WebSocket...");
    window.depositoWebSocket.connect();

    // Detección de vuelta desde background: verificar estado de transacción sin exigir WebSocket
    this.setupDisconnectionDetection();
  }

  /**
   * Configurar detección de vuelta a la app (pantalla encendida, pestaña visible)
   * para verificar estado de la transacción activa y actualizar la UI.
   */
  setupDisconnectionDetection() {
    let wasHidden = false;

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        wasHidden = true;
      } else {
        if (wasHidden) {
          this.checkAndUpdateActiveTransaction();
          wasHidden = false;
        }
      }
    });

    window.addEventListener("pageshow", (event) => {
      if (event.persisted) {
        this.checkAndUpdateActiveTransaction();
      }
    });
  }

  /**
   * Verificar y actualizar transacción activa cuando el usuario vuelve a la app.
   * Usa GET /estado (X-Telegram-Id) para no depender del WebSocket.
   */
  async checkAndUpdateActiveTransaction() {
    const currentTransaction = TransactionManager.getCurrentTransaction();
    if (!currentTransaction?._id) return;

    try {
      const telegramId = TelegramAuth.getTelegramId();
      const response = await API.verificarEstadoTransaccion(
        currentTransaction._id,
        telegramId
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return;

      const estado = data.estado;
      const monto = data.monto;
      const cajero = data.cajero;

      if (estado === "completada" || estado === "completada_con_ajuste") {
        window.depositoWebSocket.clearActiveTransaction();
        this.currentTransaction = null;
        TransactionManager.clearCurrentTransaction();
        this.loadUserBalance();
        UI.updateFinalInfo({
          monto,
          saldoNuevo: data.saldoNuevo,
          saldoAnterior: data.saldoAnterior,
          infoPago: {},
        });
        UI.showCashierVerifiedScreen();
      } else if (estado === "rechazada") {
        this.handleDepositoRechazado({
          transaccionId: currentTransaction._id,
          motivo: data.mensaje || "Depósito rechazado",
        });
      } else if (estado === "cancelada") {
        this.handleTransaccionCanceladaPorTimeout({
          mensaje: data.mensaje || "Tu solicitud fue cancelada por inactividad.",
        });
      } else if (estado === "en_proceso" && cajero) {
        this.currentTransaction = {
          ...currentTransaction,
          cajero: {
            _id: cajero._id,
            datosPago: cajero.datosPago,
          },
          estado: "en_proceso",
        };
        TransactionManager.setCurrentTransaction(this.currentTransaction);
        UI.updateBankInfo({
          banco: cajero.datosPago?.banco,
          telefono: cajero.datosPago?.telefono || cajero.telefono,
          cedula: cajero.datosPago?.cedula
            ? `${cajero.datosPago.cedula.prefijo}-${cajero.datosPago.cedula.numero}`
            : "",
          monto,
        });
        UI.showBankInfoScreen();
      } else if (estado === "pendiente") {
        UI.updateWaitingTransaction({
          _id: currentTransaction._id,
          monto,
          estado: "pendiente",
        });
        UI.showWaitingScreen();
      }
    } catch (error) {
      console.error("Error verificando estado de transacción:", error);
    }
  }

  /**
   * Cargar configuración del sistema
   */
  async cargarConfiguracion() {
    try {
      window.visualLogger.info("⚙️ Cargando configuración del sistema...");

      const response = await fetch(`${API_CONFIG.BASE_URL}/config/depositos`);

      if (response.ok) {
        const data = await response.json();

        if (data.ok && data.configuracion) {
          this.montoMinimo = data.configuracion.deposito_monto_minimo || 1;

          // Actualizar la configuración de transacciones
          TRANSACTION_CONFIG.MIN_AMOUNT = this.montoMinimo;

          // Actualizar la UI
          this.actualizarUIMontoMinimo();

          window.visualLogger.success(
            `✅ Configuración cargada: Monto mínimo = ${this.montoMinimo} Bs`
          );
        }
      } else {
        window.visualLogger.warning(
          "⚠️ No se pudo cargar la configuración, usando valores por defecto"
        );
      }
    } catch (error) {
      window.visualLogger.error(
        `❌ Error cargando configuración: ${error.message}`
      );
      // Usar valores por defecto si hay error
      this.montoMinimo = 1;
      TRANSACTION_CONFIG.MIN_AMOUNT = 1;
    }
  }

  /**
   * Actualizar UI con el monto mínimo
   */
  actualizarUIMontoMinimo() {
    // Actualizar el texto de ayuda en el formulario
    const helpText = document.querySelector("#amount + .form-help");
    if (helpText) {
      helpText.textContent = `Monto mínimo: ${this.montoMinimo} Bs`;
    }

    // Actualizar el atributo min del input
    const amountInput = document.getElementById("amount");
    if (amountInput) {
      amountInput.min = this.montoMinimo;
    }
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

      // Solo mostrar pantalla principal si no estamos reconectando
      // (si estamos reconectando, se mostrará la pantalla de reconexión)
      if (!this.isReconnecting) {
        UI.showMainScreen();
      }
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

      // Si estaba reconectando, limpiar el estado
      if (this.isReconnecting) {
        this.isReconnecting = false;
        this.reconnectAttempts = 0;
        window.visualLogger.success("✅ Reconexión completada");
      }

      window.visualLogger.info(`🔐 Autenticando con WebSocket: ${telegramId}`);
      window.depositoWebSocket.authenticateJugador(telegramId, initData);
    } else {
      // Marcar que estamos reconectando
      if (!this.isReconnecting) {
        this.isReconnecting = true;
        this.reconnectAttempts = 0;
        window.visualLogger.warning("🔄 Conectando al servidor...");
        // Mostrar pantalla de reconexión
        UI.showReconnectingScreen();
      }

      this.reconnectAttempts++;
      window.visualLogger.warning(
        `WebSocket no conectado, reintentando en 2 segundos... (Intento ${this.reconnectAttempts})`
      );

      // Limitar intentos de reconexión (máximo 30 intentos = 60 segundos)
      if (this.reconnectAttempts > 30) {
        this.isReconnecting = false;
        window.visualLogger.error(
          "❌ No se pudo conectar después de múltiples intentos"
        );
        UI.showErrorScreen(
          "Error de Conexión",
          "No se pudo establecer conexión con el servidor. Por favor, verifica tu conexión a internet e intenta recargar la página."
        );
        return;
      }

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
      // Resetear flags de ajuste de monto para nueva transacción
      this.hasAmountAdjustment = false;
      this.pendingDepositoCompletadoData = null;

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
   * Manejar ajuste de monto via WebSocket
   */
  handleMontoAjustado(data) {
    try {
      window.visualLogger.info("💰 [APP] handleMontoAjustado llamado");
      window.visualLogger.debug("💰 [APP] Datos recibidos:", data);
      window.visualLogger.debug(
        "💰 [APP] currentTransaction antes:",
        this.currentTransaction
      );

      // Marcar que hubo un ajuste de monto
      this.hasAmountAdjustment = true;

      const montoOriginalBs = (data.montoOriginal / 100).toFixed(2);
      const montoRealBs = (data.montoReal / 100).toFixed(2);

      window.visualLogger.info(
        `💰 Monto ajustado: ${montoOriginalBs} Bs → ${montoRealBs} Bs`
      );

      // Actualizar la transacción actual si existe
      if (this.currentTransaction) {
        this.currentTransaction.monto = data.montoReal;
        TransactionManager.setCurrentTransaction(this.currentTransaction);
        window.visualLogger.debug(
          "💰 [APP] currentTransaction actualizado:",
          this.currentTransaction
        );
      }

      // Mostrar al usuario con logs visuales y refrescar UI
      if (data.razon) {
        window.visualLogger.warning(
          `💰 Monto ajustado: ${montoOriginalBs} Bs → ${montoRealBs} Bs`
        );
        window.visualLogger.info(`📌 Razón del ajuste: ${data.razon}`);
      } else {
        window.visualLogger.warning(
          `💰 Monto ajustado: ${montoOriginalBs} Bs → ${montoRealBs} Bs`
        );
      }

      // Refrescar los montos visibles en la pantalla de espera
      if (this.currentTransaction) {
        window.visualLogger.info(
          "🖥️ [APP] Actualizando UI de pantalla de espera (updateWaitingTransaction)"
        );
        UI.updateWaitingTransaction(this.currentTransaction);
      }

      // Datos para pantallas (usar la referencia REAL ingresada por el usuario si existe)
      const numeroReferenciaUsuario =
        this.paymentData?.infoPago?.numeroReferencia || "-";
      const fechaPagoUsuario =
        this.paymentData?.infoPago?.fechaPago || new Date();

      const paymentData = {
        monto: data.montoReal,
        infoPago: {
          fechaPago: fechaPagoUsuario,
          numeroReferencia: numeroReferenciaUsuario,
        },
      };

      // Construir data para pantalla de ajuste aprobado
      const adjustedData = {
        montoOriginal: data.montoOriginal,
        monto: data.montoReal,
        razon: data.razon,
        infoPago: paymentData.infoPago,
      };

      // Mostrar nueva pantalla dedicada de "ajuste aprobado"
      window.visualLogger.info(
        "🖥️ [APP] Mostrando pantalla: ADJUSTED_APPROVED"
      );
      UI.updateAdjustedApprovedInfo(adjustedData);
      UI.showAdjustedApprovedScreen();
    } catch (error) {
      window.visualLogger.error(
        `Error manejando ajuste de monto: ${error.message}`
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

      // Mostrar pantalla de pago confirmado por usuario (esperando cajero)
      UI.showUserPaymentConfirmedScreen();
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

      // Si hubo un ajuste de monto, guardar los datos pero NO mostrar la pantalla automáticamente
      // El usuario debe hacer clic en "Continuar" en la pantalla de ajuste
      if (this.hasAmountAdjustment) {
        window.visualLogger.info(
          "🎉 [APP] Hay ajuste de monto pendiente, guardando datos para mostrar después"
        );
        this.pendingDepositoCompletadoData = data;
        // NO mostrar la pantalla automáticamente, esperar a que el usuario haga clic en "Continuar"
        return;
      }

      // Mostrar confirmación final solo si NO hubo ajuste de monto
      window.visualLogger.info(
        "🎉 [APP] Actualizando información final y mostrando pantalla..."
      );
      UI.updateFinalInfo(data);
      UI.showCashierVerifiedScreen();

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
   * Manejar botón "Continuar" desde la pantalla de monto ajustado
   */
  handleContinueFromAdjusted() {
    try {
      window.visualLogger.info("🎉 [APP] Continuando desde pantalla de ajuste");

      // Si hay datos pendientes de depósito completado, mostrarlos
      if (this.pendingDepositoCompletadoData) {
        window.visualLogger.info(
          "🎉 [APP] Mostrando pantalla de depósito verificado"
        );
        UI.updateFinalInfo(this.pendingDepositoCompletadoData);
        UI.showCashierVerifiedScreen();

        // Limpiar flags
        this.hasAmountAdjustment = false;
        this.pendingDepositoCompletadoData = null;
      } else {
        window.visualLogger.warning(
          "🎉 [APP] No hay datos pendientes de depósito completado"
        );
      }
    } catch (error) {
      window.visualLogger.error(
        `❌ [APP] Error continuando desde ajuste: ${error.message}`
      );
    }
  }

  /**
   * Manejar botón "Contactar admin" para revisar depósito rechazado
   * Por ahora no hace nada, se implementará cuando se cree el dashboard de admin
   */
  handleContactAdmin() {
    // Por ahora solo mostrar mensaje informativo
    window.visualLogger.info(
      "📞 [APP] Contactar admin (funcionalidad pendiente)"
    );
    
    UI.showAlert(
      "Esta funcionalidad estará disponible próximamente cuando se implemente el dashboard de administradores.\n\nPor favor, contacta directamente con soporte si necesitas ayuda."
    );
    
    // TODO: Implementar cuando tengamos dashboard de admin
  }

  /**
   * Manejar depósito rechazado
   */
  handleDepositoRechazado(data) {
    try {
      // Guardar transaccionId para poder contactar admin después
      this.rejectedTransactionId = data.transaccionId;

      // Limpiar transacción activa (ya rechazada)
      window.depositoWebSocket.clearActiveTransaction();

      window.visualLogger.warning("⚠️ [APP] handleDepositoRechazado llamado");
      window.visualLogger.info("⚠️ [APP] Datos recibidos:", data);

      // Actualizar saldo
      this.loadUserBalance();

      // Construir mensaje estructurado y claro
      const titulo = "Depósito Rechazado";
      
      // Obtener el motivo del rechazo (puede venir como 'motivo' o 'descripcionDetallada')
      const motivoCajero = data.motivo || data.descripcionDetallada || "No se especificó un motivo";
      
      // Construir mensaje con formato claro y estructurado usando <br> para saltos de línea
      const mensaje = `Tu depósito fue rechazado por el cajero.<br><br>` +
        `<strong>📋 Motivo del rechazo:</strong><br>` +
        `${motivoCajero}<br><br>` +
        `Si consideras que hubo un error, puedes contactar a un administrador para revisar tu caso.`;

      this.showingTimeoutOrRejectionScreen = true;
      UI.showErrorScreenWithContactAdmin(titulo, mensaje, data.transaccionId);

      // No redirigir automáticamente - dejar que el usuario decida cuándo continuar
      window.visualLogger.info("⚠️ [APP] Depósito rechazado procesado");
    } catch (error) {
      window.visualLogger.error(
        `❌ [APP] Error manejando depósito rechazado: ${error.message}`
      );
      console.error("❌ [APP] Stack trace:", error);
    }
  }

  /**
   * Manejar transacción en revisión administrativa
   */
  handleTransaccionEnRevision(data) {
    try {
      window.visualLogger.warning(
        "⏳ [APP] handleTransaccionEnRevision llamado"
      );
      window.visualLogger.info("⏳ [APP] Datos recibidos:", data);

      // Mostrar mensaje informativo usando la pantalla de error (que es genérica)
      UI.showErrorScreen(
        "⏳ Transacción en Revisión",
        `Tu depósito está siendo revisado por un administrador.\n\nUn miembro de nuestro equipo se pondrá en contacto contigo pronto para resolver cualquier inconveniente.\n\nGracias por tu paciencia.`
      );

      window.visualLogger.info("⏳ [APP] Transacción en revisión procesada");
    } catch (error) {
      window.visualLogger.error(
        `❌ [APP] Error manejando transacción en revisión: ${error.message}`
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

      if (!telegramId) {
        window.visualLogger.error(
          "No se pudo obtener el Telegram ID del usuario"
        );
        this.currentBalance = 0;
        UI.updateBalance(this.currentBalance);
        return;
      }

      window.visualLogger.info(`📊 Cargando saldo para usuario: ${telegramId}`);
      const response = await API.getJugadorSaldo(telegramId);

      if (response.ok) {
        const data = await response.json();
        this.currentBalance = data.saldo || 0;
        UI.updateBalance(this.currentBalance);
        window.visualLogger.info(`💰 Saldo cargado: ${this.currentBalance} Bs`);
      } else {
        // Intentar obtener más información del error
        let errorMessage = "No se pudo cargar el saldo";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.mensaje || errorMessage;
        } catch (e) {
          // Si no se puede parsear el error, usar el mensaje por defecto
          errorMessage = `Error HTTP ${response.status}: ${response.statusText}`;
        }

        window.visualLogger.warning(
          `⚠️ ${errorMessage} (código: ${response.status})`
        );
        this.currentBalance = 0;
        UI.updateBalance(this.currentBalance);
      }
    } catch (error) {
      window.visualLogger.error(`Error cargando saldo: ${error.message}`);
      console.error("Error completo:", error);
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

      // Verificar si estamos reconectando
      if (this.isReconnecting) {
        window.visualLogger.warning(
          "⏳ Por favor espera, estamos conectando al servidor..."
        );
        UI.showReconnectingScreen();
        return;
      }

      // Verificar si WebSocket está conectado y autenticado
      if (
        !window.depositoWebSocket.isConnected ||
        !window.depositoWebSocket.isAuthenticated
      ) {
        window.visualLogger.error("❌ WebSocket no conectado o no autenticado");
        window.visualLogger.info("🔄 Intentando reconectar...");

        // Marcar que estamos reconectando
        this.isReconnecting = true;
        UI.showReconnectingScreen();

        // Intentar reconectar
        window.depositoWebSocket.connect();

        // Reintentar autenticación
        if (this.userData) {
          setTimeout(() => {
            this.authenticateWithWebSocket(this.userData);
          }, 1000);
        }

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
          UI.showCashierVerifiedScreen();
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
      UI.showCashierVerifiedScreen();
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

      // Verificar si estamos reconectando
      if (this.isReconnecting) {
        window.visualLogger.warning(
          "⏳ Por favor espera, estamos conectando al servidor..."
        );
        UI.showReconnectingScreen();
        return;
      }

      // Verificar si WebSocket está conectado y autenticado
      if (
        !window.depositoWebSocket.isConnected ||
        !window.depositoWebSocket.isAuthenticated
      ) {
        window.visualLogger.error("❌ WebSocket no conectado o no autenticado");
        window.visualLogger.info("🔄 Intentando reconectar...");

        // Marcar que estamos reconectando
        this.isReconnecting = true;
        UI.showReconnectingScreen();

        // Intentar reconectar
        window.depositoWebSocket.connect();

        // Reintentar autenticación
        if (this.userData) {
          setTimeout(() => {
            this.authenticateWithWebSocket(this.userData);
          }, 1000);
        }

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
          monto: this.currentTransaction.monto, // Usar el monto de la transacción original
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
        estado: "realizada", // El jugador ya reportó que hizo el pago
      };

      // Guardar los datos del pago para usar en la pantalla de pago registrado
      this.paymentData = finalTransactionData;

      window.visualLogger.info(
        "🔍 [DEBUG] finalTransactionData:",
        finalTransactionData
      );
      window.visualLogger.info("🔍 [DEBUG] formData.date:", formData.date);

      // Mostrar pantalla de pago confirmado por usuario (esperando verificación del cajero)
      // La pantalla final se mostrará cuando llegue el evento "deposito-completado"
      UI.updateRegisteredInfo(finalTransactionData);
      UI.showUserPaymentConfirmedScreen();

      window.visualLogger.info("⏳ Esperando confirmación del cajero...");
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
    this.showingTimeoutOrRejectionScreen = false;
    UI.showMainScreen();
    this.loadUserBalance();
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

    // Limpiar estado de reconexión cuando se recupera una transacción
    if (this.isReconnecting) {
      this.isReconnecting = false;
      this.reconnectAttempts = 0;
      window.visualLogger.success(
        "✅ Reconexión completada - Transacción recuperada"
      );
    }

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

      // Si no hay transacciones recuperadas y estábamos reconectando,
      // mostrar la pantalla principal
      if (this.isReconnecting) {
        this.isReconnecting = false;
        this.reconnectAttempts = 0;

        // Esperar un momento para asegurarse de que no llegue ninguna transacción
        setTimeout(() => {
          const hasActiveTransaction =
            window.depositoWebSocket.activeTransactionId ||
            TransactionManager.getCurrentTransaction() ||
            this.currentTransaction;

          if (!hasActiveTransaction) {
            window.visualLogger.success(
              "✅ No hay transacciones pendientes, mostrando pantalla principal"
            );
            UI.showMainScreen();
          }
        }, 500);
      }
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

        // Actualizar información de la transacción en la pantalla de espera
        UI.updateWaitingTransaction({
          monto: data.monto,
          referencia: data.transaccionId,
          estado: data.estado,
        });

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
            monto: data.monto, // El monto viene en centavos, formatCurrency hará la conversión
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
        // Actualizar información de pago registrado con los datos recuperados
        UI.updateRegisteredInfo({
          monto: data.monto,
          infoPago: data.infoPago,
        });
        UI.showUserPaymentConfirmedScreen();
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
        UI.showCashierVerifiedScreen();
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

  /**
   * Manejar cancelación de transacción por timeout
   */
  handleTransaccionCanceladaPorTimeout(data) {
    try {
      if (data.tiempoTranscurrido != null) {
        window.visualLogger.warning(
          `⏱️ Transacción cancelada por inactividad (${data.tiempoTranscurrido} min)`
        );
      }
      if (data.mensaje) {
        window.visualLogger.info(data.mensaje);
      }

      // Limpiar transacción activa
      this.currentTransaction = null;
      TransactionManager.clearCurrentTransaction();
      window.depositoWebSocket.clearActiveTransaction();

      this.showingTimeoutOrRejectionScreen = true;
      UI.showErrorScreen(
        "⏱️ Solicitud Cancelada",
        data.mensaje || "Tu solicitud fue cancelada por inactividad."
      );
      // La pantalla persiste hasta que el usuario pulse "Cerrar" (handleCloseError)
    } catch (error) {
      console.error("Error manejando cancelación por timeout:", error);
      window.visualLogger.error(
        "Error en handler de timeout: " + error.message
      );
    }
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
