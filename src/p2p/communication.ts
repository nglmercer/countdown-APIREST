// src/communication.ts

import * as net from "net";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import type { Service } from "bonjour-service";
import { P2P_MESSAGE_DELIMITER } from "../config.js";

// ---- Tipos y Interfaces ----

// Definimos los tipos para los callbacks para mayor claridad y reutilización
export type OnDataCallback = (
  socket: net.Socket,
  message: any,
  socketId: string,
) => void;
export type OnClientCallback = (socket: net.Socket, socketId: string) => void;

// Interfaz para las opciones del servidor
export interface TcpServerOptions {
  preventDuplicates?: boolean;
  duplicateDetectionMethod?: "lockfile" | "port" | "pidfile";
  specificPort?: number | null;
}

// Interfaz para un Peer, extendiendo la de Bonjour si es necesario
// Por ahora, el tipo Service de bonjour-service es suficiente
export type Peer = Service;

// ---- Estado del Módulo ----

const serverClients = new Map<string, net.Socket>();
const outgoingConnections = new Map<string, net.Socket>();

const LOCK_FILE = path.join(os.tmpdir(), "p2p-app.lock");
const PIDFILE = path.join(os.tmpdir(), "p2p-app.pid");

// ---- Funciones ----

function generateSocketId(socket: net.Socket): string {
  return `${socket.remoteAddress}:${socket.remotePort}`;
}

function acquireLock(): boolean {
  // ... (la lógica interna de esta función es mayormente la misma, pero manejamos el error con tipo)
  try {
    const fd = fs.openSync(LOCK_FILE, "wx");
    fs.writeSync(fd, process.pid.toString());
    fs.closeSync(fd);
    process.on("exit", () => {
      try {
        fs.unlinkSync(LOCK_FILE);
      } catch (e) {}
    });
    return true;
  } catch (error: unknown) {
    // Hacemos una aserción de tipo para acceder a 'code' de forma segura
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "EEXIST"
    ) {
      try {
        const pid = parseInt(fs.readFileSync(LOCK_FILE, "utf8").trim());
        process.kill(pid, 0);
        console.log(`[TCP Server] Proceso duplicado detectado (PID: ${pid})`);
        return false;
      } catch {
        fs.unlinkSync(LOCK_FILE);
        return acquireLock();
      }
    }
    throw error;
  }
}

function createPidFile(): boolean {
  // ... (la lógica interna es la misma)
  try {
    if (fs.existsSync(PIDFILE)) {
      const pid = parseInt(fs.readFileSync(PIDFILE, "utf8").trim());
      try {
        process.kill(pid, 0);
        console.log(`[TCP Server] Instancia ya ejecutándose (PID: ${pid})`);
        return false;
      } catch (e) {
        fs.unlinkSync(PIDFILE);
      }
    }
    fs.writeFileSync(PIDFILE, process.pid.toString());
    process.on("exit", () => {
      try {
        fs.unlinkSync(PIDFILE);
      } catch (e) {}
    });
    return true;
  } catch (error) {
    console.error("[TCP Server] Error manejando PID file:", error);
    return true;
  }
}

function checkPortAvailability(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const testServer = net.createServer();
    testServer.listen(port, () => {
      testServer.close(() => resolve(true));
    });
    testServer.on("error", (err: any) => {
      resolve(err.code !== "EADDRINUSE");
    });
  });
}

function startTcpServer(
  port: number,
  onDataCallback: OnDataCallback,
  onClientConnected?: OnClientCallback,
  onClientDisconnected?: OnClientCallback,
): Promise<{ server: net.Server; port: number }> {
  return new Promise((resolve, reject) => {
    const server = net.createServer((socket) => {
      const socketId = generateSocketId(socket);
      console.log(`[TCP Server] Cliente conectado: ${socketId}`);
      serverClients.set(socketId, socket);

      onClientConnected?.(socket, socketId);

      let buffer = "";
      socket.on("data", (data) => {
        buffer += data.toString("utf8");
        let delimiterIndex;
        while ((delimiterIndex = buffer.indexOf(P2P_MESSAGE_DELIMITER)) > -1) {
          const jsonString = buffer.substring(0, delimiterIndex);
          buffer = buffer.substring(
            delimiterIndex + P2P_MESSAGE_DELIMITER.length,
          );
          if (jsonString) {
            try {
              const message = JSON.parse(jsonString);
              onDataCallback(socket, message, socketId);
            } catch (e) {
              console.error(
                `[TCP Server] Error parseando JSON de ${socketId}:`,
                (e as Error).message,
              );
            }
          }
        }
      });

      socket.on("end", () => {
        console.log(`[TCP Server] Cliente desconectado (end): ${socketId}`);
        serverClients.delete(socketId);
        onClientDisconnected?.(socket, socketId);
      });

      socket.on("error", (err) =>
        console.error(
          `[TCP Server] Error en socket de ${socketId}:`,
          err.message,
        ),
      );

      socket.on("close", () => {
        if (serverClients.has(socketId)) {
          serverClients.delete(socketId);
          onClientDisconnected?.(socket, socketId);
        }
      });
    });

    server.listen(port, () => {
      const address = server.address() as net.AddressInfo;
      console.log(
        `[TCP Server] Escuchando en ${address.address}:${address.port}`,
      );
      resolve({ server, port: address.port });
    });

    server.on("error", (err) => reject(err));
  });
}

// Tipo de retorno mejorado para ser más explícito
type CreateTcpServerResult = Promise<
  { server: net.Server; port: number } | false
>;

export async function createTcpServer(
  onDataCallback: OnDataCallback,
  onClientConnected?: OnClientCallback,
  onClientDisconnected?: OnClientCallback,
  options: TcpServerOptions = {},
): CreateTcpServerResult {
  const {
    preventDuplicates = true,
    duplicateDetectionMethod = "pidfile",
    specificPort = null,
  } = options;

  if (preventDuplicates) {
    let canStart = true;
    if (duplicateDetectionMethod === "lockfile") canStart = acquireLock();
    else if (duplicateDetectionMethod === "pidfile") canStart = createPidFile();
    else if (duplicateDetectionMethod === "port" && specificPort) {
      canStart = await checkPortAvailability(specificPort);
      if (!canStart) {
        console.log(
          `[TCP Server] Puerto ${specificPort} en uso - proceso duplicado detectado`,
        );
      }
    }
    if (!canStart) return false;
  }

  return startTcpServer(
    specificPort || 0,
    onDataCallback,
    onClientConnected,
    onClientDisconnected,
  );
}

export function connectToPeer(peer: Peer): Promise<net.Socket> {
  const peerFqdn = peer.fqdn;

  if (outgoingConnections.has(peerFqdn)) {
    const existingSocket = outgoingConnections.get(peerFqdn)!;
    if (!existingSocket.destroyed) {
      return Promise.resolve(existingSocket);
    }
    outgoingConnections.delete(peerFqdn);
  }

  return new Promise((resolve, reject) => {
    const socket = net.createConnection(
      { host: peer.host, port: peer.port },
      () => {
        console.log(`[TCP Client] Conectado a ${peer.name} (${peerFqdn})`);
        outgoingConnections.set(peerFqdn, socket);
        resolve(socket);
      },
    );

    socket.on("error", (err) => {
      outgoingConnections.delete(peerFqdn);
      reject(err);
    });
    socket.on("close", () => outgoingConnections.delete(peerFqdn));
  });
}

export function sendMessage(
  socket: net.Socket,
  messageObject: object,
): boolean {
  if (!socket || socket.destroyed || !socket.writable) {
    console.error(
      "[TCP] No se puede enviar mensaje: Socket no escribible o destruido.",
    );
    return false;
  }
  try {
    const jsonString = JSON.stringify(messageObject);
    socket.write(jsonString + P2P_MESSAGE_DELIMITER);
    return true;
  } catch (e) {
    console.error("[TCP] Error serializando mensaje:", e);
    return false;
  }
}

export function closeAllConnections(): void {
  console.log("[TCP] Cerrando todas las conexiones...");
  serverClients.forEach((socket) => socket.destroy());
  serverClients.clear();
  outgoingConnections.forEach((socket) => socket.destroy());
  outgoingConnections.clear();
}
