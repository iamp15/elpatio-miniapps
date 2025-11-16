const http = require("http");
const fs = require("fs");
const path = require("path");

// Leer la versión del package.json (un nivel arriba desde depositos/)
const packageJsonPath = path.join(__dirname, "..", "package.json");
let APP_VERSION = "0.0.0"; // Versión por defecto

try {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  APP_VERSION = packageJson.version;
  console.log(`[SERVER] Version leida del package.json: ${APP_VERSION}`);
} catch (error) {
  console.warn(
    "⚠️ No se pudo leer la versión del package.json:",
    error.message
  );
}

const server = http.createServer((req, res) => {
  // Usar __dirname para rutas absolutas (el servidor está en depositos/)
  let filePath = path.join(__dirname, req.url === "/" ? "index.html" : req.url);

  // Log de todas las solicitudes para depuración
  console.log(`[SERVER] Solicitud recibida: ${req.url} -> ${filePath}`);

  // Normalizar la ruta para evitar problemas con ../
  filePath = path.normalize(filePath);

  // Asegurar que el archivo esté dentro del directorio del servidor (seguridad)
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, { "Content-Type": "text/html" });
    res.end("<h1>403 Forbidden</h1>");
    return;
  }

  // Obtener la extensión del archivo
  const extname = String(path.extname(filePath)).toLowerCase();

  // Mapear extensiones a tipos MIME
  const mimeTypes = {
    ".html": "text/html",
    ".js": "application/javascript; charset=utf-8",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".wav": "audio/wav",
    ".mp4": "video/mp4",
    ".woff": "application/font-woff",
    ".ttf": "application/font-ttf",
    ".eot": "application/vnd.ms-fontobject",
    ".otf": "application/font-otf",
    ".wasm": "application/wasm",
  };

  let contentType = mimeTypes[extname] || "application/octet-stream";

  // Para módulos ES6, asegurar el tipo correcto
  if (extname === ".js") {
    contentType = "application/javascript; charset=utf-8";
  }

  // Leer y servir el archivo
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code == "ENOENT") {
        res.writeHead(404, { "Content-Type": "text/html" });
        res.end(`
          <html>
            <head><title>404 - File Not Found</title></head>
            <body>
              <h1>404 - File Not Found</h1>
              <p>Requested file: ${filePath}</p>
              <p>Current directory: ${process.cwd()}</p>
              <p>Available files:</p>
              <ul>
                <li><a href="/">index.html</a></li>
                <li><a href="/app.js">app.js</a></li>
                <li><a href="/styles.css">styles.css</a></li>
                <li><a href="/js/">js/ directory</a></li>
              </ul>
            </body>
          </html>
        `);
      } else {
        res.writeHead(500);
        res.end("Server Error: " + error.code);
      }
    } else {
      // Si es index.html, inyectar la versión como variable global
      if (
        filePath.endsWith("index.html") ||
        path.basename(filePath) === "index.html"
      ) {
        let htmlContent = content.toString("utf-8");
        // Inyectar script con la versión en el <head> (meta tag como fallback)
        const versionMeta = `<meta name="app-version" content="${APP_VERSION}">`;
        const beforeReplace = htmlContent;
        htmlContent = htmlContent.replace(
          /(<head[^>]*>)/i,
          `$1\n    ${versionMeta}`
        );
        const metaInjected = beforeReplace !== htmlContent;
        console.log(
          `[SERVER] Meta tag inyectado en index.html: ${
            metaInjected ? "SI" : "NO"
          }`
        );
        if (metaInjected) {
          // Verificar que el meta tag está presente
          const hasMeta = htmlContent.includes(
            `<meta name="app-version" content="${APP_VERSION}">`
          );
          console.log(
            `[SERVER] Verificacion: meta tag presente en HTML: ${hasMeta}`
          );
        }
        // Inyectar script INLINE en el body JUSTO ANTES de los módulos ES6 para ejecución síncrona
        // Esto asegura que window.APP_VERSION esté disponible cuando se carguen los módulos
        const versionScript = `<script>window.APP_VERSION="${APP_VERSION}";</script>`;
        // Buscar el primer script en el body y agregar el script de versión justo antes
        htmlContent = htmlContent.replace(
          /(<script[^>]*src="js\/logger\.js"[^>]*>)/i,
          `${versionScript}\n    $1`
        );
        console.log(
          `[SERVER] index.html modificado, version inyectada: ${APP_VERSION}`
        );
        res.writeHead(200, { "Content-Type": contentType });
        res.end(htmlContent, "utf-8");
      }
      // Si es app.js, reemplazar el valor por defecto de la versión con la versión real
      else if (
        filePath.endsWith("app.js") ||
        path.basename(filePath) === "app.js"
      ) {
        console.log(
          `[SERVER] Procesando app.js, version a inyectar: ${APP_VERSION}`
        );
        let jsContent = content.toString("utf-8");

        // Verificar si el contenido contiene el patrón antes de reemplazar
        const hasPattern = /return "0\.0\.0";/.test(jsContent);
        console.log(
          `[SERVER] app.js contiene "return \"0.0.0\";": ${hasPattern}`
        );

        // Reemplazar el valor por defecto "0.0.0" en la función getAppVersion con la versión real
        // Esto asegura que la versión esté disponible incluso si window.APP_VERSION no se carga a tiempo
        const originalContent = jsContent;
        jsContent = jsContent.replace(
          /return "0\.0\.0";/g,
          `return "${APP_VERSION}";`
        );
        const wasReplaced = originalContent !== jsContent;
        console.log(
          `[SERVER] app.js modificado: ${
            wasReplaced ? "SI" : "NO"
          }, version: ${APP_VERSION}`
        );
        if (wasReplaced) {
          console.log(
            `[SERVER] Reemplazo realizado: "0.0.0" -> "${APP_VERSION}"`
          );
          // Verificar que el reemplazo se hizo correctamente
          const verifyPattern = new RegExp(`return "${APP_VERSION}";`);
          const isReplaced = verifyPattern.test(jsContent);
          console.log(
            `[SERVER] Verificacion: reemplazo presente en contenido: ${isReplaced}`
          );
        } else {
          console.log(
            `[SERVER] ADVERTENCIA: No se encontro "0.0.0" para reemplazar en app.js`
          );
          // Mostrar un fragmento del contenido para debug
          const snippet = jsContent.substring(
            jsContent.indexOf('return "'),
            jsContent.indexOf('return "') + 50
          );
          console.log(
            `[SERVER] Fragmento del codigo alrededor de return: ${snippet}`
          );
        }
        res.writeHead(200, { "Content-Type": contentType });
        res.end(jsContent, "utf-8");
      } else {
        res.writeHead(200, { "Content-Type": contentType });
        res.end(content, "utf-8");
      }
    }
  });
});

const PORT = 3007;
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}/`);
  console.log(`📁 Serving from: ${process.cwd()}`);
  console.log(`📄 Main file: index.html`);
});
