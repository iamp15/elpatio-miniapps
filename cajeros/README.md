# Portal de Cajeros - El Patio (Versión Modular)

Esta es la webapp para que los cajeros puedan gestionar las solicitudes de depósitos y retiros en el sistema El Patio. La aplicación ha sido refactorizada para seguir una arquitectura modular que facilita el mantenimiento y la escalabilidad.

## 🏗️ Arquitectura Modular

La aplicación está dividida en módulos independientes que manejan responsabilidades específicas:

### 📁 Estructura de archivos

```
cajeros/
├── index.html              # Estructura HTML principal
├── styles.css              # Estilos CSS responsivos
├── app.js                  # Aplicación principal (coordinador)
├── js/                     # Módulos JavaScript
│   ├── config.js           # Configuración centralizada
│   ├── auth.js             # Gestión de autenticación
│   ├── api.js              # Comunicación con el backend
│   ├── ui.js               # Gestión de interfaz de usuario
│   └── transactions.js     # Gestión de transacciones
└── README.md               # Documentación
```

## 📋 Módulos

### 🔧 `config.js` - Configuración

Centraliza toda la configuración de la aplicación:

- URLs de la API y endpoints
- Claves de localStorage
- Mensajes de la aplicación
- Configuración de UI
- Estados y tipos de transacciones
- Selectores DOM

### 🔐 `auth.js` - Autenticación

Maneja todo lo relacionado con la autenticación:

- Login/logout de cajeros
- Verificación de tokens
- Gestión de sesiones
- Callbacks para eventos de autenticación
- Persistencia de tokens

### 🌐 `api.js` - Comunicación con Backend

Encapsula todas las llamadas a la API:

- Requests HTTP genéricos y autenticados
- Endpoints específicos del backend
- Manejo de errores de conexión
- Procesamiento de respuestas

### 🎨 `ui.js` - Interfaz de Usuario

Gestiona la interacción con el DOM:

- Referencias a elementos del DOM
- Manipulación de pantallas y estados
- Event listeners
- Modales y alertas
- Actualización de información del cajero

### 💰 `transactions.js` - Gestión de Transacciones

Maneja la lógica de transacciones:

- Carga de transacciones pendientes
- Visualización de transacciones
- Aceptación de transacciones
- Formateo de datos
- Modales de detalles

### 🎯 `app.js` - Aplicación Principal

Coordina todos los módulos:

- Inicialización de la aplicación
- Configuración de callbacks
- Event handlers principales
- Funciones globales para HTML
- Punto de entrada de la aplicación

## ✨ Características

### ✅ Funcionalidades Implementadas

- **Autenticación segura**: Login con email y contraseña
- **Persistencia de sesión**: Mantiene la sesión activa usando localStorage
- **Interfaz responsive**: Funciona en dispositivos móviles y desktop
- **Comunicación con backend**: Integración completa con la API del backend
- **Gestión de transacciones**: Visualización y aceptación de transacciones pendientes
- **Modales informativos**: Detalles de transacciones aceptadas

### 🔄 Flujo de la Aplicación

1. **Inicialización**: Se cargan todos los módulos y se configuran los callbacks
2. **Verificación de sesión**: Se verifica si hay un token válido guardado
3. **Login**: Si no hay sesión, se muestra el formulario de login
4. **Dashboard**: Una vez autenticado, se muestra el dashboard con transacciones pendientes
5. **Gestión de transacciones**: Los cajeros pueden aceptar transacciones
6. **Logout**: Cierre de sesión que limpia todos los datos

## 🛠️ API Endpoints Utilizados

- `POST /api/cajeros/login`: Autenticación de cajeros
- `GET /api/cajeros/mi-perfil`: Obtener información del cajero autenticado
- `GET /api/transacciones/pendientes-cajero`: Obtener transacciones pendientes
- `PUT /api/transacciones/:id/asignar-cajero`: Asignar cajero a transacción
- `GET /api/transacciones/:id`: Obtener detalles de transacción

## 🚀 Configuración

### Desarrollo Local

1. Asegurarse de que el backend esté corriendo
2. Ejecutar el servidor de miniapps: `npm start`
3. Acceder a `http://localhost:3000/cajeros`

### Producción

La aplicación se conecta automáticamente al backend en producción:

- **Backend**: `https://elpatio-backend-production.up.railway.app`

## 🔧 Desarrollo y Mantenimiento

### Ventajas de la Arquitectura Modular

1. **Separación de responsabilidades**: Cada módulo tiene una función específica
2. **Fácil mantenimiento**: Cambios en un módulo no afectan otros
3. **Reutilización**: Los módulos pueden ser reutilizados en otras partes
4. **Testing**: Cada módulo puede ser probado independientemente
5. **Escalabilidad**: Fácil agregar nuevas funcionalidades

### Agregar Nuevas Funcionalidades

1. **Nuevo módulo**: Crear archivo en `js/` con clase específica
2. **Configuración**: Agregar configuración en `config.js`
3. **Integración**: Importar y configurar en `app.js`
4. **UI**: Actualizar `ui.js` si es necesario

### Modificar Funcionalidades Existentes

1. **Localizar módulo**: Identificar qué módulo maneja la funcionalidad
2. **Hacer cambios**: Modificar solo el módulo afectado
3. **Testing**: Verificar que no se rompan otras funcionalidades

## 📱 Uso

1. Acceder a la URL de la aplicación
2. Ingresar email y contraseña del cajero
3. Una vez autenticado, ver las transacciones pendientes
4. Aceptar transacciones haciendo clic en "Aceptar"
5. Ver detalles de transacciones aceptadas
6. Usar el botón "Cerrar Sesión" para salir

## 🔍 Debugging

### Logs de Consola

La aplicación incluye logs detallados:

- `✅` - Operaciones exitosas
- `❌` - Errores
- `⏰` - Eventos de tiempo (tokens expirados)
- `👋` - Eventos de usuario (logout)

### Herramientas de Desarrollo

- Abrir DevTools del navegador
- Revisar la consola para logs
- Verificar el estado de los módulos en `window.CajerosApp`
- Inspeccionar elementos del DOM

## 🚀 Próximas Mejoras

- [ ] Notificaciones en tiempo real
- [ ] Historial de transacciones
- [ ] Filtros y búsqueda de transacciones
- [ ] Exportación de reportes
- [ ] Modo offline con sincronización
- [ ] Tests unitarios para cada módulo
