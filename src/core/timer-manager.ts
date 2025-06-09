// core/timer-manager.ts

import { TimerInstance } from './timer-instance';
import { StorageService } from '../services/storage.service';
import { TimerStats } from '../types/timer.types';
import { TIMER_CONSTANTS } from '../constants/timer.constants';

export class TimerManager {
  private timers: Map<string | number, TimerInstance> = new Map();
  private defaultTimerId: string | number = TIMER_CONSTANTS.DEFAULT_TIMER_ID;
  private saveInterval: NodeJS.Timeout | null = null;
  private storageService: StorageService;

  constructor(defaultInitialTime: number = TIMER_CONSTANTS.DEFAULT_INITIAL_TIME, storageFile?: string) {
    this.storageService = new StorageService(storageFile);
    this.initializeManager(defaultInitialTime);
  }

  private async initializeManager(defaultInitialTime: number): Promise<void> {
    try {
      await this.loadFromFile();
      
      // Crear timer por defecto si no existe
      if (!this.timers.has(this.defaultTimerId)) {
        this.getOrCreateTimer(this.defaultTimerId, defaultInitialTime);
      }
      
      // Limpiar timers expirados
      this.cleanupExpiredTimers();
      
      // Configurar guardado automático
      this.startAutoSave();
    } catch (error) {
      console.error('Error initializing timer manager:', error);
      // Si hay error, crear timer por defecto
      this.getOrCreateTimer(this.defaultTimerId, defaultInitialTime);
      this.startAutoSave();
    }
  }

  private async loadFromFile(): Promise<void> {
    const storage = await this.storageService.loadTimers();
    
    if (!storage) {
      return;
    }

    let loadedCount = 0;
    for (const [key, timerData] of Object.entries(storage.timers)) {
      // Verificar si el timer no ha expirado
      if (Date.now() < timerData.expiresAt) {
        const timer = new TimerInstance(
          timerData.timerId,
          timerData.initialTime,
          timerData.currentTime,
          timerData.state,
          timerData.createdAt
        );
        
        // Si estaba corriendo, lo pausamos por seguridad al recargar
        if (timerData.state === 'running') {
          timer.stopCountdown();
        }

        this.timers.set(timerData.timerId, timer);
        loadedCount++;
      }
    }

    console.log(`Loaded ${loadedCount} timers from storage`);
  }

  private async saveToFile(): Promise<void> {
    const timersData: Record<string, any> = {};

    // Solo guardar timers que no sean el default y que no hayan expirado
    for (const [timerId, timer] of this.timers.entries()) {
      if (timerId !== this.defaultTimerId && !timer.isExpired()) {
        timersData[timerId.toString()] = timer.toJSON();
      }
    }

    await this.storageService.saveTimers(timersData);
  }

  private startAutoSave(): void {
    this.saveInterval = setInterval(() => {
      this.saveToFile();
    }, TIMER_CONSTANTS.AUTO_SAVE_INTERVAL);
  }

  private scheduleNextSave(): void {
    setTimeout(() => {
      this.saveToFile();
    }, TIMER_CONSTANTS.DELAYED_SAVE_TIMEOUT);
  }

  private cleanupExpiredTimers(): void {
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
      this.saveToFile();
    }
  }

  getOrCreateTimer(timerId: string | number, initialTime: number = TIMER_CONSTANTS.DEFAULT_INITIAL_TIME): TimerInstance {
    if (!this.timers.has(timerId)) {
      console.log(`Creating new timer instance with ID: ${timerId}`);
      const timer = new TimerInstance(timerId, initialTime);
      
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

  async forceSave(): Promise<void> {
    await this.saveToFile();
  }

  getStats(): TimerStats {
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
export const timerManager = new TimerManager();
