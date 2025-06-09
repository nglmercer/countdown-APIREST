// src/ws.ts
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { timerManager } from './core/timer-manager';
import { WebSocketLike } from './types/timer.types';

// El tipo para los mensajes que vienen del cliente
interface ClientActionMessage {
  action: 'start' | 'stop' | 'setTime' | 'addTime' | 'restTime' | 'getTime';
  value?: number;
}

export const createWsTimerRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const getTimerIdFromRequest = (req: any): string | number => {
    const { timerId: rawTimerId } = req.params as { timerId: string };
    if (rawTimerId === undefined || rawTimerId === '') {
      return 0; // ID del temporizador por defecto
    }
    return isNaN(Number(rawTimerId)) ? rawTimerId : Number(rawTimerId);
  };

  const handler = {
    websocket: true,
    handler: (connection: any, req: any) => { // 'connection' es el SocketStream
      const timerId = getTimerIdFromRequest(req);
      handleWebSocketConnection(connection, timerId);
    },
  };

  fastify.get('/ws', handler);
  fastify.get('/ws/:timerId', handler);
};

function handleWebSocketConnection(
  connection: any, // Este es el SocketStream, no un objeto que contiene un socket.
  timerId: string | number
) {
  console.log(`🔌 New WebSocket connection request for timerId: ${timerId}`);
  
  const timer = timerManager.getOrCreateTimer(timerId);

  // Crear un objeto 'subscriber' que se ajuste a nuestra interfaz WebSocketLike
  const subscriber: WebSocketLike = {
    id: Math.random().toString(36).substr(2, 9),
    send: (data: string) => {
      // Usar 'connection.send' directamente
      // Comprobar si el socket sigue abierto antes de enviar
      if (connection.readyState === 1) { // 1 = WebSocket.OPEN
        connection.send(data);
      }
    },
  };

  console.log(`✅ WebSocket connection established: ${subscriber.id} for timer ${timerId}`);
  timer.subscribe(subscriber);

  // Manejar mensajes entrantes usando 'connection.on'
  connection.on('message', (data: Buffer) => {
    const rawMessage = data.toString();
    console.log(`[Timer ${timerId}] 📨 Msg from ${subscriber.id}: ${rawMessage}`);

    try {
      const message: ClientActionMessage = JSON.parse(rawMessage);
      const { action, value } = message;

      // Volver a obtener el timer por si fue eliminado
      const currentTimer = timerManager.getTimer(timerId);
      if (!currentTimer) {
        subscriber.send(JSON.stringify({ type: 'error', message: `Timer ${timerId} not found.` }));
        connection.close();
        return;
      }

      switch (action) {
        case 'start':
          currentTimer.startCountdown();
          break;
        case 'stop':
          currentTimer.stopCountdown();
          break;
        case 'setTime':
          if (typeof value === 'number') currentTimer.setTime(value);
          break;
        case 'addTime':
          if (typeof value === 'number') currentTimer.add(value);
          break;
        case 'restTime':
          if (typeof value === 'number') currentTimer.subtract(value);
          break;
        case 'getTime':
            // El estado ya se envía en cada update, pero podemos forzar uno si se pide
            subscriber.send(JSON.stringify({
                type: 'timeUpdate',
                time: currentTimer.getTime(),
                state: currentTimer.getState(),
                timerId: timerId
            }));
            break;
        default:
          subscriber.send(JSON.stringify({ type: 'error', message: `Unknown action: ${action}` }));
      }
    } catch (error) {
      console.error(`❌ Error processing message from ${subscriber.id}:`, error);
      subscriber.send(JSON.stringify({ type: 'error', message: 'Invalid JSON message format' }));
    }
  });

  // Manejar cierre de conexión
  connection.on('close', () => {
    console.log(`🔌 WebSocket connection closed: ${subscriber.id}`);
    timer.unsubscribe(subscriber.id);
  });

  // Manejar errores del socket
  connection.on('error', (error: Error) => {
    console.error(`❌ WebSocket error on connection ${subscriber.id}:`, error);
    timer.unsubscribe(subscriber.id);
  });
}