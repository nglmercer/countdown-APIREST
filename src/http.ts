import fastify, { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify';
import { timerManager } from './core/timer-manager';
const getTimerIdFromQuery = (query: any): string | number => {
  return query && (query.timerId !== undefined) ? query.timerId : 0;
};
const timerRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {

  // POST /timer/set
  fastify.post('/set', {
    schema: {
      body: {
        type: 'object',
        properties: { time: { type: 'number' } },
        required: ['time'],
      },
      querystring: {
        type: 'object',
        properties: {
          timerId: { oneOf: [{ type: 'string' }, { type: 'number' }] }
        }
      }
    }
  }, async (request, reply) => {
    const { body, query } = request as any;
    const timerId = getTimerIdFromQuery(query);
    // Accedemos al servicio a través de la instancia de fastify
    const timer = timerManager.getOrCreateTimer(timerId, body.time);
    try {
      timer.setTime(body.time);
      timer.startCountdown();
      return { success: true, timerId, currentTime: timer.getTime() };
    } catch (e: any) {
      reply.status(500);
      return { success: false, timerId, error: e.message };
    }
  });

  // POST /timer/add
  fastify.post('/add', {
    schema: {
      body: {
        type: 'object',
        properties: { seconds: { type: 'number' } },
        required: ['seconds'],
      },
      querystring: { /* ... schema idéntico al de /set ... */ }
    }
  }, async (request, reply) => {
    const { body, query } = request as any;
    const timerId = getTimerIdFromQuery(query);
    const timer = timerManager.getOrCreateTimer(timerId);
    try {
      timer.add(body.seconds);
      timer.startCountdown();
      return { success: true, timerId, currentTime: timer.getTime() };
    } catch (e: any) {
      reply.status(500);
      return { success: false, timerId, error: e.message };
    }
  });

  // POST /timer/rest (mantenemos el nombre original)
  fastify.post('/rest', {
    schema: {
      body: {
        type: 'object',
        properties: { seconds: { type: 'number' } },
        required: ['seconds'],
      },
      querystring: { /* ... schema idéntico al de /set ... */ }
    }
  }, async (request, reply) => {
    const { body, query } = request as any;
    const timerId = getTimerIdFromQuery(query);
    const timer = timerManager.getOrCreateTimer(timerId);
    try {
      timer.rest(body.seconds);
      timer.startCountdown();
      return { success: true, timerId, currentTime: timer.getTime() };
    } catch (e: any) {
      reply.status(500);
      return { success: false, timerId, error: e.message };
    }
  });

  // GET /timer/time
  fastify.get('/time', {
    schema: {
      querystring: { /* ... schema idéntico al de /set ... */ }
    }
  }, async (request, reply) => {
    const { query } = request as any;
    const timerId = getTimerIdFromQuery(query);
    const timer = timerManager.getTimer(timerId);
    if (timer) {
      return { timerId, currentTime: timer.getTime() };
    } else {
      reply.status(404);
      return { timerId, error: 'Timer not found' };
    }
  });
};
export {
  timerRoutes
}