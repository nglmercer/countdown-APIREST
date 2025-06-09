// core/timer-instance.ts

import { WebSocketLike, TimerData, TimerState, WebSocketMessage } from '../types/timer.types';
import { TIMER_CONSTANTS } from '../constants/timer.constants';
import { TimerUtils } from '../utils/timer.utils';

export class TimerInstance {
  private currentTime: number;
  private initialTime: number;
  private intervalId: NodeJS.Timeout | null = null;
  private subscribers: Map<string, WebSocketLike> = new Map();
  private state: TimerState = 'stopped';
  private timerId: string | number;
  private createdAt: number;
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

  setOnStateChangeCallback(callback: (timerId: string | number) => void): void {
    this.onStateChange = callback;
  }

  private notifyStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange(this.timerId);
    }
  }

  setTime(newTime: number): void {
    TimerUtils.validateTime(newTime);
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
    
    if (this.currentTime - seconds < 0) {
      this.currentTime = 0;
      this.state = 'completed';
      console.log(`Timer ${this.timerId} tried to rest ${seconds} seconds, but hit 0. Current time: ${this.currentTime} seconds`);
    } else {
      this.currentTime -= seconds;
      console.log(TimerUtils.formatSecondsLog(seconds, 'rested from', this.timerId, this.currentTime));
    }
    
    this.broadcastTime();
    this.notifyStateChange();
  }

  getTime(): number {
    return this.currentTime;
  }

  getState(): TimerState {
    return this.state;
  }

  getCreatedAt(): number {
    return this.createdAt;
  }

  getInitialTime(): number {
    return this.initialTime;
  }

  isExpired(): boolean {
    return TimerUtils.isExpired(this.createdAt);
  }

  subscribe(ws: WebSocketLike): void {
    this.subscribers.set(ws.id, ws);
    const message: WebSocketMessage = { 
      type: 'initialTime', 
      time: this.currentTime,
      state: this.state,
      timerId: this.timerId
    };
    ws.send(JSON.stringify(message));
  }

  unsubscribe(wsId: string): void {
    this.subscribers.delete(wsId);
    if (this.subscribers.size === 0 && this.state === 'running') {
      this.stopCountdown();
    }
  }

  private broadcastTime(): void {
    const message: WebSocketMessage = { 
      type: 'timeUpdate', 
      time: this.currentTime,
      state: this.state,
      timerId: this.timerId
    };
    this.subscribers.forEach(ws => {
      ws.send(JSON.stringify(message));
    });
  }

  private broadcastEnd(): void {
    const message: WebSocketMessage = { 
      type: 'timerEnd', 
      message: 'Timer finished!',
      timerId: this.timerId
    };
    this.subscribers.forEach(ws => {
      ws.send(JSON.stringify(message));
    });
  }

  startCountdown(interval: number = TIMER_CONSTANTS.DEFAULT_INTERVAL): void {
    if (this.currentTime <= 0) {
      this.state = 'completed';
      this.notifyStateChange();
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.state = 'running';
    this.notifyStateChange();

    this.intervalId = setInterval(() => {
      if (this.currentTime > 0) {
        this.currentTime--;
        this.broadcastTime();
        this.notifyStateChange();
      } else {
        this.state = 'completed';
        this.broadcastEnd();
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
      this.notifyStateChange();
    }
  }

  hasSubscribers(): boolean {
    return this.subscribers.size > 0;
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