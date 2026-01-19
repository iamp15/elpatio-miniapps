/**
 * Configuración de la aplicación de cajeros
 */

// Configuración de la API
export const API_CONFIG = {
  BASE_URL: "https://elpatio-backend.fly.dev",
  ENDPOINTS: {
    LOGIN: "/api/cajeros/login",
    PERFIL: "/api/cajeros/mi-perfil",
    TRANSACCIONES_PENDIENTES: "/api/transacciones/pendientes-cajero",
    ASIGNAR_CAJERO: "/api/transacciones",
    TRANSACCION_DETALLE: "/api/transacciones",
  },
};

// Configuración de localStorage
export const STORAGE_KEYS = {
  TOKEN: "cajero_token",
};

// Configuración de la UI
export const UI_CONFIG = {
  LOADING_DELAY: 300,
  ANIMATION_DURATION: 300,
  MODAL_Z_INDEX: 1000,
};

// Configuración de transacciones
export const TRANSACTION_CONFIG = {
  REFERENCE_DISPLAY_LENGTH: 6,
  AMOUNT_DIVISOR: 100, // Para convertir centavos a bolívares
  LOCALE: "es-VE",
};

// Mensajes de la aplicación
export const MESSAGES = {
  ERROR: {
    CONNECTION: "Error de conexión. Verifica tu conexión a internet.",
    INVALID_CREDENTIALS: "Error al iniciar sesión",
    INCOMPLETE_FIELDS: "Por favor, completa todos los campos",
    NO_TOKEN: "No hay token de autenticación",
    ASSIGN_TRANSACTION: "Error al asignar transacción",
  },
  SUCCESS: {
    LOGIN: "Sesión iniciada exitosamente",
    ASSIGN_TRANSACTION: "Transacción asignada exitosamente",
  },
  CONFIRM: {
    ASSIGN_TRANSACTION:
      "¿Estás seguro de aceptar esta transacción? Te asignarás como cajero responsable.",
  },
  LOADING: {
    LOGIN: "Iniciando sesión...",
    TRANSACTIONS: "Cargando solicitudes...",
    GENERAL: "Cargando...",
  },
  EMPTY: {
    NO_TRANSACTIONS: "No hay solicitudes pendientes",
    NO_TRANSACTIONS_DESC:
      "Todas las solicitudes están procesadas o no hay nuevas solicitudes.",
  },
};

// Estados de la aplicación
export const APP_STATES = {
  LOGIN: "login",
  DASHBOARD: "dashboard",
  LOADING: "loading",
  ERROR: "error",
  HISTORIAL: "historial",
};

// Tipos de transacciones
export const TRANSACTION_TYPES = {
  DEPOSITO: {
    key: "deposito",
    label: "Depósito",
    icon: "💰",
    class: "deposito",
  },
  RETIRO: {
    key: "retiro",
    label: "Retiro",
    icon: "💸",
    class: "retiro",
  },
};

// Estados finalizados para el historial
export const FINALIZED_STATES = [
  "completada",
  "completada_con_ajuste",
  "rechazada",
  "cancelada",
  "fallida",
  "revertida",
  "requiere_revision_admin",
];

// Configuración de elementos DOM
export const DOM_SELECTORS = {
  // Pantallas
  LOGIN_SCREEN: "#login-screen",
  DASHBOARD_SCREEN: "#dashboard-screen",
  HISTORIAL_SCREEN: "#historial-screen",
  NOTIFICATIONS_SCREEN: "#notifications-screen",

  // Formulario de login
  LOGIN_FORM: "#login-form",
  LOGIN_BTN: "#login-btn",
  LOGIN_TEXT: "#login-text",
  LOGIN_LOADING: "#login-loading",
  ERROR_MESSAGE: "#error-message",

  // Botones de acción
  LOGOUT_BTN: "#logout-btn",
  REFRESH_BTN: "#refresh-btn",
  HISTORY_BTN: "#history-btn",
  BACK_TO_DASHBOARD_FROM_HISTORY_BTN: "#back-to-dashboard-from-history-btn",

  // Información del cajero
  CAJERO_NAME: "#cajero-name",
  CAJERO_EMAIL_DISPLAY: "#cajero-email-display",
  CAJERO_BANCO: "#cajero-banco",
  CAJERO_CEDULA: "#cajero-cedula",
  CAJERO_TELEFONO_PAGO: "#cajero-telefono-pago",

  // Transacciones
  LOADING_TRANSACTIONS: "#loading-transactions",
  TRANSACTIONS_LIST: "#transactions-list",
  NO_TRANSACTIONS: "#no-transactions",

  // Historial
  LOADING_HISTORY: "#loading-history",
  HISTORY_LIST: "#history-list",
  NO_HISTORY: "#no-history",
  HISTORY_INITIAL_STATE: "#history-initial-state",
  HISTORY_COUNT: "#history-count",
  HISTORY_SHOWING: "#history-showing",
  HISTORY_TOTAL: "#history-total",
  LOAD_MORE_CONTAINER: "#load-more-container",
  LOAD_MORE_BTN: "#load-more-btn",
  FILTER_ESTADO: "#filter-estado",
  FILTER_TIPO: "#filter-tipo",
  FILTER_FECHA_INICIO: "#filter-fecha-inicio",
  FILTER_FECHA_FIN: "#filter-fecha-fin",
  APPLY_FILTERS_BTN: "#apply-filters-btn",
  CLEAR_FILTERS_BTN: "#clear-filters-btn",
};
