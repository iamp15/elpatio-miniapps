// Configuración de la Mini App de Depósitos
const CONFIG = {
  // URL del backend del bot
  BACKEND_URL: "http://localhost:3000/api",

  // Endpoints del backend
  ENDPOINTS: {
    // Crear solicitud de depósito
    CREATE_DEPOSIT_REQUEST: "/transacciones/solicitud",

    // Obtener detalles de transacción
    GET_TRANSACTION: "/transacciones",

    // Confirmar pago del usuario
    CONFIRM_USER_PAYMENT: "/transacciones",

    // Obtener cajeros disponibles
    GET_AVAILABLE_CAJEROS: "/transacciones/cajeros-disponibles",

    // Asignar cajero a transacción
    ASSIGN_CAJERO: "/transacciones",

    // Obtener saldo del usuario
    GET_USER_BALANCE: "/jugadores",

    // Webhook para comunicación con Mini App
    WEBAPP_WEBHOOK: "/webapp/deposito",
  },

  // Configuración de la app
  APP: {
    NAME: "Depósitos - El Patio",
    VERSION: "1.0.0",
    MIN_AMOUNT: 1, // Monto mínimo en Bs
    MAX_AMOUNT: 10000, // Monto máximo en Bs
    TIMEOUT: 30000, // Timeout para requests en ms
  },

  // Estados de transacción
  TRANSACTION_STATES: {
    PENDIENTE: "pendiente",
    EN_PROCESO: "en_proceso",
    PAGADA: "pagada",
    VERIFICADA: "verificada",
    COMPLETADA: "completada",
    RECHAZADA: "rechazada",
  },

  // Bancos disponibles
  BANKS: [
    { code: "BANESCO", name: "Banesco" },
    { code: "MERCANTIL", name: "Mercantil" },
    { code: "VENEZUELA", name: "Banco de Venezuela" },
    { code: "BOD", name: "BOD" },
    { code: "BBVA", name: "BBVA Provincial" },
    { code: "BICENTENARIO", name: "Bicentenario" },
    { code: "BANCO_PLAZA", name: "Banco Plaza" },
    { code: "BANCO_CARONI", name: "Banco Caroní" },
  ],

  // Mensajes de la app
  MESSAGES: {
    LOADING: "Cargando...",
    CREATING_REQUEST: "Creando solicitud de depósito...",
    WAITING_CAJERO: "Buscando cajero disponible...",
    CONFIRMING_PAYMENT: "Confirmando pago...",
    SUCCESS: "¡Operación exitosa!",
    ERROR: "Ha ocurrido un error",
    INVALID_AMOUNT: "Monto inválido",
    NETWORK_ERROR: "Error de conexión",
    AUTH_ERROR: "Error de autenticación",
  },

  // Configuración de polling para verificar estado
  POLLING: {
    ENABLED: true,
    INTERVAL: 5000, // 5 segundos
    MAX_ATTEMPTS: 60, // 5 minutos máximo
    BACKOFF_MULTIPLIER: 1.5,
  },
};

// Función para obtener la URL completa de un endpoint
function getEndpointUrl(endpoint, params = {}) {
  let url = CONFIG.BACKEND_URL + endpoint;

  // Reemplazar parámetros en la URL
  Object.keys(params).forEach((key) => {
    url = url.replace(`:${key}`, params[key]);
  });

  return url;
}

// Función para hacer requests HTTP
async function makeRequest(url, options = {}) {
  const defaultOptions = {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    timeout: CONFIG.APP.TIMEOUT,
  };

  const finalOptions = { ...defaultOptions, ...options };

  try {
    const response = await fetch(url, finalOptions);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Request error:", error);
    throw error;
  }
}

// Función para validar monto
function validateAmount(amount) {
  const numAmount = parseFloat(amount);

  if (isNaN(numAmount) || numAmount <= 0) {
    throw new Error("El monto debe ser un número positivo");
  }

  if (numAmount < CONFIG.APP.MIN_AMOUNT) {
    throw new Error(`El monto mínimo es ${CONFIG.APP.MIN_AMOUNT} Bs`);
  }

  if (numAmount > CONFIG.APP.MAX_AMOUNT) {
    throw new Error(`El monto máximo es ${CONFIG.APP.MAX_AMOUNT} Bs`);
  }

  return numAmount;
}

// Función para formatear monto
function formatAmount(amount, showCurrency = true) {
  const formatted = parseFloat(amount).toFixed(2);
  return showCurrency ? `${formatted} Bs` : formatted;
}

// Función para convertir Bs a centavos
function toCents(amount) {
  return Math.round(parseFloat(amount) * 100);
}

// Función para convertir centavos a Bs
function toBolivares(cents) {
  return parseFloat(cents) / 100;
}

// Exportar configuración
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    CONFIG,
    getEndpointUrl,
    makeRequest,
    validateAmount,
    formatAmount,
    toCents,
    toBolivares,
  };
} else {
  window.DepositConfig = {
    CONFIG,
    getEndpointUrl,
    makeRequest,
    validateAmount,
    formatAmount,
    toCents,
    toBolivares,
  };
}
