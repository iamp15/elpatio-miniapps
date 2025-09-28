/**
 * Módulo de gestión de transacciones para depósitos
 */

import { TRANSACTION_CONFIG, TRANSACTION_STATES, MESSAGES, POLLING_CONFIG } from "./config.js";
import { API } from "./api.js";
import { UI } from "./ui.js";

class TransactionManager {
  constructor() {
    this.currentTransaction = null;
    this.pollingInterval = null;
    this.pollingAttempts = 0;
    this.maxPollingAttempts = POLLING_CONFIG.MAX_ATTEMPTS;
    this.callbacks = {
      onTransactionCreated: null,
      onTransactionUpdated: null,
      onTransactionCompleted: null,
      onTransactionError: null,
      onTransactionTimeout: null,
    };
  }

  /**
   * Configurar callbacks para eventos de transacciones
   */
  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Crear solicitud de depósito
   */
  async createDepositRequest(amount, userData) {
    try {
      const depositoData = {
        monto: this.convertToCents(amount),
        categoria: "deposito",
        descripcion: `Depósito de ${amount} Bs`,
        jugadorId: userData.id.toString(),
        datosPago: {
          metodo: "pago_movil",
          banco: "pendiente",
          telefono: "pendiente",
          cedula: "pendiente",
        },
      };

      const response = await API.crearDeposito(depositoData);

      if (response.ok) {
        const data = await response.json();
        this.currentTransaction = data.transaccion;
        
        // Ejecutar callback de transacción creada
        if (this.callbacks.onTransactionCreated) {
          this.callbacks.onTransactionCreated(this.currentTransaction);
        }

        return this.currentTransaction;
      } else {
        const errorData = await API.extractErrorData(response);
        throw new Error(errorData.message);
      }
    } catch (error) {
      console.error("Error creando solicitud de depósito:", error);
      throw error;
    }
  }

  /**
   * Verificar estado de transacción
   */
  async checkTransactionStatus(transaccionId) {
    try {
      const response = await API.verificarEstadoTransaccion(transaccionId);

      if (response.ok) {
        const data = await response.json();
        const transaction = data.transaccion;
        
        // Actualizar transacción actual
        this.currentTransaction = transaction;

        // Ejecutar callback de transacción actualizada
        if (this.callbacks.onTransactionUpdated) {
          this.callbacks.onTransactionUpdated(transaction);
        }

        return transaction;
      } else {
        const errorData = await API.extractErrorData(response);
        throw new Error(errorData.message);
      }
    } catch (error) {
      console.error("Error verificando estado de transacción:", error);
      throw error;
    }
  }

  /**
   * Confirmar pago de transacción
   */
  async confirmPayment(transaccionId, paymentData) {
    try {
      const response = await API.confirmarPago(transaccionId, paymentData);

      if (response.ok) {
        const data = await response.json();
        const transaction = data.transaccion;
        
        // Actualizar transacción actual
        this.currentTransaction = transaction;

        // Ejecutar callback de transacción completada
        if (this.callbacks.onTransactionCompleted) {
          this.callbacks.onTransactionCompleted(transaction);
        }

        return transaction;
      } else {
        const errorData = await API.extractErrorData(response);
        throw new Error(errorData.message);
      }
    } catch (error) {
      console.error("Error confirmando pago:", error);
      throw error;
    }
  }

  /**
   * Iniciar polling para verificar estado de transacción
   */
  startPolling(transaccionId) {
    if (this.pollingInterval) {
      this.stopPolling();
    }

    this.pollingAttempts = 0;
    
    this.pollingInterval = setInterval(async () => {
      try {
        this.pollingAttempts++;
        
        const transaction = await this.checkTransactionStatus(transaccionId);
        
        // Verificar si la transacción ha cambiado de estado
        if (this.shouldStopPolling(transaction)) {
          this.stopPolling();
          return;
        }

        // Verificar si hemos excedido el número máximo de intentos
        if (this.pollingAttempts >= this.maxPollingAttempts) {
          this.stopPolling();
          
          if (this.callbacks.onTransactionTimeout) {
            this.callbacks.onTransactionTimeout(transaccionId);
          }
          return;
        }

      } catch (error) {
        console.error("Error en polling:", error);
        
        // Si hay muchos errores consecutivos, detener el polling
        if (this.pollingAttempts >= this.maxPollingAttempts) {
          this.stopPolling();
          
          if (this.callbacks.onTransactionError) {
            this.callbacks.onTransactionError(error);
          }
        }
      }
    }, POLLING_CONFIG.INTERVAL);
  }

  /**
   * Detener polling
   */
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.pollingAttempts = 0;
  }

  /**
   * Verificar si debe detener el polling
   */
  shouldStopPolling(transaction) {
    const finalStates = [
      TRANSACTION_STATES.CONFIRMADA,
      TRANSACTION_STATES.CANCELADA,
      TRANSACTION_STATES.EXPIRADA,
    ];
    
    return finalStates.includes(transaction.estado);
  }

  /**
   * Cancelar transacción por timeout
   */
  async cancelTransactionByTimeout(transaccionId) {
    try {
      // Aquí se podría implementar una llamada al backend para cancelar la transacción
      console.log(`Cancelando transacción ${transaccionId} por timeout`);
      
      // Por ahora, solo actualizamos el estado local
      if (this.currentTransaction && this.currentTransaction._id === transaccionId) {
        this.currentTransaction.estado = TRANSACTION_STATES.EXPIRADA;
        
        if (this.callbacks.onTransactionTimeout) {
          this.callbacks.onTransactionTimeout(transaccionId);
        }
      }
    } catch (error) {
      console.error("Error cancelando transacción por timeout:", error);
      throw error;
    }
  }

  /**
   * Comunicar con el bot
   */
  async communicateWithBot(action, data) {
    try {
      const response = await API.comunicarConBot(action, data);
      
      if (response.ok) {
        const result = await response.json();
        return result;
      } else {
        const errorData = await API.extractErrorData(response);
        throw new Error(errorData.message);
      }
    } catch (error) {
      console.error("Error comunicando con el bot:", error);
      throw error;
    }
  }

  /**
   * Obtener token del bot
   */
  async getBotToken() {
    try {
      const response = await API.getBotToken();
      
      if (response.ok) {
        const data = await response.json();
        return data.token;
      } else {
        const errorData = await API.extractErrorData(response);
        throw new Error(errorData.message);
      }
    } catch (error) {
      console.error("Error obteniendo token del bot:", error);
      throw error;
    }
  }

  /**
   * Convertir monto a centavos
   */
  convertToCents(amount) {
    return Math.round(parseFloat(amount || 0) * TRANSACTION_CONFIG.AMOUNT_DIVISOR);
  }

  /**
   * Convertir centavos a bolívares
   */
  convertFromCents(cents) {
    return cents / TRANSACTION_CONFIG.AMOUNT_DIVISOR;
  }

  /**
   * Formatear monto para mostrar
   */
  formatAmount(amount) {
    return (amount / TRANSACTION_CONFIG.AMOUNT_DIVISOR).toLocaleString(
      TRANSACTION_CONFIG.LOCALE
    );
  }

  /**
   * Obtener transacción actual
   */
  getCurrentTransaction() {
    return this.currentTransaction;
  }

  /**
   * Establecer transacción actual
   */
  setCurrentTransaction(transaction) {
    this.currentTransaction = transaction;
  }

  /**
   * Limpiar transacción actual
   */
  clearCurrentTransaction() {
    this.currentTransaction = null;
    this.stopPolling();
  }

  /**
   * Verificar si hay una transacción activa
   */
  hasActiveTransaction() {
    return this.currentTransaction !== null;
  }

  /**
   * Verificar si la transacción está en estado final
   */
  isTransactionFinal() {
    if (!this.currentTransaction) return true;
    
    const finalStates = [
      TRANSACTION_STATES.CONFIRMADA,
      TRANSACTION_STATES.CANCELADA,
      TRANSACTION_STATES.EXPIRADA,
    ];
    
    return finalStates.includes(this.currentTransaction.estado);
  }

  /**
   * Obtener estado de la transacción actual
   */
  getCurrentTransactionState() {
    return this.currentTransaction?.estado || null;
  }

  /**
   * Verificar si la transacción está en proceso
   */
  isTransactionInProgress() {
    return this.currentTransaction?.estado === TRANSACTION_STATES.EN_PROCESO;
  }

  /**
   * Verificar si la transacción está pendiente
   */
  isTransactionPending() {
    return this.currentTransaction?.estado === TRANSACTION_STATES.PENDIENTE;
  }

  /**
   * Verificar si la transacción está confirmada
   */
  isTransactionConfirmed() {
    return this.currentTransaction?.estado === TRANSACTION_STATES.CONFIRMADA;
  }

  /**
   * Obtener datos bancarios de la transacción
   */
  getBankData() {
    if (!this.currentTransaction?.cajeroId?.datosPagoMovil) {
      return null;
    }

    const bankData = this.currentTransaction.cajeroId.datosPagoMovil;
    return {
      banco: bankData.banco,
      telefono: bankData.telefono,
      cedula: `${bankData.cedula?.prefijo || ""}-${bankData.cedula?.numero || ""}`,
      monto: this.currentTransaction.monto,
    };
  }

  /**
   * Validar datos de pago
   */
  validatePaymentData(paymentData) {
    const errors = [];

    if (!paymentData.bank) {
      errors.push("El banco es requerido");
    }

    if (!paymentData.phone) {
      errors.push("El teléfono es requerido");
    } else if (paymentData.phone.length !== 11) {
      errors.push("El teléfono debe tener 11 dígitos");
    }

    if (!paymentData.reference) {
      errors.push("La referencia es requerida");
    }

    if (!paymentData.date) {
      errors.push("La fecha es requerida");
    }

    if (!paymentData.amount || paymentData.amount <= 0) {
      errors.push("El monto debe ser mayor a 0");
    }

    return {
      valid: errors.length === 0,
      errors: errors,
    };
  }
}

// Crear instancia única del gestor de transacciones
export const TransactionManager = new TransactionManager();
