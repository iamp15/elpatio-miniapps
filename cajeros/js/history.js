/**
 * Módulo de gestión del historial de transacciones para cajeros
 */

import { TRANSACTION_CONFIG, TRANSACTION_TYPES, FINALIZED_STATES } from "./config.js";
import { API } from "./api.js";
import { UI } from "./ui.js";

class HistoryManager {
  constructor() {
    this.transactions = [];
    this.currentFilters = {
      estado: "",
      tipo: "",
      fechaInicio: "",
      fechaFin: "",
    };
  }

  /**
   * Cargar historial de transacciones con filtros
   * @param {string} token - Token de autenticación
   * @param {Object} filters - Filtros opcionales
   */
  async loadHistory(token, filters = {}) {
    if (!token) return;

    try {
      UI.showLoadingHistory(true);
      UI.hideNoHistory();

      // Combinar filtros actuales con nuevos filtros
      const activeFilters = { ...this.currentFilters, ...filters };
      this.currentFilters = activeFilters;

      // Determinar estados a consultar
      let estadosAConsultar = FINALIZED_STATES;
      
      // Si hay filtro de estado específico, solo consultar ese
      if (activeFilters.estado) {
        estadosAConsultar = [activeFilters.estado];
      }

      // Preparar filtros para la API
      const apiFilters = {};
      if (activeFilters.tipo) {
        apiFilters.tipo = activeFilters.tipo;
      }
      if (activeFilters.fechaInicio) {
        apiFilters.fechaInicio = activeFilters.fechaInicio;
      }
      if (activeFilters.fechaFin) {
        apiFilters.fechaFin = activeFilters.fechaFin;
      }

      // Obtener transacciones del historial
      this.transactions = await API.getHistorialTransacciones(
        estadosAConsultar,
        token,
        apiFilters
      );

      // Mostrar transacciones en la UI
      this.displayHistory();
    } catch (error) {
      console.error("Error cargando historial:", error);
      UI.showNoHistory();
      UI.showAlert("Error al cargar el historial de transacciones");
    } finally {
      UI.showLoadingHistory(false);
    }
  }

  /**
   * Aplicar filtros y recargar historial
   * @param {Object} filters - Nuevos filtros a aplicar
   * @param {string} token - Token de autenticación
   */
  async applyFilters(filters, token) {
    this.currentFilters = { ...this.currentFilters, ...filters };
    await this.loadHistory(token, this.currentFilters);
  }

  /**
   * Limpiar filtros y recargar historial
   * @param {string} token - Token de autenticación
   */
  async clearFilters(token) {
    this.currentFilters = {
      estado: "",
      tipo: "",
      fechaInicio: "",
      fechaFin: "",
    };
    
    // Resetear UI de filtros
    UI.clearHistoryFilters();
    
    // Recargar historial sin filtros
    await this.loadHistory(token);
  }

  /**
   * Mostrar transacciones en el historial
   */
  displayHistory() {
    if (!this.transactions || this.transactions.length === 0) {
      UI.showNoHistory();
      return;
    }

    UI.displayHistoryTransactions(this.transactions);
  }

  /**
   * Formatear transacción para mostrar en historial
   * @param {Object} transaccion - Transacción a formatear
   * @returns {HTMLElement} - Elemento HTML de la tarjeta
   */
  formatHistoryTransaction(transaccion) {
    const card = document.createElement("div");
    card.className = "transaction-card history-transaction";
    card.dataset.transactionId = transaccion._id;
    card.dataset.status = transaccion.estado || "completada";

    const tipoInfo = this.getTransactionTypeInfo(transaccion.categoria);
    const estado = transaccion.estado || "completada";
    const fechaCreacion = new Date(
      transaccion.createdAt || transaccion.fechaCreacion
    ).toLocaleString("es-VE");
    const fechaProcesamiento = transaccion.fechaProcesamiento
      ? new Date(transaccion.fechaProcesamiento).toLocaleString("es-VE")
      : "N/A";

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
        <p><strong>Estado:</strong> <span class="history-status ${this.getStatusClass(
          estado
        )}">${this.formatEstado(estado)}</span></p>
        <p><strong>Fecha Creación:</strong> ${fechaCreacion}</p>
        ${
          fechaProcesamiento !== "N/A"
            ? `<p><strong>Fecha Procesamiento:</strong> ${fechaProcesamiento}</p>`
            : ""
        }
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
        ${this.renderPaymentDetails(transaccion.infoPago || transaccion.datosPago)}
        ${this.renderMotivoRechazo(transaccion.motivoRechazo)}
        ${this.renderAjusteMonto(transaccion.ajusteMonto)}
      </div>
      
      <div class="transaction-actions">
        <button class="btn-action btn-view" onclick="viewTransactionDetails('${transaccion._id}')">
          👁️ Ver Detalles
        </button>
      </div>
    `;

    return card;
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
   * Formatear monto para mostrar
   */
  formatAmount(monto) {
    return (monto / TRANSACTION_CONFIG.AMOUNT_DIVISOR).toLocaleString(
      TRANSACTION_CONFIG.LOCALE
    );
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
   * Formatear estado para mostrar
   */
  formatEstado(estado) {
    const estados = {
      completada: "✅ Completada",
      completada_con_ajuste: "✅ Completada (Ajuste)",
      rechazada: "❌ Rechazada",
      cancelada: "🚫 Cancelada",
      fallida: "⚠️ Fallida",
      revertida: "↩️ Revertida",
      requiere_revision_admin: "🔍 Revisión Admin",
    };
    return estados[estado] || estado;
  }

  /**
   * Obtener clase CSS para el estado
   */
  getStatusClass(estado) {
    const classes = {
      completada: "status-completed",
      completada_con_ajuste: "status-completed-adjusted",
      rechazada: "status-rejected",
      cancelada: "status-cancelled",
      fallida: "status-failed",
      revertida: "status-reverted",
      requiere_revision_admin: "status-admin-review",
    };
    return classes[estado] || "";
  }

  /**
   * Renderizar detalles de pago
   */
  renderPaymentDetails(datosPago) {
    if (!datosPago) return "";

    return `
      <div class="payment-details-section">
        <p><strong>Método:</strong> ${datosPago.metodo || "N/A"}</p>
        ${
          datosPago.banco || datosPago.bancoOrigen
            ? `<p><strong>Banco:</strong> ${
                datosPago.banco || datosPago.bancoOrigen
              }</p>`
            : ""
        }
        ${
          datosPago.telefono || datosPago.telefonoOrigen
            ? `<p><strong>Teléfono:</strong> ${
                datosPago.telefono || datosPago.telefonoOrigen
              }</p>`
            : ""
        }
        ${
          datosPago.referencia || datosPago.numeroReferencia
            ? `<p><strong>Referencia:</strong> ${this.formatReference(
                datosPago.referencia || datosPago.numeroReferencia
              )}</p>`
            : ""
        }
      </div>
    `;
  }

  /**
   * Renderizar motivo de rechazo si existe
   */
  renderMotivoRechazo(motivoRechazo) {
    if (!motivoRechazo || !motivoRechazo.descripcionDetallada) return "";

    return `
      <div class="rejection-details-section">
        <p><strong>Motivo de Rechazo:</strong></p>
        <p class="rejection-reason">${motivoRechazo.descripcionDetallada}</p>
        ${
          motivoRechazo.imagenRechazoUrl
            ? `<p><strong>Evidencia:</strong> <a href="${
                motivoRechazo.imagenRechazoUrl
              }" target="_blank">Ver imagen</a></p>`
            : ""
        }
      </div>
    `;
  }

  /**
   * Renderizar ajuste de monto si existe
   */
  renderAjusteMonto(ajusteMonto) {
    if (!ajusteMonto || !ajusteMonto.montoOriginal) return "";

    return `
      <div class="adjustment-details-section">
        <p><strong>Ajuste de Monto:</strong></p>
        <p><strong>Original:</strong> ${this.formatAmount(
          ajusteMonto.montoOriginal
        )} Bs</p>
        <p><strong>Real:</strong> ${this.formatAmount(ajusteMonto.montoReal)} Bs</p>
        ${
          ajusteMonto.razon
            ? `<p><strong>Razón:</strong> ${ajusteMonto.razon}</p>`
            : ""
        }
      </div>
    `;
  }

  /**
   * Obtener filtros actuales
   */
  getCurrentFilters() {
    return { ...this.currentFilters };
  }

  /**
   * Limpiar historial
   */
  clearHistory() {
    this.transactions = [];
    UI.clearHistoryList();
  }
}

// Crear instancia única del gestor de historial
const historyManagerInstance = new HistoryManager();

// Exportar la instancia como HistoryManager
export { historyManagerInstance as HistoryManager };