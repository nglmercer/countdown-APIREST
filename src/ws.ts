// src/ws.ts
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { timerManager,TimerManager } from './core/timer-manager';

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
    handleWebSocketConnection(connection, req, 0, timerManager);
  });

  // WebSocket route for specific timer ID
  fastify.get('/ws/:timerId', { websocket: true }, (connection, req) => {
    const { timerId: rawTimerId } = req.params as { timerId: string };
    
    const timerId = rawTimerId === undefined || rawTimerId === '' 
      ? 0 
      : (isNaN(Number(rawTimerId)) ? rawTimerId : Number(rawTimerId));
    
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

  console.log(`WebSocket connection opened: ${ws.id} for timerId: ${timerId}`);
  
  const timer = timerManager.getOrCreateTimer(timerId);
  timer.subscribe(ws.socket);
  timer.startCountdown(); // Start countdown when a client connects

  connection.socket.on('message', (data: Buffer) => {
    console.log(`Received message from ${ws.id} for timerId ${timerId}:`, data.toString());
    const timer = timerManager.getTimer(timerId);

    if (!timer) {
      connection.socket.send(JSON.stringify({ 
        type: 'error', 
        message: `Timer with ID ${timerId} not found.` 
      }));
      return;
    }

    try {
      const message: WebSocketMessage = JSON.parse(data.toString());
      
      if (message && typeof message === 'object') {
        const { action, value } = message;

        switch (action) {
          case 'setTime':
            if (typeof value === 'number') {
              timer.setTime(value);
              timer.startCountdown(); // Restart countdown
            } else {
              connection.socket.send(JSON.stringify({ 
                type: 'error', 
                message: 'Invalid value for setTime' 
              }));
            }
            break;
            
          case 'addTime':
            if (typeof value === 'number') {
              timer.add(value);
              timer.startCountdown();
            } else {
              connection.socket.send(JSON.stringify({ 
                type: 'error', 
                message: 'Invalid value for addTime' 
              }));
            }
            break;
            
          case 'restTime':
            if (typeof value === 'number') {
              timer.rest(value);
              timer.startCountdown();
            } else {
              connection.socket.send(JSON.stringify({ 
                type: 'error', 
                message: 'Invalid value for restTime' 
              }));
            }
            break;
            
          case 'getTime':
            // Time is broadcasted on change, but client can request explicitly
            connection.socket.send(JSON.stringify({ 
              type: 'timeUpdate', 
              time: timer.getTime() 
            }));
            break;
            
          case 'start':
            timer.startCountdown();
            connection.socket.send(JSON.stringify({ 
              type: 'status', 
              message: `Timer ${timerId} started/resumed` 
            }));
            break;
            
          case 'stop':
            timer.stopCountdown();
            connection.socket.send(JSON.stringify({ 
              type: 'status', 
              message: `Timer ${timerId} stopped` 
            }));
            break;
            
          default:
            connection.socket.send(JSON.stringify({ 
              type: 'error', 
              message: 'Unknown action' 
            }));
        }
      } else {
        connection.socket.send(JSON.stringify({ 
          type: 'error', 
          message: 'Invalid message format' 
        }));
      }
    } catch (error) {
      console.error(`Error processing WebSocket message for timerId ${timerId}:`, error);
      connection.socket.send(JSON.stringify({ 
        type: 'error', 
        message: 'Error processing message' 
      }));
    }
  });

  connection.socket.on('close', () => {
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
  });

  connection.socket.on('error', (error: Error) => {
    console.error(`WebSocket error for ${ws.id}:`, error);
  });
}