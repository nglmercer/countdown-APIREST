// src/http.ts
import { Elysia, t } from 'elysia';
import type { P2PService } from './p2p/p2pService'; // Importa el tipo

// Elysia infiere el tipo de `p2p` del `decorate` que haremos en el archivo principal
// por lo que no necesitas pasarlo como argumento aquí.
export const createHttpeers = () => {
  return new Elysia({ prefix: '/api' })
    // --- NUEVAS RUTAS P2P ---

    // Endpoint para ver los peers descubiertos en la red
    .get('/peers', ({ p2p }: { p2p: P2PService }) => {
      return p2p.getPeers();
    })

    // Endpoint para enviar un mensaje a todos los peers
    .post(
      '/broadcast',
      ({ body, p2p }: { body: { message: string, type: string }, p2p: P2PService }) => {
        p2p.broadcast(body);
        return { status: 'ok', message: 'Broadcast initiated.' };
      },
      {
        // Añadimos validación del cuerpo de la petición
        body: t.Object({
          type: t.String(),
          message: t.String(),
        }),
      }
    );
};