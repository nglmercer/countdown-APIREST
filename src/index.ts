// src/index.ts (o renómbralo a main.ts)
import { Elysia } from 'elysia';
import { staticPlugin } from '@elysiajs/static';
import { TimerManager } from './timer';
import { P2PService } from './p2p/p2pService'; // Importa nuestro servicio
import { createHttpTimerRouter } from './http';
import { createWsTimerRouter } from './ws';

async function main() {
  // 1. Instanciar los componentes principales
  const timerManager = new TimerManager();
  const p2pService = new P2PService(timerManager);

  // 2. Iniciar el servicio P2P (servidor TCP + descubrimiento)
  await p2pService.start();

  // 3. Crear e iniciar la aplicación Elysia
  const app = new Elysia()
    // 'decorate' hace que p2pService esté disponible en el contexto de cada petición (ctx.p2p)
    .decorate('p2p', p2pService)
    .use(staticPlugin({
      assets: "public",
      prefix: "/",
    }))
    .use(createWsTimerRouter(timerManager))
    .use(createHttpTimerRouter(timerManager))
    .listen(3000);

  console.log(`🦊 Elysia está corriendo en http://${app.server?.hostname}:${app.server?.port}`);
  console.log(` Websocket disponible en ws://${app.server?.hostname}:${app.server?.port}/ws`);

  // 4. Manejar el cierre gradual (graceful shutdown)
  process.on('SIGINT', async () => {
/*     await p2pService.stop();
    await app.stop(); */
    console.log('👋 Adiós!');
  });
}

// Ejecutar la función principal
main().catch(err => {
  console.error("Error fatal al iniciar la aplicación:", err);
});