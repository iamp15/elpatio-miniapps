// Configuración de la API
const API_BASE_URL = "https://elpatio-backend-production.up.railway.app";

// Elementos del DOM
const loginScreen = document.getElementById("login-screen");
const dashboardScreen = document.getElementById("dashboard-screen");
const loginForm = document.getElementById("login-form");
const loginBtn = document.getElementById("login-btn");
const loginText = document.getElementById("login-text");
const loginLoading = document.getElementById("login-loading");
const errorMessage = document.getElementById("error-message");
const logoutBtn = document.getElementById("logout-btn");
const refreshBtn = document.getElementById("refresh-btn");

// Elementos del dashboard
const cajeroName = document.getElementById("cajero-name");
const cajeroEmailDisplay = document.getElementById("cajero-email-display");
const cajeroBanco = document.getElementById("cajero-banco");
const cajeroCedula = document.getElementById("cajero-cedula");
const cajeroTelefonoPago = document.getElementById("cajero-telefono-pago");
const loadingTransactions = document.getElementById("loading-transactions");
const transactionsList = document.getElementById("transactions-list");
const noTransactions = document.getElementById("no-transactions");

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
  refreshBtn.addEventListener("click", loadTransactions);
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

      // Cargar transacciones pendientes
      await loadTransactions();

      // Mostrar dashboard
      showDashboard();
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

      // Cargar transacciones pendientes
      await loadTransactions();

      // Mostrar dashboard
      showDashboard();
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
    cajeroName.textContent = cajeroInfo.nombreCompleto || "-";
    cajeroEmailDisplay.textContent = cajeroInfo.email || "-";
    cajeroBanco.textContent = cajeroInfo.datosPagoMovil?.banco || "-";

    // Formatear cédula con prefijo y número
    const cedula = cajeroInfo.datosPagoMovil?.cedula;
    if (cedula && cedula.prefijo && cedula.numero) {
      cajeroCedula.textContent = `${cedula.prefijo}-${cedula.numero}`;
    } else {
      cajeroCedula.textContent = "-";
    }

    // Mostrar teléfono de pago móvil
    cajeroTelefonoPago.textContent = cajeroInfo.datosPagoMovil?.telefono || "-";
  }
}

/**
 * Mostrar dashboard
 */
function showDashboard() {
  loginScreen.classList.remove("active");
  dashboardScreen.classList.add("active");
  updateCajeroDisplay();
}

/**
 * Mostrar pantalla de login
 */
function showLoginScreen() {
  dashboardScreen.classList.remove("active");
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
 * Cargar transacciones pendientes
 */
async function loadTransactions() {
  if (!currentToken) return;

  try {
    showLoadingTransactions(true);
    hideNoTransactions();

    const response = await authenticatedRequest(
      `${API_BASE_URL}/api/transacciones/pendientes-cajero`
    );

    if (response.ok) {
      const data = await response.json();
      console.log("Respuesta del endpoint:", data);
      // El endpoint devuelve { transacciones: [...], total: number }
      const transacciones = data.transacciones || data;
      console.log("Transacciones extraídas:", transacciones);
      displayTransactions(transacciones);
    } else {
      console.error("Error cargando transacciones:", response.status);
      showNoTransactions();
    }
  } catch (error) {
    console.error("Error cargando transacciones:", error);
    showNoTransactions();
  } finally {
    showLoadingTransactions(false);
  }
}

/**
 * Mostrar transacciones en la interfaz
 */
function displayTransactions(transacciones) {
  transactionsList.innerHTML = "";

  if (!transacciones || transacciones.length === 0) {
    showNoTransactions();
    return;
  }

  transacciones.forEach((transaccion) => {
    const transactionCard = createTransactionCard(transaccion);
    transactionsList.appendChild(transactionCard);
  });
}

/**
 * Formatear referencia para mostrar solo últimos 6 dígitos
 */
function formatReference(referencia) {
  if (!referencia) return "N/A";
  if (referencia.length <= 6) return referencia;
  return "..." + referencia.slice(-6);
}

/**
 * Crear tarjeta de transacción
 */
function createTransactionCard(transaccion) {
  const card = document.createElement("div");
  card.className = "transaction-card";
  card.dataset.transactionId = transaccion._id;

  const tipoClass =
    transaccion.categoria === "deposito" ? "deposito" : "retiro";
  const tipoText = transaccion.categoria === "deposito" ? "Depósito" : "Retiro";
  const icon = transaccion.categoria === "deposito" ? "💰" : "💸";

  card.innerHTML = `
    <div class="transaction-header">
      <div class="transaction-type ${tipoClass}">
        ${icon} ${tipoText}
      </div>
      <div class="transaction-amount">
        ${(transaccion.monto / 100).toLocaleString("es-VE")} Bs
      </div>
    </div>
    
    <div class="transaction-details">
      <p><strong>Descripción:</strong> ${
        transaccion.descripcion || "Sin descripción"
      }</p>
      <p><strong>Categoría:</strong> ${transaccion.categoria || "N/A"}</p>
      <p><strong>Fecha:</strong> ${new Date(
        transaccion.createdAt
      ).toLocaleString()}</p>
      ${
        transaccion.referencia
          ? `<p><strong>ID Transacción:</strong> ${formatReference(
              transaccion.referencia
            )}</p>`
          : ""
      }
      ${
        transaccion.jugadorId
          ? `<p><strong>Jugador:</strong> ${
              transaccion.jugadorId.username ||
              transaccion.jugadorId.nickname ||
              "N/A"
            }</p>`
          : ""
      }
      ${
        transaccion.datosPago
          ? `
        <p><strong>Método:</strong> ${transaccion.datosPago.metodo || "N/A"}</p>
        ${
          transaccion.datosPago.banco
            ? `<p><strong>Banco:</strong> ${transaccion.datosPago.banco}</p>`
            : ""
        }
        ${
          transaccion.datosPago.telefono
            ? `<p><strong>Teléfono:</strong> ${transaccion.datosPago.telefono}</p>`
            : ""
        }
        ${
          transaccion.datosPago.referencia
            ? `<p><strong>Referencia:</strong> ${formatReference(
                transaccion.datosPago.referencia
              )}</p>`
            : ""
        }
      `
          : ""
      }
    </div>
    
    <div class="transaction-actions">
      <button class="btn-action btn-accept" onclick="aceptarTransaccion('${
        transaccion._id
      }')">
        ✅ Aceptar
      </button>
    </div>
  `;

  return card;
}

/**
 * Aceptar transacción (tomar la transacción)
 */
async function aceptarTransaccion(transaccionId) {
  if (
    !confirm(
      "¿Estás seguro de aceptar esta transacción? Te asignarás como cajero responsable."
    )
  ) {
    return;
  }

  try {
    // 1. Asignar cajero a la transacción
    const asignacionResponse = await authenticatedRequest(
      `${API_BASE_URL}/api/transacciones/${transaccionId}/asignar-cajero`,
      { method: "PUT" }
    );

    if (!asignacionResponse.ok) {
      const errorData = await asignacionResponse.json();
      alert(`❌ Error: ${errorData.mensaje || "Error al asignar transacción"}`);
      return;
    }

    // 2. Obtener detalles de la transacción asignada
    const transaccionResponse = await authenticatedRequest(
      `${API_BASE_URL}/api/transacciones/${transaccionId}`
    );

    if (transaccionResponse.ok) {
      const transaccionData = await transaccionResponse.json();
      showTransactionDetails(transaccionData.transaccion);
    } else {
      alert("✅ Transacción asignada exitosamente");
      loadTransactions(); // Recargar la lista
    }

  } catch (error) {
    console.error("Error aceptando transacción:", error);
    alert("❌ Error de conexión al aceptar transacción");
  }
}

/**
 * Mostrar detalles de transacción aceptada
 */
function showTransactionDetails(transaccion) {
  const tipoClass = transaccion.categoria === "deposito" ? "deposito" : "retiro";
  const tipoText = transaccion.categoria === "deposito" ? "Depósito" : "Retiro";
  const icon = transaccion.categoria === "deposito" ? "💰" : "💸";

  const detailsHTML = `
    <div class="transaction-details-modal">
      <div class="modal-header">
        <h2>✅ Transacción Aceptada</h2>
        <button onclick="closeTransactionDetails()" class="close-btn">&times;</button>
      </div>
      
      <div class="transaction-info">
        <div class="transaction-header ${tipoClass}">
          <div class="transaction-type">
            ${icon} ${tipoText}
          </div>
          <div class="transaction-amount">
            ${(transaccion.monto / 100).toLocaleString("es-VE")} Bs
          </div>
        </div>
        
        <div class="details-grid">
          <div class="detail-item">
            <strong>ID Transacción:</strong>
            <span>${formatReference(transaccion.referencia || transaccion._id)}</span>
          </div>
          
          <div class="detail-item">
            <strong>Jugador:</strong>
            <span>${transaccion.jugadorId?.username || transaccion.jugadorId?.nickname || "N/A"}</span>
          </div>
          
          <div class="detail-item">
            <strong>Estado:</strong>
            <span class="status-en-proceso">En Proceso</span>
          </div>
          
          <div class="detail-item">
            <strong>Fecha Asignación:</strong>
            <span>${new Date().toLocaleString("es-VE")}</span>
          </div>
        </div>
        
        <div class="payment-info">
          <h3>📱 Información de Pago Móvil</h3>
          <div class="payment-details">
            <div class="payment-item">
              <strong>Banco:</strong> ${cajeroInfo?.datosPagoMovil?.banco || "N/A"}
            </div>
            <div class="payment-item">
              <strong>Cédula:</strong> ${cajeroInfo?.datosPagoMovil?.cedula?.prefijo || ""}-${cajeroInfo?.datosPagoMovil?.cedula?.numero || "N/A"}
            </div>
            <div class="payment-item">
              <strong>Teléfono:</strong> ${cajeroInfo?.datosPagoMovil?.telefono || "N/A"}
            </div>
          </div>
        </div>
        
        <div class="status-message">
          <p>🔄 <strong>Estado:</strong> Esperando pago del jugador</p>
          <p>Los datos bancarios han sido enviados al jugador. Recibirás una notificación cuando realice el pago.</p>
        </div>
      </div>
      
      <div class="modal-actions">
        <button onclick="closeTransactionDetails()" class="btn btn-primary">Cerrar</button>
        <button onclick="loadTransactions(); closeTransactionDetails();" class="btn btn-secondary">Ver Lista</button>
      </div>
    </div>
  `;

  // Crear overlay
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = detailsHTML;
  
  document.body.appendChild(overlay);
}

/**
 * Cerrar detalles de transacción
 */
function closeTransactionDetails() {
  const overlay = document.querySelector(".modal-overlay");
  if (overlay) {
    overlay.remove();
  }
}

/**
 * Mostrar estado de carga de transacciones
 */
function showLoadingTransactions(show) {
  loadingTransactions.style.display = show ? "block" : "none";
}

/**
 * Mostrar mensaje de no transacciones
 */
function showNoTransactions() {
  noTransactions.style.display = "block";
  transactionsList.innerHTML = "";
}

/**
 * Ocultar mensaje de no transacciones
 */
function hideNoTransactions() {
  noTransactions.style.display = "none";
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
  loadTransactions,
  aceptarTransaccion,
  showTransactionDetails,
  closeTransactionDetails,
};
