# Mini App de Depósitos - El Patio

Mini aplicación web integrada con Telegram para realizar depósitos de forma segura y eficiente.

## 🚀 Características

- **Interfaz nativa de Telegram**: Se integra perfectamente con la app de Telegram
- **Flujo completo de depósitos**: Desde la solicitud hasta la confirmación
- **Diseño responsive**: Funciona en móviles y escritorio
- **Tema adaptativo**: Se adapta al tema claro/oscuro de Telegram
- **Validación en tiempo real**: Validación de formularios y montos
- **Comunicación con backend**: Integración completa con el sistema de transacciones

## 📱 Flujo de la aplicación

1. **Solicitud de depósito**: El usuario ingresa el monto deseado
2. **Asignación de cajero**: El sistema asigna un cajero disponible
3. **Datos bancarios**: Se muestran los datos para realizar el pago móvil
4. **Confirmación de pago**: El usuario confirma haber realizado el pago
5. **Verificación**: El cajero verifica la recepción del pago
6. **Acreditación**: El saldo se acredita automáticamente

## 🛠️ Instalación y configuración

### 1. Estructura de archivos

```
webapps/deposito/
├── index.html          # Página principal
├── styles.css          # Estilos CSS
├── app.js             # Lógica de la aplicación
├── config.js          # Configuración y utilidades
└── README.md          # Este archivo
```

### 2. Configuración del backend

Edita el archivo `config.js` y actualiza la URL del backend:

```javascript
const CONFIG = {
  BACKEND_URL: "https://tu-dominio.com/api", // Cambiar por tu URL
  // ... resto de la configuración
};
```

### 3. Alojamiento

La Mini App debe estar alojada en un servidor HTTPS. Puedes usar:

- **GitHub Pages**: Gratuito y fácil
- **Vercel**: Deploy automático desde GitHub
- **Netlify**: Similar a Vercel
- **Tu propio servidor**: Con certificado SSL

### 4. Configuración en Telegram

1. Ve a [@BotFather](https://t.me/botfather)
2. Selecciona tu bot
3. Usa el comando `/newapp`
4. Proporciona la URL de tu Mini App
5. Configura el nombre y descripción

## 🔧 Integración con el bot

### 1. Botón para abrir la Mini App

Agrega este código a tu bot para crear un botón que abra la Mini App:

```javascript
const depositButton = {
  text: "💳 Realizar Depósito",
  web_app: { url: "https://tu-dominio.com/webapps/deposito/" },
};

bot.sendMessage(chatId, "¿Qué deseas hacer?", {
  reply_markup: {
    inline_keyboard: [[depositButton]],
  },
});
```

### 2. Endpoint para comunicación

Crea un endpoint en tu backend para recibir datos de la Mini App:

```javascript
// POST /api/webapp/deposito
app.post("/api/webapp/deposito", async (req, res) => {
  try {
    const { action, data, userId, timestamp } = req.body;

    switch (action) {
      case "create_deposit_request":
        // Crear solicitud de depósito
        const transaction = await backendAPI.crearSolicitudDeposito(
          userId,
          data.monto
        );
        res.json({ success: true, transaction });
        break;

      case "confirm_payment":
        // Confirmar pago del usuario
        await backendAPI.confirmarPagoUsuario(
          data.transactionId,
          data.paymentData
        );
        res.json({ success: true });
        break;

      default:
        res.status(400).json({ error: "Acción no válida" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## 📊 Estados de transacción

La Mini App maneja los siguientes estados:

- **`pendiente`**: Solicitud creada, esperando cajero
- **`en_proceso`**: Cajero asignado, esperando pago
- **`pagada`**: Usuario confirmó el pago
- **`verificada`**: Cajero verificó la recepción
- **`completada`**: Saldo acreditado
- **`rechazada`**: Transacción rechazada

## 🎨 Personalización

### Colores y tema

La Mini App se adapta automáticamente al tema de Telegram usando las variables CSS:

```css
:root {
  --tg-theme-bg-color: #ffffff;
  --tg-theme-text-color: #000000;
  --tg-theme-button-color: #2481cc;
  /* ... más variables */
}
```

### Bancos disponibles

Edita la lista de bancos en `config.js`:

```javascript
BANKS: [
  { code: "BANESCO", name: "Banesco" },
  { code: "MERCANTIL", name: "Mercantil" },
  // Agregar más bancos...
];
```

## 🔒 Seguridad

- **HTTPS obligatorio**: Telegram requiere HTTPS para Mini Apps
- **Validación de datos**: Todos los inputs se validan
- **Autenticación**: Usa los datos del usuario de Telegram
- **Timeouts**: Requests con timeout para evitar bloqueos

## 🐛 Debugging

### Logs en consola

La Mini App incluye logs detallados en la consola del navegador:

```javascript
console.log("🚀 Inicializando Mini App de Depósitos");
console.log("👤 Usuario:", this.userData);
console.log("🎨 Tema:", theme);
```

### Modo desarrollo

Para desarrollo local, puedes usar ngrok para crear un túnel HTTPS:

```bash
# Instalar ngrok
npm install -g ngrok

# Crear túnel
ngrok http 3000

# Usar la URL HTTPS generada en la configuración
```

## 📱 Testing

### En Telegram

1. Abre tu bot en Telegram
2. Haz clic en el botón de depósito
3. La Mini App se abrirá en Telegram
4. Prueba el flujo completo

### En navegador

1. Abre `index.html` en un navegador
2. Simula los datos de Telegram:

```javascript
window.Telegram = {
  WebApp: {
    ready: () => {},
    expand: () => {},
    initDataUnsafe: {
      user: {
        id: 123456789,
        first_name: "Test",
        username: "testuser",
      },
    },
    themeParams: {
      bg_color: "#ffffff",
      text_color: "#000000",
    },
  },
};
```

## 🚀 Deploy

### GitHub Pages

1. Sube los archivos a un repositorio de GitHub
2. Ve a Settings > Pages
3. Selecciona la rama main
4. La URL será: `https://tu-usuario.github.io/tu-repo/webapps/deposito/`

### Vercel

1. Conecta tu repositorio de GitHub a Vercel
2. Configura el build command (no necesario para archivos estáticos)
3. Deploy automático en cada push

## 📞 Soporte

Si tienes problemas o preguntas:

1. Revisa los logs en la consola del navegador
2. Verifica que la URL del backend sea correcta
3. Asegúrate de que el backend esté funcionando
4. Comprueba que la Mini App esté alojada en HTTPS

## 🔄 Actualizaciones

Para actualizar la Mini App:

1. Modifica los archivos necesarios
2. Sube los cambios al servidor
3. La actualización será automática (no requiere reinstalación)

---

**Nota**: Esta Mini App está diseñada para integrarse con el sistema de transacciones existente. Asegúrate de que todos los endpoints del backend estén implementados antes de usar la Mini App en producción.
