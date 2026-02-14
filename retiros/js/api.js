/**
 * Módulo de API para la app de retiros
 */

import { API_CONFIG, MESSAGES } from "./config.js";

class APIManager {
  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.endpoints = API_CONFIG.ENDPOINTS;
  }

  async telegramRequest(url, options = {}) {
    const telegramId =
      options.telegramId || window.Telegram?.WebApp?.initDataUnsafe?.user?.id;

    const telegramOptions = {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "X-Telegram-Id": telegramId ? telegramId.toString() : "",
        ...options.headers,
      },
    };

    delete telegramOptions.telegramId;
    return this.request(url, telegramOptions);
  }

  async request(url, options = {}) {
    try {
      const response = await fetch(url, {
        headers: { "Content-Type": "application/json", ...options.headers },
        ...options,
      });
      return response;
    } catch (error) {
      console.error("Error en request:", error);
      throw new Error(MESSAGES.ERROR.CONNECTION);
    }
  }

  async getJugadorSaldo(telegramId) {
    const url = `${this.baseURL}${this.endpoints.JUGADOR_SALDO}/${telegramId}/saldo`;
    return this.telegramRequest(url, {
      method: "GET",
      telegramId: telegramId,
    });
  }

  async getConfigRetiros() {
    const url = `${this.baseURL}${this.endpoints.CONFIG_RETIROS}`;
    return this.request(url, { method: "GET" });
  }

  async cancelarTransaccion(transaccionId, motivo = null) {
    const url = `${this.baseURL}${this.endpoints.TRANSACCIONES}/${transaccionId}/cancelar-jugador`;
    return this.telegramRequest(url, {
      method: "PUT",
      body: JSON.stringify({ motivo: motivo || "Cancelada por el usuario" }),
    });
  }

  /**
   * Verificar estado de transacción (usa GET /estado que acepta X-Telegram-Id, no JWT).
   * @param {string} transaccionId
   * @param {string} [telegramId] - Si se pasa, se usa en la cabecera (recomendado al volver de background).
   */
  async verificarEstadoTransaccion(transaccionId, telegramId = null) {
    const url = `${this.baseURL}${this.endpoints.TRANSACCIONES}/${transaccionId}/estado`;
    return this.telegramRequest(url, {
      method: "GET",
      ...(telegramId != null && { telegramId: telegramId.toString() }),
    });
  }

  extractErrorData(response) {
    try {
      return response.json();
    } catch (e) {
      return {
        message: `${response.status}: ${response.statusText}`,
        code: response.status,
        details: null,
      };
    }
  }
}

export const API = new APIManager();
