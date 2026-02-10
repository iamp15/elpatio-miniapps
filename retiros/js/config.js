/**
 * Configuración de la aplicación de retiros
 */

export const API_CONFIG = {
  BASE_URL: "https://elpatio-backend.fly.dev/api",
  ENDPOINTS: {
    JUGADOR_SALDO: "/webapp/jugadores",
    CONFIG_RETIROS: "/configuracion/retiros",
    TRANSACCIONES: "/transacciones",
  },
};

export const TELEGRAM_CONFIG = {
  READY_TIMEOUT: 5000,
  EXPAND_ON_READY: true,
  ENABLE_LOGS: false,
};

export const UI_CONFIG = {
  LOADING_DELAY: 300,
  ANIMATION_DURATION: 300,
};

export const TRANSACTION_CONFIG = {
  MIN_AMOUNT: 1,
  AMOUNT_DIVISOR: 100,
  LOCALE: "es-VE",
  CURRENCY_SYMBOL: "Bs",
};

export const MESSAGES = {
  ERROR: {
    CONNECTION: "Error de conexión. Verifica tu conexión a internet.",
    INVALID_AMOUNT: "El monto debe ser mayor al mínimo permitido",
    INSUFFICIENT_BALANCE: "Saldo insuficiente para el retiro",
    MAX_AMOUNT_EXCEEDED: "El monto excede tu saldo disponible",
    TELEGRAM_NOT_AVAILABLE: "Telegram Web App no está disponible",
    USER_DATA_MISSING: "No se pudieron obtener los datos del usuario",
    TRANSACTION_FAILED: "Error al crear la solicitud de retiro",
    TIMEOUT: "La solicitud ha expirado. Por favor, intenta nuevamente.",
  },
  SUCCESS: {
    WITHDRAWAL_CREATED: "Solicitud de retiro creada exitosamente",
    WITHDRAWAL_COMPLETED: "Retiro completado exitosamente",
    BALANCE_UPDATED: "Saldo actualizado",
  },
  INFO: {
    LOADING: "Cargando...",
    SEARCHING_CAJERO: "Buscando cajero disponible...",
    WAITING_CAJERO: "Esperando que un cajero acepte tu solicitud...",
    PROCESSING: "El cajero te enviará el dinero. Te notificaremos cuando se complete.",
  },
};

export const APP_STATES = {
  LOADING: "loading",
  RECONNECTING: "reconnecting",
  MAIN: "main-screen",
  DATA_PAYMENT: "data-payment-screen",
  WAITING: "waiting-screen",
  IN_PROCESS: "in-process-screen",
  COMPLETED: "completed-screen",
  ERROR: "error-screen",
};

export const TRANSACTION_STATES = {
  PENDIENTE: "pendiente",
  REQUIERE_REVISION_ADMIN: "requiere_revision_admin",
  RETIRO_PENDIENTE_ASIGNACION: "retiro_pendiente_asignacion",
  EN_PROCESO: "en_proceso",
  COMPLETADA: "completada",
  CANCELADA: "cancelada",
  EXPIRADA: "expirada",
};

export const BANKS = [
  { value: "Banesco", label: "Banesco" },
  { value: "Mercantil", label: "Mercantil" },
  { value: "Venezuela", label: "Banco de Venezuela" },
  { value: "BOD", label: "BOD" },
  { value: "BBVA", label: "BBVA Provincial" },
  { value: "Bicentenario", label: "Bicentenario" },
];
