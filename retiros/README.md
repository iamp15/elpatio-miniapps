# Miniapp de Retiros - El Patio

Miniapp de Telegram para que los jugadores soliciten retiros de su saldo.

## Flujo

1. **Pantalla principal**: El jugador ingresa el monto a retirar (≥ mínimo, ≤ saldo).
2. **Datos de pago**: Indica dónde recibir (banco, teléfono, cédula para pago móvil).
3. **Espera**: La solicitud se envía; se espera que un cajero la acepte.
4. **En proceso**: Un cajero aceptó; el cajero envía el dinero al jugador.
5. **Completado**: El cajero reportó la transferencia; el jugador recibe notificación y comprobante.

## Estados especiales

- **requiere_revision_admin**: Si no hay cajeros con saldo suficiente, la transacción pasa a revisión admin. Para el jugador se muestra como "pendiente" (transparente).

## Archivos

- `app.js` - Lógica principal
- `index.html` - Estructura de pantallas
- `js/auth.js` - Autenticación Telegram
- `js/api.js` - Llamadas HTTP
- `js/config.js` - Configuración
- `js/logger.js` - VisualLogger (sin consola)
- `js/transactions.js` - Gestión de transacciones
- `js/ui.js` - Interfaz
- `js/websocket.js` - WebSocket (solicitar-retiro, eventos)
- `styles.css` - Estilos
