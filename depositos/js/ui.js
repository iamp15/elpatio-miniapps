/**
 * Módulo de interfaz de usuario para depósitos
 */

import {
  DOM_SELECTORS,
  UI_CONFIG,
  MESSAGES,
  APP_STATES,
  TRANSACTION_CONFIG,
} from "./config.js";

class UIManager {
  constructor() {
    this.elements = {};
    this.currentState = APP_STATES.LOADING;
    this.initElements();
  }

  /**
   * Inicializar referencias a elementos del DOM
   */
  initElements() {
    // Pantallas
    this.elements.loadingScreen = document.querySelector(
      DOM_SELECTORS.LOADING_SCREEN
    );
    this.elements.mainScreen = document.querySelector(
      DOM_SELECTORS.MAIN_SCREEN
    );
    this.elements.waitingScreen = document.querySelector(
      DOM_SELECTORS.WAITING_SCREEN
    );
    this.elements.bankInfoScreen = document.querySelector(
      DOM_SELECTORS.BANK_INFO_SCREEN
    );
    this.elements.paymentConfirmationScreen = document.querySelector(
      DOM_SELECTORS.PAYMENT_CONFIRMATION_SCREEN
    );
    this.elements.cashierVerifiedScreen = document.querySelector(
      DOM_SELECTORS.CASHIER_VERIFIED_SCREEN
    );
    this.elements.userPaymentConfirmedScreen = document.querySelector(
      DOM_SELECTORS.USER_PAYMENT_CONFIRMED_SCREEN
    );
    this.elements.errorScreen = document.querySelector(
      DOM_SELECTORS.ERROR_SCREEN
    );

    // Formularios
    this.elements.depositForm = document.querySelector(
      DOM_SELECTORS.DEPOSIT_FORM
    );
    this.elements.paymentConfirmationForm = document.querySelector(
      DOM_SELECTORS.PAYMENT_CONFIRMATION_FORM
    );

    // Botones
    this.elements.requestDepositBtn = document.querySelector(
      DOM_SELECTORS.REQUEST_DEPOSIT_BTN
    );
    this.elements.paymentDoneBtn = document.querySelector(
      DOM_SELECTORS.PAYMENT_DONE_BTN
    );
    this.elements.confirmPaymentBtn = document.querySelector(
      DOM_SELECTORS.CONFIRM_PAYMENT_BTN
    );
    this.elements.backToBankBtn = document.querySelector(
      DOM_SELECTORS.BACK_TO_BANK_BTN
    );
    this.elements.closeAppBtn = document.querySelector(
      DOM_SELECTORS.CLOSE_APP_BTN
    );
    this.elements.retryBtn = document.querySelector(DOM_SELECTORS.RETRY_BTN);
    this.elements.closeErrorBtn = document.querySelector(
      DOM_SELECTORS.CLOSE_ERROR_BTN
    );
    this.elements.copyAllBtn = document.querySelector(
      DOM_SELECTORS.COPY_ALL_BTN
    );
    this.elements.continueFromAdjustedBtn = document.querySelector(
      DOM_SELECTORS.CONTINUE_FROM_ADJUSTED_BTN
    );
    this.elements.contactAdminBtn = document.querySelector(
      DOM_SELECTORS.CONTACT_ADMIN_BTN
    );
    this.elements.cancelWaitingBtn =
      document.getElementById("cancel-waiting-btn");
    this.elements.cancelBankInfoBtn = document.getElementById(
      "cancel-bank-info-btn"
    );

    // Campos de entrada
    this.elements.amountInput = document.querySelector(
      DOM_SELECTORS.AMOUNT_INPUT
    );
    this.elements.amountCentsInput = document.querySelector(
      DOM_SELECTORS.AMOUNT_CENTS_INPUT
    );
    this.elements.paymentBankSelect = document.querySelector(
      DOM_SELECTORS.PAYMENT_BANK_SELECT
    );
    this.elements.paymentPhoneInput = document.querySelector(
      DOM_SELECTORS.PAYMENT_PHONE_INPUT
    );
    this.elements.paymentReferenceInput = document.querySelector(
      DOM_SELECTORS.PAYMENT_REFERENCE_INPUT
    );
    this.elements.paymentDateInput = document.querySelector(
      DOM_SELECTORS.PAYMENT_DATE_INPUT
    );

    // Información mostrada
    this.elements.currentBalance = document.querySelector(
      DOM_SELECTORS.CURRENT_BALANCE
    );
    this.elements.waitingAmount = document.querySelector(
      DOM_SELECTORS.WAITING_AMOUNT
    );
    this.elements.waitingReference = document.querySelector(
      DOM_SELECTORS.WAITING_REFERENCE
    );
    this.elements.waitingStatus = document.querySelector(
      DOM_SELECTORS.WAITING_STATUS
    );
    this.elements.bankName = document.querySelector(DOM_SELECTORS.BANK_NAME);
    this.elements.bankPhone = document.querySelector(DOM_SELECTORS.BANK_PHONE);
    this.elements.bankId = document.querySelector(DOM_SELECTORS.BANK_ID);
    this.elements.bankAmount = document.querySelector(
      DOM_SELECTORS.BANK_AMOUNT
    );
    this.elements.finalAmount = document.querySelector(
      DOM_SELECTORS.FINAL_AMOUNT
    );
    this.elements.finalDate = document.querySelector(DOM_SELECTORS.FINAL_DATE);
    this.elements.finalReference = document.querySelector(
      DOM_SELECTORS.FINAL_REFERENCE
    );
    this.elements.finalBalance = document.querySelector(
      DOM_SELECTORS.FINAL_BALANCE
    );
    // Elementos de pantalla de ajuste aprobado
    this.elements.adjustedAmount = document.querySelector(
      DOM_SELECTORS.ADJUSTED_AMOUNT
    );
    this.elements.adjustedDate = document.querySelector(
      DOM_SELECTORS.ADJUSTED_DATE
    );
    this.elements.adjustedReference = document.querySelector(
      DOM_SELECTORS.ADJUSTED_REFERENCE
    );
    this.elements.adjustedNote = document.querySelector(
      DOM_SELECTORS.ADJUSTED_NOTE
    );
    this.elements.registeredAmount = document.querySelector(
      DOM_SELECTORS.REGISTERED_AMOUNT
    );
    this.elements.registeredDate = document.querySelector(
      DOM_SELECTORS.REGISTERED_DATE
    );
    this.elements.registeredReference = document.querySelector(
      DOM_SELECTORS.REGISTERED_REFERENCE
    );
    this.elements.registeredStatus = document.querySelector(
      DOM_SELECTORS.REGISTERED_STATUS
    );
    this.elements.errorTitle = document.querySelector(
      DOM_SELECTORS.ERROR_TITLE
    );
    this.elements.errorMessage = document.querySelector(
      DOM_SELECTORS.ERROR_MESSAGE
    );
  }

  /**
   * Configurar event listeners
   */
  setupEventListeners(eventHandlers) {
    // Formulario de depósito
    if (this.elements.depositForm && eventHandlers.onDepositSubmit) {
      this.elements.depositForm.addEventListener(
        "submit",
        eventHandlers.onDepositSubmit
      );
    }

    // Formulario de confirmación de pago
    if (
      this.elements.paymentConfirmationForm &&
      eventHandlers.onPaymentConfirmationSubmit
    ) {
      this.elements.paymentConfirmationForm.addEventListener(
        "submit",
        eventHandlers.onPaymentConfirmationSubmit
      );
    }

    // Botones
    if (this.elements.paymentDoneBtn && eventHandlers.onPaymentDone) {
      this.elements.paymentDoneBtn.addEventListener(
        "click",
        eventHandlers.onPaymentDone
      );
    }

    if (this.elements.backToBankBtn && eventHandlers.onBackToBank) {
      this.elements.backToBankBtn.addEventListener(
        "click",
        eventHandlers.onBackToBank
      );
    }

    if (this.elements.closeAppBtn && eventHandlers.onCloseApp) {
      this.elements.closeAppBtn.addEventListener(
        "click",
        eventHandlers.onCloseApp
      );
    }

    if (this.elements.retryBtn && eventHandlers.onRetry) {
      this.elements.retryBtn.addEventListener("click", eventHandlers.onRetry);
    }

    if (this.elements.closeErrorBtn && eventHandlers.onCloseError) {
      this.elements.closeErrorBtn.addEventListener(
        "click",
        eventHandlers.onCloseError
      );
    }

    // Botones de cancelar
    if (this.elements.cancelWaitingBtn && eventHandlers.onCancelTransaction) {
      this.elements.cancelWaitingBtn.addEventListener(
        "click",
        eventHandlers.onCancelTransaction
      );
    }

    if (this.elements.cancelBankInfoBtn && eventHandlers.onCancelTransaction) {
      this.elements.cancelBankInfoBtn.addEventListener(
        "click",
        eventHandlers.onCancelTransaction
      );
    }

    // Input de monto con validación en tiempo real
    if (this.elements.amountInput && eventHandlers.onAmountChange) {
      this.elements.amountInput.addEventListener(
        "input",
        eventHandlers.onAmountChange
      );
    }

    // Botones de pantalla de ajuste aprobado
    if (this.elements.continueFromAdjustedBtn && eventHandlers.onContinueFromAdjusted) {
      this.elements.continueFromAdjustedBtn.addEventListener(
        "click",
        eventHandlers.onContinueFromAdjusted
      );
    }

    if (this.elements.contactAdminBtn && eventHandlers.onContactAdmin) {
      this.elements.contactAdminBtn.addEventListener(
        "click",
        eventHandlers.onContactAdmin
      );
    }
  }

  /**
   * Mostrar pantalla específica
   */
  showScreen(screenId) {
    // Ocultar todas las pantallas
    Object.values(APP_STATES).forEach((state) => {
      const screen = document.getElementById(state);
      if (screen) {
        screen.classList.remove("active");
      }
    });

    // Mostrar pantalla específica
    const screen = document.getElementById(screenId);
    if (screen) {
      screen.classList.add("active");
      this.currentState = screenId;
      if (window.visualLogger) {
        window.visualLogger.success(`🖥️ [UI] Pantalla activa: ${screenId}`);
      }
    } else {
      if (window.visualLogger) {
        window.visualLogger.error(
          `🖥️ [UI] Pantalla NO encontrada en DOM: ${screenId}`
        );
      }
    }
  }

  /**
   * Mostrar pantalla de carga
   */
  showLoadingScreen() {
    this.showScreen(APP_STATES.LOADING);
  }

  /**
   * Mostrar pantalla principal
   */
  showMainScreen() {
    this.showScreen(APP_STATES.MAIN);
  }

  /**
   * Mostrar pantalla de espera
   */
  showWaitingScreen() {
    this.showScreen(APP_STATES.WAITING);
  }

  /**
   * Mostrar pantalla de datos bancarios
   */
  showBankInfoScreen() {
    this.showScreen(APP_STATES.BANK_INFO);
  }

  /**
   * Mostrar pantalla de confirmación de pago
   */
  showPaymentConfirmationScreen() {
    this.showScreen(APP_STATES.PAYMENT_CONFIRMATION);
  }

  /**
   * Mostrar pantalla de depósito verificado por cajero (confirmación final)
   */
  showCashierVerifiedScreen() {
    this.showScreen(APP_STATES.CASHIER_VERIFIED);
  }

  /**
   * Mostrar pantalla de depósito verificado con ajuste de monto
   */
  showAdjustedApprovedScreen() {
    this.showScreen(APP_STATES.ADJUSTED_APPROVED);
  }

  /**
   * Mostrar pantalla de espera de verificación
   */
  showWaitingVerificationScreen() {
    this.showScreen(APP_STATES.WAITING);
  }

  /**
   * Mostrar pantalla de pago confirmado por usuario (esperando cajero)
   */
  showUserPaymentConfirmedScreen() {
    this.showScreen(APP_STATES.USER_PAYMENT_CONFIRMED);
  }

  /**
   * Mostrar pantalla de error
   */
  showErrorScreen(title, message) {
    if (this.elements.errorTitle) {
      this.elements.errorTitle.textContent = title;
    }
    if (this.elements.errorMessage) {
      this.elements.errorMessage.textContent = message;
    }
    this.showScreen(APP_STATES.ERROR);
  }

  /**
   * Actualizar saldo actual
   */
  updateBalance(balance) {
    if (this.elements.currentBalance) {
      const formattedBalance = this.formatCurrency(balance);
      this.elements.currentBalance.textContent = formattedBalance;
    }
  }

  /**
   * Actualizar información de transacción en espera
   */
  updateWaitingTransaction(transaction) {
    if (this.elements.waitingAmount) {
      this.elements.waitingAmount.textContent = this.formatCurrency(
        transaction.monto
      );
    }
    if (this.elements.waitingReference) {
      this.elements.waitingReference.textContent =
        transaction.referencia || "-";
    }
    if (this.elements.waitingStatus) {
      this.elements.waitingStatus.textContent = this.formatStatus(
        transaction.estado
      );
    }
  }

  /**
   * Actualizar datos bancarios
   */
  updateBankInfo(bankData) {
    if (this.elements.bankName) {
      this.elements.bankName.textContent = bankData.banco || "-";
    }
    if (this.elements.bankPhone) {
      this.elements.bankPhone.textContent = bankData.telefono || "-";
    }
    if (this.elements.bankId) {
      this.elements.bankId.textContent = bankData.cedula || "-";
    }
    if (this.elements.bankAmount) {
      this.elements.bankAmount.textContent = this.formatCurrency(
        bankData.monto
      );
    }
  }

  /**
   * Actualizar información de pago registrado
   */
  updateRegisteredInfo(transaction) {
    if (window.visualLogger) {
      window.visualLogger.info("🖥️ [UI] updateRegisteredInfo llamado");
      window.visualLogger.debug("🖥️ [UI] Datos:", transaction);
    }
    if (this.elements.registeredAmount) {
      this.elements.registeredAmount.textContent = this.formatCurrency(
        transaction.monto
      );
    } else if (window.visualLogger) {
      window.visualLogger.error("🖥️ [UI] registeredAmount NO encontrado");
    }
    if (this.elements.registeredDate) {
      // Mostrar la fecha del pago del usuario
      const paymentDate = transaction.infoPago?.fechaPago || new Date();
      this.elements.registeredDate.textContent = this.formatDate(paymentDate);
    } else if (window.visualLogger) {
      window.visualLogger.error("🖥️ [UI] registeredDate NO encontrado");
    }
    if (this.elements.registeredReference) {
      // Mostrar la referencia del pago del usuario
      this.elements.registeredReference.textContent =
        transaction.infoPago?.numeroReferencia || "-";
    } else if (window.visualLogger) {
      window.visualLogger.error("🖥️ [UI] registeredReference NO encontrado");
    }
    if (this.elements.registeredStatus) {
      this.elements.registeredStatus.textContent = "En verificación";
      this.elements.registeredStatus.className = "status-processing";
    } else if (window.visualLogger) {
      window.visualLogger.error("🖥️ [UI] registeredStatus NO encontrado");
    }
  }

  /**
   * Actualizar información final
   */
  updateFinalInfo(transaction) {
    // Log para verificar el estado de la transacción
    console.log("🔍 [UI] Estado de transacción recibido:", transaction.estado);

    if (this.elements.finalAmount) {
      this.elements.finalAmount.textContent = this.formatCurrency(
        transaction.monto
      );
    }
    if (this.elements.finalDate) {
      // Mostrar la fecha del pago del usuario
      const paymentDate = transaction.infoPago?.fechaPago || new Date();
      window.visualLogger.info("🔍 [DEBUG] finalDate element found");
      window.visualLogger.info("🔍 [DEBUG] paymentDate:", paymentDate);
      window.visualLogger.info(
        "🔍 [DEBUG] formatted date:",
        this.formatDate(paymentDate)
      );
      this.elements.finalDate.textContent = this.formatDate(paymentDate);
    } else {
      window.visualLogger.error("🔍 [DEBUG] finalDate element NOT found");
    }
    if (this.elements.finalReference) {
      // Mostrar la referencia del pago del usuario (no la referencia de la transacción)
      const userReference = transaction.infoPago?.numeroReferencia || "-";
      this.elements.finalReference.textContent = userReference;
    }
    if (this.elements.finalBalance) {
      // Mostrar el nuevo saldo del jugador
      const newBalance =
        transaction.saldoNuevo || transaction.saldoAnterior + transaction.monto;
      this.elements.finalBalance.textContent = this.formatCurrency(newBalance);
    }
  }

  /**
   * Actualizar información de pantalla "ajuste aprobado"
   */
  updateAdjustedApprovedInfo(data) {
    if (window.visualLogger) {
      window.visualLogger.info("🖥️ [UI] updateAdjustedApprovedInfo llamado");
      window.visualLogger.debug("🖥️ [UI] Datos:", data);
    }

    if (this.elements.adjustedAmount) {
      this.elements.adjustedAmount.textContent = this.formatCurrency(
        data.monto
      );
    } else if (window.visualLogger) {
      window.visualLogger.error("🖥️ [UI] adjustedAmount NO encontrado");
    }

    if (this.elements.adjustedDate) {
      const paymentDate = data.infoPago?.fechaPago || new Date();
      this.elements.adjustedDate.textContent = this.formatDate(paymentDate);
    } else if (window.visualLogger) {
      window.visualLogger.error("🖥️ [UI] adjustedDate NO encontrado");
    }

    if (this.elements.adjustedReference) {
      const ref = data.infoPago?.numeroReferencia || "-";
      this.elements.adjustedReference.textContent = ref;
    } else if (window.visualLogger) {
      window.visualLogger.error("🖥️ [UI] adjustedReference NO encontrado");
    }

    if (this.elements.adjustedNote) {
      const originalBs = (data.montoOriginal / TRANSACTION_CONFIG.AMOUNT_DIVISOR).toFixed(2);
      const realBs = (data.monto / TRANSACTION_CONFIG.AMOUNT_DIVISOR).toFixed(2);
      const razon = data.razon || "Ajuste de monto por discrepancia";
      this.elements.adjustedNote.innerHTML = `
        🎯 Se acreditó tu depósito con un ajuste de monto.<br/>
        Ajuste: ${originalBs} Bs → ${realBs} Bs.<br/>
        Motivo: ${razon}.<br/>
        Si consideras que hubo un error, por favor contacta a un administrador.
      `;
    } else if (window.visualLogger) {
      window.visualLogger.error("🖥️ [UI] adjustedNote NO encontrado");
    }
  }

  /**
   * Formatear moneda
   */
  formatCurrency(amount) {
    const amountInBs = amount / TRANSACTION_CONFIG.AMOUNT_DIVISOR;
    return `${amountInBs.toLocaleString(TRANSACTION_CONFIG.LOCALE)} ${
      TRANSACTION_CONFIG.CURRENCY_SYMBOL
    }`;
  }

  /**
   * Formatear fecha
   */
  formatDate(date) {
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString("es-VE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }

  /**
   * Formatear estado
   */
  formatStatus(status) {
    const statusMap = {
      pendiente: "Pendiente",
      en_proceso: "En Proceso",
      realizada: "Pago Realizado",
      confirmada: "Confirmada",
      cancelada: "Cancelada",
      expirada: "Expirada",
    };
    return statusMap[status] || status;
  }

  /**
   * Obtener datos del formulario de depósito
   */
  getDepositFormData() {
    if (!this.elements.depositForm) return null;

    const formData = new FormData(this.elements.depositForm);
    return {
      amount: parseFloat(formData.get("amount")),
      amountCents: parseInt(formData.get("amount-cents")),
    };
  }

  /**
   * Obtener datos del formulario de confirmación de pago
   */
  getPaymentConfirmationFormData() {
    if (!this.elements.paymentConfirmationForm) return null;

    const formData = new FormData(this.elements.paymentConfirmationForm);
    return {
      bank: formData.get("payment-bank"),
      phone: formData.get("payment-phone"),
      reference: formData.get("payment-reference"),
      date: formData.get("payment-date"),
    };
  }

  /**
   * Validar formulario de depósito
   */
  validateDepositForm(formData) {
    if (!formData || !formData.amount) {
      return { valid: false, message: "Por favor, ingresa un monto válido" };
    }

    if (formData.amount < TRANSACTION_CONFIG.MIN_AMOUNT) {
      return {
        valid: false,
        message: `El monto mínimo es ${TRANSACTION_CONFIG.MIN_AMOUNT} ${TRANSACTION_CONFIG.CURRENCY_SYMBOL}`,
      };
    }

    if (formData.amount > TRANSACTION_CONFIG.MAX_AMOUNT) {
      return {
        valid: false,
        message: `El monto máximo es ${TRANSACTION_CONFIG.MAX_AMOUNT} ${TRANSACTION_CONFIG.CURRENCY_SYMBOL}`,
      };
    }

    return { valid: true };
  }

  /**
   * Validar formulario de confirmación de pago
   */
  validatePaymentConfirmationForm(formData) {
    if (!formData) {
      return { valid: false, message: "Datos de pago no válidos" };
    }

    const requiredFields = ["bank", "phone", "reference", "date"];
    for (const field of requiredFields) {
      if (!formData[field]) {
        return { valid: false, message: `El campo ${field} es requerido` };
      }
    }

    if (formData.phone.length !== 11) {
      return { valid: false, message: "El teléfono debe tener 11 dígitos" };
    }

    return { valid: true };
  }

  /**
   * Mostrar estado de carga en botón
   */
  setButtonLoading(button, loading, loadingText = "Procesando...") {
    if (!button) return;

    if (loading) {
      button.disabled = true;
      button.dataset.originalText = button.textContent;
      button.textContent = loadingText;
    } else {
      button.disabled = false;
      button.textContent = button.dataset.originalText || button.textContent;
    }
  }

  /**
   * Copiar texto al portapapeles
   */
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error("Error copiando al portapapeles:", error);
      return false;
    }
  }

  /**
   * Copiar elemento al portapapeles
   */
  async copyElementToClipboard(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return false;

    const text = element.textContent.trim();
    return await this.copyToClipboard(text);
  }

  /**
   * Copiar todos los datos bancarios
   */
  async copyAllBankData() {
    const bankData = {
      banco: this.elements.bankName?.textContent || "",
      telefono: this.elements.bankPhone?.textContent || "",
      cedula: this.elements.bankId?.textContent || "",
      monto: this.elements.bankAmount?.textContent || "",
    };

    const text = `Banco: ${bankData.banco}\nTeléfono: ${bankData.telefono}\nCédula: ${bankData.cedula}\nMonto: ${bankData.monto}`;
    return await this.copyToClipboard(text);
  }

  /**
   * Obtener estado actual
   */
  getCurrentState() {
    return this.currentState;
  }

  /**
   * Verificar si está en estado de carga
   */
  isLoading() {
    return this.currentState === APP_STATES.LOADING;
  }

  /**
   * Limpiar formularios
   */
  clearForms() {
    if (this.elements.depositForm) {
      this.elements.depositForm.reset();
    }
    if (this.elements.paymentConfirmationForm) {
      this.elements.paymentConfirmationForm.reset();
    }
  }

  /**
   * Animar transición entre pantallas
   */
  animateTransition(fromScreen, toScreen) {
    if (!fromScreen || !toScreen) return;

    fromScreen.style.opacity = "0";
    setTimeout(() => {
      fromScreen.classList.remove("active");
      toScreen.classList.add("active");
      toScreen.style.opacity = "0";
      setTimeout(() => {
        toScreen.style.opacity = "1";
      }, 50);
    }, UI_CONFIG.ANIMATION_DURATION);
  }

  /**
   * Mostrar modal de confirmación
   * Retorna una promesa que se resuelve con true/false
   */
  showConfirmModal(title, message) {
    return new Promise((resolve) => {
      const modal = document.getElementById("confirm-modal");
      const modalTitle = document.getElementById("modal-title");
      const modalMessage = document.getElementById("modal-message");
      const confirmBtn = document.getElementById("modal-confirm-btn");
      const cancelBtn = document.getElementById("modal-cancel-btn");

      if (!modal || !modalTitle || !modalMessage || !confirmBtn || !cancelBtn) {
        console.error("Elementos del modal no encontrados");
        resolve(false);
        return;
      }

      // Establecer contenido
      modalTitle.textContent = title;
      modalMessage.textContent = message;

      // Mostrar modal
      modal.style.display = "flex";

      // Función para cerrar modal
      const closeModal = (result) => {
        modal.style.display = "none";
        // Limpiar listeners
        confirmBtn.removeEventListener("click", handleConfirm);
        cancelBtn.removeEventListener("click", handleCancel);
        modal.removeEventListener("click", handleOverlayClick);
        resolve(result);
      };

      // Handlers
      const handleConfirm = () => closeModal(true);
      const handleCancel = () => closeModal(false);
      const handleOverlayClick = (e) => {
        if (e.target === modal) {
          closeModal(false);
        }
      };

      // Agregar listeners
      confirmBtn.addEventListener("click", handleConfirm);
      cancelBtn.addEventListener("click", handleCancel);
      modal.addEventListener("click", handleOverlayClick);
    });
  }
}

// Crear instancia única del gestor de UI
export const UI = new UIManager();
