# Configuración de Variables de Entorno en Vercel

Las miniapps están alojadas en Vercel y necesitan conectarse al backend en Fly.io.

## Variables de Entorno Requeridas

Configura estas variables en el dashboard de Vercel:

### 1. Ir al Dashboard de Vercel

1. Ve a https://vercel.com/dashboard
2. Selecciona tu proyecto `elpatio-miniapps`
3. Ve a **Settings** → **Environment Variables**

### 2. Agregar Variables

Agrega las siguientes variables:

| Variable                 | Valor                             | Descripción                |
| ------------------------ | --------------------------------- | -------------------------- |
| `API_BASE_URL`           | `https://elpatio-backend.fly.dev` | URL del backend en Fly.io  |
| `NODE_ENV`               | `production`                      | Entorno de producción      |
| `TELEGRAM_BOT_TOKEN`     | `tu_bot_token`                    | Token del bot (si se usa)  |
| `MERCADOPAGO_PUBLIC_KEY` | `tu_public_key`                   | Key pública de MercadoPago |
| `PAYMENT_PROVIDER`       | `mercadopago`                     | Proveedor de pagos         |

### 3. Aplicar para Todos los Entornos

Para cada variable:

- Marca las opciones: **Production**, **Preview**, **Development**
- Esto asegura que funcione en todos los entornos

### 4. Redeploy

Después de agregar las variables:

1. Ve a **Deployments**
2. Haz clic en los tres puntos (...) del último deployment
3. Selecciona **Redeploy**

O simplemente haz un push a tu repositorio y Vercel hará redeploy automático.

## Verificar Configuración

Después del deploy, verifica que las miniapps se conecten correctamente:

1. Abre la miniapp desde Telegram
2. Abre la consola del navegador (F12)
3. Verifica que las peticiones vayan a `https://elpatio-backend.fly.dev`
4. No deberían haber errores de CORS

## URLs de las Miniapps

Después del deploy en Vercel, tus miniapps estarán disponibles en:

- Production: `https://elpatio-miniapps.vercel.app`
- Preview: `https://elpatio-miniapps-[hash].vercel.app`

## Actualizar CORS en el Backend

⚠️ **IMPORTANTE**: Asegúrate de que el backend permita las solicitudes desde Vercel.

En tu backend en Fly.io, configura la variable `CORS_ORIGIN`:

```bash
cd elpatio-backend
fly secrets set CORS_ORIGIN="https://elpatio-miniapps.vercel.app,https://elpatio-miniapps-*.vercel.app"
```

O si usas dominio personalizado:

```bash
fly secrets set CORS_ORIGIN="https://elpatio.games,https://*.elpatio.games,https://elpatio-miniapps.vercel.app"
```

## Dominio Personalizado (Opcional)

Si quieres usar tu dominio `elpatio.games` para las miniapps:

1. En Vercel, ve a **Settings** → **Domains**
2. Agrega tu dominio (ej: `app.elpatio.games` o `play.elpatio.games`)
3. Configura los registros DNS según las instrucciones de Vercel
4. Actualiza `CORS_ORIGIN` en el backend con el nuevo dominio

## Testing Local

Para probar localmente con el backend de Fly.io:

```bash
# En el directorio elpatio-miniapps
export API_BASE_URL=https://elpatio-backend.fly.dev
npm run dev
```

O crea un archivo `.env.local`:

```env
API_BASE_URL=https://elpatio-backend.fly.dev
NODE_ENV=development
```
