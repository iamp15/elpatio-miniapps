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
   * Realizar request autenticado
   */
  async authenticatedRequest(url, token, options = {}) {
    if (!token) {
      throw new Error(MESSAGES.ERROR.NO_TOKEN);
    }

    const authOptions = {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    };

    return this.request(url, authOptions);
  }

  /**
   * Login de cajero
   */
  async login(email, password) {
    const url = `${this.baseURL}${this.endpoints.LOGIN}`;
    const body = JSON.stringify({ email, password });

    return this.request(url, {
      method: "POST",
      body,
    });
  }

  /**
   * Obtener perfil del cajero
   */
  async getPerfil(token) {
    const url = `${this.baseURL}${this.endpoints.PERFIL}`;
    return this.authenticatedRequest(url, token, {
      method: "GET",
    });
  }

  /**
   * Obtener transacciones por estado (endpoint genérico)
   */
  async getTransaccionesCajero(estado, token) {
    const url = `${this.baseURL}/api/transacciones/cajero?estado=${estado}`;
    return this.authenticatedRequest(url, token, {
      method: "GET",
    });
  }

  /**
   * Obtener transacciones pendientes (mantener compatibilidad)
   */
  async getTransaccionesPendientes(token) {
    const url = `${this.baseURL}${this.endpoints.TRANSACCIONES_PENDIENTES}`;
    return this.authenticatedRequest(url, token, {
      method: "GET",
    });
  }

  /**
   * Asignar cajero a una transacción
   */
  async asignarCajero(transaccionId, token) {
    const url = `${this.baseURL}${this.endpoints.ASIGNAR_CAJERO}/${transaccionId}/asignar-cajero`;
    return this.authenticatedRequest(url, token, {
      method: "PUT",
    });
  }

  /**
   * Obtener detalles de una transacción
   */
  async getTransaccionDetalle(transaccionId, token) {
    const url = `${this.baseURL}${this.endpoints.TRANSACCION_DETALLE}/${transaccionId}`;
    return this.authenticatedRequest(url, token, {
      method: "GET",
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
   * ===== NOTIFICACIONES =====
   */

  /**
   * Obtener notificaciones del cajero autenticado
   */
  async getNotificaciones(token, limit = 10) {
    const url = `${this.baseURL}/api/notificaciones/cajero?limit=${limit}`;
    return this.authenticatedRequest(url, token, {
      method: "GET",
    });
  }

  /**
   * Eliminar una notificación específica
   */
  async deleteNotificacion(notificacionId, token) {
    const url = `${this.baseURL}/api/notificaciones/${notificacionId}`;
    return this.authenticatedRequest(url, token, {
      method: "DELETE",
    });
  }
}

// Crear instancia única del gestor de API
export const API = new APIManager();
