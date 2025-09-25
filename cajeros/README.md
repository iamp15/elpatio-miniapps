# Portal de Cajeros - El Patio

Esta es la webapp para que los cajeros puedan gestionar las solicitudes de depósitos y retiros en el sistema El Patio.

## Características

- **Autenticación segura**: Login con email y contraseña
- **Persistencia de sesión**: Mantiene la sesión activa usando localStorage
- **Interfaz responsive**: Funciona en dispositivos móviles y desktop
- **Comunicación con backend**: Integración completa con la API del backend

## Estructura de archivos

- `index.html`: Estructura HTML de la aplicación
- `styles.css`: Estilos CSS responsivos
- `app.js`: Lógica JavaScript para autenticación y comunicación con API
- `README.md`: Este archivo de documentación

## Funcionalidades implementadas

### ✅ Login de Cajeros

- Formulario de autenticación con email y contraseña
- Validación de campos requeridos
- Estados de carga durante el proceso
- Manejo de errores de autenticación

### ✅ Pantalla de Login Exitoso

- Confirmación visual del login exitoso
- Muestra información del cajero autenticado
- Opción para cerrar sesión

### ✅ Gestión de Sesiones

- Almacenamiento seguro del token JWT
- Verificación automática de tokens válidos
- Logout completo que limpia la sesión

## API Endpoints utilizados

- `POST /api/cajeros/login`: Autenticación de cajeros
- `GET /api/cajeros/mi-perfil`: Obtener información del cajero autenticado

## Configuración

La aplicación se conecta automáticamente al backend según el entorno:

- **Desarrollo**: `http://localhost:3001`
- **Producción**: Configurar la URL real del backend en `app.js`

## Próximas funcionalidades

- [ ] Dashboard principal con solicitudes pendientes
- [ ] Gestión de solicitudes de depósitos
- [ ] Gestión de solicitudes de retiros
- [ ] Confirmación de pagos
- [ ] Historial de transacciones
- [ ] Notificaciones en tiempo real

## Uso

1. Acceder a `http://localhost:3000/cajeros`
2. Ingresar email y contraseña del cajero
3. Una vez autenticado, se mostrará la pantalla de éxito
4. Usar el botón "Cerrar Sesión" para salir

## Desarrollo

Para desarrollo local:

1. Asegurarse de que el backend esté corriendo en puerto 3001
2. Ejecutar el servidor de miniapps: `npm start`
3. Acceder a `http://localhost:3000/cajeros`
