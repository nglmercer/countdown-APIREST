// src/discovery.ts

import { Bonjour, Service } from "bonjour-service";
import { peerManager } from "./peerManager.js";
import { P2P_SERVICE_TYPE, P2P_SERVICE_PROTOCOL } from "../config.js";

let bonjourInstance: Bonjour | null;
let publishedService: Service | null;

export function startDiscovery(
  instanceName: string,
  portToAnnounce: number,
): Service | undefined {
  if (bonjourInstance) {
    console.warn("[Discovery] El descubrimiento ya está iniciado.");
    return;
  }

  bonjourInstance = new Bonjour();

  publishedService = bonjourInstance.publish({
    name: instanceName,
    type: P2P_SERVICE_TYPE,
    protocol: P2P_SERVICE_PROTOCOL,
    port: portToAnnounce,
    txt: {
      id: instanceName,
      timestamp: Date.now().toString(),
    },
  });
  console.log(
    `[Discovery] Servicio publicado: ${instanceName} en puerto ${portToAnnounce}`,
  );

  const browser = bonjourInstance.find({
    type: P2P_SERVICE_TYPE,
    protocol: P2P_SERVICE_PROTOCOL,
  });

  browser.on("up", (service: Service) => {
    if (service.name === instanceName && service.port === portToAnnounce) {
      return;
    }
    peerManager.addPeer(service);
  });

  browser.on("down", (service: Service) => {
    peerManager.removePeer(service);
  });

  console.log(`[Discovery] Buscando servicios '${P2P_SERVICE_TYPE}'...`);
  return publishedService;
}

export function stopDiscovery(): Promise<void> {
  return new Promise((resolve) => {
    if (!bonjourInstance) {
      bonjourInstance = null;
      return resolve();
    }
    if (publishedService && typeof publishedService.stop === "function") {
      publishedService.stop(() => {
        console.log("[Discovery] Servicio desanunciado.");
        publishedService = null;
        // Bonjour v4+ destroy() es síncrono, pero por compatibilidad lo manejamos así
        bonjourInstance?.destroy();
        bonjourInstance = null;
        console.log("[Discovery] Instancia Bonjour destruida.");
        resolve();
      });
    } else if (bonjourInstance) {
      bonjourInstance.destroy();
      bonjourInstance = null;
      console.log(
        "[Discovery] Instancia Bonjour destruida (sin servicio publicado).",
      );
      resolve();
    } else {
      console.log("[Discovery] No hay instancia Bonjour para detener.");
      resolve();
    }
  });
}
