// src/ws.ts
import { Elysia, t } from 'elysia';
import { TimerManager } from './timer';

export const createWsTimerRouter = (timerManager: TimerManager) => {
  return new Elysia({ prefix: '/ws' })
    .ws('/:timerId?', {
      body: t.Object({
        action: t.String(),
        value: t.Optional(t.Union([t.Number(), t.String()]))
      }),
      params: t.Object({
        timerId: t.Optional(t.String())
      }),
      open(ws) {
        const rawTimerId = ws.data.params.timerId;
        const timerId = rawTimerId === undefined || rawTimerId === '' ? 0 : (isNaN(Number(rawTimerId)) ? rawTimerId : Number(rawTimerId));
        
        // Store timerId in ws data context for later use
        (ws.data as any).timerId = timerId;

        console.log(`WebSocket connection opened: ${ws.id} for timerId: ${timerId}`);
        const timer = timerManager.getOrCreateTimer(timerId);
        timer.subscribe(ws);
        timer.startCountdown(); // Start countdown when a client connects
      },
      message(ws, message) {
        const timerId = (ws.data as any).timerId;
        console.log(`Received message from ${ws.id} for timerId ${timerId}:`, message);
        const timer = timerManager.getTimer(timerId);

        if (!timer) {
          ws.send(JSON.stringify({ type: 'error', message: `Timer with ID ${timerId} not found.` }));
          return;
        }

        try {
          const parsedMessage = typeof message === 'string' ? JSON.parse(message) : message;
          if (parsedMessage && typeof parsedMessage === 'object') {
            const { action, value } = parsedMessage as { action: string, value?: any };

            switch (action) {
              case 'setTime':
                if (typeof value === 'number') {
                  timer.setTime(value);
                  timer.startCountdown(); // Restart countdown
                } else {
                  ws.send(JSON.stringify({ type: 'error', message: 'Invalid value for setTime' }));
                }
                break;
              case 'addTime':
                if (typeof value === 'number') {
                  timer.add(value);
                  timer.startCountdown();
                } else {
                  ws.send(JSON.stringify({ type: 'error', message: 'Invalid value for addTime' }));
                }
                break;
              case 'restTime':
                if (typeof value === 'number') {
                  timer.rest(value);
                  timer.startCountdown();
                } else {
                  ws.send(JSON.stringify({ type: 'error', message: 'Invalid value for restTime' }));
                }
                break;
              case 'getTime':
                // Time is broadcasted on change, but client can request explicitly
                ws.send(JSON.stringify({ type: 'timeUpdate', time: timer.getTime() }));
                break;
              case 'start':
                timer.startCountdown();
                ws.send(JSON.stringify({ type: 'status', message: `Timer ${timerId} started/resumed` }));
                break;
              case 'stop':
                timer.stopCountdown();
                ws.send(JSON.stringify({ type: 'status', message: `Timer ${timerId} stopped` }));
                break;
              default:
                ws.send(JSON.stringify({ type: 'error', message: 'Unknown action' }));
            }
          } else {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
          }
        } catch (error) {
          console.error(`Error processing WebSocket message for timerId ${timerId}:`, error);
          ws.send(JSON.stringify({ type: 'error', message: 'Error processing message' }));
        }
      },
      close(ws) {
        const timerId = (ws.data as any).timerId;
        console.log(`WebSocket connection closed: ${ws.id} for timerId: ${timerId}`);
        const timer = timerManager.getTimer(timerId);
        if (timer) {
          timer.unsubscribe(ws.id);
          // Optional: if no more subscribers for a non-default timer, remove it
          // if (!timer.hasSubscribers() && timerId !== 0) {
          //   timerManager.removeTimer(timerId);
          //   console.log(`Timer instance ${timerId} removed as it has no subscribers.`);
          // }
        }
      }
    });
};