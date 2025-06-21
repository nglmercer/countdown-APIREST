// src/ws.ts
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { TimerManager } from './core/timer-manager';
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
    handler: (connection: any, req: any) => {
      const timerId = getTimerIdFromRequest(req);
      handleWebSocketConnection(connection, timerId, timerManager);
    },
  };  
  fastify.get('/ws', handler);
  fastify.get('/ws/:timerId', handler);
};

function handleWebSocketConnection(
  connection: any,
  timerId: string | number,
  timerManager: TimerManager
) {
  console.log(`🔌 New WebSocket connection request for timerId: ${timerId}`);
  
  // VALIDACIÓN CRÍTICA: Verificar que timerManager existe
  if (!timerManager) {
    console.error('❌ TimerManager is undefined!');
    connection.close();
    return;
  }

  // Verificar que el método existe
  if (typeof timerManager.getOrCreateTimer !== 'function') {
    console.error('❌ TimerManager.getOrCreateTimer is not a function!');
    connection.close();
    return;
  }

  // Obtener o crear la instancia del timer con mejor manejo de errores
  let timer: TimerInstance | null = null;
  
  try {
    timer = getTimer(timerId, timerManager);
    
    if (!timer) {
      console.error(`❌ Failed to create/get timer for timerId: ${timerId}`);
      connection.send(JSON.stringify({
        type: 'error',
        message: `Failed to initialize timer ${timerId}`,
        timerId: timerId
      }));
      connection.close();
      return;
    }
  } catch (error) {
    console.error(`❌ Error getting timer ${timerId}:`, error);
    connection.send(JSON.stringify({
      type: 'error',
      message: `Error initializing timer ${timerId}`,
      timerId: timerId
    }));
    connection.close();
    return;
  }

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
  try {
    if (timer && typeof timer.subscribe === 'function') {
      timer.subscribe(subscriber);
    } else {
      console.error(`❌ Timer ${timerId} doesn't have subscribe method`);
      connection.close();
      return;
    }
  } catch (error) {
    console.error(`❌ Error subscribing to timer ${timerId}:`, error);
    connection.close();
    return;
  }

  // Enviar estado inicial inmediatamente
  try {
    subscriber.send(JSON.stringify({
      type: 'connected',
      time: timer.getTime(),
      state: timer.getState(),
      timerId: timerId,
      subscriberId: subscriber.id
    }));
  } catch (error) {
    console.error(`❌ Error sending initial state:`, error);
  }

  // HEARTBEAT para mantener la conexión viva y sincronizada
  const heartbeatInterval = setInterval(() => {
    if (connection.readyState === 1) {
      try {
        const currentTimer = getTimer(timerId, timerManager);
        if (currentTimer) {
          subscriber.send(JSON.stringify({
            type: 'heartbeat',
            time: currentTimer.getTime(),
            state: currentTimer.getState(),
            timerId: timerId,
            timestamp: Date.now()
          }));
        }
      } catch (error) {
        console.error(`❌ Error in heartbeat for timer ${timerId}:`, error);
        clearInterval(heartbeatInterval);
      }
    } else {
      clearInterval(heartbeatInterval);
    }
  }, 2000);

  // Manejar mensajes entrantes del cliente
  connection.on('message', (data: Buffer) => {
    const rawMessage = data.toString();
    console.log(`[Timer ${timerId}] 📨 Message from ${subscriber.id}: ${rawMessage}`);

    try {
      const message: ClientActionMessage = JSON.parse(rawMessage);
      const { action, value } = message;

      // Verificar que el timer aún existe
      const currentTimer = getTimer(timerId, timerManager);
      if (!currentTimer) {
        subscriber.send(JSON.stringify({ 
          type: 'error', 
          message: `Timer ${timerId} not found.`,
          timerId: timerId
        }));
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
    try {
      const currentTimer = getTimer(timerId, timerManager);
      if (currentTimer && typeof currentTimer.unsubscribe === 'function') {
        currentTimer.unsubscribe(subscriber.id);
        console.log(`Unsubscribed ${subscriber.id} from timer ${timerId}`);
      }
    } catch (error) {
      console.error(`❌ Error during cleanup for ${subscriber.id}:`, error);
    }
  }
}

function getTimer(
  timerId: string | number,
  timerManager: TimerManager
): TimerInstance | null {
  try {
    console.log('getOrCreateTimer', typeof timerManager?.getOrCreateTimer);
    console.log('typeof', typeof timerId);
    
    if (!timerManager) {
      console.error('TimerManager is null or undefined');
      return null;
    }
    
    if (typeof timerManager.getOrCreateTimer !== 'function') {
      console.error('getOrCreateTimer is not a function');
      return null;
    }
    
    const timer = timerManager.getOrCreateTimer(timerId);
    console.log('Timer retrieved:', timer ? 'success' : 'failed');
    
    return timer || null;
  } catch (error) {
    console.error('Error in getTimer:', error);
    return null;
  }
}