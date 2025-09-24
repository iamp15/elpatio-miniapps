// Configuración de la Mini App
class DepositApp {
  constructor() {
    this.tg = window.Telegram.WebApp;
    this.currentTransaction = null;
    this.userData = null;
    // Configuración del backend basada en el ambiente
    this.backendUrl = this.getBackendUrl();

    this.init();
  }

  // Obtener URL del backend basada en el ambiente
  getBackendUrl() {
    // En desarrollo local
    if (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    ) {
      return "http://localhost:3001/api";
    }

    // En Vercel (desarrollo), usar Railway backend
    if (window.location.hostname.includes("vercel.app")) {
      // URL del backend en Railway (actualizar con tu URL real)
      return "https://elpatio-backend-production.up.railway.app/api";
    }

    // En producción real
    return "https://elpatio-backend-production.up.railway.app/api";
  }

  // Inicialización de la app
  init() {
    console.log("🚀 Inicializando Mini App de Depósitos");

    // Configurar Telegram Web App
    this.tg.ready();
    this.tg.expand();

    // Obtener datos del usuario
    this.userData = this.tg.initDataUnsafe?.user;

    if (!this.userData) {
      this.showError(
        "Error de autenticación",
        "No se pudieron obtener los datos del usuario"
      );
      return;
    }

    console.log("👤 Usuario:", this.userData);

    // Configurar tema
    this.setupTheme();

    // Configurar eventos
    this.setupEventListeners();

    // Cargar saldo inicial
    this.loadUserBalance();

    // Mostrar pantalla principal
    this.showScreen("main-screen");
  }

  // Configurar tema de Telegram
  setupTheme() {
    const theme = this.tg.colorScheme;
    console.log("🎨 Tema:", theme);

    // Aplicar colores del tema
    document.documentElement.style.setProperty(
      "--tg-theme-bg-color",
      this.tg.themeParams.bg_color || "#ffffff"
    );
    document.documentElement.style.setProperty(
      "--tg-theme-text-color",
      this.tg.themeParams.text_color || "#000000"
    );
    document.documentElement.style.setProperty(
      "--tg-theme-hint-color",
      this.tg.themeParams.hint_color || "#999999"
    );
    document.documentElement.style.setProperty(
      "--tg-theme-link-color",
      this.tg.themeParams.link_color || "#2481cc"
    );
    document.documentElement.style.setProperty(
      "--tg-theme-button-color",
      this.tg.themeParams.button_color || "#2481cc"
    );
    document.documentElement.style.setProperty(
      "--tg-theme-button-text-color",
      this.tg.themeParams.button_text_color || "#ffffff"
    );
    document.documentElement.style.setProperty(
      "--tg-theme-secondary-bg-color",
      this.tg.themeParams.secondary_bg_color || "#f1f1f1"
    );
  }

  // Configurar event listeners
  setupEventListeners() {
    // Formulario de solicitud de depósito
    document.getElementById("deposit-form").addEventListener("submit", (e) => {
      e.preventDefault();
      this.handleDepositRequest();
    });

    // Cálculo automático de centavos
    document.getElementById("amount").addEventListener("input", (e) => {
      this.calculateCents(e.target.value);
    });

    // Botón "Ya realicé el pago"
    document
      .getElementById("payment-done-btn")
      .addEventListener("click", () => {
        this.showScreen("payment-confirmation-screen");
      });

    // Formulario de confirmación de pago
    document
      .getElementById("payment-confirmation-form")
      .addEventListener("submit", (e) => {
        e.preventDefault();
        this.handlePaymentConfirmation();
      });

    // Botón volver
    document
      .getElementById("back-to-bank-btn")
      .addEventListener("click", () => {
        this.showScreen("bank-info-screen");
      });

    // Botón cerrar app
    document.getElementById("close-app-btn").addEventListener("click", () => {
      this.tg.close();
    });

    // Botones de error
    document.getElementById("retry-btn").addEventListener("click", () => {
      this.showScreen("main-screen");
    });

    document.getElementById("close-error-btn").addEventListener("click", () => {
      this.tg.close();
    });

    // Configurar fecha actual por defecto
    document.getElementById("payment-date").value = new Date()
      .toISOString()
      .split("T")[0];
  }

  // Mostrar pantalla específica
  showScreen(screenId) {
    // Ocultar todas las pantallas
    document.querySelectorAll(".screen").forEach((screen) => {
      screen.classList.remove("active");
    });

    // Mostrar pantalla seleccionada
    const screen = document.getElementById(screenId);
    if (screen) {
      screen.classList.add("active");
      console.log(`📱 Mostrando pantalla: ${screenId}`);
    }
  }

  // Cargar saldo del usuario
  async loadUserBalance() {
    try {
      // Mostrar estado de carga
      document.getElementById("current-balance").textContent = "Cargando...";

      // Obtener saldo real del backend
      const balance = await this.getUserBalance();

      // Formatear saldo con separadores de miles
      const formattedBalance = this.formatCurrency(balance);
      document.getElementById(
        "current-balance"
      ).textContent = `${formattedBalance} Bs`;
      
      console.log("✅ Saldo cargado exitosamente:", formattedBalance, "Bs");
    } catch (error) {
      console.error("❌ Error cargando saldo:", error);
      
      // Mostrar mensaje de error más específico
      let errorMessage = "No disponible temporalmente";
      
      if (error.message.includes("404")) {
        errorMessage = "Usuario no encontrado";
      } else if (error.message.includes("Backend no disponible")) {
        errorMessage = "Backend no disponible";
      } else if (error.message.includes("fetch")) {
        errorMessage = "Error de conexión";
      }
      
      document.getElementById("current-balance").textContent = errorMessage;
      
      // Mostrar mensaje de error en la consola para debugging
      console.warn("⚠️ No se pudo cargar el saldo:", error.message);
    }
  }

  // Obtener saldo del usuario desde el backend
  async getUserBalance() {
    try {
      console.log("🔍 Iniciando obtención de saldo...");
      console.log("🔗 Backend URL:", this.backendUrl);
      console.log("👤 Usuario ID:", this.userData?.id);

      // Si no hay backend disponible, lanzar error
      if (!this.backendUrl) {
        console.error("❌ Backend no disponible");
        throw new Error("Backend no disponible");
      }

      // Obtener el ID del jugador desde los datos de Telegram
      const telegramId = this.userData.id.toString();
      const fullUrl = `${this.backendUrl}/webapp/jugadores/${telegramId}/saldo`;

      console.log("📡 Haciendo petición a:", fullUrl);

      // Hacer llamada al endpoint del backend con autenticación de Telegram
      const response = await fetch(fullUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Telegram-ID": telegramId,
        },
      });

      console.log(
        "📊 Respuesta recibida:",
        response.status,
        response.statusText
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Error del servidor: ${response.status} - ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log("📊 Datos recibidos:", data);

      if (data.success && data.saldo !== undefined) {
        // Convertir centavos a bolívares
        const balanceInBs = data.saldo / 100;
        console.log(
          "✅ Saldo obtenido:",
          data.saldo,
          "centavos =",
          balanceInBs,
          "Bs"
        );
        return balanceInBs;
      } else {
        throw new Error(data.message || "Error obteniendo saldo");
      }
    } catch (error) {
      console.error("❌ Error obteniendo saldo:", error.message);
      // Lanzar el error para que se muestre el mensaje de error
      throw error;
    }
  }

  // Formatear moneda venezolana
  formatCurrency(amount) {
    return new Intl.NumberFormat("es-VE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  // Calcular centavos automáticamente
  calculateCents(amount) {
    const cents = Math.round(parseFloat(amount || 0) * 100);
    document.getElementById("amount-cents").value = cents;
  }

  // Manejar solicitud de depósito
  async handleDepositRequest() {
    const amount = parseFloat(document.getElementById("amount").value);
    const amountCents = parseInt(document.getElementById("amount-cents").value);

    if (!amount || amount <= 0) {
      this.showError("Monto inválido", "Por favor ingresa un monto válido");
      return;
    }

    try {
      this.showLoading("Creando solicitud de depósito...");

      // Crear solicitud de depósito
      const transaction = await this.createDepositRequest(amountCents);

      this.currentTransaction = transaction;

      // Mostrar pantalla de espera
      this.showWaitingScreen(transaction);

      // Simular asignación de cajero (en producción esto sería automático)
      setTimeout(() => {
        this.simulateCajeroAssignment();
      }, 2000);
    } catch (error) {
      console.error("Error creando solicitud:", error);
      this.showError("Error en la solicitud", error.message);
    }
  }

  // Crear solicitud de depósito
  async createDepositRequest(amountCents) {
    const payload = {
      telegramId: this.userData.id.toString(),
      monto: amountCents,
    };

    // TODO: Implementar llamada real al backend del bot
    // const response = await fetch(`${this.backendUrl}/depositos/solicitud`, {
    //     method: 'POST',
    //     headers: {
    //         'Content-Type': 'application/json',
    //     },
    //     body: JSON.stringify(payload)
    // });

    // Simular respuesta
    return {
      _id: "64f1a2b3c4d5e6f7g8h9i0j1",
      referencia: `DEP_${this.userData.id}_${Date.now()}`,
      monto: amountCents,
      estado: "pendiente",
      fechaCreacion: new Date().toISOString(),
    };
  }

  // Mostrar pantalla de espera
  showWaitingScreen(transaction) {
    document.getElementById("waiting-amount").textContent = `${
      transaction.monto / 100
    } Bs`;
    document.getElementById("waiting-reference").textContent =
      transaction.referencia;
    document.getElementById("waiting-status").textContent = "Pendiente";

    this.showScreen("waiting-screen");
  }

  // Simular asignación de cajero
  async simulateCajeroAssignment() {
    try {
      // Obtener cajeros disponibles
      const cajeros = await this.getAvailableCajeros();
      const cajero = cajeros[0]; // Tomar el primer cajero disponible

      // Asignar cajero a la transacción
      await this.assignCajeroToTransaction(
        this.currentTransaction._id,
        cajero._id,
        cajero.datosBancarios
      );

      // Mostrar pantalla de datos bancarios
      this.showBankInfoScreen(cajero);
    } catch (error) {
      console.error("Error asignando cajero:", error);
      this.showError("Error asignando cajero", error.message);
    }
  }

  // Obtener cajeros disponibles
  async getAvailableCajeros() {
    // TODO: Implementar llamada real al backend
    return [
      {
        _id: "64f1a2b3c4d5e6f7g8h9i0j2",
        nombre: "Cajero Principal",
        datosBancarios: {
          banco: "Banesco",
          telefono: "04141234567",
          cedula: "12345678",
        },
      },
    ];
  }

  // Asignar cajero a transacción
  async assignCajeroToTransaction(transactionId, cajeroId, datosBancarios) {
    // TODO: Implementar llamada real al backend
    console.log("Asignando cajero:", {
      transactionId,
      cajeroId,
      datosBancarios,
    });

    // Simular actualización de estado
    this.currentTransaction.estado = "en_proceso";
    this.currentTransaction.cajeroId = cajeroId;
  }

  // Mostrar pantalla de datos bancarios
  showBankInfoScreen(cajero) {
    document.getElementById("bank-name").textContent =
      cajero.datosBancarios.banco;
    document.getElementById("bank-phone").textContent =
      cajero.datosBancarios.telefono;
    document.getElementById("bank-id").textContent =
      cajero.datosBancarios.cedula;
    document.getElementById("bank-amount").textContent = `${
      this.currentTransaction.monto / 100
    } Bs`;

    this.showScreen("bank-info-screen");
  }

  // Manejar confirmación de pago
  async handlePaymentConfirmation() {
    const formData = new FormData(
      document.getElementById("payment-confirmation-form")
    );

    const paymentData = {
      banco: formData.get("payment-bank"),
      telefono: formData.get("payment-phone"),
      referencia: formData.get("payment-reference"),
      fecha: formData.get("payment-date"),
    };

    try {
      this.showLoading("Confirmando pago...");

      // Confirmar pago del usuario
      await this.confirmUserPayment(this.currentTransaction._id, paymentData);

      // Mostrar pantalla de confirmación final
      this.showConfirmationScreen();
    } catch (error) {
      console.error("Error confirmando pago:", error);
      this.showError("Error confirmando pago", error.message);
    }
  }

  // Confirmar pago del usuario
  async confirmUserPayment(transactionId, paymentData) {
    // TODO: Implementar llamada real al backend
    console.log("Confirmando pago:", { transactionId, paymentData });

    // Simular actualización
    this.currentTransaction.estado = "pagada";
    this.currentTransaction.datosPago = paymentData;
  }

  // Mostrar pantalla de confirmación final
  showConfirmationScreen() {
    document.getElementById("final-amount").textContent = `${
      this.currentTransaction.monto / 100
    } Bs`;
    document.getElementById("final-reference").textContent =
      this.currentTransaction.referencia;
    document.getElementById("final-status").textContent = "En verificación";

    this.showScreen("confirmation-screen");
  }

  // Mostrar loading
  showLoading(message = "Cargando...") {
    const loadingScreen = document.getElementById("loading");
    const loadingText = loadingScreen.querySelector("p");
    loadingText.textContent = message;
    this.showScreen("loading");
  }

  // Mostrar error
  showError(title, message) {
    document.getElementById("error-title").textContent = title;
    document.getElementById("error-message").textContent = message;
    this.showScreen("error-screen");
  }

  // Enviar datos al bot (para comunicación con el backend)
  sendDataToBot(data) {
    this.tg.sendData(JSON.stringify(data));
  }

  // Método para comunicación con el bot
  async communicateWithBot(action, data) {
    try {
      // Enviar datos al bot
      this.sendDataToBot({
        action,
        data,
        userId: this.userData.id,
        timestamp: new Date().toISOString(),
      });

      // También hacer llamada HTTP directa al backend del bot
      const response = await fetch(`${this.backendUrl}/webapp/deposito`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          data,
          userId: this.userData.id,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error comunicándose con el bot:", error);
      throw error;
    }
  }
}

// Inicializar la app cuando se carga la página
document.addEventListener("DOMContentLoaded", () => {
  window.depositApp = new DepositApp();
});

// Manejar eventos de Telegram Web App
window.Telegram.WebApp.onEvent("mainButtonClicked", () => {
  console.log("Main button clicked");
  // Lógica adicional si es necesario
});

window.Telegram.WebApp.onEvent("backButtonClicked", () => {
  console.log("Back button clicked");
  // Lógica de navegación hacia atrás
});

// Exportar para uso global
window.DepositApp = DepositApp;
