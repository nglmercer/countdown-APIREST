import { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify';
import { timerManager } from './core/timer-manager';
import { TimerInstance } from './core/timer-instance';

// --- Tipos para las peticiones (mejora la seguridad y autocompletado) ---
interface TimerParams { timerId: string | number; }
interface SetTimeBody { time: number; }
interface ModifyTimeBody { seconds: number; }
interface FactorBody { factor: number; }
interface DivisorBody { divisor: number; }

// --- Función de ayuda para crear manejadores de rutas y evitar repetición (DRY) ---
const createTimerActionHandler = (
  action: (timer: TimerInstance, request: FastifyRequest) => void
) => {
  return async (request: FastifyRequest<{ Params: TimerParams }>, reply: any) => {
    const { timerId } = request.params;
    const timer = timerManager.getTimer(timerId);

    if (!timer) {
      return reply.status(404).send({ success: false, error: 'Timer not found' });
    }

    try {
      action(timer, request);
      // Iniciar el contador si se modifica y no está corriendo
      if (timer.getState() !== 'running' && timer.getTime() > 0) {
        timer.startCountdown();
      }
      return { success: true, timerId, currentTime: timer.getTime(), state: timer.getState() };
    } catch (e: any) {
      return reply.status(400).send({ success: false, timerId, error: e.message });
    }
  };
};

const timerRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
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
        params: { type: 'object', properties: { timerId: { type: ['string', 'number'] } }, required: ['timerId'] },
        body: { type: 'object', properties: { time: { type: 'number', minimum: 0 } }, required: ['time'] },
      },
    },
    async (request, reply) => {
      const { timerId } = request.params;
      const { time } = request.body;
      try {
        const timer = timerManager.getOrCreateTimer(timerId, time);
        timer.setTime(time);
        timer.startCountdown();
        return { success: true, timerId, currentTime: timer.getTime(), state: timer.getState() };
      } catch (e: any) {
        return reply.status(500).send({ success: false, timerId, error: e.message });
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
        return timer.getStatus();
      }
      return reply.status(404).send({ error: 'Timer not found' });
    }
  );

  // --- Rutas de Modificación (PATCH) ---
  // Usamos el manejador genérico para cada acción

  // Añadir segundos
  fastify.patch<{ Params: TimerParams, Body: ModifyTimeBody }>(
    `${API_PREFIX}/:timerId/add`,
    { schema: { body: { type: 'object', properties: { seconds: { type: 'number' } }, required: ['seconds'] } } },
    createTimerActionHandler((timer, req) => timer.add((req.body as ModifyTimeBody).seconds))
  );

  // Restar segundos
  fastify.patch<{ Params: TimerParams, Body: ModifyTimeBody }>(
    `${API_PREFIX}/:timerId/subtract`,
    { schema: { body: { type: 'object', properties: { seconds: { type: 'number' } }, required: ['seconds'] } } },
    createTimerActionHandler((timer, req) => timer.subtract((req.body as ModifyTimeBody).seconds))
  );

  // Multiplicar tiempo
  fastify.patch<{ Params: TimerParams, Body: FactorBody }>(
    `${API_PREFIX}/:timerId/multiply`,
    { schema: { body: { type: 'object', properties: { factor: { type: 'number', minimum: 0 } }, required: ['factor'] } } },
    createTimerActionHandler((timer, req) => timer.multiply((req.body as FactorBody).factor))
  );

  // Dividir tiempo
  fastify.patch<{ Params: TimerParams, Body: DivisorBody }>(
    `${API_PREFIX}/:timerId/divide`,
    { schema: { body: { type: 'object', properties: { divisor: { type: 'number', exclusiveMinimum: 0 } }, required: ['divisor'] } } },
    createTimerActionHandler((timer, req) => timer.divide((req.body as DivisorBody).divisor))
  );

  // --- Rutas de Acción (POST) ---

  // Reiniciar al tiempo inicial
  fastify.post<{ Params: TimerParams }>(
    `${API_PREFIX}/:timerId/reset`,
    createTimerActionHandler((timer) => timer.reset())
  );
  
  // --- Ruta de Eliminación (DELETE) ---
  fastify.delete<{ Params: TimerParams }>(
    `${API_PREFIX}/:timerId`,
    async (request, reply) => {
        const { timerId } = request.params;
        const success = timerManager.removeTimer(timerId);
        if (success) {
            return { success: true, message: `Timer ${timerId} removed.` };
        }
        return reply.status(404).send({ success: false, error: 'Timer not found or cannot be removed.' });
    }
  );
  
  // --- Rutas de Información Global ---
  /**
   * [GET] /timers/stats
   * Obtiene estadísticas de todos los temporizadores.
   */
  fastify.get(`${API_PREFIX}/stats`, async (request, reply) => {
      return timerManager.getStats();
  });
};

export { timerRoutes };