// src/p2pService.ts
import { randomUUID } from "crypto";
// Importa todas tus funciones y singletons P2P
import { P2P_INSTANCE_NAME_PREFIX } from "../config";
import { peerManager } from "./peerManager";
import { startDiscovery, stopDiscovery } from "./discovery";
import {
  createTcpServer,
  connectToPeer,
  sendMessage,
  closeAllConnections,
  type OnDataCallback,
  type Peer,
} from "./communication";
import { Server } from "http";

export class P2PService {
  private instanceName: string;

  constructor() {
    // Cada instancia necesita un nombre único para ser identificada en la red
    this.instanceName = P2P_INSTANCE_NAME_PREFIX + randomUUID().slice(0, 8);
    console.log(`[P2P] Nombre de esta instancia: ${this.instanceName}`);
  }

  // Método principal para iniciar todo el sistema P2P
  public async start() {
    // 1. Definir qué hacer cuando recibimos un mensaje de otro peer
    const handleIncomingMessage: OnDataCallback = (_, message, socketId) => {
      console.log(`[P2P] Mensaje recibido de ${socketId}:`, message);

      // Aquí puedes interactuar con otras partes de tu app
      // Por ejemplo, si un peer te notifica un cambio en un timer:
      if (message.type === "TIMER_UPDATE") {
        // this.timerManager.updateState(message.payload);
        console.log("Procesando actualización de timer desde la red P2P...");
      }
    };

    // 2. Iniciar el servidor TCP en un puerto aleatorio (o específico)
    const tcpServerInfo = await createTcpServer(handleIncomingMessage);
    if (!tcpServerInfo) {
      console.error(
        "[P2P] No se pudo iniciar el servidor TCP. ¿Instancia duplicada?",
      );
    }

    const { port: p2pPort } = tcpServerInfo as { port: number; server: Server };
    console.log(`[P2P] Servidor TCP P2P escuchando en el puerto: ${p2pPort}`);

    // 3. Con el puerto ya asignado, iniciar el descubrimiento y anunciarlo
    startDiscovery(this.instanceName, p2pPort);

    // 4. Escuchar eventos de la red para conectar/desconectar peers automáticamente
    this.setupPeerListeners();
  }

  private setupPeerListeners() {
    peerManager.on("peerUp", async (peer: Peer) => {
      console.log(`[P2P] Peer detectado: ${peer.name}. Intentando conectar...`);
      try {
        // Cuando un nuevo peer aparece, intentamos establecer una conexión saliente
        const socket = await connectToPeer(peer);
        // Podrías enviar un saludo inicial si quisieras
        sendMessage(socket, { type: "GREETING", from: this.instanceName });
      } catch (error) {
        console.error(
          `[P2P] Fallo al conectar con ${peer.name}:`,
          (error as Error).message,
        );
      }
    });

    peerManager.on("peerDown", (peer: Peer) => {
      console.log(`[P2P] Peer desconectado: ${peer.name}`);
      // La lógica de 'communication.ts' ya se encarga de limpiar las conexiones cerradas.
    });
  }

  // Método para enviar un mensaje a todos los peers conocidos
  public async broadcast(message: object) {
    console.log("[P2P] Transmitiendo mensaje a todos los peers:", message);
    const peers = peerManager.getAllPeers();
    if (peers.length === 0) {
      console.log("[P2P] No hay peers a los que transmitir.");
      return;
    }

    for (const peer of peers) {
      try {
        const socket = await connectToPeer(peer); // Reutilizará o creará conexión
        sendMessage(socket, message);
      } catch (error) {
        console.error(
          `[P2P] No se pudo enviar mensaje a ${peer.name}:`,
          (error as Error).message,
        );
      }
    }
  }

  // Método para obtener la lista de peers actuales
  public getPeers(): Peer[] {
    return peerManager.getAllPeers();
  }

  // Método para la limpieza al cerrar la aplicación
  public async stop() {
    console.log("[P2P] Deteniendo el servicio P2P...");
    await stopDiscovery();
    closeAllConnections();
  }
}
export const p2pserver = new P2PService();
