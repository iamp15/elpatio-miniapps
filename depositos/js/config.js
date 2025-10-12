/**
 * Configuracion de la aplicacion de depositos
 */

// Configuracion de la API
export const API_CONFIG = {
  BASE_URL: "https://elpatio-backend.fly.dev/api",
  ENDPOINTS: {
    JUGADOR_SALDO: "/webapp/jugadores",
    CREAR_DEPOSITO: "/transacciones/solicitud",
    VERIFICAR_ESTADO: "/transacciones",
    CONFIRMAR_PAGO: "/transacciones",
    OBTENER_JUGADOR: "/jugadores",
    ADMIN_LOGIN: "/admin/login",
    CAJEROS_LOGIN: "/cajeros/login",
    BOT_TOKEN: "/bot/token",
    COMUNICAR_BOT: "/bot/comunicar",
  },
};

// Configuracion de Telegram Web App
export const TELEGRAM_CONFIG = {
  READY_TIMEOUT: 5000,
  EXPAND_ON_READY: true,
  ENABLE_LOGS: false,
};

// Configuración de la UI
export const UI_CONFIG = {
  LOADING_DELAY: 300,
  ANIMATION_DURATION: 300,
  POLLING_INTERVAL: 3000, // 3 segundos
  TIMEOUT_DURATION: 300000, // 5 minutos
};

// Configuración de transacciones
export const TRANSACTION_CONFIG = {
  MIN_AMOUNT: 1, // Bs
  MAX_AMOUNT: 10000, // Bs
  AMOUNT_DIVISOR: 100, // Para convertir centavos a bolívares
  LOCALE: "es-VE",
  CURRENCY_SYMBOL: "Bs",
};

// Mensajes de la aplicación
export const MESSAGES = {
  ERROR: {
    CONNECTION: "Error de conexión. Verifica tu conexión a internet.",
    INVALID_AMOUNT: "El monto debe ser mayor a 1 Bs",
    MAX_AMOUNT_EXCEEDED: "El monto máximo permitido es 10,000 Bs",
    TELEGRAM_NOT_AVAILABLE: "Telegram Web App no está disponible",
    USER_DATA_MISSING: "No se pudieron obtener los datos del usuario",
    TRANSACTION_FAILED: "Error al crear la transacción",
    PAYMENT_CONFIRMATION_FAILED: "Error al confirmar el pago",
    TIMEOUT: "La transacción ha expirado. Por favor, intenta nuevamente.",
  },
  SUCCESS: {
    DEPOSIT_CREATED: "Solicitud de depósito creada exitosamente",
    PAYMENT_CONFIRMED: "Pago confirmado exitosamente",
    BALANCE_UPDATED: "Saldo actualizado",
  },
  INFO: {
    LOADING: "Cargando...",
    SEARCHING_CAJERO: "Buscando cajero disponible...",
    WAITING_PAYMENT: "Esperando confirmación de pago...",
    VERIFYING_PAYMENT: "Verificando pago...",
    PROCESSING: "Procesando...",
  },
  CONFIRM: {
    CREATE_DEPOSIT: "¿Estás seguro de crear esta solicitud de depósito?",
    CONFIRM_PAYMENT: "¿Confirmas que realizaste el pago con estos datos?",
  },
};

// Estados de la aplicación
export const APP_STATES = {
  LOADING: "loading",
  MAIN: "main-screen",
  WAITING: "waiting-screen",
  BANK_INFO: "bank-info-screen",
  PAYMENT_CONFIRMATION: "payment-confirmation-screen",
  PAYMENT_REGISTERED: "payment-registered-screen",
  CONFIRMATION: "confirmation-screen",
  ERROR: "error-screen",
};

// Estados de transacciones
export const TRANSACTION_STATES = {
  PENDIENTE: "pendiente",
  EN_PROCESO: "en_proceso",
  REALIZADA: "realizada",
  CONFIRMADA: "confirmada",
  CANCELADA: "cancelada",
  EXPIRADA: "expirada",
};

// Configuración de elementos DOM
export const DOM_SELECTORS = {
  // Pantallas
  LOADING_SCREEN: "#loading",
  MAIN_SCREEN: "#main-screen",
  WAITING_SCREEN: "#waiting-screen",
  BANK_INFO_SCREEN: "#bank-info-screen",
  PAYMENT_CONFIRMATION_SCREEN: "#payment-confirmation-screen",
  PAYMENT_REGISTERED_SCREEN: "#payment-registered-screen",
  CONFIRMATION_SCREEN: "#confirmation-screen",
  ERROR_SCREEN: "#error-screen",

  // Formularios
  DEPOSIT_FORM: "#deposit-form",
  PAYMENT_CONFIRMATION_FORM: "#payment-confirmation-form",

  // Botones
  REQUEST_DEPOSIT_BTN: "#request-deposit-btn",
  PAYMENT_DONE_BTN: "#payment-done-btn",
  CONFIRM_PAYMENT_BTN: "#confirm-payment-btn",
  BACK_TO_BANK_BTN: "#back-to-bank-btn",
  CLOSE_APP_BTN: "#close-app-btn",
  RETRY_BTN: "#retry-btn",
  CLOSE_ERROR_BTN: "#close-error-btn",
  COPY_ALL_BTN: "#copy-all-btn",

  // Campos de entrada
  AMOUNT_INPUT: "#amount",
  AMOUNT_CENTS_INPUT: "#amount-cents",
  PAYMENT_BANK_SELECT: "#payment-bank",
  PAYMENT_PHONE_INPUT: "#payment-phone",
  PAYMENT_REFERENCE_INPUT: "#payment-reference",
  PAYMENT_DATE_INPUT: "#payment-date",
  PAYMENT_AMOUNT_INPUT: "#payment-amount",

  // Información mostrada
  CURRENT_BALANCE: "#current-balance",
  WAITING_AMOUNT: "#waiting-amount",
  WAITING_REFERENCE: "#waiting-reference",
  WAITING_STATUS: "#waiting-status",
  BANK_NAME: "#bank-name",
  BANK_PHONE: "#bank-phone",
  BANK_ID: "#bank-id",
  BANK_AMOUNT: "#bank-amount",
  FINAL_AMOUNT: "#final-amount",
  FINAL_DATE: "#final-date",
  FINAL_REFERENCE: "#final-reference",
  FINAL_BALANCE: "#final-balance",
  REGISTERED_AMOUNT: "#registered-amount",
  REGISTERED_DATE: "#registered-date",
  REGISTERED_REFERENCE: "#registered-reference",
  REGISTERED_STATUS: "#registered-status",
  ERROR_TITLE: "#error-title",
  ERROR_MESSAGE: "#error-message",
};

// Configuración de bancos
export const BANKS = [
  { value: "Banesco", label: "Banesco" },
  { value: "Mercantil", label: "Mercantil" },
  { value: "Venezuela", label: "Banco de Venezuela" },
  { value: "BOD", label: "BOD" },
  { value: "BBVA", label: "BBVA Provincial" },
  { value: "Bicentenario", label: "Bicentenario" },
];

// Configuración de polling
export const POLLING_CONFIG = {
  ENABLED: true,
  INTERVAL: 3000, // 3 segundos
  MAX_ATTEMPTS: 100, // 5 minutos máximo
  BACKOFF_MULTIPLIER: 1.1,
  MAX_INTERVAL: 10000, // 10 segundos máximo
};
