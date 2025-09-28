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
   */
  async telegramRequest(url, options = {}) {
    const telegramData = window.Telegram?.WebApp?.initData;
    
    const telegramOptions = {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "X-Telegram-Init-Data": telegramData || "",
        ...options.headers,
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
   * Verificar estado de transacción
   */
  async verificarEstadoTransaccion(transaccionId) {
    const url = `${this.baseURL}${this.endpoints.VERIFICAR_ESTADO}/${transaccionId}`;
    return this.telegramRequest(url, {
      method: "GET",
    });
  }

  /**
   * Confirmar pago de transacción
   */
  async confirmarPago(transaccionId, paymentData) {
    const url = `${this.baseURL}${this.endpoints.CONFIRMAR_PAGO}/${transaccionId}/confirmar-pago`;
    const body = JSON.stringify(paymentData);
    
    return this.telegramRequest(url, {
      method: "PUT",
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
    // En desarrollo local
    if (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    ) {
      return "http://localhost:3001/api";
    }

    // En Vercel (desarrollo), usar Railway backend
    if (window.location.hostname.includes("vercel.app")) {
      return "https://elpatio-backend-production.up.railway.app/api";
    }

    // En producción real
    return "https://elpatio-backend-production.up.railway.app/api";
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
    
    Object.keys(params).forEach(key => {
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
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
    
    throw lastError;
  }
}

// Crear instancia única del gestor de API
export const API = new APIManager();
