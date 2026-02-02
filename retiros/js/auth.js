/**
 * Módulo de autenticación para retiros (Telegram Web App)
 */

import { TELEGRAM_CONFIG, MESSAGES } from "./config.js";

class TelegramAuthManager {
  constructor() {
    this.tg = null;
    this.userData = null;
    this.isInitialized = false;
    this.callbacks = { onUserDataLoaded: null, onError: null };
  }

  async init() {
    try {
      await this.waitForTelegramWebApp();

      if (!window.Telegram?.WebApp) {
        throw new Error("Telegram Web App no está disponible");
      }

      this.tg = window.Telegram.WebApp;
      this.tg.ready();

      if (TELEGRAM_CONFIG.EXPAND_ON_READY) {
        this.tg.expand();
      }

      this.userData = this.tg.initDataUnsafe?.user;

      if (!this.userData) {
        throw new Error("No se pudieron obtener datos del usuario de Telegram");
      }

      this.isInitialized = true;

      if (this.callbacks.onUserDataLoaded) {
        this.callbacks.onUserDataLoaded(this.userData);
      }

      return this.userData;
    } catch (error) {
      console.error("Error inicializando Telegram Web App:", error);
      throw error;
    }
  }

  async waitForTelegramWebApp() {
    return new Promise((resolve) => {
      let attempts = 0;
      const check = () => {
        attempts++;
        if (window.Telegram?.WebApp || attempts >= 50) resolve();
        else setTimeout(check, 100);
      };
      check();
    });
  }

  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  isReady() {
    return this.isInitialized && this.userData !== null;
  }

  getUserData() {
    return this.userData;
  }

  getTelegramId() {
    return this.userData?.id?.toString();
  }

  getInitData() {
    return this.tg?.initData;
  }

  closeApp() {
    if (this.tg) this.tg.close();
  }
}

export const TelegramAuth = new TelegramAuthManager();
