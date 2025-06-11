// types/timer.types.ts

export interface WebSocketLike {
  id: string;
  send: (data: string) => void;
}
  
  export interface TimerData {
    timerId: string | number;
    currentTime: number;
    initialTime: number;
    state: 'running' | 'stopped' | 'completed';
    createdAt: number; // timestamp
    expiresAt: number; // timestamp
    lastSaved: number; // timestamp
  }
  
  export interface TimerStorage {
    version: string;
    timers: Record<string, TimerData>;
    lastCleanup: number;
  }
  
  export type TimerState = 'running' | 'stopped' | 'completed';
  
  export interface TimerStats {
    total: number;
    running: number;
    stopped: number;
    completed: number;
    expired: number;
  }
  
  export interface WebSocketMessage {
    type: 'initialTime' | 'timeUpdate' | 'timerEnd' | 'stateChange';
    time?: number;
    state?: TimerState;
    timerId?: string | number;
    message?: string;
    timestamp?: string | number;
    source?: 'websocket' | 'http';
  }