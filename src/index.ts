// src/index.ts
import { Elysia } from 'elysia';
import { TimerManager } from './timer';
import { createHttpTimerRouter } from './http';
import { createWsTimerRouter } from './ws';

const app = new Elysia();
const timerManager = new TimerManager(); // Manages multiple timer instances

// Initialize and use the routers
const httpRouter = createHttpTimerRouter(timerManager);
const wsRouter = createWsTimerRouter(timerManager);

app
  .use(wsRouter)
  .use(httpRouter)
  .listen(3000, () => {
    console.log('🦊 Elysia is running at http://localhost:3000');
    console.log('🕒 Timer WebSocket is available at ws://localhost:3000/ws or ws://localhost:3000/ws/YOUR_TIMER_ID');
  });

export type App = typeof app;