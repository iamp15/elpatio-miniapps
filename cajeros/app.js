// Configuración de la API
const API_BASE_URL = "https://elpatio-backend-production.up.railway.app";

// Elementos del DOM
const loginScreen = document.getElementById("login-screen");
const successScreen = document.getElementById("success-screen");
const loginForm = document.getElementById("login-form");
const loginBtn = document.getElementById("login-btn");
const loginText = document.getElementById("login-text");
const loginLoading = document.getElementById("login-loading");
const errorMessage = document.getElementById("error-message");
const logoutBtn = document.getElementById("logout-btn");

// Elementos para mostrar información del cajero
const cajeroId = document.getElementById("cajero-id");
const cajeroEmail = document.getElementById("cajero-email");
const cajeroRol = document.getElementById("cajero-rol");

// Estado de la aplicación
let currentToken = null;
let cajeroInfo = null;

/**
 * Inicializar la aplicación
 */
function init() {
  // Verificar si hay un token guardado
  const savedToken = localStorage.getItem("cajero_token");
  if (savedToken) {
    // Verificar si el token sigue siendo válido
    verifyToken(savedToken);
  }

  // Event listeners
  loginForm.addEventListener("submit", handleLogin);
  logoutBtn.addEventListener("click", handleLogout);
}

/**
 * Manejar el envío del formulario de login
 */
async function handleLogin(e) {
  e.preventDefault();

  const formData = new FormData(loginForm);
  const email = formData.get("email");
  const password = formData.get("password");

  // Validaciones básicas
  if (!email || !password) {
    showError("Por favor, completa todos los campos");
    return;
  }

  setLoading(true);
  hideError();

  try {
    const response = await fetch(`${API_BASE_URL}/api/cajeros/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (response.ok) {
      // Login exitoso
      currentToken = data.token;
      localStorage.setItem("cajero_token", currentToken);

      // Obtener información del cajero
      await loadCajeroInfo();

      // Mostrar pantalla de éxito
      showSuccessScreen();
    } else {
      // Error en el login
      showError(data.mensaje || "Error al iniciar sesión");
    }
  } catch (error) {
    console.error("Error en el login:", error);
    showError("Error de conexión. Verifica tu conexión a internet.");
  } finally {
    setLoading(false);
  }
}

/**
 * Verificar si un token es válido
 */
async function verifyToken(token) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/cajeros/mi-perfil`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      currentToken = token;
      cajeroInfo = data.cajero;
      showSuccessScreen();
    } else {
      // Token inválido, limpiar
      localStorage.removeItem("cajero_token");
      currentToken = null;
    }
  } catch (error) {
    console.error("Error verificando token:", error);
    localStorage.removeItem("cajero_token");
    currentToken = null;
  }
}

/**
 * Cargar información del cajero autenticado
 */
async function loadCajeroInfo() {
  if (!currentToken) return;

  try {
    const response = await fetch(`${API_BASE_URL}/api/cajeros/mi-perfil`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${currentToken}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      cajeroInfo = data.cajero;
      updateCajeroDisplay();
    }
  } catch (error) {
    console.error("Error cargando información del cajero:", error);
  }
}

/**
 * Actualizar la visualización de información del cajero
 */
function updateCajeroDisplay() {
  if (cajeroInfo) {
    cajeroId.textContent = cajeroInfo._id || "-";
    cajeroEmail.textContent = cajeroInfo.email || "-";
    cajeroRol.textContent = "Cajero";
  }
}

/**
 * Mostrar pantalla de éxito
 */
function showSuccessScreen() {
  loginScreen.classList.remove("active");
  successScreen.classList.add("active");
  updateCajeroDisplay();
}

/**
 * Mostrar pantalla de login
 */
function showLoginScreen() {
  successScreen.classList.remove("active");
  loginScreen.classList.add("active");
  loginForm.reset();
  hideError();
}

/**
 * Manejar logout
 */
function handleLogout() {
  // Limpiar token y datos
  currentToken = null;
  cajeroInfo = null;
  localStorage.removeItem("cajero_token");

  // Volver a la pantalla de login
  showLoginScreen();
}

/**
 * Mostrar estado de carga
 */
function setLoading(loading) {
  if (loading) {
    loginBtn.disabled = true;
    loginText.style.display = "none";
    loginLoading.style.display = "inline";
  } else {
    loginBtn.disabled = false;
    loginText.style.display = "inline";
    loginLoading.style.display = "none";
  }
}

/**
 * Mostrar mensaje de error
 */
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.style.display = "block";
}

/**
 * Ocultar mensaje de error
 */
function hideError() {
  errorMessage.style.display = "none";
}

/**
 * Función para hacer requests autenticados
 */
async function authenticatedRequest(url, options = {}) {
  if (!currentToken) {
    throw new Error("No hay token de autenticación");
  }

  const defaultOptions = {
    headers: {
      Authorization: `Bearer ${currentToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  };

  return fetch(url, { ...defaultOptions, ...options });
}

// Inicializar la aplicación cuando se carga el DOM
document.addEventListener("DOMContentLoaded", init);

// Exportar funciones para uso global si es necesario
window.CajerosApp = {
  authenticatedRequest,
  logout: handleLogout,
  getCurrentToken: () => currentToken,
  getCajeroInfo: () => cajeroInfo,
};
