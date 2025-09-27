/**
 * Módulo de gestión de transacciones para cajeros
 */

import { TRANSACTION_CONFIG, TRANSACTION_TYPES, MESSAGES } from "./config.js";
import { API } from "./api.js";
import { UI } from "./ui.js";

class TransactionManager {
  constructor() {
    this.transactions = [];
    this.filteredTransactions = {
      pendientes: [],
      en_proceso: [],
      completadas: []
    };
    this.currentTab = 'pendientes';
    this.callbacks = {
      onTransactionAssigned: null,
      onTransactionError: null,
    };
  }

  /**
   * Configurar callbacks para eventos de transacciones
   */
  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Cargar transacciones pendientes
   */
  async loadTransactions(token) {
    if (!token) return;

    try {
      UI.showLoadingTransactions(true);
      UI.hideNoTransactions();

      const response = await API.getTransaccionesPendientes(token);

      if (response.ok) {
        const data = await response.json();
        console.log("Respuesta del endpoint:", data);

        // El endpoint devuelve { transacciones: [...], total: number }
        const transacciones = data.transacciones || data;
        console.log("Transacciones extraídas:", transacciones);

        this.transactions = transacciones;
        this.filterTransactionsByStatus();
        this.displayTransactionsByTab();
        this.updateTabCounts();
      } else {
        console.error("Error cargando transacciones:", response.status);
        UI.showNoTransactions();
      }
    } catch (error) {
      console.error("Error cargando transacciones:", error);
      UI.showNoTransactions();
    } finally {
      UI.showLoadingTransactions(false);
    }
  }

  /**
   * Filtrar transacciones por estado
   */
  filterTransactionsByStatus() {
    this.filteredTransactions = {
      pendientes: [],
      en_proceso: [],
      completadas: []
    };

    this.transactions.forEach((transaccion) => {
      switch (transaccion.estado) {
        case 'pendiente':
          this.filteredTransactions.pendientes.push(transaccion);
          break;
        case 'en_proceso':
          this.filteredTransactions.en_proceso.push(transaccion);
          break;
        case 'confirmada':
          this.filteredTransactions.completadas.push(transaccion);
          break;
        default:
          // Por defecto, considerar como pendiente
          this.filteredTransactions.pendientes.push(transaccion);
      }
    });
  }

  /**
   * Mostrar transacciones según la pestaña activa
   */
  displayTransactionsByTab() {
    const currentTransactions = this.filteredTransactions[this.currentTab];
    UI.displayTransactionsForTab(this.currentTab, currentTransactions);
  }

  /**
   * Cambiar pestaña activa
   */
  switchTab(tabName) {
    this.currentTab = tabName;
    this.displayTransactionsByTab();
    UI.switchTab(tabName);
  }

  /**
   * Actualizar contadores de pestañas
   */
  updateTabCounts() {
    UI.updateTabCount('pendientes', this.filteredTransactions.pendientes.length);
    UI.updateTabCount('en_proceso', this.filteredTransactions.en_proceso.length);
    UI.updateTabCount('completadas', this.filteredTransactions.completadas.length);
  }

  /**
   * Mostrar transacciones en la interfaz (método legacy - mantener compatibilidad)
   */
  displayTransactions(transacciones) {
    // Este método se mantiene para compatibilidad pero ahora usa el nuevo sistema
    this.filterTransactionsByStatus();
    this.displayTransactionsByTab();
    this.updateTabCounts();
  }

  /**
   * Formatear referencia para mostrar solo últimos dígitos
   */
  formatReference(referencia) {
    if (!referencia) return "N/A";
    if (referencia.length <= TRANSACTION_CONFIG.REFERENCE_DISPLAY_LENGTH) {
      return referencia;
    }
    return (
      "..." + referencia.slice(-TRANSACTION_CONFIG.REFERENCE_DISPLAY_LENGTH)
    );
  }

  /**
   * Formatear monto para mostrar
   */
  formatAmount(monto) {
    return (monto / TRANSACTION_CONFIG.AMOUNT_DIVISOR).toLocaleString(
      TRANSACTION_CONFIG.LOCALE
    );
  }

  /**
   * Obtener información del tipo de transacción
   */
  getTransactionTypeInfo(categoria) {
    return categoria === TRANSACTION_TYPES.DEPOSITO.key
      ? TRANSACTION_TYPES.DEPOSITO
      : TRANSACTION_TYPES.RETIRO;
  }

  /**
   * Crear tarjeta de transacción
   */
  createTransactionCard(transaccion) {
    const card = document.createElement("div");
    card.className = "transaction-card";
    card.dataset.transactionId = transaccion._id;
    card.dataset.status = transaccion.estado || 'pendiente';

    const tipoInfo = this.getTransactionTypeInfo(transaccion.categoria);
    const estado = transaccion.estado || 'pendiente';

    card.innerHTML = `
      <div class="transaction-header">
        <div class="transaction-type ${tipoInfo.class}">
          ${tipoInfo.icon} ${tipoInfo.label}
        </div>
        <div class="transaction-amount">
          ${this.formatAmount(transaccion.monto)} Bs
        </div>
      </div>
      
      <div class="transaction-details">
        <p><strong>Descripción:</strong> ${
          transaccion.descripcion || "Sin descripción"
        }</p>
        <p><strong>Categoría:</strong> ${transaccion.categoria || "N/A"}</p>
        <p><strong>Estado:</strong> ${this.formatEstado(estado)}</p>
        <p><strong>Fecha:</strong> ${new Date(
          transaccion.createdAt
        ).toLocaleString()}</p>
        ${
          transaccion.referencia
            ? `<p><strong>ID Transacción:</strong> ${this.formatReference(
                transaccion.referencia
              )}</p>`
            : ""
        }
        ${
          transaccion.jugadorId
            ? `<p><strong>Jugador:</strong> ${
                transaccion.jugadorId.username ||
                transaccion.jugadorId.nickname ||
                "N/A"
              }</p>`
            : ""
        }
        ${this.renderPaymentDetails(transaccion.datosPago)}
      </div>
      
      <div class="transaction-actions">
        ${this.renderActionButtons(transaccion, estado)}
      </div>
    `;

    return card;
  }

  /**
   * Formatear estado para mostrar
   */
  formatEstado(estado) {
    const estados = {
      'pendiente': '⏳ Pendiente',
      'en_proceso': '🔄 En Proceso',
      'confirmada': '✅ Completada'
    };
    return estados[estado] || estado;
  }

  /**
   * Renderizar botones de acción según el estado
   */
  renderActionButtons(transaccion, estado) {
    switch (estado) {
      case 'pendiente':
        return `
          <button class="btn-action btn-accept" onclick="acceptTransaction('${
            transaccion._id
          }')">
            ✅ Aceptar
          </button>
        `;
      case 'en_proceso':
        return `
          <button class="btn-action btn-view" onclick="viewTransactionDetails('${
            transaccion._id
          }')">
            👁️ Ver Detalles
          </button>
        `;
      case 'confirmada':
        return `
          <button class="btn-action btn-view" onclick="viewTransactionDetails('${
            transaccion._id
          }')">
            👁️ Ver Detalles
          </button>
        `;
      default:
        return `
          <button class="btn-action btn-accept" onclick="acceptTransaction('${
            transaccion._id
          }')">
            ✅ Aceptar
          </button>
        `;
    }
  }

  /**
   * Renderizar detalles de pago
   */
  renderPaymentDetails(datosPago) {
    if (!datosPago) return "";

    return `
      <p><strong>Método:</strong> ${datosPago.metodo || "N/A"}</p>
      ${
        datosPago.banco
          ? `<p><strong>Banco:</strong> ${datosPago.banco}</p>`
          : ""
      }
      ${
        datosPago.telefono
          ? `<p><strong>Teléfono:</strong> ${datosPago.telefono}</p>`
          : ""
      }
      ${
        datosPago.referencia
          ? `<p><strong>Referencia:</strong> ${this.formatReference(
              datosPago.referencia
            )}</p>`
          : ""
      }
    `;
  }

  /**
   * Aceptar transacción (tomar la transacción)
   */
  async acceptTransaction(transaccionId, token) {
    UI.showConfirmDialog(MESSAGES.CONFIRM.ASSIGN_TRANSACTION, async () => {
      try {
        // 1. Asignar cajero a la transacción
        const asignacionResponse = await API.asignarCajero(
          transaccionId,
          token
        );

        if (!asignacionResponse.ok) {
          const errorData = await asignacionResponse.json();
          UI.showAlert(
            `❌ Error: ${
              errorData.mensaje || MESSAGES.ERROR.ASSIGN_TRANSACTION
            }`
          );
          return;
        }

        // 2. Obtener detalles de la transacción asignada
        const transaccionResponse = await API.getTransaccionDetalle(
          transaccionId,
          token
        );

        if (transaccionResponse.ok) {
          const transaccionData = await transaccionResponse.json();
          this.showTransactionDetailsModal(transaccionData.transaccion);
        } else {
          UI.showAlert("✅ " + MESSAGES.SUCCESS.ASSIGN_TRANSACTION);

          // Ejecutar callback para recargar transacciones
          if (this.callbacks.onTransactionAssigned) {
            this.callbacks.onTransactionAssigned();
          }
        }
      } catch (error) {
        console.error("Error aceptando transacción:", error);
        UI.showAlert("❌ Error de conexión al aceptar transacción");

        if (this.callbacks.onTransactionError) {
          this.callbacks.onTransactionError(error);
        }
      }
    });
  }

  /**
   * Mostrar modal de detalles de transacción aceptada
   */
  showTransactionDetailsModal(transaccion) {
    const tipoInfo = this.getTransactionTypeInfo(transaccion.categoria);

    const modalHTML = `
      <div class="transaction-details-modal">
        <div class="modal-header">
          <h2>✅ Transacción Aceptada</h2>
          <button onclick="UI.closeTransactionDetailsModal()" class="close-btn">&times;</button>
        </div>
        
        <div class="transaction-info">
          <div class="transaction-header ${tipoInfo.class}">
            <div class="transaction-type">
              ${tipoInfo.icon} ${tipoInfo.label}
            </div>
            <div class="transaction-amount">
              ${this.formatAmount(transaccion.monto)} Bs
            </div>
          </div>
          
          <div class="details-grid">
            <div class="detail-item">
              <strong>ID Transacción:</strong>
              <span>${this.formatReference(
                transaccion.referencia || transaccion._id
              )}</span>
            </div>
            
            <div class="detail-item">
              <strong>Jugador:</strong>
              <span>${
                transaccion.jugadorId?.username ||
                transaccion.jugadorId?.nickname ||
                "N/A"
              }</span>
            </div>
            
            <div class="detail-item">
              <strong>Estado:</strong>
              <span class="status-en-proceso">En Proceso</span>
            </div>
            
            <div class="detail-item">
              <strong>Fecha Asignación:</strong>
              <span>${new Date().toLocaleString("es-VE")}</span>
            </div>
          </div>
          
          <div class="payment-info">
            <h3>📱 Información de Pago Móvil</h3>
            <div class="payment-details">
              <div class="payment-item">
                <strong>Banco:</strong> ${
                  window.CajerosApp?.getCajeroInfo()?.datosPagoMovil?.banco ||
                  "N/A"
                }
              </div>
              <div class="payment-item">
                <strong>Cédula:</strong> ${
                  window.CajerosApp?.getCajeroInfo()?.datosPagoMovil?.cedula
                    ?.prefijo || ""
                }-${
      window.CajerosApp?.getCajeroInfo()?.datosPagoMovil?.cedula?.numero ||
      "N/A"
    }
              </div>
              <div class="payment-item">
                <strong>Teléfono:</strong> ${
                  window.CajerosApp?.getCajeroInfo()?.datosPagoMovil
                    ?.telefono || "N/A"
                }
              </div>
            </div>
          </div>
          
          <div class="status-message">
            <p>🔄 <strong>Estado:</strong> Esperando pago del jugador</p>
            <p>Los datos bancarios han sido enviados al jugador. Recibirás una notificación cuando realice el pago.</p>
          </div>
        </div>
        
        <div class="modal-actions">
          <button onclick="UI.closeTransactionDetailsModal()" class="btn btn-primary">Cerrar</button>
          <button onclick="refreshTransactions(); UI.closeTransactionDetailsModal();" class="btn btn-secondary">Ver Lista</button>
        </div>
      </div>
    `;

    UI.showTransactionDetailsModal(modalHTML);
  }

  /**
   * Refrescar transacciones (método estático para uso global)
   */
  static async refreshTransactions() {
    const token = window.CajerosApp?.getToken();
    if (token && window.transactionManager) {
      await window.transactionManager.loadTransactions(token);
    }
  }

  /**
   * Aceptar transacción (método estático para uso global)
   */
  static async acceptTransaction(transaccionId) {
    const token = window.CajerosApp?.getToken();
    if (token && window.transactionManager) {
      await window.transactionManager.acceptTransaction(transaccionId, token);
    }
  }

  /**
   * Obtener transacciones actuales
   */
  getTransactions() {
    return this.transactions;
  }

  /**
   * Limpiar transacciones
   */
  clearTransactions() {
    this.transactions = [];
    UI.clearTransactionsList();
    UI.showNoTransactions();
  }
}

// Crear instancia única del gestor de transacciones
const transactionManagerInstance = new TransactionManager();

// Exportar la instancia como TransactionManager
export { transactionManagerInstance as TransactionManager };

// Exportar también la clase para uso global
export { TransactionManager as TransactionManagerClass };
