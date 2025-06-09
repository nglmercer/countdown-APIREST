// src/timer.ts
import { writeFile, readFile, existsSync } from 'fs';
import { promisify } from 'util';

const writeFileAsync = promisify(writeFile);
const readFileAsync = promisify(readFile);

interface WebSocketLike {
  send: (message: string) => void;
  id: string;
}

interface TimerData {
  timerId: string | number;
  currentTime: number;
  initialTime: number;
  state: 'running' | 'stopped' | 'completed';
  createdAt: number; // timestamp
  expiresAt: number; // timestamp
  lastSaved: number; // timestamp
}

interface TimerStorage {
  version: string;
  timers: Record<string, TimerData>;
  lastCleanup: number;
}

export class TimerInstance {
  private currentTime: number;
  private initialTime: number;
  private intervalId: NodeJS.Timeout | null = null;
  private subscribers: Map<string, WebSocketLike> = new Map();
  private state: 'running' | 'stopped' | 'completed' = 'stopped';
  private timerId: string | number;
  private createdAt: number;
  private onStateChange?: (timerId: string | number) => void;

  constructor(
    timerId: string | number,
    initialTime: number = 60,
    currentTime?: number,
    state: 'running' | 'stopped' | 'completed' = 'stopped',
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
    if (newTime < 0) {
      throw new Error('Time cannot be negative.');
    }
    this.currentTime = newTime;
    this.state = newTime === 0 ? 'completed' : 'stopped';
    this.broadcastTime();
    this.notifyStateChange();
    console.log(`Timer ${this.timerId} set to: ${this.currentTime} seconds`);
  }

  add(seconds: number): void {
    if (seconds < 0) {
      throw new Error('Cannot add negative seconds. Use rest for subtraction.');
    }
    this.currentTime += seconds;
    if (this.state === 'completed' && this.currentTime > 0) {
      this.state = 'stopped';
    }
    this.broadcastTime();
    this.notifyStateChange();
    console.log(`${seconds} seconds added to timer ${this.timerId}. Current time: ${this.currentTime} seconds`);
  }

  rest(seconds: number): void {
    if (seconds < 0) {
      throw new Error('Cannot rest negative seconds. Use add for addition.');
    }
    if (this.currentTime - seconds < 0) {
      this.currentTime = 0;
      this.state = 'completed';
      console.log(`Timer ${this.timerId} tried to rest ${seconds} seconds, but hit 0. Current time: ${this.currentTime} seconds`);
    } else {
      this.currentTime -= seconds;
      console.log(`${seconds} seconds rested from timer ${this.timerId}. Current time: ${this.currentTime} seconds`);
    }
    this.broadcastTime();
    this.notifyStateChange();
  }

  getTime(): number {
    return this.currentTime;
  }

  getState(): 'running' | 'stopped' | 'completed' {
    return this.state;
  }

  getCreatedAt(): number {
    return this.createdAt;
  }

  getInitialTime(): number {
    return this.initialTime;
  }

  isExpired(): boolean {
    const oneDayMs = 24 * 60 * 60 * 1000; // 1 día en milisegundos
    return Date.now() - this.createdAt > oneDayMs;
  }

  subscribe(ws: WebSocketLike): void {
    this.subscribers.set(ws.id, ws);
    ws.send(JSON.stringify({ 
      type: 'initialTime', 
      time: this.currentTime,
      state: this.state,
      timerId: this.timerId
    }));
  }

  unsubscribe(wsId: string): void {
    this.subscribers.delete(wsId);
    if (this.subscribers.size === 0 && this.state === 'running') {
      this.stopCountdown();
    }
  }

  private broadcastTime(): void {
    this.subscribers.forEach(ws => {
      ws.send(JSON.stringify({ 
        type: 'timeUpdate', 
        time: this.currentTime,
        state: this.state,
        timerId: this.timerId
      }));
    });
  }

  private broadcastEnd(): void {
    this.subscribers.forEach(ws => {
      ws.send(JSON.stringify({ 
        type: 'timerEnd', 
        message: 'Timer finished!',
        timerId: this.timerId
      }));
    });
  }

  startCountdown(interval: number = 1000): void {
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
    const oneDayMs = 24 * 60 * 60 * 1000;
    return {
      timerId: this.timerId,
      currentTime: this.currentTime,
      initialTime: this.initialTime,
      state: this.state,
      createdAt: this.createdAt,
      expiresAt: this.createdAt + oneDayMs,
      lastSaved: Date.now()
    };
  }
}

export class TimerManager {
  private timers: Map<string | number, TimerInstance> = new Map();
  private defaultTimerId: string | number = 0;
  private storageFile: string = './timers.json';
  private saveInterval: NodeJS.Timeout | null = null;

  constructor(defaultInitialTime: number = 60, storageFile?: string) {
    if (storageFile) {
      this.storageFile = storageFile;
    }
    
    // Cargar timers desde el archivo al inicializar
    this.loadFromFile().then(() => {
      // Crear timer por defecto si no existe
      if (!this.timers.has(this.defaultTimerId)) {
        this.getOrCreateTimer(this.defaultTimerId, defaultInitialTime);
      }
      
      // Limpiar timers expirados
      this.cleanupExpiredTimers();
      
      // Configurar guardado automático cada 30 segundos
      this.startAutoSave();
    }).catch(error => {
      console.error('Error loading timers from file:', error);
      // Si hay error, crear timer por defecto
      this.getOrCreateTimer(this.defaultTimerId, defaultInitialTime);
      this.startAutoSave();
    });
  }

  private async loadFromFile(): Promise<void> {
    try {
      if (!existsSync(this.storageFile)) {
        console.log('Timer storage file does not exist, starting fresh');
        return;
      }

      const fileContent = await readFileAsync(this.storageFile, 'utf8');
      const storage: TimerStorage = JSON.parse(fileContent);

      let loadedCount = 0;
      for (const [key, timerData] of Object.entries(storage.timers)) {
        // Verificar si el timer no ha expirado (1 día)
        if (Date.now() < timerData.expiresAt) {
          const timer = new TimerInstance(
            timerData.timerId,
            timerData.initialTime,
            timerData.currentTime,
            timerData.state,
            timerData.createdAt
          );
          
          // Configurar callback para cambios de estado
          timer.setOnStateChangeCallback((timerId) => {
            this.scheduleNextSave();
          });

          // Si estaba corriendo, lo pausamos por seguridad al recargar
          if (timerData.state === 'running') {
            timer.stopCountdown();
          }

          this.timers.set(timerData.timerId, timer);
          loadedCount++;
        }
      }

      console.log(`Loaded ${loadedCount} timers from storage`);
    } catch (error) {
      console.error('Error loading timers from file:', error);
      throw error;
    }
  }

  private async saveToFile(): Promise<void> {
    try {
      const storage: TimerStorage = {
        version: '1.0',
        timers: {},
        lastCleanup: Date.now()
      };

      // Solo guardar timers que no sean el default (ID 0) y que no hayan expirado
      for (const [timerId, timer] of this.timers.entries()) {
        if (timerId !== this.defaultTimerId && !timer.isExpired()) {
          storage.timers[timerId.toString()] = timer.toJSON();
        }
      }

      await writeFileAsync(this.storageFile, JSON.stringify(storage, null, 2));
      console.log(`Saved ${Object.keys(storage.timers).length} timers to storage`);
    } catch (error) {
      console.error('Error saving timers to file:', error);
    }
  }

  private startAutoSave(): void {
    // Guardar automáticamente cada 30 segundos
    this.saveInterval = setInterval(() => {
      this.saveToFile();
    }, 30000);
  }

  private scheduleNextSave(): void {
    // Guardar en los próximos 5 segundos después de un cambio
    setTimeout(() => {
      this.saveToFile();
    }, 5000);
  }

  private cleanupExpiredTimers(): void {
    const now = Date.now();
    const expiredTimers: (string | number)[] = [];

    for (const [timerId, timer] of this.timers.entries()) {
      if (timerId !== this.defaultTimerId && timer.isExpired()) {
        timer.stopCountdown();
        expiredTimers.push(timerId);
      }
    }

    expiredTimers.forEach(timerId => {
      this.timers.delete(timerId);
      console.log(`Removed expired timer: ${timerId}`);
    });

    if (expiredTimers.length > 0) {
      this.saveToFile(); // Guardar después de limpiar
    }
  }

  getOrCreateTimer(timerId: string | number, initialTime: number = 60): TimerInstance {
    if (!this.timers.has(timerId)) {
      console.log(`Creating new timer instance with ID: ${timerId}`);
      const timer = new TimerInstance(timerId, initialTime);
      
      // Configurar callback para cambios de estado
      timer.setOnStateChangeCallback((id) => {
        this.scheduleNextSave();
      });

      this.timers.set(timerId, timer);
      
      // Guardar inmediatamente si no es el timer por defecto
      if (timerId !== this.defaultTimerId) {
        this.scheduleNextSave();
      }
    }
    return this.timers.get(timerId)!;
  }

  getTimer(timerId: string | number = this.defaultTimerId): TimerInstance | undefined {
    return this.timers.get(timerId);
  }

  removeTimer(timerId: string | number): boolean {
    const timer = this.getTimer(timerId);
    if (timer && !timer.hasSubscribers() && timerId !== this.defaultTimerId) {
      timer.stopCountdown();
      const deleted = this.timers.delete(timerId);
      if (deleted) {
        this.scheduleNextSave();
      }
      return deleted;
    }
    return false;
  }

  // Método para forzar guardado manual
  async forceSave(): Promise<void> {
    await this.saveToFile();
  }

  // Método para obtener estadísticas
  getStats(): { total: number; running: number; stopped: number; completed: number; expired: number } {
    let running = 0, stopped = 0, completed = 0, expired = 0;

    for (const timer of this.timers.values()) {
      if (timer.isExpired()) {
        expired++;
      } else {
        switch (timer.getState()) {
          case 'running': running++; break;
          case 'stopped': stopped++; break;
          case 'completed': completed++; break;
        }
      }
    }

    return {
      total: this.timers.size,
      running,
      stopped,
      completed,
      expired
    };
  }

  // Limpiar recursos al cerrar la aplicación
  destroy(): void {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
    }
    
    // Guardar una última vez
    this.saveToFile().then(() => {
      console.log('Timer manager destroyed and data saved');
    });

    // Detener todos los timers
    for (const timer of this.timers.values()) {
      timer.stopCountdown();
    }
  }
}