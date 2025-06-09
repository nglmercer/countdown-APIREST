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

  // --- Métodos de Estado y Notificación ---

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
        console.error(`Error sending message to subscriber ${subscriber.id}`, e);
        // Opcional: remover suscriptor si falla el envío
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

  // --- Métodos de Suscripción ---

  subscribe(subscriber: WebSocketLike): void {
    this.subscribers.set(subscriber.id, subscriber);
    console.log(`[Timer ${this.timerId}] Client ${subscriber.id} subscribed. Total: ${this.subscribers.size}`);
    
    // Enviar el estado actual inmediatamente al nuevo suscriptor
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

  // --- Métodos de Control del Temporizador ---

  startCountdown(interval: number = TIMER_CONSTANTS.DEFAULT_INTERVAL): void {
    if (this.state === 'running') return;
    if (this.currentTime <= 0) {
      this.state = 'completed';
      this.broadcastTime();
      this.notifyStateChange();
      return;
    }

    this.state = 'running';
    this.broadcastTime(); // Notifica el cambio a 'running'
    this.notifyStateChange();

    this.intervalId = setInterval(() => {
      if (this.currentTime > 0) {
        this.currentTime--;
        this.broadcastTime();
      } else {
        this.state = 'completed';
        this.broadcast({ type: 'timerEnd', message: 'Timer finished!', timerId: this.timerId });
        this.stopCountdown(); // Limpia el intervalo y notifica al manager
      }
    }, interval);
  }

  stopCountdown(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    // Solo cambia el estado si estaba corriendo
    if (this.state === 'running') {
      this.state = this.currentTime <= 0 ? 'completed' : 'stopped';
      this.broadcastTime(); // Notifica el nuevo estado
      this.notifyStateChange();
    }
  }

  setTime(newTime: number): void {
    TimerUtils.validateTime(newTime);
    this.stopCountdown(); // Detener cualquier contador en marcha antes de cambiar el tiempo
    this.currentTime = newTime;
    this.state = newTime === 0 ? 'completed' : 'stopped';
    this.broadcastTime();
    this.notifyStateChange();
    console.log(TimerUtils.formatTimerLog(this.timerId, 'set to', this.currentTime));
  }

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

  rest(seconds: number): void {
    TimerUtils.validateSeconds(seconds, 'rest');
    this.currentTime = Math.max(0, this.currentTime - seconds);
    if (this.currentTime === 0) {
      this.state = 'completed';
    }
    this.broadcastTime();
    this.notifyStateChange();
    console.log(TimerUtils.formatSecondsLog(seconds, 'rested from', this.timerId, this.currentTime));
  }
  
  // --- Getters y otros ---

  getTime(): number { return this.currentTime; }
  getState(): TimerState { return this.state; }
  getInitialTime(): number { return this.initialTime; }
  hasSubscribers(): boolean { return this.subscribers.size > 0; }
  isExpired(): boolean { return TimerUtils.isExpired(this.createdAt); }
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