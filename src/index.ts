// src/index.ts
import { Elysia } from 'elysia';
import { staticPlugin } from '@elysiajs/static';
import { TimerManager } from './timer';

import { createHttpTimerRouter } from './http';
import { createWsTimerRouter } from './ws';
import { createHttpeers } from './tcprouter';
import { P2PService } from './p2p/p2pService'
const app = new Elysia();
const timerManager = new TimerManager();



// Initialize and use the routers
const httpRouter = createHttpTimerRouter(timerManager);
const wsRouter = createWsTimerRouter(timerManager);
const peerRouter = createHttpeers()
app
  .use(staticPlugin({
    assets: "public", // carpeta donde están tus archivos estáticos
    prefix: "/", // prefijo de la URL (opcional)
  }))
  .use(wsRouter)
  .use(httpRouter)
  .use(peerRouter)
  .listen(3000, () => {
    console.log('🦊 Elysia is running at http://localhost:3000');
    console.log('🕒 Timer WebSocket is available at ws://localhost:3000/ws or ws://localhost:3000/ws/YOUR_TIMER_ID');
    console.log('📁 Static files served from /public');

  });
const p2pserver = new P2PService();
try {
  p2pserver.start();
} catch (error) {
  console.error(error,"p2p error")
  p2pserver.stop();
}

  export type App = typeof app;
  