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

  constructor(
    timerId: string | number,
    initialTime: number = TIMER_CONSTANTS.DEFAULT_INITIAL_TIME,
    currentTime?: number,
    state: TimerState = 'stopped',
    createdAt?: number
  ) {
    this.timerId = timerId;
    this.initialTime = currentTime ?? initialTime;
    this.currentTime = currentTime ?? initialTime;
    this.state = state;
    this.createdAt = createdAt ?? Date.now();
  }

  // --- Métodos de Notificación Mejorados ---
  private broadcast(message: WebSocketMessage): void {
    if (this.subscribers.size === 0) return;

    const messageString = JSON.stringify(message);
    const disconnectedSubscribers: string[] = [];

    this.subscribers.forEach((subscriber, subscriberId) => {
      try {
        subscriber.send(messageString);
      } catch (error) {
        console.error(`Error sending message to subscriber ${subscriberId} for timer ${this.timerId}:`, error);
        disconnectedSubscribers.push(subscriberId);
      }
    });

    // Limpiar suscriptores desconectados
    disconnectedSubscribers.forEach(subscriberId => {
      this.subscribers.delete(subscriberId);
    });
  }

  private broadcastTime(): void {
    this.broadcast({
      type: 'timeUpdate',
      time: this.currentTime,
      state: this.state,
      timerId: this.timerId,
      timestamp: Date.now()
    });
  }

  private broadcastStateChange(source: 'websocket' | 'http' = 'websocket'): void {
    this.broadcast({
      type: 'stateChange',
      time: this.currentTime,
      state: this.state,
      timerId: this.timerId,
      source: source,
      timestamp: Date.now()
    });
  }

  // --- Métodos de Suscripción ---
  subscribe(subscriber: WebSocketLike): void {
    this.subscribers.set(subscriber.id, subscriber);
    console.log(`[Timer ${this.timerId}] Client ${subscriber.id} subscribed. Total subscribers: ${this.subscribers.size}`);
    
    // Enviar estado actual inmediatamente al nuevo suscriptor
    try {
      subscriber.send(JSON.stringify({
        type: 'initialState',
        time: this.currentTime,
        state: this.state,
        timerId: this.timerId,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error(`Error sending initial state to subscriber ${subscriber.id}:`, error);
      this.subscribers.delete(subscriber.id);
    }
  }

  unsubscribe(subscriberId: string): void {
    const wasSubscribed = this.subscribers.has(subscriberId);
    this.subscribers.delete(subscriberId);
    
    if (wasSubscribed) {
      console.log(`[Timer ${this.timerId}] Client ${subscriberId} unsubscribed. Total subscribers: ${this.subscribers.size}`);
    }
  }

  // --- Métodos de Control del Temporizador ---

  startCountdown(interval: number = TIMER_CONSTANTS.DEFAULT_INTERVAL): void {
    console.log(`[Timer ${this.timerId}] Start countdown requested. Current state: ${this.state}, time: ${this.currentTime}`);
    
    if (this.state === 'running') {
      console.log(`[Timer ${this.timerId}] Already running, ignoring start request`);
      return;
    }
    
    if (this.currentTime <= 0) {
      this.state = 'completed';
      this.broadcastTime();
      this.broadcastStateChange();
      console.log(`[Timer ${this.timerId}] Cannot start - time is 0 or negative`);
      return;
    }

    // Limpiar cualquier interval anterior por seguridad
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.state = 'running';
    this.broadcastTime();
    this.broadcastStateChange();

    this.intervalId = setInterval(() => {
      if (this.currentTime > 0) {
        this.currentTime--;
        this.broadcastTime();
        
        // Verificar si llegó a 0
        if (this.currentTime === 0) {
          this.state = 'completed';
          this.broadcast({ 
            type: 'timerEnd', 
            message: 'Timer finished!', 
            timerId: this.timerId,
            timestamp: Date.now()
          });
          this.stopCountdown();
        }
      }
    }, interval);
    
    console.log(`[Timer ${this.timerId}] Countdown started successfully`);
  }

  stopCountdown(): void {
    console.log(`[Timer ${this.timerId}] Stop countdown requested. Current state: ${this.state}`);
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    const previousState = this.state;
    if (this.state === 'running') {
      this.state = this.currentTime <= 0 ? 'completed' : 'stopped';
    }

    // Solo notificar si hubo un cambio de estado real
    if (previousState !== this.state) {
      this.broadcastTime();
      this.broadcastStateChange();
    }
    
    console.log(`[Timer ${this.timerId}] Countdown stopped. New state: ${this.state}`);
  }

  setTime(newTime: number): void {
    console.log(`[Timer ${this.timerId}] Setting time to: ${newTime}`);
    
    TimerUtils.validateTime(newTime);
    this.stopCountdown();
    
    this.currentTime = newTime;
    this.initialTime = newTime; // También actualizar el tiempo inicial
    this.state = newTime === 0 ? 'completed' : 'stopped';
    
    this.broadcastTime();
    this.broadcastStateChange('http');
    
    console.log(`[Timer ${this.timerId}] Time set successfully. New state: ${this.state}`);
  }
  
  // --- MÉTODOS DE MODIFICACIÓN DE TIEMPO ---

  add(seconds: number): void {
    console.log(`[Timer ${this.timerId}] Adding ${seconds} seconds`);
    
    TimerUtils.validateSeconds(seconds, 'add');
    this.currentTime += seconds;
    
    // Si estaba completado y ahora tiene tiempo, cambiar a stopped
    if (this.state === 'completed' && this.currentTime > 0) {
      this.state = 'stopped';
    }
    
    this.broadcastTime();
    this.broadcastStateChange('http');
    
    console.log(`[Timer ${this.timerId}] Added ${seconds} seconds. New time: ${this.currentTime}, state: ${this.state}`);
  }

  subtract(seconds: number): void {
    console.log(`[Timer ${this.timerId}] Subtracting ${seconds} seconds`);
    
    TimerUtils.validateSeconds(seconds, 'subtract');
    this.currentTime = Math.max(0, this.currentTime - seconds);
    
    // Si llegó a 0, marcar como completado
    if (this.currentTime === 0) {
      const wasRunning = this.state === 'running';
      this.state = 'completed';
      
      // Si estaba corriendo, detener el countdown
      if (wasRunning) {
        this.stopCountdown();
      }
    }
    
    this.broadcastTime();
    this.broadcastStateChange('http');
    
    console.log(`[Timer ${this.timerId}] Subtracted ${seconds} seconds. New time: ${this.currentTime}, state: ${this.state}`);
  }

  reset(): void {
    console.log(`[Timer ${this.timerId}] Resetting to initial time: ${this.initialTime}`);
    
    this.stopCountdown();
    this.currentTime = this.initialTime;
    this.state = this.currentTime === 0 ? 'completed' : 'stopped';
    
    this.broadcastTime();
    this.broadcastStateChange('http');
    
    console.log(`[Timer ${this.timerId}] Reset completed. New state: ${this.state}`);
  }
  
  multiply(factor: number): void {
    if (typeof factor !== 'number' || factor < 0) {
        throw new Error('Factor must be a non-negative number.');
    }
    
    console.log(`[Timer ${this.timerId}] Multiplying time by ${factor}`);
    
    this.currentTime = Math.round(this.currentTime * factor);
    
    if (this.state === 'completed' && this.currentTime > 0) {
      this.state = 'stopped';
    }
    
    this.broadcastTime();
    this.broadcastStateChange('http');
    
    console.log(`[Timer ${this.timerId}] Time multiplied. New time: ${this.currentTime}, state: ${this.state}`);
  }

  divide(divisor: number): void {
    if (typeof divisor !== 'number' || divisor <= 0) {
        throw new Error('Divisor must be a positive number greater than zero.');
    }
    
    console.log(`[Timer ${this.timerId}] Dividing time by ${divisor}`);
    
    this.currentTime = Math.round(this.currentTime / divisor);
    
    if (this.currentTime === 0 && this.state !== 'completed') {
      this.state = 'completed';
      this.stopCountdown();
    }
    
    this.broadcastTime();
    this.broadcastStateChange('http');
    
    console.log(`[Timer ${this.timerId}] Time divided. New time: ${this.currentTime}, state: ${this.state}`);
  }

  // --- Getters y otros ---
  getTime(): number { return this.currentTime; }
  getState(): TimerState { return this.state; }
  getInitialTime(): number { return this.currentTime || this.initialTime; }
  hasSubscribers(): boolean { return this.subscribers.size > 0; }
  isExpired(): boolean { return TimerUtils.isExpired(this.createdAt); }
  getSubscriberCount(): number { return this.subscribers.size; }
  
  getStatus() {
    return {
      timerId: this.timerId,
      currentTime: this.currentTime,
      initialTime: this.initialTime,
      state: this.state,
      subscriberCount: this.subscribers.size,
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

  // Método para debugging
  debug(): void {
    console.log(`[Timer ${this.timerId}] Debug Info:`, {
      currentTime: this.currentTime,
      initialTime: this.initialTime,
      state: this.state,
      isRunning: this.intervalId !== null,
      subscriberCount: this.subscribers.size,
      subscribers: Array.from(this.subscribers.keys())
    });
  }
}