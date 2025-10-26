// src/index.ts
import { Elysia } from "elysia";
import { staticPlugin } from "@elysiajs/static";
import { cors } from "@elysiajs/cors";
import { p2pRoutes } from "./tcprouter";
import { p2pserver } from "./p2p/p2pService";
import { TimerManager } from "./core/timer-manager";
import { createTimerRoutes } from "./http";
import { createWsTimerRoutes } from "./ws";
import { API_PORT } from "./config";
import { fileURLToPath } from "url";
import path from "path";

// 👇 Estas dos líneas reemplazan __dirname en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function buildServer() {
  try {
    // Crear instancia del TimerManager
    const timerManager = new TimerManager();

    // Crear aplicación Elysia con todos los plugins
    const app = new Elysia()
      // CORS
      .use(
        cors({
          origin: true, // Permite cualquier origen
          methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
          allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
          credentials: false,
        }),
      )
      // WebSocket is now built into Elysia core
      // Static files
      .use(
        staticPlugin({
          assets: path.join(__dirname, "..", "public"),
          prefix: "/",
        }),
      )
      // Rutas de timers HTTP
      .use(createTimerRoutes(timerManager))
      // Rutas de timers WebSocket
      .use(createWsTimerRoutes(timerManager))
      // Rutas P2P
      .use(p2pRoutes)
      // Ruta principal
      .get("/", () => "Timer API Server with ElysiaJS")
      // Health check
      .get("/health", () => ({ status: "ok", timestamp: Date.now() }));

    return app;
  } catch (err) {
    console.error("Error building server:", err);
    process.exit(1);
  }
}

async function start() {
  try {
    const app = await buildServer();

    // Start the server
    const server = app.listen({
      port: API_PORT,
      hostname: "0.0.0.0",
    });

    console.log(
      `🚀 ElysiaJS server is running at http://localhost:${API_PORT}`,
    );
    console.log("📁 Static files served from /public");
    console.log(
      `🕒 Timer WebSocket is available at ws://localhost:${API_PORT}/ws or ws://localhost:${API_PORT}/ws/YOUR_TIMER_ID`,
    );

    // Initialize P2P service
    try {
      p2pserver.start();
    } catch (error) {
      console.error(error, "p2p error");
      p2pserver.stop();
    }

    return server;
  } catch (err) {
    console.error("Error starting server:", err);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("Received SIGINT, shutting down gracefully...");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Received SIGTERM, shutting down gracefully...");
  process.exit(0);
});

// Start the server
start();
