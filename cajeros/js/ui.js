/**
 * Módulo de interfaz de usuario para cajeros
 */

import { DOM_SELECTORS, UI_CONFIG, MESSAGES, APP_STATES } from "./config.js";

class UIManager {
  constructor() {
    this.elements = {};
    this.currentState = APP_STATES.LOGIN;
    this.initElements();
  }

  /**
   * Inicializar referencias a elementos del DOM
   */
  initElements() {
    // Pantallas
    this.elements.loginScreen = document.querySelector(
      DOM_SELECTORS.LOGIN_SCREEN
    );
    this.elements.dashboardScreen = document.querySelector(
      DOM_SELECTORS.DASHBOARD_SCREEN
    );

    // Formulario de login
    this.elements.loginForm = document.querySelector(DOM_SELECTORS.LOGIN_FORM);
    this.elements.loginBtn = document.querySelector(DOM_SELECTORS.LOGIN_BTN);
    this.elements.loginText = document.querySelector(DOM_SELECTORS.LOGIN_TEXT);
    this.elements.loginLoading = document.querySelector(
      DOM_SELECTORS.LOGIN_LOADING
    );
    this.elements.errorMessage = document.querySelector(
      DOM_SELECTORS.ERROR_MESSAGE
    );

    // Botones de acción
    this.elements.logoutBtn = document.querySelector(DOM_SELECTORS.LOGOUT_BTN);
    this.elements.refreshBtn = document.querySelector(
      DOM_SELECTORS.REFRESH_BTN
    );

    // Información del cajero
    this.elements.cajeroName = document.querySelector(
      DOM_SELECTORS.CAJERO_NAME
    );
    this.elements.cajeroEmailDisplay = document.querySelector(
      DOM_SELECTORS.CAJERO_EMAIL_DISPLAY
    );
    this.elements.cajeroBanco = document.querySelector(
      DOM_SELECTORS.CAJERO_BANCO
    );
    this.elements.cajeroCedula = document.querySelector(
      DOM_SELECTORS.CAJERO_CEDULA
    );
    this.elements.cajeroTelefonoPago = document.querySelector(
      DOM_SELECTORS.CAJERO_TELEFONO_PAGO
    );

    // Transacciones
    this.elements.loadingTransactions = document.querySelector(
      DOM_SELECTORS.LOADING_TRANSACTIONS
    );
    this.elements.transactionsList = document.querySelector(
      DOM_SELECTORS.TRANSACTIONS_LIST
    );
    this.elements.noTransactions = document.querySelector(
      DOM_SELECTORS.NO_TRANSACTIONS
    );
  }

  /**
   * Configurar event listeners
   */
  setupEventListeners(eventHandlers) {
    if (this.elements.loginForm && eventHandlers.onLogin) {
      this.elements.loginForm.addEventListener("submit", eventHandlers.onLogin);
    }

    if (this.elements.logoutBtn && eventHandlers.onLogout) {
      this.elements.logoutBtn.addEventListener("click", eventHandlers.onLogout);
    }

    if (this.elements.refreshBtn && eventHandlers.onRefresh) {
      this.elements.refreshBtn.addEventListener(
        "click",
        eventHandlers.onRefresh
      );
    }
  }

  /**
   * Mostrar pantalla de login
   */
  showLoginScreen() {
    this.elements.loginScreen?.classList.add("active");
    this.elements.dashboardScreen?.classList.remove("active");
    this.elements.loginForm?.reset();
    this.hideError();
    this.currentState = APP_STATES.LOGIN;
  }

  /**
   * Mostrar dashboard
   */
  showDashboard() {
    this.elements.loginScreen?.classList.remove("active");
    this.elements.dashboardScreen?.classList.add("active");
    this.currentState = APP_STATES.DASHBOARD;
  }

  /**
   * Actualizar información del cajero en la UI
   */
  updateCajeroDisplay(cajeroInfo) {
    if (!cajeroInfo) return;

    if (this.elements.cajeroName) {
      this.elements.cajeroName.textContent = cajeroInfo.nombreCompleto || "-";
    }

    if (this.elements.cajeroEmailDisplay) {
      this.elements.cajeroEmailDisplay.textContent = cajeroInfo.email || "-";
    }

    if (this.elements.cajeroBanco) {
      this.elements.cajeroBanco.textContent =
        cajeroInfo.datosPagoMovil?.banco || "-";
    }

    if (this.elements.cajeroCedula) {
      const cedula = cajeroInfo.datosPagoMovil?.cedula;
      if (cedula && cedula.prefijo && cedula.numero) {
        this.elements.cajeroCedula.textContent = `${cedula.prefijo}-${cedula.numero}`;
      } else {
        this.elements.cajeroCedula.textContent = "-";
      }
    }

    if (this.elements.cajeroTelefonoPago) {
      this.elements.cajeroTelefonoPago.textContent =
        cajeroInfo.datosPagoMovil?.telefono || "-";
    }
  }

  /**
   * Mostrar estado de carga del login
   */
  setLoading(loading) {
    if (loading) {
      this.elements.loginBtn.disabled = true;
      this.elements.loginText.style.display = "none";
      this.elements.loginLoading.style.display = "inline";
    } else {
      this.elements.loginBtn.disabled = false;
      this.elements.loginText.style.display = "inline";
      this.elements.loginLoading.style.display = "none";
    }
  }

  /**
   * Mostrar mensaje de error
   */
  showError(message) {
    if (this.elements.errorMessage) {
      this.elements.errorMessage.textContent = message;
      this.elements.errorMessage.style.display = "block";
    }
  }

  /**
   * Ocultar mensaje de error
   */
  hideError() {
    if (this.elements.errorMessage) {
      this.elements.errorMessage.style.display = "none";
    }
  }

  /**
   * Mostrar estado de carga de transacciones
   */
  showLoadingTransactions(show) {
    if (this.elements.loadingTransactions) {
      this.elements.loadingTransactions.style.display = show ? "block" : "none";
    }
  }

  /**
   * Mostrar mensaje de no transacciones
   */
  showNoTransactions() {
    if (this.elements.noTransactions) {
      this.elements.noTransactions.style.display = "block";
    }
    if (this.elements.transactionsList) {
      this.elements.transactionsList.innerHTML = "";
    }
  }

  /**
   * Ocultar mensaje de no transacciones
   */
  hideNoTransactions() {
    if (this.elements.noTransactions) {
      this.elements.noTransactions.style.display = "none";
    }
  }

  /**
   * Limpiar lista de transacciones
   */
  clearTransactionsList() {
    if (this.elements.transactionsList) {
      this.elements.transactionsList.innerHTML = "";
    }
  }

  /**
   * Agregar transacción a la lista
   */
  addTransactionToList(transactionElement) {
    if (this.elements.transactionsList) {
      this.elements.transactionsList.appendChild(transactionElement);
    }
  }

  /**
   * Mostrar modal de detalles de transacción
   */
  showTransactionDetailsModal(modalHTML) {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = modalHTML;
    overlay.style.zIndex = UI_CONFIG.MODAL_Z_INDEX;

    document.body.appendChild(overlay);

    // Configurar evento de cierre
    const closeBtn = overlay.querySelector(".close-btn");
    if (closeBtn) {
      closeBtn.addEventListener("click", () =>
        this.closeTransactionDetailsModal()
      );
    }

    // Configurar evento de click en overlay para cerrar
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        this.closeTransactionDetailsModal();
      }
    });
  }

  /**
   * Cerrar modal de detalles de transacción
   */
  closeTransactionDetailsModal() {
    const overlay = document.querySelector(".modal-overlay");
    if (overlay) {
      overlay.remove();
    }
  }

  /**
   * Mostrar alerta con confirmación
   */
  showConfirmDialog(message, callback) {
    if (confirm(message)) {
      callback();
    }
  }

  /**
   * Mostrar alerta simple
   */
  showAlert(message) {
    alert(message);
  }

  /**
   * Obtener datos del formulario de login
   */
  getLoginFormData() {
    if (!this.elements.loginForm) return null;

    const formData = new FormData(this.elements.loginForm);
    return {
      email: formData.get("email"),
      password: formData.get("password"),
    };
  }

  /**
   * Obtener estado actual de la UI
   */
  getCurrentState() {
    return this.currentState;
  }

  /**
   * Verificar si la UI está en estado de carga
   */
  isLoading() {
    return this.currentState === APP_STATES.LOADING;
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
}

// Crear instancia única del gestor de UI
export const UI = new UIManager();
