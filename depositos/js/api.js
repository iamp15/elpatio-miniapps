/**
 * Módulo de API para comunicación con el backend
 */

import { API_CONFIG, MESSAGES } from "./config.js";

class APIManager {
  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.endpoints = API_CONFIG.ENDPOINTS;
  }

  /**
   * Realizar request HTTP genérico
   */
  async request(url, options = {}) {
    const defaultOptions = {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, defaultOptions);
      return response;
    } catch (error) {
      console.error("Error en request:", error);
      throw new Error(MESSAGES.ERROR.CONNECTION);
    }
  }

  /**
   * Realizar request con datos de Telegram
   * @param {string} url - URL de la petición
   * @param {object} options - Opciones de la petición
   * @param {string} options.telegramId - ID de Telegram (opcional, si no se proporciona se intenta obtener de window.Telegram)
   */
  async telegramRequest(url, options = {}) {
    // Obtener telegramId de las opciones o de window.Telegram
    const telegramId =
      options.telegramId || window.Telegram?.WebApp?.initDataUnsafe?.user?.id;

    // Remover telegramId de las opciones para no enviarlo en el body
    const { telegramId: _, ...restOptions } = options;

    const telegramOptions = {
      ...restOptions,
      headers: {
        "Content-Type": "application/json",
        "X-Telegram-Id": telegramId ? telegramId.toString() : "",
        ...restOptions.headers,
      },
    };

    return this.request(url, telegramOptions);
  }

  /**
   * Obtener saldo del jugador
   */
  async getJugadorSaldo(telegramId) {
    const url = `${this.baseURL}${this.endpoints.JUGADOR_SALDO}/${telegramId}/saldo`;
    return this.telegramRequest(url, {
      method: "GET",
      telegramId: telegramId, // Pasar el telegramId explícitamente
    });
  }

  /**
   * Crear solicitud de depósito
   */
  async crearDeposito(depositoData) {
    const url = `${this.baseURL}${this.endpoints.CREAR_DEPOSITO}`;
    const body = JSON.stringify(depositoData);

    return this.telegramRequest(url, {
      method: "POST",
      body,
    });
  }

  /**
   * Verificar estado de transacción (GET /estado acepta X-Telegram-Id).
   * @param {string} transaccionId
   * @param {string} [telegramId] - Si se pasa, se usa en la cabecera (recomendado al volver de background).
   */
  async verificarEstadoTransaccion(transaccionId, telegramId = null) {
    const url = `${this.baseURL}${this.endpoints.VERIFICAR_ESTADO}/${transaccionId}/estado`;
    return this.telegramRequest(url, {
      method: "GET",
      ...(telegramId != null && { telegramId: telegramId.toString() }),
    });
  }

  /**
   * Confirmar pago de transacción
   */
  async confirmarPago(transaccionId, paymentData) {
    const url = `${this.baseURL}${this.endpoints.CONFIRMAR_PAGO}/${transaccionId}/confirmar-pago-usuario`;
    const body = JSON.stringify(paymentData);

    return this.telegramRequest(url, {
      method: "PUT",
      body,
    });
  }

  /**
   * Cancelar transacción por jugador
   */
  async cancelarTransaccion(transaccionId, motivo = null) {
    const url = `${this.baseURL}/transacciones/${transaccionId}/cancelar-jugador`;
    const body = JSON.stringify({
      motivo: motivo || "Cancelada por el usuario",
    });

    return this.telegramRequest(url, {
      method: "PUT",
      body,
    });
  }

  /**
   * Obtener jugador por ID
   */
  async getJugador(telegramId, token) {
    const url = `${this.baseURL}${this.endpoints.OBTENER_JUGADOR}/${telegramId}`;
    return this.request(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
  }

  /**
   * Login de admin
   */
  async adminLogin(email, password) {
    const url = `${this.baseURL}${this.endpoints.ADMIN_LOGIN}`;
    const body = JSON.stringify({ email, password });

    return this.request(url, {
      method: "POST",
      body,
    });
  }

  /**
   * Login de cajero
   */
  async cajeroLogin(email, password) {
    const url = `${this.baseURL}${this.endpoints.CAJEROS_LOGIN}`;
    const body = JSON.stringify({ email, password });

    return this.request(url, {
      method: "POST",
      body,
    });
  }

  /**
   * Obtener token del bot
   */
  async getBotToken() {
    const url = `${this.baseURL}${this.endpoints.BOT_TOKEN}`;
    return this.telegramRequest(url, {
      method: "GET",
    });
  }

  /**
   * Comunicar con el bot
   */
  async comunicarConBot(action, data) {
    const url = `${this.baseURL}${this.endpoints.COMUNICAR_BOT}`;
    const body = JSON.stringify({ action, data });

    return this.telegramRequest(url, {
      method: "POST",
      body,
    });
  }

  /**
   * Procesar respuesta de la API
   */
  async processResponse(response) {
    if (!response.ok) {
      let errorMessage = MESSAGES.ERROR.CONNECTION;

      try {
        const errorData = await response.json();
        errorMessage = errorData.mensaje || errorMessage;
      } catch (e) {
        // Si no se puede parsear el error, usar el mensaje por defecto
      }

      throw new Error(errorMessage);
    }

    return response.json();
  }

  /**
   * Manejar errores de la API
   */
  handleApiError(error) {
    console.error("Error de API:", error);

    if (error.name === "TypeError" || error.message.includes("fetch")) {
      return new Error(MESSAGES.ERROR.CONNECTION);
    }

    return error;
  }

  /**
   * Obtener URL del backend basada en el ambiente
   */
  getBackendUrl() {
    // Backend en Fly.io
    return "https://elpatio-backend.fly.dev/api";
  }

  /**
   * Verificar si la respuesta es exitosa
   */
  isSuccessResponse(response) {
    return response.ok && response.status >= 200 && response.status < 300;
  }

  /**
   * Extraer datos de error de la respuesta
   */
  async extractErrorData(response) {
    try {
      const errorData = await response.json();
      return {
        message: errorData.mensaje || errorData.message || "Error desconocido",
        code: errorData.codigo || errorData.code || response.status,
        details: errorData.detalles || errorData.details || null,
      };
    } catch (e) {
      return {
        message: `Error ${response.status}: ${response.statusText}`,
        code: response.status,
        details: null,
      };
    }
  }

  /**
   * Crear URL con parámetros de consulta
   */
  buildUrlWithParams(baseUrl, params) {
    const url = new URL(baseUrl);

    Object.keys(params).forEach((key) => {
      if (params[key] !== null && params[key] !== undefined) {
        url.searchParams.append(key, params[key]);
      }
    });

    return url.toString();
  }

  /**
   * Realizar request con reintentos
   */
  async requestWithRetry(url, options = {}, maxRetries = 3, delay = 1000) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.request(url, options);
        return response;
      } catch (error) {
        lastError = error;

        if (attempt === maxRetries) {
          throw error;
        }

        // Esperar antes del siguiente intento
        await new Promise((resolve) => setTimeout(resolve, delay * attempt));
      }
    }

    throw lastError;
  }
}

// Crear instancia única del gestor de API
export const API = new APIManager();
