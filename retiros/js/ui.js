/**
 * Módulo de interfaz de usuario para retiros
 */

import { TRANSACTION_CONFIG } from "./config.js";
import { TransactionManager } from "./transactions.js";

class UIManager {
  constructor() {
    this.screens = {
      loading: document.getElementById("loading"),
      main: document.getElementById("main-screen"),
      dataPayment: document.getElementById("data-payment-screen"),
      waiting: document.getElementById("waiting-screen"),
      inProcess: document.getElementById("in-process-screen"),
      completed: document.getElementById("completed-screen"),
      error: document.getElementById("error-screen"),
    };
  }

  showScreen(screenId) {
    Object.values(this.screens).forEach((s) => {
      s?.classList.remove("active");
    });
    const screen = this.screens[screenId] || document.getElementById(screenId);
    screen?.classList.add("active");
  }

  showMainScreen() {
    this.showScreen("main");
  }

  showDataPaymentScreen() {
    this.showScreen("dataPayment");
  }

  showWaitingScreen() {
    this.showScreen("waiting");
  }

  showInProcessScreen() {
    this.showScreen("inProcess");
  }

  showCompletedScreen() {
    this.showScreen("completed");
  }

  showErrorScreen(title, message) {
    const titleEl = document.getElementById("error-title");
    const msgEl = document.getElementById("error-message");
    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.innerHTML = message;
    this.showScreen("error");
  }

  updateBalance(balance) {
    const el = document.getElementById("current-balance");
    if (el) {
      el.textContent = `${(balance / 100).toLocaleString("es-VE")} ${TRANSACTION_CONFIG.CURRENCY_SYMBOL}`;
    }
  }

  updateMontoMinimo(min) {
    const help = document.querySelector("#amount + .form-help");
    if (help) help.textContent = `Monto mínimo: ${min} Bs`;
    const input = document.getElementById("amount");
    if (input) input.min = min;
  }

  updateWaitingTransaction(transaction) {
    const amountEl = document.getElementById("waiting-amount");
    const statusEl = document.getElementById("waiting-status");
    if (amountEl) amountEl.textContent = `${TransactionManager.formatAmount(transaction.monto)} Bs`;
    if (statusEl) statusEl.textContent = "Pendiente";
  }

  updateInProcessInfo(data) {
    const amountEl = document.getElementById("in-process-amount");
    if (amountEl) amountEl.textContent = `${TransactionManager.formatAmount(data.monto)} Bs`;
  }

  updateCompletedInfo(data) {
    const amountEl = document.getElementById("completed-amount");
    const balanceEl = document.getElementById("completed-balance");
    const linkContainer = document.getElementById("comprobante-link-container");
    const linkEl = document.getElementById("comprobante-link");

    if (amountEl) amountEl.textContent = `${TransactionManager.formatAmount(data.monto)} Bs`;
    if (balanceEl) balanceEl.textContent = `${TransactionManager.formatAmount(data.saldoNuevo)} Bs`;

    if (data.comprobanteUrl && linkContainer && linkEl) {
      linkEl.href = data.comprobanteUrl;
      linkContainer.style.display = "block";
    }
  }

  getRetiroFormData() {
    return {
      amount: parseFloat(document.getElementById("amount")?.value) || 0,
    };
  }

  getDataPaymentFormData() {
    return {
      banco: document.getElementById("data-bank")?.value || "",
      telefono: document.getElementById("data-phone")?.value || "",
      cedula: document.getElementById("data-cedula")?.value || "",
    };
  }

  validateRetiroForm(formData, montoMinimo, saldoActual) {
    const { amount } = formData;
    const amountCents = Math.round(amount * 100);
    if (amount < montoMinimo) {
      return { valid: false, message: `El monto mínimo es ${montoMinimo} Bs` };
    }
    if (amountCents > saldoActual) {
      return { valid: false, message: "Saldo insuficiente para el retiro" };
    }
    return { valid: true };
  }

  validateDataPaymentForm(formData) {
    const { banco, telefono, cedula } = formData;
    if (!banco) return { valid: false, message: "Selecciona un banco" };
    if (!telefono || telefono.length !== 11) {
      return { valid: false, message: "El teléfono debe tener 11 dígitos" };
    }
    if (!cedula || cedula.trim().length < 5) {
      return { valid: false, message: "Ingresa tu cédula correctamente" };
    }
    return { valid: true };
  }

  async showConfirmModal(title, message) {
    return new Promise((resolve) => {
      const overlay = document.getElementById("confirm-modal");
      const titleEl = document.getElementById("modal-title");
      const msgEl = document.getElementById("modal-message");
      const cancelBtn = document.getElementById("modal-cancel-btn");
      const confirmBtn = document.getElementById("modal-confirm-btn");

      if (!overlay || !titleEl || !msgEl || !cancelBtn || !confirmBtn) {
        resolve(confirm(message));
        return;
      }

      titleEl.textContent = title;
      msgEl.textContent = message;
      overlay.style.display = "flex";

      const cleanup = () => {
        overlay.style.display = "none";
        cancelBtn.removeEventListener("click", onCancel);
        confirmBtn.removeEventListener("click", onConfirm);
      };

      const onCancel = () => {
        cleanup();
        resolve(false);
      };
      const onConfirm = () => {
        cleanup();
        resolve(true);
      };

      cancelBtn.addEventListener("click", onCancel);
      confirmBtn.addEventListener("click", onConfirm);
    });
  }

  setupEventListeners(handlers) {
    const retiroForm = document.getElementById("retiro-form");
    const dataPaymentForm = document.getElementById("data-payment-form");
    const cancelBtn = document.getElementById("cancel-waiting-btn");
    const closeAppBtn = document.getElementById("close-app-btn");
    const retryBtn = document.getElementById("retry-btn");
    const closeErrorBtn = document.getElementById("close-error-btn");

    if (retiroForm && handlers.onRetiroSubmit) {
      retiroForm.addEventListener("submit", handlers.onRetiroSubmit);
    }
    if (dataPaymentForm && handlers.onDataPaymentSubmit) {
      dataPaymentForm.addEventListener("submit", handlers.onDataPaymentSubmit);
    }
    if (cancelBtn && handlers.onCancelTransaction) {
      cancelBtn.addEventListener("click", handlers.onCancelTransaction);
    }
    if (closeAppBtn && handlers.onCloseApp) {
      closeAppBtn.addEventListener("click", handlers.onCloseApp);
    }
    if (retryBtn && handlers.onRetry) {
      retryBtn.addEventListener("click", handlers.onRetry);
    }
    if (closeErrorBtn && handlers.onCloseError) {
      closeErrorBtn.addEventListener("click", handlers.onCloseError);
    }
  }
}

export const UI = new UIManager();
