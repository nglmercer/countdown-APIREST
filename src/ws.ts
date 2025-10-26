// src/ws.ts
import { Elysia } from "elysia";
import { TimerManager } from "./core/timer-manager";
import { TimerInstance } from "./core/timer-instance";
import { WebSocketLike } from "./types/timer.types";
import { logger } from "./utils/logger";

// El tipo para los mensajes que vienen del cliente
interface ClientActionMessage {
  action:
    | "start"
    | "stop"
    | "setTime"
    | "addTime"
    | "restTime"
    | "getTime"
    | "reset";
  value?: number;
}

export const createWsTimerRoutes = (timerManager: TimerManager) => {
  return (
    new Elysia()
      // WebSocket para conexión específica con timerId exacto primero
      // WebSocket con timerId específico (más específico primero)
      .ws("/ws/:timerId", {
        message: (ws, message) => {
          const timerId = ws.data?.params?.timerId;
          handleWebSocketMessage(
            ws,
            message as string | Buffer<ArrayBufferLike>,
            timerId,
            timerManager,
          );
        },
        open: (ws) => {
          const timerId = ws.data?.params?.timerId || "1";
          logger.debug(`Open handler - timerId: ${timerId}, ws.data:`, ws.data);
          handleWebSocketConnection(ws, timerId, timerManager);
        },
        close: (ws) => {
          const timerId = ws.data?.params?.timerId || "1";
          handleWebSocketClose(ws, timerId, timerManager);
        },
        error: () => {
          // WebSocket error handling
        },
      })
      // WebSocket sin timerId específico (usa el default) - solo raíz exacta
      .ws("/ws/timer/:timerId", {
        message: (ws, message) => {
          const timerId = ws.data?.params?.timerId;
          handleWebSocketMessage(
            ws,
            message as string | Buffer<ArrayBufferLike>,
            timerId,
            timerManager,
          );
        },
        open: (ws) => {
          const timerId = ws.data?.params?.timerId || "1";
          logger.debug(
            `Timer handler - timerId: ${timerId}, ws.data:`,
            ws.data,
          );
          handleWebSocketConnection(ws, timerId, timerManager);
        },
        close: (ws) => {
          const timerId = ws.data?.params?.timerId || "1";
          handleWebSocketClose(ws, timerId, timerManager);
        },
        error: () => {
          // WebSocket error handling
        },
      })
      // WebSocket sin timerId específico (usa el default) - solo raíz exacta
      .ws("/ws", {
        message: (ws, message) => {
          logger.debug("Default message handler called");
          handleWebSocketMessage(
            ws,
            message as string | Buffer<ArrayBufferLike>,
            "1",
            timerManager,
          );
        },
        open: (ws) => {
          logger.debug("Default open handler called");
          handleWebSocketConnection(ws, "1", timerManager);
        },
        close: (ws) => {
          handleWebSocketClose(ws, "1", timerManager);
        },
        error: () => {
          // WebSocket error handling
        },
      })
  );
};

function handleWebSocketConnection(
  ws: any,
  timerId: string | number,
  timerManager: TimerManager,
) {
  logger.log(`🔌 New WebSocket connection request for timerId: ${timerId}`);

  // VALIDACIÓN CRÍTICA: Verificar que timerManager existe
  if (!timerManager) {
    logger.error("❌ TimerManager is undefined!");
    ws.close();
    return;
  }

  // Verificar que el método existe
  if (typeof timerManager.getOrCreateTimer !== "function") {
    logger.error("❌ TimerManager.getOrCreateTimer is not a function!");
    ws.close();
    return;
  }

  // Obtener o crear la instancia del timer con mejor manejo de errores
  let timer: TimerInstance | null = null;

  try {
    timer = getTimer(timerId, timerManager);

    if (!timer) {
      logger.error(`❌ Failed to create/get timer for timerId: ${timerId}`);
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Failed to initialize timer " + timerId,
          timerId: timerId,
        }),
      );
      ws.close();
      return;
    }
  } catch (error) {
    logger.error(`❌ Error getting timer ${timerId}:`, error);
    ws.send(
      JSON.stringify({
        type: "error",
        message: `Error initializing timer ${timerId}`,
        timerId: timerId,
      }),
    );
  }

  // Crear un objeto 'subscriber' que se ajuste a nuestra interfaz WebSocketLike
  const subscriber: WebSocketLike = {
    id: Math.random().toString(36).substr(2, 9),
    send: (data: string) => {
      try {
        // Verificar que la conexión esté abierta antes de enviar
        if (ws.readyState === 1) {
          // 1 = WebSocket.OPEN
          ws.send(data);
        }
      } catch (error) {
        logger.error(`Error sending WebSocket message:`, error);
      }
    },
  };

  logger.log(
    `✅ WebSocket connection established: ${subscriber.id} for timer ${timerId}`,
  );

  // SUSCRIBIRSE AL TIMER para recibir actualizaciones
  try {
    if (timer && typeof timer.subscribe === "function") {
      timer.subscribe(subscriber);
    } else {
      logger.error(`❌ Timer ${timerId} doesn't have subscribe method`);
      ws.close();
      return;
    }
  } catch (error) {
    logger.error(`❌ Error subscribing to timer ${timerId}:`, error);
    ws.close();
    return;
  }

  // Guardar referencia al subscriber en el websocket para cleanup - usar múltiples estrategias para persistencia
  ws.timerSubscriber = subscriber;
  // También intentar guardar en data si existe
  if (ws.data) {
    ws.data.timerSubscriber = subscriber;
  }
  // Asignar directamente como propiedad para máxima compatibilidad
  (ws as any).__subscriber = subscriber;

  // Enviar estado inicial inmediatamente
  try {
    const connectedMessage = JSON.stringify({
      type: "connected",
      time: timer.getTime(),
      state: timer.getState(),
      timerId: timerId.toString(),
      subscriberId: subscriber.id,
    });
    logger.log(`📤 Sending connected message: ${connectedMessage}`);
    ws.send(connectedMessage);
  } catch (error) {
    logger.error(`❌ Error sending connected message:`, error);
  }

  // HEARTBEAT para mantener la conexión viva y sincronizada
  ws.heartbeatInterval = setInterval(() => {
    if (ws.readyState === 1) {
      try {
        const currentTimer = getTimer(timerId, timerManager);
        if (currentTimer) {
          const heartbeatMessage = JSON.stringify({
            type: "heartbeat",
            time: currentTimer.getTime(),
            state: currentTimer.getState(),
            timerId: timerId.toString(),
            timestamp: Date.now(),
          });
          ws.send(heartbeatMessage);
        }
      } catch (error) {
        logger.error(`❌ Error in heartbeat for timer ${timerId}:`, error);
        clearInterval(ws.heartbeatInterval);
      }
    } else {
      clearInterval(ws.heartbeatInterval);
    }
  }, 2000);
}

function handleWebSocketMessage(
  ws: any,
  message: string | Buffer,
  timerId: string | number,
  timerManager: TimerManager,
) {
  // Try multiple ways to get subscriber for maximum compatibility
  let subscriber =
    ws.timerSubscriber || ws.data?.timerSubscriber || (ws as any).__subscriber;

  if (!subscriber) {
    logger.error("❌ No subscriber found for WebSocket connection");
    // Try to create the subscriber if it doesn't exist
    try {
      const timer = getTimer(timerId, timerManager);
      if (timer) {
        const newSubscriber: WebSocketLike = {
          id: Math.random().toString(36).substr(2, 9),
          send: (data: string) => {
            try {
              if (ws.readyState === 1) {
                ws.send(data);
              }
            } catch (error) {
              console.error(`Error sending WebSocket message:`, error);
            }
          },
        };
        timer.subscribe(newSubscriber);
        // Store in multiple places for persistence
        ws.timerSubscriber = newSubscriber;
        if (ws.data) ws.data.timerSubscriber = newSubscriber;
        (ws as any).__subscriber = newSubscriber;
        logger.log(
          `✅ Created new subscriber ${newSubscriber.id} for timer ${timerId}`,
        );
        subscriber = newSubscriber;
      } else {
        ws.send(
          JSON.stringify({
            type: "error",
            message: "Connection not properly initialized",
            timerId: timerId.toString(),
          }),
        );
        return;
      }
    } catch (error) {
      logger.error("❌ Failed to create subscriber:", error);
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Connection not properly initialized",
          timerId: timerId,
        }),
      );
      return;
    }
  }

  // Handle different message types from Elysia WebSocket
  let messageData: ClientActionMessage;

  try {
    if (typeof message === "string") {
      // If it's a string, parse it as JSON
      messageData = JSON.parse(message);
    } else if (typeof message === "object" && message !== null) {
      // If it's already an object, cast it through unknown first
      messageData = message as unknown as ClientActionMessage;
    } else {
      throw new Error("Invalid message format");
    }
  } catch (parseError) {
    // Handle JSON parsing errors specifically
    const errorMessage = JSON.stringify({
      type: "error",
      message: "Invalid JSON message format",
      timerId: timerId,
    });
    ws.send(errorMessage);
    return;
  }

  logger.log(
    `[Timer ${timerId}] 📨 Message from ${subscriber.id}:`,
    messageData,
  );

  try {
    const { action, value } = messageData;

    // Verificar que el timer aún existe
    const currentTimer = getTimer(timerId, timerManager);
    if (!currentTimer) {
      subscriber.send(
        JSON.stringify({
          type: "error",
          message: `Timer ${timerId} not found.`,
          timerId: timerId,
        }),
      );
      return;
    }

    // Ejecutar la acción solicitada
    let actionExecuted = false;

    switch (action) {
      case "start":
        currentTimer.startCountdown();
        actionExecuted = true;
        break;

      case "stop":
        currentTimer.stopCountdown();
        actionExecuted = true;
        break;

      case "setTime":
        if (typeof value === "number" && value >= 0) {
          currentTimer.setTime(value);
          actionExecuted = true;
        } else {
          const setTimeErrorMessage = JSON.stringify({
            type: "error",
            message: "setTime requires a valid non-negative number",
            timerId: currentTimer.timerId,
          });
          ws.send(setTimeErrorMessage);
        }
        break;

      case "addTime":
        if (typeof value === "number") {
          currentTimer.add(value);
          actionExecuted = true;
        } else {
          const addTimeErrorMessage = JSON.stringify({
            type: "error",
            message: "addTime requires a valid number",
            timerId: currentTimer.timerId,
          });
          ws.send(addTimeErrorMessage);
        }
        break;

      case "restTime":
        if (typeof value === "number") {
          currentTimer.subtract(value);
          actionExecuted = true;
        } else {
          const restTimeErrorMessage = JSON.stringify({
            type: "error",
            message: "restTime requires a valid number",
            timerId: currentTimer.timerId,
          });
          ws.send(restTimeErrorMessage);
        }
        break;

      case "reset":
        currentTimer.reset();
        actionExecuted = true;
        break;

      case "getTime":
        // Enviar estado actual inmediatamente
        const timeUpdateMessage = JSON.stringify({
          type: "timeUpdate",
          time: currentTimer.getTime(),
          state: currentTimer.getState(),
          timerId: currentTimer.timerId,
          source: "websocket-request",
          timestamp: Date.now(),
        });
        ws.send(timeUpdateMessage);
        actionExecuted = true;
        break;

      default:
        const errorResponse = JSON.stringify({
          type: "error",
          message: `Invalid action: ${action}`,
          timerId: currentTimer.timerId,
        });
        ws.send(errorResponse);
    }

    // Confirmar que la acción se ejecutó
    if (actionExecuted) {
      const confirmationMessage = JSON.stringify({
        type: "actionConfirmed",
        action: action,
        value: value,
        time: currentTimer.getTime(),
        state: currentTimer.getState(),
        timerId: currentTimer.timerId,
      });
      ws.send(confirmationMessage);
    }
  } catch (error) {
    logger.error(`❌ Error processing message from ${subscriber.id}:`, error);
    const errorMessage = JSON.stringify({
      type: "error",
      message: "Error processing message",
      timerId: timerId,
    });
    ws.send(errorMessage);
  }
}

function handleWebSocketClose(
  ws: any,
  timerId: string | number,
  timerManager: TimerManager,
) {
  const subscriber =
    ws.timerSubscriber || ws.data?.timerSubscriber || (ws as any).__subscriber;
  if (subscriber) {
    logger.log(
      `🔌 WebSocket connection closed: ${subscriber.id} for timer ${timerId}`,
    );
    cleanup(ws, timerId, timerManager);
  }
}

// WebSocket error handling is now inline in the route handlers

function cleanup(
  ws: any,
  timerId: string | number,
  timerManager: TimerManager,
) {
  // Try multiple ways to get subscriber for maximum compatibility
  const subscriber =
    ws.timerSubscriber || ws.data?.timerSubscriber || (ws as any).__subscriber;

  // Limpiar heartbeat
  if (ws.heartbeatInterval) {
    clearInterval(ws.heartbeatInterval);
  }

  // Desuscribirse del timer
  try {
    const currentTimer = getTimer(timerId, timerManager);
    if (
      currentTimer &&
      typeof currentTimer.unsubscribe === "function" &&
      subscriber
    ) {
      currentTimer.unsubscribe(subscriber.id);
      logger.log(`Unsubscribed ${subscriber.id} from timer ${timerId}`);
    }
  } catch (error) {
    logger.error(`❌ Error during cleanup for ${subscriber?.id}:`, error);
  }
}

function getTimer(
  timerId: string | number,
  timerManager: TimerManager,
): TimerInstance | null {
  try {
    if (!timerManager) {
      logger.error("TimerManager is null or undefined");
      return null;
    }

    if (typeof timerManager.getOrCreateTimer !== "function") {
      logger.error("getOrCreateTimer is not a function");
      return null;
    }

    const timer = timerManager.getOrCreateTimer(timerId);

    return timer || null;
  } catch (error) {
    logger.error("Error in getTimer:", error);
    return null;
  }
}
