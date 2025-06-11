// src/http/timer-routes.ts
import { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify';
import { TimerManager } from './core/timer-manager'; // Importamos el TIPO, no la instancia
import { TimerInstance } from './core/timer-instance';

// --- Tipos para las peticiones (mejora la seguridad y autocompletado) ---
interface TimerParams { timerId: string | number; }
interface SetTimeBody { time: number; }
interface ModifyTimeBody { seconds: number; }
interface FactorBody { factor: number; }
interface DivisorBody { divisor: number; }

// --- Función de ayuda para crear manejadores de rutas y evitar repetición (DRY) ---
const createTimerActionHandler = (
  timerManager: TimerManager, // <-- Recibe la instancia
  action: (timer: TimerInstance, request: FastifyRequest) => void,
  autoCreateTimer: boolean = false,
  autoStart: boolean = false
) => {
  return async (request: FastifyRequest<{ Params: TimerParams }>, reply: any) => {
    const { timerId } = request.params;
    let timer = timerManager.getTimer(timerId);

    // Si el timer no existe y autoCreateTimer es true, crear uno nuevo
    if (!timer && autoCreateTimer) {
      timer = timerManager.getOrCreateTimer(timerId, 0);
    }

    if (!timer) {
      return reply.status(404).send({ 
        success: false, 
        error: `Timer ${timerId} not found. Create it first using PUT /timers/${timerId}` 
      });
    }

    try {
      console.log(`[HTTP] Executing action on timer ${timerId}. Current state: ${timer.getState()}, time: ${timer.getTime()}`);
      
      action(timer, request);
      
      // Solo iniciar automáticamente si autoStart es true y cumple las condiciones
      if (autoStart && timer.getState() !== 'running' && timer.getTime() > 0) {
        timer.startCountdown();
      }
      
      const response = { 
        success: true, 
        timerId, 
        currentTime: timer.getTime(), 
        state: timer.getState(),
        subscriberCount: timer.getSubscriberCount()
      };
      
      console.log(`[HTTP] Action completed on timer ${timerId}. New state: ${timer.getState()}, time: ${timer.getTime()}`);
      
      return response;
    } catch (e: any) {
      console.error(`[HTTP] Error executing action on timer ${timerId}:`, e.message);
      return reply.status(400).send({ 
        success: false, 
        timerId, 
        error: e.message 
      });
    }
  };
};

export const createTimerRoutes = (timerManager: TimerManager): FastifyPluginAsync => async (fastify: FastifyInstance) => {
  const API_PREFIX = '/timers';

  /**
   * [PUT] /timers/:timerId
   * Establece un tiempo específico o crea un nuevo temporizador.
   * Es idempotente: llamarlo varias veces con los mismos datos tiene el mismo resultado.
   */
  fastify.put<{ Params: TimerParams; Body: SetTimeBody }>(
    `${API_PREFIX}/:timerId`,
    {
      schema: {
        params: { 
          type: 'object', 
          properties: { timerId: { type: ['string', 'number'] } }, 
          required: ['timerId'] 
        },
        body: { 
          type: 'object', 
          properties: { time: { type: 'number', minimum: 0 } }, 
          required: ['time'] 
        },
      },
    },
    async (request, reply) => {
      const { timerId } = request.params;
      const { time } = request.body;
      
      try {
        const timer = timerManager.getOrCreateTimer(timerId, time);
        timer.setTime(time);
        
        // Solo iniciar automáticamente si el tiempo es mayor a 0
        if (time > 0) {
          timer.startCountdown();
        }
        
        return { 
          success: true, 
          timerId, 
          currentTime: timer.getTime(), 
          state: timer.getState(),
          message: 'Timer created/updated successfully'
        };
      } catch (e: any) {
        return reply.status(500).send({ 
          success: false, 
          timerId, 
          error: e.message 
        });
      }
    }
  );

  /**
   * [GET] /timers/:timerId/status
   * Obtiene el estado completo de un temporizador.
   */
  fastify.get<{ Params: TimerParams }>(
    `${API_PREFIX}/:timerId/status`,
    async (request, reply) => {
      const { timerId } = request.params;
      const timer = timerManager.getTimer(timerId);
      
      if (timer) {
        return { 
          success: true, 
          ...timer.getStatus() 
        };
      }
      
      return reply.status(404).send({ 
        success: false,
        error: `Timer ${timerId} not found. Create it first using PUT /timers/${timerId}` 
      });
    }
  );

  /**
   * [GET] /timers
   * Lista todos los temporizadores existentes
   */
  fastify.get(`${API_PREFIX}`, async (request, reply) => {
    try {
      const stats = timerManager.getStats();
      return {
        success: true,
        ...stats
      };
    } catch (e: any) {
      return reply.status(500).send({
        success: false,
        error: e.message
      });
    }
  });

  // --- Rutas de Modificación (PATCH) ---
  // Usamos el manejador genérico para cada acción

  // Añadir segundos
  fastify.patch<{ Params: TimerParams, Body: ModifyTimeBody }>(
    `${API_PREFIX}/:timerId/add`,
    { 
      schema: { 
        params: {
          type: 'object',
          properties: { timerId: { type: ['string', 'number'] } },
          required: ['timerId']
        },
        body: { 
          type: 'object', 
          properties: { seconds: { type: 'number' } }, 
          required: ['seconds'] 
        } 
      } 
    },
    createTimerActionHandler(timerManager, (timer, req) => {
      const { seconds } = req.body as ModifyTimeBody;
      timer.add(seconds);
    })
  );

  // Restar segundos
  fastify.patch<{ Params: TimerParams, Body: ModifyTimeBody }>(
    `${API_PREFIX}/:timerId/subtract`,
    { 
      schema: { 
        params: {
          type: 'object',
          properties: { timerId: { type: ['string', 'number'] } },
          required: ['timerId']
        },
        body: { 
          type: 'object', 
          properties: { seconds: { type: 'number' } }, 
          required: ['seconds'] 
        } 
      } 
    },
    createTimerActionHandler(timerManager, (timer, req) => {
      const { seconds } = req.body as ModifyTimeBody;
      timer.subtract(seconds);
    })
  );

  // Multiplicar tiempo
  fastify.patch<{ Params: TimerParams, Body: FactorBody }>(
    `${API_PREFIX}/:timerId/multiply`,
    { 
      schema: { 
        params: {
          type: 'object',
          properties: { timerId: { type: ['string', 'number'] } },
          required: ['timerId']
        },
        body: { 
          type: 'object', 
          properties: { factor: { type: 'number', minimum: 0 } }, 
          required: ['factor'] 
        } 
      } 
    },
    createTimerActionHandler(timerManager, (timer, req) => {
      const { factor } = req.body as FactorBody;
      timer.multiply(factor);
    })
  );

  // Dividir tiempo
  fastify.patch<{ Params: TimerParams, Body: DivisorBody }>(
    `${API_PREFIX}/:timerId/divide`,
    { 
      schema: { 
        params: {
          type: 'object',
          properties: { timerId: { type: ['string', 'number'] } },
          required: ['timerId']
        },
        body: { 
          type: 'object', 
          properties: { divisor: { type: 'number', exclusiveMinimum: 0 } }, 
          required: ['divisor'] 
        } 
      } 
    },
    createTimerActionHandler(timerManager, (timer, req) => {
      const { divisor } = req.body as DivisorBody;
      timer.divide(divisor);
    })
  );

  // --- Rutas de Acción (POST) ---

  // Reiniciar al tiempo inicial
  fastify.post<{ Params: TimerParams }>(
    `${API_PREFIX}/:timerId/reset`,
    {
      schema: {
        params: {
          type: 'object',
          properties: { timerId: { type: ['string', 'number'] } },
          required: ['timerId']
        }
      }
    },
    createTimerActionHandler(timerManager, (timer) => timer.reset())
  );

  // Pausar timer
  fastify.post<{ Params: TimerParams }>(
    `${API_PREFIX}/:timerId/pause`,
    {
      schema: {
        params: {
          type: 'object',
          properties: { timerId: { type: ['string', 'number'] } },
          required: ['timerId']
        }
      }
    },
    createTimerActionHandler(timerManager, (timer) => timer.stopCountdown())
  );

  // Reanudar timer
  fastify.post<{ Params: TimerParams }>(
    `${API_PREFIX}/:timerId/resume`,
    {
      schema: {
        params: {
          type: 'object',
          properties: { timerId: { type: ['string', 'number'] } },
          required: ['timerId']
        }
      }
    },
    createTimerActionHandler(timerManager, (timer) => timer.startCountdown())
  );
  
  // --- Ruta de Eliminación (DELETE) ---
  fastify.delete<{ Params: TimerParams }>(
    `${API_PREFIX}/:timerId`,
    {
      schema: {
        params: {
          type: 'object',
          properties: { timerId: { type: ['string', 'number'] } },
          required: ['timerId']
        }
      }
    },
    async (request, reply) => {
      const { timerId } = request.params;
      const success = timerManager.removeTimer(timerId);
      
      if (success) {
        return { 
          success: true, 
          message: `Timer ${timerId} removed successfully.` 
        };
      }
      
      return reply.status(404).send({ 
        success: false, 
        error: `Timer ${timerId} not found or cannot be removed.` 
      });
    }
  );
  
  // --- Rutas de Información Global ---
  /**
   * [GET] /timers/stats
   * Obtiene estadísticas de todos los temporizadores.
   */
  fastify.get(`${API_PREFIX}/stats`, async (request, reply) => {
    try {
      const stats = timerManager.getStats();
      return {
        success: true,
        ...stats
      };
    } catch (e: any) {
      return reply.status(500).send({
        success: false,
        error: e.message
      });
    }
  });
};

