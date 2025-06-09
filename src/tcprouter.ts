// src/http.ts
import fastify, { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify';
import { p2pserver } from './p2p/p2pService'; // Importa el tipo

export const p2pRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {

  // GET /api/peers
  fastify.get('/peers', async (request, reply) => {
    // Accedemos al servicio a través de la instancia de fastify
    const peers = p2pserver.getPeers();
    return peers;
  });

  // POST /api/broadcast
  fastify.post('/broadcast', {
    schema: {
      body: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          message: { type: 'string' }
        },
        required: ['type', 'message'],
      }
    }
  }, async (request, reply) => {
    const body = request.body as { message: string, type: string };
    p2pserver.broadcast(body);
    return { status: 'ok', message: 'Broadcast initiated.' };
  });
};