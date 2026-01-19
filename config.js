// Configuración para las Mini Apps de El Patio
const config = {
  // URLs de la API
  API_BASE_URL: process.env.API_BASE_URL || "http://localhost:3001",

  // Configuración de Telegram
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || "",

  // Configuración de pagos
  PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER || "mercadopago",
  MERCADOPAGO_PUBLIC_KEY: process.env.MERCADOPAGO_PUBLIC_KEY || "",

  // Configuración de la aplicación
  APP_NAME: "El Patio",
  APP_VERSION: "1.0.0",

  // Configuración de salas
  MIN_SALA_AMOUNT: parseInt(process.env.MIN_SALA_AMOUNT) || 1000,
  MAX_SALA_AMOUNT: parseInt(process.env.MAX_SALA_AMOUNT) || 100000,

  // Configuración de moneda
  CURRENCY: "VES",
  CURRENCY_SYMBOL: "Bs",

  // Configuración de desarrollo
  DEBUG: process.env.NODE_ENV === "development",

  // URLs de las mini apps
  DEPOSITOS_URL: "/depositos",
  RETIROS_URL: "/retiros",
  SALAS_URL: "/salas",
  CONFIGURACION_URL: "/configuracion",
};

module.exports = config;
