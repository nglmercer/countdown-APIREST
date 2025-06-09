// src/index.ts
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket';
import { timerManager } from './core/timer-manager';
import { timerRoutes } from './http';
import { p2pRoutes } from './tcprouter';
import { createWsTimerRoutes } from './ws';
import { P2PService,p2pserver } from './p2p/p2pService';
import { API_PORT } from './config';
import { fileURLToPath } from 'url';
import path from 'path';

// 👇 Estas dos líneas reemplazan __dirname en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fastify = Fastify({ 
  logger: true 
});

async function buildServer() {
  try {
    // Register WebSocket support
    await fastify.register(fastifyWebsocket);
    
    // Register static files plugin
    await fastify.register(fastifyStatic, {
      root: path.join(__dirname, 'public'),
      prefix: '/', // optional: default '/'
    });

    // Register HTTP timer routes
    await fastify.register(timerRoutes);

    await fastify.register(p2pRoutes);

    // Register WebSocket routes
    await fastify.register(createWsTimerRoutes);

    return fastify;
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

async function start() {
  try {
    const server = await buildServer();
    
    // Start the server
    await server.listen({ 
      port: API_PORT, 
      host: '0.0.0.0' 
    });
    
    console.log(`🚀 Fastify server is running at http://localhost:${API_PORT}`);
    console.log('📁 Static files served from /public');
    console.log(`🕒 Timer WebSocket is available at ws://localhost:${API_PORT}/ws or ws://localhost:${API_PORT}/ws/YOUR_TIMER_ID`);

    // Initialize P2P service
    try {
      p2pserver.start();
    } catch (error) {
      console.error(error, "p2p error");
      p2pserver.stop();
    }

  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  fastify.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  fastify.close();
  process.exit(0);
});

// Start the server
start();

export { fastify };
export type App = typeof fastify;