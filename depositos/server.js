const http = require("http");
const fs = require("fs");
const path = require("path");

// Leer la versión del package.json (un nivel arriba desde depositos/)
const packageJsonPath = path.join(__dirname, "..", "package.json");
let APP_VERSION = "0.0.0"; // Versión por defecto

try {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  APP_VERSION = packageJson.version;
} catch (error) {
  console.warn("⚠️ No se pudo leer la versión del package.json:", error.message);
}

const server = http.createServer((req, res) => {
  let filePath = "." + req.url;

  // Si la URL es solo '/', servir index.html
  if (filePath === "./") {
    filePath = "./index.html";
  }

  // Obtener la extensión del archivo
  const extname = String(path.extname(filePath)).toLowerCase();

  // Mapear extensiones a tipos MIME
  const mimeTypes = {
    ".html": "text/html",
    ".js": "application/javascript",
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

  const contentType = mimeTypes[extname] || "application/octet-stream";

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
      if (filePath === "./index.html" || filePath === "index.html") {
        let htmlContent = content.toString("utf-8");
        // Inyectar script con la versión en el <head> para que se ejecute inmediatamente
        // Usar IIFE para asegurar ejecución síncrona
        const versionScript = `<script>(function(){window.APP_VERSION="${APP_VERSION}";})();</script>`;
        // Buscar el cierre de </head> y agregar el script de versión justo antes
        htmlContent = htmlContent.replace(
          /(<\/head>)/i,
          `    ${versionScript}\n$1`
        );
        res.writeHead(200, { "Content-Type": contentType });
        res.end(htmlContent, "utf-8");
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
