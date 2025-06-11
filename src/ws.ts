// src/ws.ts
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
// REMOVED: import { timerManager } from './core/timer-manager';
import { TimerManager } from './core/timer-manager'; // Importamos el TIPO, no la instancia
import { TimerInstance } from './core/timer-instance';
import { WebSocketLike } from './types/timer.types';


// El tipo para los mensajes que vienen del cliente
interface ClientActionMessage {
  action: 'start' | 'stop' | 'setTime' | 'addTime' | 'restTime' | 'getTime' | 'reset';
  value?: number;
}

export const createWsTimerRoutes = (timerManager: TimerManager): FastifyPluginAsync => async (fastify: FastifyInstance) => {  
  const getTimerIdFromRequest = (req: any): string | number => {
    const { timerId: rawTimerId } = req.params as { timerId: string };
    if (rawTimerId === undefined || rawTimerId === '') {
      return 1; // ID del temporizador por defecto
    }
    return isNaN(Number(rawTimerId)) ? rawTimerId : Number(rawTimerId);
  };

  const handler = {
    websocket: true,
    // CAMBIO: Pasamos el timerManager al manejador de la conexión
    handler: (connection: any, req: any) => {
      const timerId = getTimerIdFromRequest(req);
      handleWebSocketConnection(connection, timerId, timerManager); // <-- Inyectamos el manager
    },
  };  
  fastify.get('/ws', handler);
  fastify.get('/ws/:timerId', handler);
};

function handleWebSocketConnection(
  connection: any,
  timerId: string | number,
  timerManager: TimerManager // <-- Recibe la instancia compartida
) {
  console.log(`🔌 New WebSocket connection request for timerId: ${timerId}`);
  
  // Obtener o crear la instancia del timer
  let timer = getTimer(timerId,timerManager);

  // Crear un objeto 'subscriber' que se ajuste a nuestra interfaz WebSocketLike
  const subscriber: WebSocketLike = {
    id: Math.random().toString(36).substr(2, 9),
    send: (data: string) => {
      try {
        // Verificar que la conexión esté abierta antes de enviar
        if (connection.readyState === 1) { // 1 = WebSocket.OPEN
          connection.send(data);
        }
      } catch (error) {
        console.error(`Error sending WebSocket message:`, error);
      }
    },
  };

  console.log(`✅ WebSocket connection established: ${subscriber.id} for timer ${timerId}`);
  
  // SUSCRIBIRSE AL TIMER para recibir actualizaciones
  timer.subscribe(subscriber);

  // Enviar estado inicial inmediatamente
  subscriber.send(JSON.stringify({
    type: 'connected',
    time: timer.getTime(),
    state: timer.getState(),
    timerId: timerId,
    subscriberId: subscriber.id
  }));

  // HEARTBEAT para mantener la conexión viva y sincronizada
  const heartbeatInterval = setInterval(() => {
    if (connection.readyState === 1) {
      timer = getTimer(timerId,timerManager);
      console.log("uodate timer",timer)
      subscriber.send(JSON.stringify({
        type: 'heartbeat',
        time: timer.getTime(),
        state: timer.getState(),
        timerId: timerId,
        timestamp: Date.now()
      }));
    } else {
      clearInterval(heartbeatInterval);
    }
  }, 2000); // Cada 2 segundos para mejor sincronización

  // Manejar mensajes entrantes del cliente
  connection.on('message', (data: Buffer) => {
    const rawMessage = data.toString();
    console.log(`[Timer ${timerId}] 📨 Message from ${subscriber.id}: ${rawMessage}`);

    try {
      const message: ClientActionMessage = JSON.parse(rawMessage);
      const { action, value } = message;

      // Verificar que el timer aún existe
      const currentTimer = getTimer(timerId,timerManager);
      if (!currentTimer) {
        subscriber.send(JSON.stringify({ 
          type: 'error', 
          message: `Timer ${timerId} not found.`,
          timerId: timerId
        }));
        connection.close();
        return;
      }

      // Ejecutar la acción solicitada
      let actionExecuted = false;
      
      switch (action) {
        case 'start':
          currentTimer.startCountdown();
          actionExecuted = true;
          break;
          
        case 'stop':
          currentTimer.stopCountdown();  
          actionExecuted = true;
          break;
          
        case 'setTime':
          if (typeof value === 'number' && value >= 0) {
            currentTimer.setTime(value);
            actionExecuted = true;
          } else {
            subscriber.send(JSON.stringify({ 
              type: 'error', 
              message: 'setTime requires a valid non-negative number',
              timerId: timerId
            }));
          }
          break;
          
        case 'addTime':
          if (typeof value === 'number') {
            currentTimer.add(value);
            actionExecuted = true;
          } else {
            subscriber.send(JSON.stringify({ 
              type: 'error', 
              message: 'addTime requires a valid number',
              timerId: timerId
            }));
          }
          break;
          
        case 'restTime':
          if (typeof value === 'number') {
            currentTimer.subtract(value);
            actionExecuted = true;
          } else {
            subscriber.send(JSON.stringify({ 
              type: 'error', 
              message: 'restTime requires a valid number',
              timerId: timerId
            }));
          }
          break;
          
        case 'reset':
          currentTimer.reset();
          actionExecuted = true;
          break;
          
        case 'getTime':
          // Enviar estado actual inmediatamente
          subscriber.send(JSON.stringify({
            type: 'timeUpdate',
            time: currentTimer.getTime(),
            state: currentTimer.getState(),
            timerId: timerId,
            source: 'websocket-request'
          }));
          actionExecuted = true;
          break;
          
        default:
          subscriber.send(JSON.stringify({ 
            type: 'error', 
            message: `Unknown action: ${action}`,
            timerId: timerId
          }));
      }

      // Confirmar que la acción se ejecutó
      if (actionExecuted) {
        subscriber.send(JSON.stringify({
          type: 'actionConfirmed',
          action: action,
          value: value,
          time: currentTimer.getTime(),
          state: currentTimer.getState(),
          timerId: timerId
        }));
      }

    } catch (error) {
      console.error(`❌ Error processing message from ${subscriber.id}:`, error);
      subscriber.send(JSON.stringify({ 
        type: 'error', 
        message: 'Invalid JSON message format',
        timerId: timerId
      }));
    }
  });

  // Manejar cierre de conexión
  connection.on('close', () => {
    console.log(`🔌 WebSocket connection closed: ${subscriber.id} for timer ${timerId}`);
    cleanup();
  });

  // Manejar errores del socket
  connection.on('error', (error: Error) => {
    console.error(`❌ WebSocket error on connection ${subscriber.id}:`, error);
    cleanup();
  });

  // Función de limpieza
  function cleanup() {
    // Limpiar heartbeat
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }
    
    // Desuscribirse del timer
    const currentTimer = getTimer(timerId,timerManager);
    if (currentTimer) {
      currentTimer.unsubscribe(subscriber.id);
      console.log(`Unsubscribed ${subscriber.id} from timer ${timerId}`);
    }
  }
}
function getTimer(
  timerId: string | number,
  timerManager: TimerManager // <-- Recibe la instancia compartida
){
  let timer = timerManager.getOrCreateTimer(timerId)
  if (!timer) timer = timerManager.getOrCreateTimer(timerId);
  return timer;
}