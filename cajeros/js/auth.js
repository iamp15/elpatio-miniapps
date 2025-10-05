/**
 * Módulo de autenticación para cajeros
 */

import { API_CONFIG, STORAGE_KEYS, MESSAGES } from "./config.js";
import { API } from "./api.js";
import { UI } from "./ui.js";

class AuthManager {
  constructor() {
    this.currentToken = null;
    this.cajeroInfo = null;
    this.callbacks = {
      onLoginSuccess: null,
      onLogout: null,
      onTokenExpired: null,
    };
  }

  /**
   * Inicializar el gestor de autenticación
   */
  init() {
    // Verificar si hay un token guardado
    const savedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (savedToken) {
      this.verifyToken(savedToken);
    }
  }

  /**
   * Configurar callbacks para eventos de autenticación
   */
  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Realizar login
   */
  async login(email, password) {
    // Validaciones básicas
    if (!email || !password) {
      throw new Error(MESSAGES.ERROR.INCOMPLETE_FIELDS);
    }

    try {
      const response = await API.login(email, password);

      if (response.ok) {
        const data = await response.json();
        this.currentToken = data.token;
        localStorage.setItem(STORAGE_KEYS.TOKEN, this.currentToken);

        // Obtener información del cajero
        await this.loadCajeroInfo();

        // Ejecutar callback de éxito
        if (this.callbacks.onLoginSuccess) {
          this.callbacks.onLoginSuccess(this.cajeroInfo);
        }

        return { success: true, cajeroInfo: this.cajeroInfo };
      } else {
        const data = await response.json();
        throw new Error(data.mensaje || MESSAGES.ERROR.INVALID_CREDENTIALS);
      }
    } catch (error) {
      console.error("Error en el login:", error);
      if (error.name === "TypeError" || error.message.includes("fetch")) {
        throw new Error(MESSAGES.ERROR.CONNECTION);
      }
      throw error;
    }
  }

  /**
   * Verificar si un token es válido
   */
  async verifyToken(token) {
    try {
      const response = await API.getPerfil(token);

      if (response.ok) {
        const data = await response.json();
        this.currentToken = token;
        this.cajeroInfo = data.cajero;

        // Ejecutar callback de login exitoso
        if (this.callbacks.onLoginSuccess) {
          this.callbacks.onLoginSuccess(this.cajeroInfo);
        }

        return true;
      } else {
        // Token inválido, limpiar
        this.clearSession();
        return false;
      }
    } catch (error) {
      console.error("Error verificando token:", error);
      this.clearSession();
      return false;
    }
  }

  /**
   * Cargar información del cajero autenticado
   */
  async loadCajeroInfo() {
    if (!this.currentToken) return;

    try {
      const response = await API.getPerfil(this.currentToken);

      if (response.ok) {
        const data = await response.json();
        this.cajeroInfo = data.cajero;
        return this.cajeroInfo;
      }
    } catch (error) {
      console.error("Error cargando información del cajero:", error);
      throw error;
    }
  }

  /**
   * Realizar logout
   */
  logout() {
    this.clearSession();
    // No ejecutar callback aquí para evitar bucle infinito
    // El callback se maneja directamente en CajerosApp.handleLogout()
  }

  /**
   * Limpiar sesión
   */
  clearSession() {
    this.currentToken = null;
    this.cajeroInfo = null;
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
  }

  /**
   * Verificar si el usuario está autenticado
   */
  isAuthenticated() {
    return !!this.currentToken;
  }

  /**
   * Obtener token actual
   */
  getToken() {
    return this.currentToken;
  }

  /**
   * Obtener información del cajero
   */
  getCajeroInfo() {
    return this.cajeroInfo;
  }

  /**
   * Manejar expiración de token
   */
  handleTokenExpired() {
    this.clearSession();

    if (this.callbacks.onTokenExpired) {
      this.callbacks.onTokenExpired();
    }
  }
}

// Crear instancia única del gestor de autenticación
export const Auth = new AuthManager();
