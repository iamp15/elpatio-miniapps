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

    // Pestañas
    this.elements.tabButtons = document.querySelectorAll(".tab-btn");
    this.elements.tabPanels = document.querySelectorAll(".tab-panel");
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

    // Event listeners para pestañas
    this.setupTabEventListeners(eventHandlers);
  }

  /**
   * Configurar event listeners para pestañas
   */
  setupTabEventListeners(eventHandlers) {
    this.elements.tabButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        const tabName = e.currentTarget.dataset.tab;
        if (eventHandlers.onTabSwitch) {
          eventHandlers.onTabSwitch(tabName);
        }
      });
    });
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
   * Limpiar lista de transacciones de una pestaña específica
   */
  clearTransactionsListForTab(tabName) {
    const listElement = document.querySelector(`#transactions-list-${tabName}`);
    if (listElement) {
      listElement.innerHTML = "";
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
   * Agregar transacción a la lista de una pestaña específica
   */
  addTransactionToListForTab(tabName, transactionElement) {
    const listElement = document.querySelector(`#transactions-list-${tabName}`);
    if (listElement) {
      listElement.appendChild(transactionElement);
    }
  }

  /**
   * Mostrar transacciones para una pestaña específica
   */
  displayTransactionsForTab(tabName, transactions) {
    this.clearTransactionsListForTab(tabName);
    this.hideNoTransactionsForTab(tabName);

    if (!transactions || transactions.length === 0) {
      this.showNoTransactionsForTab(tabName);
      return;
    }

    transactions.forEach((transaccion) => {
      // Crear tarjeta usando TransactionManager
      if (window.transactionManager) {
        const transactionCard =
          window.transactionManager.createTransactionCard(transaccion);
        this.addTransactionToListForTab(tabName, transactionCard);
      }
    });
  }

  /**
   * Cambiar pestaña activa
   */
  switchTab(tabName) {
    // Remover clase active de todos los botones y paneles
    this.elements.tabButtons.forEach((btn) => btn.classList.remove("active"));
    this.elements.tabPanels.forEach((panel) =>
      panel.classList.remove("active")
    );

    // Agregar clase active al botón y panel correspondientes
    const activeButton = document.querySelector(`[data-tab="${tabName}"]`);
    const activePanel = document.querySelector(`#tab-${tabName}`);

    if (activeButton) activeButton.classList.add("active");
    if (activePanel) activePanel.classList.add("active");
  }

  /**
   * Actualizar contador de pestaña
   */
  updateTabCount(tabName, count) {
    const countElement = document.querySelector(`#count-${tabName}`);
    if (countElement) {
      countElement.textContent = count;
    }
  }

  /**
   * Mostrar mensaje de no transacciones para una pestaña específica
   */
  showNoTransactionsForTab(tabName) {
    const noTransactionsElement = document.querySelector(
      `#no-transactions-${tabName}`
    );
    if (noTransactionsElement) {
      noTransactionsElement.style.display = "block";
    }
  }

  /**
   * Ocultar mensaje de no transacciones para una pestaña específica
   */
  hideNoTransactionsForTab(tabName) {
    const noTransactionsElement = document.querySelector(
      `#no-transactions-${tabName}`
    );
    if (noTransactionsElement) {
      noTransactionsElement.style.display = "none";
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

    // Configurar botones de confirmar y rechazar pago
    const confirmBtn = overlay.querySelector(".confirm-payment-btn");
    if (confirmBtn) {
      confirmBtn.addEventListener("click", () => {
        const transaccionId = confirmBtn.getAttribute("data-transaction-id");
        this.handleConfirmPayment(transaccionId);
      });
    }

    const rejectBtn = overlay.querySelector(".reject-payment-btn");
    if (rejectBtn) {
      rejectBtn.addEventListener("click", () => {
        const transaccionId = rejectBtn.getAttribute("data-transaction-id");
        this.handleRejectPayment(transaccionId);
      });
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
   * Mostrar pop-up de verificación de pago
   */
  showVerificarPagoPopup(data) {
    const modalHTML = `
      <div class="verificar-pago-modal">
        <div class="modal-header">
          <h2>🔍 Verificar Pago</h2>
          <button class="close-btn">&times;</button>
        </div>
        <div class="modal-content">
          <div class="payment-info">
            <div class="info-row">
              <span class="label">Jugador:</span>
              <span class="value">${data.jugador.nombre}</span>
            </div>
            <div class="info-row">
              <span class="label">Monto:</span>
              <span class="value amount">${(data.monto / 100).toFixed(
                2
              )} Bs</span>
            </div>
            <div class="info-row">
              <span class="label">Banco:</span>
              <span class="value">${data.datosPago.banco}</span>
            </div>
            <div class="info-row">
              <span class="label">Referencia:</span>
              <span class="value reference">${data.datosPago.referencia}</span>
            </div>
            <div class="info-row">
              <span class="label">Teléfono:</span>
              <span class="value">${data.datosPago.telefono}</span>
            </div>
          </div>
          <div class="verification-message">
            <p>📱 Por favor verifica en tu cuenta bancaria si el pago fue recibido correctamente.</p>
          </div>
        </div>
          <div class="modal-actions">
            <button class="btn btn-success confirm-payment-btn" data-transaction-id="${
              data.transaccionId
            }">✅ Confirmar Pago</button>
            <button class="btn btn-danger reject-payment-btn" data-transaction-id="${
              data.transaccionId
            }">❌ Rechazar Pago</button>
            <button class="btn btn-secondary close-btn">Cerrar</button>
          </div>
      </div>
    `;

    this.showTransactionDetailsModal(modalHTML);
  }

  /**
   * Mostrar pop-up de depósito completado
   */
  showDepositoCompletadoPopup(data) {
    const modalHTML = `
      <div class="deposito-completado-modal">
        <div class="modal-header success">
          <h2>✅ Depósito Completado</h2>
          <button class="close-btn">&times;</button>
        </div>
        <div class="modal-content">
          <div class="success-info">
            <div class="info-row">
              <span class="label">Transacción:</span>
              <span class="value">${data.transaccionId}</span>
            </div>
            <div class="info-row">
              <span class="label">Monto:</span>
              <span class="value amount">${(data.monto / 100).toFixed(
                2
              )} Bs</span>
            </div>
            <div class="info-row">
              <span class="label">Nuevo saldo del jugador:</span>
              <span class="value balance">${(data.saldoNuevo / 100).toFixed(
                2
              )} Bs</span>
            </div>
          </div>
          <div class="success-message">
            <p>🎉 ¡Transacción procesada exitosamente!</p>
            <p>El saldo del jugador ha sido actualizado.</p>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-primary close-btn">Continuar</button>
        </div>
      </div>
    `;

    this.showTransactionDetailsModal(modalHTML);
  }

  /**
   * Mostrar pop-up de depósito rechazado
   */
  showDepositoRechazadoPopup(data) {
    const modalHTML = `
      <div class="deposito-rechazado-modal">
        <div class="modal-header error">
          <h2>❌ Depósito Rechazado</h2>
          <button class="close-btn">&times;</button>
        </div>
        <div class="modal-content">
          <div class="error-info">
            <div class="info-row">
              <span class="label">Transacción:</span>
              <span class="value">${data.transaccionId}</span>
            </div>
            <div class="info-row">
              <span class="label">Motivo:</span>
              <span class="value reason">${data.motivo}</span>
            </div>
          </div>
          <div class="error-message">
            <p>⚠️ La transacción ha sido rechazada.</p>
            <p>El jugador será notificado del rechazo.</p>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary close-btn">Entendido</button>
        </div>
      </div>
    `;

    this.showTransactionDetailsModal(modalHTML);
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

  /**
   * Manejar confirmación de pago
   */
  handleConfirmPayment(transaccionId) {
    console.log("✅ Confirmando pago para transacción:", transaccionId);

    // Verificar si ya se está procesando esta transacción
    if (this.processingPayment === transaccionId) {
      console.log("⚠️ Ya se está procesando esta transacción");
      return;
    }

    // Marcar como procesando
    this.processingPayment = transaccionId;

    // Cerrar el modal
    this.closeTransactionDetailsModal();

    // Enviar confirmación via WebSocket
    if (
      window.cajeroWebSocket &&
      window.cajeroWebSocket.isConnected &&
      window.cajeroWebSocket.isAuthenticated
    ) {
      window.cajeroWebSocket.confirmarPagoCajero(transaccionId);
    } else {
      console.error("No hay conexión WebSocket disponible");
      this.showAlert("Error: No hay conexión disponible");
      this.processingPayment = null; // Limpiar en caso de error
    }
  }

  /**
   * Manejar rechazo de pago
   */
  handleRejectPayment(transaccionId) {
    // Verificar si ya se está procesando esta transacción
    if (this.processingPayment === transaccionId) {
      console.log("⚠️ Ya se está procesando esta transacción");
      return;
    }

    const motivo = prompt("Ingresa el motivo del rechazo:");
    if (!motivo || motivo.trim() === "") {
      this.showAlert("Debes ingresar un motivo para rechazar el pago");
      return;
    }

    console.log(
      "❌ Rechazando pago para transacción:",
      transaccionId,
      "Motivo:",
      motivo
    );

    // Marcar como procesando
    this.processingPayment = transaccionId;

    // Cerrar el modal
    this.closeTransactionDetailsModal();

    // Enviar rechazo via WebSocket
    if (
      window.cajeroWebSocket &&
      window.cajeroWebSocket.isConnected &&
      window.cajeroWebSocket.isAuthenticated
    ) {
      window.cajeroWebSocket.rechazarPagoCajero(transaccionId, motivo.trim());
    } else {
      console.error("No hay conexión WebSocket disponible");
      this.showAlert("Error: No hay conexión disponible");
      this.processingPayment = null; // Limpiar en caso de error
    }
  }
}

// Crear instancia única del gestor de UI
export const UI = new UIManager();
