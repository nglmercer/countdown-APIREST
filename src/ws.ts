// src/ws.ts - Versión corregida con debugging
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { timerManager, TimerManager } from './core/timer-manager';

interface WebSocketMessage {
  action: string;
  value?: number | string;
}

interface ExtendedWebSocket {
  id: string;
  timerId: string | number;
  socket: any; // WebSocket instance from @fastify/websocket
}

export const createWsTimerRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Generate unique ID for each connection
  const generateId = () => Math.random().toString(36).substr(2, 9);

  // WebSocket route for default timer
  fastify.get('/ws', { websocket: true }, (connection, req) => {
    console.log('🔌 New WebSocket connection to /ws');
    handleWebSocketConnection(connection, req, 0, timerManager);
  });

  // WebSocket route for specific timer ID
  fastify.get('/ws/:timerId', { websocket: true }, (connection, req) => {
    const { timerId: rawTimerId } = req.params as { timerId: string };
    console.log('🔌 New WebSocket connection to /ws/:timerId with rawTimerId:', rawTimerId);
    
    const timerId = rawTimerId === undefined || rawTimerId === '' 
      ? 0 
      : (isNaN(Number(rawTimerId)) ? rawTimerId : Number(rawTimerId));
    
    console.log('📋 Processed timerId:', timerId);
    handleWebSocketConnection(connection, req, timerId, timerManager);
  });
};

function handleWebSocketConnection(
  connection: any, 
  req: any, 
  timerId: string | number,
  timerManager: TimerManager
) {
  const ws: ExtendedWebSocket = {
    id: Math.random().toString(36).substr(2, 9),
    timerId,
    socket: connection.socket
  };

  console.log(`✅ WebSocket connection established: ${ws.id} for timerId: ${timerId}`);
  
  // Verificar que timerManager existe
  if (!timerManager) {
    console.error('❌ TimerManager is null or undefined');
    connection.socket.send(JSON.stringify({ 
      type: 'error', 
      message: 'Timer manager not available' 
    }));
    return;
  }

  const timer = timerManager.getOrCreateTimer(timerId);
  
  if (!timer) {
    console.error(`❌ Failed to create/get timer for ID: ${timerId}`);
    connection.socket.send(JSON.stringify({ 
      type: 'error', 
      message: `Failed to create timer with ID ${timerId}` 
    }));
    return;
  }

  console.log(`⏱️ Timer instance obtained for ID: ${timerId}`);
  
  // Suscribir el socket al timer
  try {
    timer.subscribe(ws.socket);
    console.log(`🔔 Socket subscribed to timer ${timerId}`);
  } catch (error) {
    console.error(`❌ Error subscribing to timer ${timerId}:`, error);
  }

  // Enviar estado inicial inmediatamente
  try {
    const initialState = {
      type: 'timeUpdate',
      time: timer.getTime(),
      state: timer.getState(),
      timerId: timerId
    };
    
    connection.socket.send(JSON.stringify(initialState));
    console.log(`📤 Initial state sent:`, initialState);
  } catch (error) {
    console.error('❌ Error sending initial state:', error);
  }

  // Iniciar countdown solo si no está ya corriendo
  try {
    const currentState = timer.getState();
    console.log(`📊 Current timer state: ${currentState}`);
    
    if (currentState === 'stopped') {
      timer.startCountdown();
      console.log(`▶️ Countdown started for timer ${timerId}`);
    }
  } catch (error) {
    console.error(`❌ Error starting countdown for timer ${timerId}:`, error);
  }

  // Manejar mensajes entrantes
  connection.socket.on('message', (data: Buffer) => {
    const rawMessage = data.toString();
    console.log(`📨 Received message from ${ws.id} for timerId ${timerId}:`, rawMessage);
    
    const timer = timerManager.getTimer(timerId);

    if (!timer) {
      const errorMsg = { 
        type: 'error', 
        message: `Timer with ID ${timerId} not found.` 
      };
      connection.socket.send(JSON.stringify(errorMsg));
      console.log(`❌ Timer not found, sent error:`, errorMsg);
      return;
    }

    try {
      const message: WebSocketMessage = JSON.parse(rawMessage);
      console.log(`📋 Parsed message:`, message);
      
      if (message && typeof message === 'object') {
        const { action, value } = message;

        switch (action) {
          case 'setTime':
            if (typeof value === 'number') {
              console.log(`⏱️ Setting time to: ${value}`);
              timer.setTime(value);
              timer.startCountdown();
            } else {
              const errorMsg = { 
                type: 'error', 
                message: 'Invalid value for setTime' 
              };
              connection.socket.send(JSON.stringify(errorMsg));
              console.log(`❌ Invalid setTime value:`, errorMsg);
            }
            break;
            
          case 'addTime':
            if (typeof value === 'number') {
              console.log(`➕ Adding time: ${value}`);
              timer.add(value);
              timer.startCountdown();
            } else {
              const errorMsg = { 
                type: 'error', 
                message: 'Invalid value for addTime' 
              };
              connection.socket.send(JSON.stringify(errorMsg));
              console.log(`❌ Invalid addTime value:`, errorMsg);
            }
            break;
            
          case 'restTime':
            if (typeof value === 'number') {
              console.log(`➖ Subtracting time: ${value}`);
              timer.rest(value);
              timer.startCountdown();
            } else {
              const errorMsg = { 
                type: 'error', 
                message: 'Invalid value for restTime' 
              };
              connection.socket.send(JSON.stringify(errorMsg));
              console.log(`❌ Invalid restTime value:`, errorMsg);
            }
            break;
            
          case 'getTime':
            console.log(`🔍 Requested current time`);
            const timeResponse = { 
              type: 'timeUpdate', 
              time: timer.getTime(),
              state: timer.getState(),
              timerId: timerId
            };
            connection.socket.send(JSON.stringify(timeResponse));
            console.log(`📤 Sent time response:`, timeResponse);
            break;
            
          case 'start':
            console.log(`▶️ Starting timer ${timerId}`);
            timer.startCountdown();
            const startMsg = { 
              type: 'status', 
              message: `Timer ${timerId} started/resumed` 
            };
            connection.socket.send(JSON.stringify(startMsg));
            console.log(`📤 Sent start confirmation:`, startMsg);
            break;
            
          case 'stop':
            console.log(`⏸️ Stopping timer ${timerId}`);
            timer.stopCountdown();
            const stopMsg = { 
              type: 'status', 
              message: `Timer ${timerId} stopped` 
            };
            connection.socket.send(JSON.stringify(stopMsg));
            console.log(`📤 Sent stop confirmation:`, stopMsg);
            break;
            
          default:
            const unknownMsg = { 
              type: 'error', 
              message: `Unknown action: ${action}` 
            };
            connection.socket.send(JSON.stringify(unknownMsg));
            console.log(`❌ Unknown action:`, unknownMsg);
        }
      } else {
        const formatErrorMsg = { 
          type: 'error', 
          message: 'Invalid message format' 
        };
        connection.socket.send(JSON.stringify(formatErrorMsg));
        console.log(`❌ Invalid message format:`, formatErrorMsg);
      }
    } catch (error) {
      console.error(`❌ Error processing WebSocket message for timerId ${timerId}:`, error);
      const parseErrorMsg = { 
        type: 'error', 
        message: 'Error processing message' 
      };
      connection.socket.send(JSON.stringify(parseErrorMsg));
      console.log(`📤 Sent parse error:`, parseErrorMsg);
    }
  });

  connection.socket.on('close', () => {
    console.log(`🔌 WebSocket connection closed: ${ws.id} for timerId: ${timerId}`);
    const timer = timerManager.getTimer(timerId);
    if (timer) {
      timer.unsubscribe(ws.id);
      console.log(`🔕 Unsubscribed ${ws.id} from timer ${timerId}`);
      
      // Optional: if no more subscribers for a non-default timer, remove it
      // if (!timer.hasSubscribers() && timerId !== 0) {
      //   timerManager.removeTimer(timerId);
      //   console.log(`🗑️ Timer instance ${timerId} removed as it has no subscribers.`);
      // }
    }
  });

  connection.socket.on('error', (error: Error) => {
    console.error(`❌ WebSocket error for ${ws.id}:`, error);
  });

  // Test de conectividad - enviar ping cada 30 segundos
  const pingInterval = setInterval(() => {
    if (connection.socket.readyState === 1) { // OPEN
      try {
        connection.socket.send(JSON.stringify({ 
          type: 'ping', 
          timestamp: Date.now() 
        }));
        console.log(`🏓 Ping sent to ${ws.id}`);
      } catch (error) {
        console.error(`❌ Error sending ping to ${ws.id}:`, error);
        clearInterval(pingInterval);
      }
    } else {
      console.log(`🔌 Connection ${ws.id} not open, clearing ping interval`);
      clearInterval(pingInterval);
    }
  }, 30000);

  // Limpiar interval cuando se cierre la conexión
  connection.socket.on('close', () => {
    clearInterval(pingInterval);
  });
}