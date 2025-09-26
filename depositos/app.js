// Configuración de la Mini App
// Actualizado: 2024-01-24 - Integración con Railway backend
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
          errorData.message ||
            `Error del servidor: ${response.status} - ${response.statusText}`
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

      // Mostrar mensaje de confirmación exitosa
      this.showSuccessScreen(transaction);
    } catch (error) {
      console.error("Error creando solicitud:", error);
      this.showError("Error en la solicitud", error.message);
    }
  }

  // Crear solicitud de depósito
  async createDepositRequest(amountCents) {
    try {
      console.log("🚀 Iniciando creación de solicitud de depósito...");
      console.log("💰 Monto en centavos:", amountCents);
      console.log("👤 Usuario:", this.userData);

      // Obtener token de autenticación
      console.log("🔐 Obteniendo token de autenticación...");
      const token = await this.getBotToken();

      if (!token || token === "bot_token_placeholder") {
        throw new Error(
          "No se pudo obtener un token válido para la autenticación"
        );
      }

      console.log("✅ Token obtenido:", token.substring(0, 20) + "...");

      // Obtener el jugador existente
      console.log("👥 Obteniendo jugador existente...");
      const jugador = await this.getJugador(token);

      if (!jugador) {
        throw new Error(
          "No se pudo obtener el jugador. Verifica que el usuario esté registrado."
        );
      }

      if (!jugador._id) {
        throw new Error("El jugador no tiene un ID válido");
      }

      console.log("✅ Jugador obtenido:", {
        id: jugador._id,
        username: jugador.username,
        saldo: jugador.saldo,
      });

      // Crear la transacción de depósito
      const payload = {
        jugadorId: jugador._id,
        telegramId: this.userData.id.toString(),
        tipo: "credito",
        categoria: "deposito",
        monto: amountCents,
        descripcion: `Depósito de ${(amountCents / 100).toLocaleString(
          "es-VE"
        )} Bs`,
        saldoAnterior: jugador.saldo || 0,
        referencia: `DEP_${this.userData.id}_${Date.now()}`,
        estado: "pendiente",
        infoPago: {
          metodoPago: "pago_movil",
        },
        creadoPor: jugador._id,
      };

      console.log("📝 Creando transacción de depósito:", payload);

      const response = await fetch(
        `${this.backendUrl}/transacciones/solicitud`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      console.log(
        "📡 Respuesta del servidor:",
        response.status,
        response.statusText
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("❌ Error del servidor:", errorData);
        throw new Error(
          errorData.mensaje ||
            `Error del servidor: ${response.status} - ${response.statusText}`
        );
      }

      const transactionData = await response.json();
      console.log("✅ Transacción creada exitosamente:", transactionData);

      return transactionData.transaccion || transactionData;
    } catch (error) {
      console.error("❌ Error creando transacción:", error);
      // Agregar información adicional al error para debugging
      const errorMessage =
        error.message +
        `\n\nDetalles técnicos:\n- Usuario ID: ${
          this.userData?.id
        }\n- Backend URL: ${
          this.backendUrl
        }\n- Timestamp: ${new Date().toISOString()}`;
      throw new Error(errorMessage);
    }
  }

  // Obtener jugador existente
  async getJugador(token) {
    try {
      console.log("🔍 Obteniendo jugador existente...");
      console.log("👤 Telegram ID:", this.userData.id);

      // Obtener el jugador existente usando el endpoint correcto
      const response = await fetch(
        `${this.backendUrl}/jugadores/${this.userData.id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log(
        "📡 Respuesta del servidor:",
        response.status,
        response.statusText
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("❌ Error obteniendo jugador:", errorData);

        if (response.status === 404) {
          throw new Error(
            "Jugador no encontrado. Verifica que el usuario esté registrado en el sistema."
          );
        } else if (response.status === 401 || response.status === 403) {
          throw new Error("Error de autenticación. Token inválido o expirado.");
        } else {
          throw new Error(
            errorData.mensaje ||
              `Error del servidor: ${response.status} - ${response.statusText}`
          );
        }
      }

      const jugadorData = await response.json();
      console.log("✅ Jugador obtenido:", jugadorData);

      // El endpoint devuelve directamente el objeto jugador, no envuelto
      if (jugadorData && jugadorData._id) {
        return jugadorData;
      } else {
        throw new Error(
          "La respuesta del servidor no contiene un jugador válido"
        );
      }
    } catch (error) {
      console.error("❌ Error obteniendo jugador:", error);
      throw error;
    }
  }

  // Obtener token del bot
  async getBotToken() {
    // Credenciales del bot (en producción estas vendrían del build)
    const BOT_EMAIL = "bot@elpatio.games";
    const BOT_PASSWORD = "BotCl4ve#Sup3rS3gur4!2025";

    try {
      console.log("🔐 Obteniendo token del bot...");

      const response = await fetch(`${this.backendUrl}/admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: BOT_EMAIL,
          password: BOT_PASSWORD,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Token del bot obtenido exitosamente");
        return data.token;
      } else {
        console.error(
          "❌ Error en login del bot:",
          response.status,
          response.statusText
        );

        // Fallback: usar token de cajero si el bot no está disponible
        console.log("🔄 Intentando fallback con cajero...");
        const fallbackResponse = await fetch(
          `${this.backendUrl}/cajeros/login`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: "luis@ejemplo.com",
              password: "clave123",
            }),
          }
        );

        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          console.log("✅ Token de cajero obtenido como fallback");
          return fallbackData.token;
        }
      }
    } catch (error) {
      console.error("❌ Error obteniendo token:", error);
    }

    // Si todo falla, usar token placeholder
    console.warn("⚠️ Usando token placeholder");
    return "bot_token_placeholder";
  }

  // Mostrar pantalla de éxito
  showSuccessScreen(transaction) {
    document.getElementById("waiting-amount").textContent = `${
      transaction.monto / 100
    } Bs`;
    document.getElementById("waiting-reference").textContent =
      transaction.referencia || transaction._id;
    document.getElementById("waiting-status").textContent = "Creada exitosamente";

    // Actualizar el mensaje de la pantalla
    const statusElement = document.querySelector("#waiting-screen .status-message");
    if (statusElement) {
      statusElement.textContent = "Solicitud creada correctamente";
    }

    // Actualizar el mensaje de descripción
    const descElement = document.querySelector("#waiting-screen .description");
    if (descElement) {
      descElement.innerHTML = `
        <p>Tu solicitud de depósito ha sido creada exitosamente.</p>
        <p><strong>ID de transacción:</strong> ${transaction.referencia || transaction._id}</p>
        <p>En los próximos minutos se te asignará un cajero para que realices el pago móvil.</p>
      `;
    }

    this.showScreen("waiting-screen");
  }

  // Las funciones de simulación han sido eliminadas
  // En el futuro se implementará la asignación real de cajeros

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
