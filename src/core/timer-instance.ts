// src/core/timer-instance.ts

import { WebSocketLike, TimerData, TimerState, WebSocketMessage } from '../types/timer.types';
import { TIMER_CONSTANTS } from '../constants/timer.constants';
import { TimerUtils } from '../utils/timer.utils';

export class TimerInstance {
  private currentTime: number;
  private initialTime: number;
  private intervalId: NodeJS.Timeout | null = null;
  private subscribers: Map<string, WebSocketLike> = new Map();
  private state: TimerState = 'stopped';
  public readonly timerId: string | number;
  private readonly createdAt: number;
  private onStateChange?: (timerId: string | number) => void;

  constructor(
    timerId: string | number,
    initialTime: number = TIMER_CONSTANTS.DEFAULT_INITIAL_TIME,
    currentTime?: number,
    state: TimerState = 'stopped',
    createdAt?: number
  ) {
    this.timerId = timerId;
    this.initialTime = initialTime;
    this.currentTime = currentTime ?? initialTime;
    this.state = state;
    this.createdAt = createdAt ?? Date.now();
  }

  // --- Métodos de Estado y Notificación --- (sin cambios)
  private notifyStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange(this.timerId);
    }
  }

  private broadcast(message: WebSocketMessage): void {
    const messageString = JSON.stringify(message);
    this.subscribers.forEach(subscriber => {
      try {
        subscriber.send(messageString);
      } catch (e) {
        console.error(`Error sending message to subscriber for timer ${this.timerId}`, e);
        this.unsubscribe(subscriber.id);
      }
    });
  }

  private broadcastTime(): void {
    this.broadcast({
      type: 'timeUpdate',
      time: this.currentTime,
      state: this.state,
      timerId: this.timerId
    });
  }

  // --- Métodos de Suscripción --- (sin cambios)
  subscribe(subscriber: WebSocketLike): void {
    this.subscribers.set(subscriber.id, subscriber);
    console.log(`[Timer ${this.timerId}] Client subscribed. Total: ${this.subscribers.size}`);
    subscriber.send(JSON.stringify({
      type: 'timeUpdate',
      time: this.currentTime,
      state: this.state,
      timerId: this.timerId
    }));
  }

  unsubscribe(subscriberId: string): void {
    this.subscribers.delete(subscriberId);
    console.log(`[Timer ${this.timerId}] Client ${subscriberId} unsubscribed. Total: ${this.subscribers.size}`);
  }


  // --- Métodos de Control del Temporizador --- (con adiciones)

  startCountdown(interval: number = TIMER_CONSTANTS.DEFAULT_INTERVAL): void {
    if (this.state === 'running') return;
    if (this.currentTime <= 0) {
      this.state = 'completed';
      this.broadcastTime();
      this.notifyStateChange();
      return;
    }

    this.state = 'running';
    this.broadcastTime();
    this.notifyStateChange();

    this.intervalId = setInterval(() => {
      if (this.currentTime > 0) {
        this.currentTime--;
        this.broadcastTime();
      } else {
        this.state = 'completed';
        this.broadcast({ type: 'timerEnd', message: 'Timer finished!', timerId: this.timerId });
        this.stopCountdown();
      }
    }, interval);
  }

  stopCountdown(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.state === 'running') {
      this.state = this.currentTime <= 0 ? 'completed' : 'stopped';
      this.broadcastTime();
      this.notifyStateChange();
    }
  }

  setTime(newTime: number): void {
    TimerUtils.validateTime(newTime);
    this.stopCountdown();
    this.currentTime = newTime;
    // También actualizamos el tiempo inicial al hacer un set explícito
    this.initialTime = newTime; 
    this.state = newTime === 0 ? 'completed' : 'stopped';
    this.broadcastTime();
    this.notifyStateChange();
    console.log(TimerUtils.formatTimerLog(this.timerId, 'set to', this.currentTime));
  }
  
  // --- MÉTODOS DE MODIFICACIÓN DE TIEMPO ---

  add(seconds: number): void {
    TimerUtils.validateSeconds(seconds, 'add');
    this.currentTime += seconds;
    if (this.state === 'completed' && this.currentTime > 0) {
      this.state = 'stopped';
    }
    this.broadcastTime();
    this.notifyStateChange();
    console.log(TimerUtils.formatSecondsLog(seconds, 'added to', this.timerId, this.currentTime));
  }

  // Renombrado 'rest' a 'subtract' por claridad
  subtract(seconds: number): void {
    TimerUtils.validateSeconds(seconds, 'subtract');
    this.currentTime = Math.max(0, this.currentTime - seconds);
    if (this.currentTime === 0) {
      this.state = 'completed';
    }
    this.broadcastTime();
    this.notifyStateChange();
    console.log(TimerUtils.formatSecondsLog(seconds, 'subtracted from', this.timerId, this.currentTime));
  }

  // NUEVO: Reinicia al tiempo inicial
  reset(): void {
    this.stopCountdown();
    this.currentTime = this.initialTime;
    this.state = this.currentTime === 0 ? 'completed' : 'stopped';
    this.broadcastTime();
    this.notifyStateChange();
    console.log(TimerUtils.formatTimerLog(this.timerId, 'reset to initial time', this.currentTime));
  }
  
  // NUEVO: Multiplica el tiempo actual
  multiply(factor: number): void {
    if (typeof factor !== 'number' || factor < 0) {
        throw new Error('Factor must be a non-negative number.');
    }
    this.currentTime = Math.round(this.currentTime * factor);
    if (this.state === 'completed' && this.currentTime > 0) {
      this.state = 'stopped';
    }
    this.broadcastTime();
    this.notifyStateChange();
    console.log(`[Timer ${this.timerId}] Time multiplied by ${factor}. New time: ${this.currentTime}`);
  }

  // NUEVO: Divide el tiempo actual
  divide(divisor: number): void {
    if (typeof divisor !== 'number' || divisor <= 0) {
        throw new Error('Divisor must be a positive number greater than zero.');
    }
    this.currentTime = Math.round(this.currentTime / divisor);
    if (this.currentTime === 0 && this.state !== 'completed') {
      this.state = 'completed';
    }
    this.broadcastTime();
    this.notifyStateChange();
    console.log(`[Timer ${this.timerId}] Time divided by ${divisor}. New time: ${this.currentTime}`);
  }

  // --- Getters y otros --- (con adición)
  getTime(): number { return this.currentTime; }
  getState(): TimerState { return this.state; }
  getInitialTime(): number { return this.initialTime; }
  hasSubscribers(): boolean { return this.subscribers.size > 0; }
  isExpired(): boolean { return TimerUtils.isExpired(this.createdAt); }
  
  getStatus() {
    return {
      timerId: this.timerId,
      currentTime: this.currentTime,
      initialTime: this.initialTime,
      state: this.state,
      createdAt: new Date(this.createdAt).toISOString(),
    };
  }

  toJSON(): TimerData {
    return {
      timerId: this.timerId,
      currentTime: this.currentTime,
      initialTime: this.initialTime,
      state: this.state,
      createdAt: this.createdAt,
      expiresAt: TimerUtils.calculateExpirationTime(this.createdAt),
      lastSaved: Date.now()
    };
  }
}