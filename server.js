const express = require("express");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname)));

// Configurar headers para Telegram Web Apps
app.use((req, res, next) => {
  // Permitir que la app se abra en iframe de Telegram
  res.setHeader("X-Frame-Options", "ALLOWALL");
  res.setHeader("Content-Security-Policy", "frame-ancestors *");

  // Headers adicionales para Telegram Web Apps
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  next();
});

// Ruta principal
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Rutas para las mini apps
app.get("/depositos", (req, res) => {
  res.sendFile(path.join(__dirname, "depositos", "index.html"));
});

app.get("/retiros", (req, res) => {
  res.sendFile(path.join(__dirname, "retiros", "index.html"));
});

app.get("/salas", (req, res) => {
  res.sendFile(path.join(__dirname, "salas", "index.html"));
});

app.get("/configuracion", (req, res) => {
  res.sendFile(path.join(__dirname, "configuracion", "index.html"));
});

// Ruta de salud
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    message: "Mini Apps server is running",
  });
});

// Manejar rutas no encontradas
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, "index.html"));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor de Mini Apps ejecutándose en puerto ${PORT}`);
  console.log(`📱 Mini App de Depósitos: http://localhost:${PORT}/depositos`);
  console.log(`🌐 Aplicación principal: http://localhost:${PORT}`);
  console.log(`💚 Salud del servidor: http://localhost:${PORT}/health`);
});
