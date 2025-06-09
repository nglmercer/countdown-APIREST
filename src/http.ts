// src/http.ts
import { Elysia, t } from 'elysia';
import { TimerManager } from './timer';

// Helper to get timerId from query or use default
const getTimerIdFromQuery = (query: any): string | number => {
  return query && (query.timerId !== undefined) ? query.timerId : 0;
};

export const createHttpTimerRouter = (timerManager: TimerManager) => {
  return new Elysia({ prefix: '/timer' })
    .post('/set', ({ body, query }) => {
      const timerId = getTimerIdFromQuery(query);
      const timer = timerManager.getOrCreateTimer(timerId, body.time); // Pass initial time if creating
      try {
        timer.setTime(body.time);
        timer.startCountdown(); // Ensure countdown is active
        return { success: true, timerId, currentTime: timer.getTime() };
      } catch (e: any) {
        return { success: false, timerId, error: e.message };
      }
    }, {
      body: t.Object({
        time: t.Number()
      }),
      query: t.Optional(t.Object({ timerId: t.Optional(t.Union([t.String(), t.Number()])) }))
    })
    .post('/add', ({ body, query }) => {
      const timerId = getTimerIdFromQuery(query);
      const timer = timerManager.getOrCreateTimer(timerId);
      try {
        timer.add(body.seconds);
        timer.startCountdown();
        return { success: true, timerId, currentTime: timer.getTime() };
      } catch (e: any) {
        return { success: false, timerId, error: e.message };
      }
    }, {
      body: t.Object({
        seconds: t.Number()
      }),
      query: t.Optional(t.Object({ timerId: t.Optional(t.Union([t.String(), t.Number()])) }))
    })
    .post('/rest', ({ body, query }) => {
      const timerId = getTimerIdFromQuery(query);
      const timer = timerManager.getOrCreateTimer(timerId);
      try {
        timer.rest(body.seconds);
        timer.startCountdown();
        return { success: true, timerId, currentTime: timer.getTime() };
      } catch (e: any) {
        return { success: false, timerId, error: e.message };
      }
    }, {
      body: t.Object({
        seconds: t.Number()
      }),
      query: t.Optional(t.Object({ timerId: t.Optional(t.Union([t.String(), t.Number()])) }))
    })
    .get('/time', ({ query }) => {
      const timerId = getTimerIdFromQuery(query);
      const timer = timerManager.getTimer(timerId);
      if (timer) {
        return { timerId, currentTime: timer.getTime() };
      } else {
        return { timerId, error: 'Timer not found' };
      }
    }, {
      query: t.Optional(t.Object({ timerId: t.Optional(t.Union([t.String(), t.Number()])) }))
    });
}