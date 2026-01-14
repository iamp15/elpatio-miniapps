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

    if (activeButton) {
      activeButton.classList.add("active");
      // Remover notificaciones cuando se activa la pestaña
      activeButton.classList.remove("has-notifications");
    }
    if (activePanel) activePanel.classList.add("active");
  }

  /**
   * Actualizar contador de pestaña
   */
  updateTabCount(tabName, count) {
    const tabButton = document.querySelector(`[data-tab="${tabName}"]`);

    if (tabButton) {
      // Mostrar indicador solo si hay transacciones y la pestaña NO está activa
      if (count > 0 && !tabButton.classList.contains("active")) {
        tabButton.classList.add("has-notifications");
      } else {
        tabButton.classList.remove("has-notifications");
      }
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
    // Creando modal de detalles de transacción

    // Cerrar cualquier modal existente antes de crear uno nuevo
    this.closeTransactionDetailsModal();

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = modalHTML;
    overlay.style.zIndex = UI_CONFIG.MODAL_Z_INDEX;

    document.body.appendChild(overlay);
    // Modal agregado al DOM

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
      // Remover listeners anteriores si existen
      confirmBtn.removeEventListener("click", this.handleConfirmPaymentClick);

      // Crear función con contexto
      this.handleConfirmPaymentClick = () => {
        const transaccionId = confirmBtn.getAttribute("data-transaction-id");
        console.log(
          "🔍 [UI] Botón confirmar clickeado para transacción:",
          transaccionId
        );
        console.log("🔍 [UI] Stack trace del click:", new Error().stack);
        this.handleConfirmPayment(transaccionId);
      };

      confirmBtn.addEventListener("click", this.handleConfirmPaymentClick);
    }

    const rejectBtn = overlay.querySelector(".reject-payment-btn");
    if (rejectBtn) {
      // Remover listeners anteriores si existen
      rejectBtn.removeEventListener("click", this.handleRejectPaymentClick);

      // Crear función con contexto
      this.handleRejectPaymentClick = () => {
        const transaccionId = rejectBtn.getAttribute("data-transaction-id");
        this.handleRejectPayment(transaccionId);
      };

      rejectBtn.addEventListener("click", this.handleRejectPaymentClick);
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
      // Cerrando modal existente

      // Limpiar event listeners antes de remover
      const confirmBtn = overlay.querySelector(".confirm-payment-btn");
      if (confirmBtn && this.handleConfirmPaymentClick) {
        confirmBtn.removeEventListener("click", this.handleConfirmPaymentClick);
      }

      const rejectBtn = overlay.querySelector(".reject-payment-btn");
      if (rejectBtn && this.handleRejectPaymentClick) {
        rejectBtn.removeEventListener("click", this.handleRejectPaymentClick);
      }

      overlay.remove();
      // Modal removido del DOM
    }
  }

  /**
   * Mostrar pop-up de verificación de pago
   */
  showVerificarPagoPopup(data) {
    const montoSolicitado = data.monto / 100;
    
    const modalHTML = `
      <div class="transaction-details-modal verificar-pago-modal">
        <div class="modal-header">
          <h2>🔍 Verificar Pago</h2>
          <button onclick="closeTransactionDetails()" class="close-btn">&times;</button>
        </div>
        
        <div class="transaction-info">
          <div class="transaction-header deposito">
            <div class="transaction-type">
              💰 Depósito
            </div>
            <div class="transaction-amount">
              ${montoSolicitado.toFixed(2)} Bs
            </div>
          </div>
          
          <div class="details-grid">
            <div class="detail-item">
              <strong>Jugador:</strong>
              <span>${data.jugador.nombre}</span>
            </div>
            
            <div class="detail-item">
              <strong>Banco:</strong>
              <span>${data.datosPago.banco}</span>
            </div>
            
            <div class="detail-item">
              <strong>Referencia:</strong>
              <span class="reference-code">${data.datosPago.referencia}</span>
            </div>
            
            <div class="detail-item">
              <strong>Teléfono:</strong>
              <span>${data.datosPago.telefono}</span>
            </div>
          </div>

          <div class="form-group monto-verificacion">
            <label class="form-label">
              Monto recibido (Bs): *
              <span class="label-hint">Ingresa el monto exacto que recibiste</span>
            </label>
            <input 
              type="number" 
              id="monto-recibido" 
              class="form-input" 
              placeholder="0.00"
              step="0.01"
              min="0"
              value="${montoSolicitado.toFixed(2)}"
            />
            <div id="monto-alert" class="monto-alert" style="display: none;"></div>
          </div>
          
          <div class="status-message">
            <p>🔍 <strong>Verificación requerida:</strong> Confirma en tu cuenta bancaria si el pago fue recibido correctamente.</p>
          </div>
        </div>
        
        <div class="modal-actions">
          <button class="btn btn-success" id="btn-verificar-confirmar" data-transaction-id="${data.transaccionId}" data-monto-solicitado="${montoSolicitado}">✅ Confirmar Pago</button>
          <button class="btn btn-danger reject-payment-btn" data-transaction-id="${data.transaccionId}">❌ Rechazar Pago</button>
        </div>
      </div>
    `;

    this.showTransactionDetailsModal(modalHTML);

    // Agregar event listeners
    const montoRecibidoInput = document.getElementById('monto-recibido');
    const montoAlert = document.getElementById('monto-alert');

    montoRecibidoInput.addEventListener('input', (e) => {
      const montoRecibido = parseFloat(e.target.value) || 0;
      
      if (montoRecibido !== montoSolicitado) {
        montoAlert.style.display = 'block';
        
        if (montoRecibido < montoSolicitado) {
          montoAlert.className = 'monto-alert error';
          montoAlert.innerHTML = `⚠️ El monto recibido es MENOR al solicitado. Diferencia: ${(montoSolicitado - montoRecibido).toFixed(2)} Bs`;
        } else {
          montoAlert.className = 'monto-alert warning';
          montoAlert.innerHTML = `⚠️ El monto recibido es MAYOR al solicitado. Diferencia: ${(montoRecibido - montoSolicitado).toFixed(2)} Bs`;
        }
      } else {
        montoAlert.style.display = 'none';
      }
    });

    // Botón de confirmar con validación de monto
    document.getElementById('btn-verificar-confirmar').addEventListener('click', (e) => {
      const transaccionId = e.target.dataset.transactionId;
      const montoSolicitado = parseFloat(e.target.dataset.montoSolicitado);
      const montoRecibido = parseFloat(montoRecibidoInput.value) || 0;

      if (montoRecibido <= 0) {
        this.showAlert('Debes ingresar el monto recibido');
        return;
      }

      // Si hay diferencia en el monto, manejar apropiadamente
      if (montoRecibido !== montoSolicitado) {
        this.handleDiferenciaMonto(transaccionId, montoSolicitado, montoRecibido);
      } else {
        // Confirmar directamente si el monto coincide
        this.handleConfirmPayment(transaccionId);
      }
    });
  }

  /**
   * Manejar diferencia de monto
   */
  async handleDiferenciaMonto(transaccionId, montoSolicitado, montoRecibido) {
    // Obtener configuración de monto mínimo
    const montoMinimo = await this.obtenerMontoMinimo();

    // Si el monto recibido es menor al mínimo, debe rechazarse
    if (montoRecibido < montoMinimo) {
      this.showAlert(
        `El monto recibido (${montoRecibido} Bs) es menor al mínimo permitido (${montoMinimo} Bs). Debes rechazar este depósito.`
      );
      return;
    }

    // Mostrar modal de ajuste directamente para cualquier diferencia (mayor o menor)
    // El comportamiento debe ser consistente independientemente de si el monto es mayor o menor
    this.showModalAjusteMonto(transaccionId, montoSolicitado, montoRecibido);
  }

  /**
   * Obtener monto mínimo desde la configuración
   */
  async obtenerMontoMinimo() {
    try {
      // Importar API_CONFIG si no está disponible
      const API_BASE = window.API_CONFIG?.BASE_URL || 'https://elpatio-backend.fly.dev';
      const response = await fetch(`${API_BASE}/api/config/depositos`);
      if (response.ok) {
        const data = await response.json();
        return data.configuracion?.deposito_monto_minimo || 10;
      }
    } catch (error) {
      console.error('Error obteniendo configuración:', error);
    }
    return 10; // Valor por defecto
  }

  /**
   * Mostrar modal de ajuste de monto
   */
  showModalAjusteMonto(transaccionId, montoSolicitado, montoRecibido) {
    const modalHTML = `
      <div class="modal-ajuste-monto">
        <div class="modal-header warning">
          <h2>⚠️ Ajustar Monto</h2>
          <button class="close-btn" onclick="closeTransactionDetails()">&times;</button>
        </div>
        
        <div class="modal-content">
          <div class="monto-comparison">
            <div class="monto-item">
              <div class="monto-label">Monto Solicitado</div>
              <div class="monto-value">${montoSolicitado.toFixed(2)} Bs</div>
            </div>
            <div class="monto-arrow">→</div>
            <div class="monto-item">
              <div class="monto-label">Monto Recibido</div>
              <div class="monto-value">${montoRecibido.toFixed(2)} Bs</div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Confirma el monto real recibido:</label>
            <input 
              type="number" 
              id="monto-ajustado-final" 
              class="form-input" 
              value="${montoRecibido.toFixed(2)}"
              step="0.01"
              min="0"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Razón del ajuste: (opcional)</label>
            <textarea 
              id="razon-ajuste" 
              class="form-textarea" 
              rows="3" 
              placeholder="Describe por qué el monto es diferente..."
            ></textarea>
          </div>

          <div class="info-message">
            <p>ℹ️ El depósito se completará con el monto ajustado. El jugador recibirá este monto en su saldo.</p>
          </div>
        </div>
        
        <div class="modal-actions">
          <button class="btn btn-secondary" onclick="closeTransactionDetails()">Cancelar</button>
          <button class="btn btn-success" id="btn-confirmar-ajuste">Confirmar Ajuste</button>
        </div>
      </div>
    `;

    this.showTransactionDetailsModal(modalHTML);

    // Event listener para confirmar ajuste
    document.getElementById('btn-confirmar-ajuste').addEventListener('click', () => {
      const montoFinal = parseFloat(document.getElementById('monto-ajustado-final').value);
      const razon = document.getElementById('razon-ajuste').value.trim();

      if (!montoFinal || montoFinal <= 0) {
        this.showAlert('Debes ingresar un monto válido');
        return;
      }

      // Convertir de bolívares a centavos (el backend espera centavos)
      const montoEnCentavos = Math.round(montoFinal * 100);
      this.procesarAjusteMonto(transaccionId, montoEnCentavos, razon || 'Ajuste de monto por discrepancia');
    });
  }

  /**
   * Procesar ajuste de monto
   */
  procesarAjusteMonto(transaccionId, montoReal, razon) {
    console.log('💰 Ajustando monto:', { transaccionId, montoReal, razon });

    // Marcar como procesando
    this.processingPayment = transaccionId;

    // Cerrar el modal
    this.closeTransactionDetailsModal();

    // Enviar ajuste via WebSocket
    if (
      window.cajeroWebSocket &&
      window.cajeroWebSocket.isConnected &&
      window.cajeroWebSocket.isAuthenticated
    ) {
      // Enviar ajuste - la confirmación automática se hará cuando llegue el evento monto-ajustado
      window.cajeroWebSocket.ajustarMontoDeposito(transaccionId, montoReal, razon);
    } else {
      console.error('No hay conexión WebSocket disponible');
      this.showAlert('Error: No hay conexión disponible');
      this.processingPayment = null;
    }
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
   * Mostrar modal de confirmación
   */
  async showConfirmDialog(message, callback) {
    // Detectar tipo de confirmación basado en el mensaje
    let title = "Confirmar acción";
    let icon = "❓";
    let type = "confirm";
    let confirmText = "Confirmar";
    let cancelText = "Cancelar";

    if (message.includes("aceptar") || message.includes("asignar")) {
      title = "Aceptar transacción";
      icon = "✅";
      confirmText = "Aceptar";
    } else if (message.includes("rechazar") || message.includes("eliminar")) {
      title = "Confirmar acción";
      icon = "⚠️";
      type = "danger";
      confirmText = "Sí, continuar";
    }

    try {
      const confirmed = await window.notificationManager.confirm(
        title,
        message,
        {
          confirmText,
          cancelText,
          type,
          icon,
        }
      );

      if (confirmed) {
        callback();
      }
    } catch (error) {
      console.error("Error en modal de confirmación:", error);
      // Fallback a confirm nativo si hay error
      if (confirm(message)) {
        callback();
      }
    }
  }

  /**
   * Mostrar notificación toast
   */
  showAlert(message, type = "info") {
    // Detectar tipo automáticamente basado en el mensaje
    if (
      message.includes("✅") ||
      message.includes("exitoso") ||
      message.includes("correctamente")
    ) {
      type = "success";
    } else if (
      message.includes("❌") ||
      message.includes("Error") ||
      message.includes("error")
    ) {
      type = "error";
    } else if (message.includes("⚠️") || message.includes("advertencia")) {
      type = "warning";
    }

    // Limpiar emojis del mensaje para el título
    const cleanMessage = message.replace(/[✅❌⚠️ℹ️]/g, "").trim();

    // Determinar título y mensaje
    let title, msg;
    if (cleanMessage.includes(":")) {
      [title, msg] = cleanMessage.split(":", 2);
      title = title.trim();
      msg = msg.trim();
    } else {
      title =
        type === "success"
          ? "Éxito"
          : type === "error"
          ? "Error"
          : type === "warning"
          ? "Advertencia"
          : "Información";
      msg = cleanMessage;
    }

    // Usar el sistema de notificaciones toast
    if (window.notificationManager) {
      window.notificationManager.show(type, title, msg);
    } else {
      // Fallback a alert si no está disponible
      alert(message);
    }
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
    // handleConfirmPayment llamado

    // Verificar si ya se está procesando esta transacción
    if (this.processingPayment === transaccionId) {
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
      // Enviando confirmación via WebSocket
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
      return;
    }

    // Mostrar modal de rechazo estructurado
    this.showModalRechazoDeposito(transaccionId);
  }

  /**
   * Mostrar modal de rechazo estructurado
   */
  showModalRechazoDeposito(transaccionId) {
    const modalHTML = `
      <div class="modal-rechazo-deposito">
        <div class="modal-header error">
          <h2>❌ Rechazar Depósito</h2>
          <button class="close-btn" onclick="closeTransactionDetails()">&times;</button>
        </div>
        
        <div class="modal-content">
          <div class="form-group">
            <label class="form-label">Motivo del rechazo: *</label>
            <textarea 
              id="descripcion-rechazo" 
              class="form-textarea" 
              rows="4" 
              placeholder="Describe el motivo del rechazo con detalle..."
              required
            ></textarea>
          </div>

          <div class="form-group">
            <label class="form-label">Evidencia (imagen opcional):</label>
            <div class="file-upload-container">
              <input 
                type="file" 
                id="imagen-rechazo" 
                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                class="file-input"
              />
              <label for="imagen-rechazo" class="file-input-label">
                <span class="file-input-icon">📷</span>
                <span class="file-input-text">Seleccionar imagen (máx. 5MB)</span>
              </label>
              <div id="imagen-preview-container" class="imagen-preview-container" style="display: none;">
                <img id="imagen-preview" class="imagen-preview" alt="Preview" />
                <button type="button" id="btn-eliminar-imagen" class="btn-eliminar-imagen">✕</button>
                <div class="imagen-info">
                  <span id="imagen-nombre"></span>
                  <span id="imagen-tamaño"></span>
                </div>
              </div>
            </div>
            <small class="form-help-text">Formatos permitidos: JPG, PNG, WEBP, GIF. Tamaño máximo: 5MB</small>
          </div>

          <div class="info-message">
            <p>ℹ️ Esta información será enviada al jugador.</p>
          </div>
        </div>
        
        <div class="modal-actions">
          <button class="btn btn-secondary" onclick="closeTransactionDetails()">Cancelar</button>
          <button class="btn btn-danger" id="btn-confirmar-rechazo">Confirmar Rechazo</button>
        </div>
      </div>
    `;

    this.showTransactionDetailsModal(modalHTML);

    // Configurar event listeners para el input de archivo
    const imagenInput = document.getElementById('imagen-rechazo');
    const imagenPreview = document.getElementById('imagen-preview');
    const imagenPreviewContainer = document.getElementById('imagen-preview-container');
    const imagenNombre = document.getElementById('imagen-nombre');
    const imagenTamaño = document.getElementById('imagen-tamaño');
    const btnEliminarImagen = document.getElementById('btn-eliminar-imagen');

    imagenInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        // Validar tamaño (5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB en bytes
        if (file.size > maxSize) {
          this.showAlert('La imagen no puede ser mayor a 5MB');
          e.target.value = '';
          return;
        }

        // Validar tipo de archivo
        const tiposPermitidos = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
        if (!tiposPermitidos.includes(file.type)) {
          this.showAlert('Tipo de archivo no permitido. Solo se permiten imágenes (JPG, PNG, WEBP, GIF)');
          e.target.value = '';
          return;
        }

        // Mostrar preview
        const reader = new FileReader();
        reader.onload = (event) => {
          imagenPreview.src = event.target.result;
          imagenNombre.textContent = file.name;
          imagenTamaño.textContent = this.formatearTamaño(file.size);
          imagenPreviewContainer.style.display = 'block';
        };
        reader.readAsDataURL(file);
      }
    });

    // Botón para eliminar imagen seleccionada
    btnEliminarImagen.addEventListener('click', () => {
      imagenInput.value = '';
      imagenPreviewContainer.style.display = 'none';
      imagenPreview.src = '';
    });

    // Botón de confirmar rechazo
    document.getElementById('btn-confirmar-rechazo').addEventListener('click', () => {
      this.procesarRechazoDeposito(transaccionId);
    });
  }

  /**
   * Formatear tamaño de archivo para mostrar
   */
  formatearTamaño(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Procesar rechazo de depósito con datos simplificados
   */
  async procesarRechazoDeposito(transaccionId) {
    // Obtener descripción (obligatoria)
    const descripcion = document.getElementById('descripcion-rechazo')?.value.trim();
    if (!descripcion) {
      this.showAlert('Debes proporcionar un motivo de rechazo');
      return;
    }

    // Obtener imagen (opcional)
    const imagenInput = document.getElementById('imagen-rechazo');
    const imagenFile = imagenInput?.files[0];

    let imagenRechazoUrl = null;

    // Si hay imagen, subirla primero
    if (imagenFile) {
      try {
        // Mostrar indicador de carga
        const btnConfirmar = document.getElementById('btn-confirmar-rechazo');
        const textoOriginal = btnConfirmar.textContent;
        btnConfirmar.disabled = true;
        btnConfirmar.textContent = 'Subiendo imagen...';

        // Subir imagen al backend
        imagenRechazoUrl = await this.subirImagenRechazo(imagenFile);

        // Restaurar botón
        btnConfirmar.disabled = false;
        btnConfirmar.textContent = textoOriginal;
      } catch (error) {
        console.error('❌ Error subiendo imagen:', error);
        this.showAlert(`Error al subir imagen: ${error.message || 'Error desconocido'}`);
        return;
      }
    }

    // Marcar como procesando
    this.processingPayment = transaccionId;

    // Cerrar el modal
    this.closeTransactionDetailsModal();

    // Enviar rechazo via WebSocket con estructura simplificada
    if (
      window.cajeroWebSocket &&
      window.cajeroWebSocket.isConnected &&
      window.cajeroWebSocket.isAuthenticated
    ) {
      window.cajeroWebSocket.rechazarPagoCajero(transaccionId, {
        descripcionDetallada: descripcion,
        imagenRechazoUrl: imagenRechazoUrl
      });
    } else {
      console.error('No hay conexión WebSocket disponible');
      this.showAlert('Error: No hay conexión disponible');
      this.processingPayment = null;
    }
  }

  /**
   * Subir imagen de rechazo al backend
   */
  async subirImagenRechazo(archivo) {
    const formData = new FormData();
    formData.append('imagen', archivo);

    // Obtener token de autenticación
    let token = null;
    
    // Intentar obtener del WebSocket primero
    if (window.cajeroWebSocket && window.cajeroWebSocket.lastAuthToken) {
      token = window.cajeroWebSocket.lastAuthToken;
    }
    
    // Si no está en WebSocket, intentar obtener del AuthManager o localStorage
    if (!token && window.AuthManager && window.AuthManager.getToken) {
      token = window.AuthManager.getToken();
    }
    
    // Fallback: intentar obtener de localStorage directamente
    if (!token) {
      token = localStorage.getItem('cajeroToken') || 
              localStorage.getItem('token') || 
              sessionStorage.getItem('cajeroToken');
    }

    if (!token) {
      throw new Error('No hay token de autenticación disponible. Por favor, inicia sesión nuevamente.');
    }
    
    // Obtener URL del backend
    const backendUrl = this.getBackendUrl();

    const response = await fetch(`${backendUrl}/api/upload/imagen-rechazo`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
      throw new Error(errorData.error || errorData.mensaje || 'Error al subir imagen');
    }

    const data = await response.json();
    return data.imagen.url;
  }

  /**
   * Obtener URL del backend según el entorno
   */
  getBackendUrl() {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:3001';
    }
    // En producción, usar la URL del backend
    return 'https://elpatio-backend.fly.dev';
  }

  /**
   * Referir transacción a administrador
   */
  referirAAdmin(transaccionId, descripcion) {
    console.log('⚠️ Refiriendo transacción a admin:', transaccionId);

    // Marcar como procesando
    this.processingPayment = transaccionId;

    // Cerrar el modal
    this.closeTransactionDetailsModal();

    // Enviar evento de referir a admin
    if (
      window.cajeroWebSocket &&
      window.cajeroWebSocket.isConnected &&
      window.cajeroWebSocket.isAuthenticated
    ) {
      window.cajeroWebSocket.referirAAdmin(transaccionId, descripcion);
    } else {
      console.error('No hay conexión WebSocket disponible');
      this.showAlert('Error: No hay conexión disponible');
      this.processingPayment = null;
    }
  }
}

// Crear instancia única del gestor de UI
export const UI = new UIManager();
