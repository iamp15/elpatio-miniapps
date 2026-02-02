/**
 * Módulo de gestión de transacciones para retiros
 */

import { TRANSACTION_CONFIG, TRANSACTION_STATES } from "./config.js";

class RetiroTransactionManager {
  constructor() {
    this.currentTransaction = null;
  }

  convertToCents(amount) {
    return Math.round(
      parseFloat(amount || 0) * TRANSACTION_CONFIG.AMOUNT_DIVISOR
    );
  }

  convertFromCents(cents) {
    return cents / TRANSACTION_CONFIG.AMOUNT_DIVISOR;
  }

  formatAmount(amount) {
    return (amount / TRANSACTION_CONFIG.AMOUNT_DIVISOR).toLocaleString(
      TRANSACTION_CONFIG.LOCALE
    );
  }

  getCurrentTransaction() {
    return this.currentTransaction;
  }

  setCurrentTransaction(transaction) {
    this.currentTransaction = transaction;
  }

  clearCurrentTransaction() {
    this.currentTransaction = null;
  }

  getEstadoVisibleParaUsuario(estado) {
    if (estado === TRANSACTION_STATES.REQUIERE_REVISION_ADMIN) {
      return TRANSACTION_STATES.PENDIENTE;
    }
    return estado;
  }
}

export const TransactionManager = new RetiroTransactionManager();
