// src/peerManager.ts

import { EventEmitter } from 'events';
import type { Service } from 'bonjour-service'; // Usamos 'import type' porque solo es para anotaciones de tipo

export class PeerManager extends EventEmitter {
    // El mapa almacenará el FQDN del servicio como clave y el objeto Service como valor.
    public peers: Map<string, Service> = new Map();

    constructor() {
        super();
    }

    public addPeer(service: Service): void {
        if (!service || !service.fqdn) {
            console.warn('[PeerManager] Intento de añadir servicio inválido:', service);
            return;
        }
        const existingPeer = this.peers.get(service.fqdn);
        this.peers.set(service.fqdn, service);

        if (!existingPeer) {
            console.log(`[PeerManager] Peer ARRIBA: ${service.name} (${service.fqdn}) en ${service.host}:${service.port}`);
            this.emit('peerUp', service);
        }
    }

    public removePeer(service: Service): void {
        if (service && service.fqdn && this.peers.has(service.fqdn)) {
            const removedPeer = this.peers.get(service.fqdn)!; // '!' porque sabemos que existe
            this.peers.delete(service.fqdn);
            console.log(`[PeerManager] Peer ABAJO: ${removedPeer.name} (${removedPeer.fqdn})`);
            this.emit('peerDown', removedPeer);
        }
    }

    public getPeerByFqdn(fqdn: string): Service | undefined {
        return this.peers.get(fqdn);
    }

    public getPeerByName(instanceName: string): Service | undefined {
        for (const peer of this.peers.values()) {
            if (peer.name === instanceName) {
                return peer;
            }
        }
        return undefined;
    }

    public getAllPeers(): Service[] {
        return Array.from(this.peers.values());
    }
}

// Exportamos una única instancia (patrón Singleton) para que sea compartida en toda la app.
export const peerManager = new PeerManager();