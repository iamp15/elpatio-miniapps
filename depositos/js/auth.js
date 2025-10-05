/**
 * Modulo de autenticacion para depositos (Telegram Web App)
 */

import { TELEGRAM_CONFIG, MESSAGES } from "./config.js";

class TelegramAuthManager {
  constructor() {
    this.tg = null;
    this.userData = null;
    this.isInitialized = false;
    this.callbacks = {
      onUserDataLoaded: null,
      onError: null,
    };
  }

  /**
   * Inicializar Telegram Web App
   */
  async init() {
    try {
      // Esperar un poco para que Telegram Web App se cargue completamente
      await this.waitForTelegramWebApp();

      // Verificar si Telegram Web App está disponible
      if (!window.Telegram?.WebApp) {
        throw new Error("Telegram Web App no está disponible");
      }

      this.tg = window.Telegram.WebApp;

      // Configurar Telegram Web App
      this.tg.ready();

      if (TELEGRAM_CONFIG.EXPAND_ON_READY) {
        this.tg.expand();
      }

      // Obtener datos del usuario
      this.userData = this.tg.initDataUnsafe?.user;

      if (!this.userData) {
        throw new Error("No se pudieron obtener datos del usuario de Telegram");
      }

      this.isInitialized = true;

      // Ejecutar callback de éxito
      if (this.callbacks.onUserDataLoaded) {
        this.callbacks.onUserDataLoaded(this.userData);
      }

      console.log("✅ Telegram Web App inicializado correctamente");
      return this.userData;
    } catch (error) {
      console.error("❌ Error inicializando Telegram Web App:", error);
      throw error;
    }
  }

  /**
   * Esperar a que Telegram Web App esté disponible
   */
  async waitForTelegramWebApp() {
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 50; // 5 segundos máximo

      const checkTelegram = () => {
        attempts++;

        if (window.Telegram?.WebApp || attempts >= maxAttempts) {
          resolve();
        } else {
          setTimeout(checkTelegram, 100);
        }
      };

      checkTelegram();
    });
  }

  /**
   * Configurar callbacks para eventos de autenticación
   */
  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Verificar si está inicializado
   */
  isReady() {
    return this.isInitialized && this.userData !== null;
  }

  /**
   * Obtener datos del usuario
   */
  getUserData() {
    return this.userData;
  }

  /**
   * Obtener ID de Telegram del usuario
   */
  getTelegramId() {
    return this.userData?.id?.toString();
  }

  /**
   * Obtener nombre del usuario
   */
  getUserName() {
    if (!this.userData) return null;

    return (
      this.userData.first_name +
      (this.userData.last_name ? ` ${this.userData.last_name}` : "")
    );
  }

  /**
   * Obtener username del usuario
   */
  getUsername() {
    return this.userData?.username;
  }

  /**
   * Obtener instancia de Telegram Web App
   */
  getTelegramWebApp() {
    return this.tg;
  }

  /**
   * Cerrar la aplicación
   */
  closeApp() {
    if (this.tg) {
      this.tg.close();
    }
  }

  /**
   * Mostrar alerta nativa de Telegram
   */
  showAlert(message) {
    if (this.tg) {
      this.tg.showAlert(message);
    } else {
      alert(message);
    }
  }

  /**
   * Mostrar confirmación nativa de Telegram
   */
  showConfirm(message, callback) {
    if (this.tg) {
      this.tg.showConfirm(message, callback);
    } else {
      const result = confirm(message);
      if (callback) callback(result);
    }
  }

  /**
   * Vibrar el dispositivo
   */
  vibrate() {
    if (this.tg) {
      this.tg.HapticFeedback.impactOccurred("medium");
    }
  }

  /**
   * Obtener tema actual
   */
  getTheme() {
    if (!this.tg) return "light";
    return this.tg.colorScheme;
  }

  /**
   * Verificar si es modo oscuro
   */
  isDarkMode() {
    return this.getTheme() === "dark";
  }

  /**
   * Obtener parámetros de la URL
   */
  getUrlParams() {
    if (!this.tg) return {};
    return this.tg.initDataUnsafe?.start_param || {};
  }

  /**
   * Obtener datos de inicialización
   */
  getInitData() {
    if (!this.tg) return null;
    return this.tg.initData;
  }

  /**
   * Obtener datos de inicialización no seguros
   */
  getInitDataUnsafe() {
    if (!this.tg) return null;
    return this.tg.initDataUnsafe;
  }

  /**
   * Verificar si la aplicación está en modo de desarrollo
   */
  isDevelopment() {
    return this.tg?.isExpanded === false;
  }

  /**
   * Obtener información de la plataforma
   */
  getPlatform() {
    if (!this.tg) return "unknown";
    return this.tg.platform;
  }

  /**
   * Obtener versión de la aplicación
   */
  getVersion() {
    if (!this.tg) return "unknown";
    return this.tg.version;
  }

  /**
   * Configurar color de fondo
   */
  setBackgroundColor(color) {
    if (this.tg) {
      this.tg.backgroundColor = color;
    }
  }

  /**
   * Configurar color de encabezado
   */
  setHeaderColor(color) {
    if (this.tg) {
      this.tg.headerColor = color;
    }
  }

  /**
   * Habilitar/deshabilitar botón de cierre
   */
  enableClosingConfirmation() {
    if (this.tg) {
      this.tg.enableClosingConfirmation();
    }
  }

  /**
   * Deshabilitar confirmación de cierre
   */
  disableClosingConfirmation() {
    if (this.tg) {
      this.tg.disableClosingConfirmation();
    }
  }
}

// Crear instancia única del gestor de autenticación de Telegram
export const TelegramAuth = new TelegramAuthManager();
