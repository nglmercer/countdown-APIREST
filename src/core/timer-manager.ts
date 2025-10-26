// core/timer-manager.ts

import { TimerInstance } from "./timer-instance";
import { StorageService } from "../services/storage.service";
import { TimerStats } from "../types/timer.types";
import { TIMER_CONSTANTS } from "../constants/timer.constants";

// Helper function to check if a string is a valid integer
function isIntegerString(str: string): boolean {
  return /^-?\d+$/.test(str);
}

export class TimerManager {
  private timers: Map<string | number, TimerInstance> = new Map();
  private defaultTimerId: string | number = TIMER_CONSTANTS.DEFAULT_TIMER_ID;
  private saveInterval: NodeJS.Timeout | null = null;
  private storageService: StorageService;

  constructor(
    defaultInitialTime: number = TIMER_CONSTANTS.DEFAULT_INITIAL_TIME,
    storageFile?: string,
  ) {
    this.storageService = new StorageService(storageFile);
    // Inicializar sincrónicamente primero
    this.syncInitialize(defaultInitialTime);
    // Luego cargar datos de forma asíncrona
    this.initializeManager(defaultInitialTime);
  }

  private syncInitialize(defaultInitialTime: number): void {
    // Crear timer por defecto inmediatamente
    const defaultTimer = new TimerInstance(
      this.defaultTimerId,
      defaultInitialTime,
    );
    this.timers.set(this.defaultTimerId, defaultTimer);
  }

  private async initializeManager(defaultInitialTime: number): Promise<void> {
    try {
      await this.loadFromFile();

      // Verificar que el timer por defecto sigue existiendo
      if (!this.timers.has(this.defaultTimerId)) {
        this.syncInitialize(defaultInitialTime);
      }

      // Limpiar timers expirados
      this.cleanupExpiredTimers();

      // Configurar guardado automático
      this.startAutoSave();
    } catch (error) {
      // Si hay error, asegurar que tenemos al menos el timer por defecto
      if (!this.timers.has(this.defaultTimerId)) {
        this.syncInitialize(defaultInitialTime);
      }
      this.startAutoSave();
    }
  }

  private async loadFromFile(): Promise<void> {
    const storage = await this.storageService.loadTimers();

    if (!storage) {
      return;
    }

    let loadedCount = 0;
    for (const [, timerData] of Object.entries(storage.timers)) {
      // Verificar si el timer no ha expirado
      if (Date.now() < timerData.expiresAt) {
        const timer = new TimerInstance(
          timerData.timerId,
          timerData.initialTime,
          timerData.currentTime,
          timerData.state,
          timerData.createdAt,
        );

        // Si estaba corriendo, lo pausamos por seguridad al recargar
        if (timerData.state === "running") {
          timer.stopCountdown();
        }

        this.timers.set(timerData.timerId, timer);
        loadedCount++;
      }
    }
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
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
    }
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

    expiredTimers.forEach((timerId) => {
      this.timers.delete(timerId);
    });

    if (expiredTimers.length > 0) {
      this.saveToFile();
    }
  }

  getOrCreateTimer(
    timerId: string | number,
    initialTime: number = TIMER_CONSTANTS.DEFAULT_INITIAL_TIME,
  ): TimerInstance {
    // Normalizar el timerId para la búsqueda y creación
    let normalizedTimerId = timerId;

    // Solo convertir strings que son enteros válidos a numbers
    if (typeof timerId === "string" && isIntegerString(timerId)) {
      normalizedTimerId = Number(timerId);
    }

    // Buscar el timer (intentar con ambos tipos)
    let timer = this.timers.get(normalizedTimerId);
    if (!timer && typeof normalizedTimerId === "number") {
      // Si no se encontró como number, intentar como string
      timer = this.timers.get(normalizedTimerId.toString());
    } else if (!timer && typeof normalizedTimerId === "string") {
      // Si no se encontró como string y es un entero válido, intentar como number
      if (isIntegerString(normalizedTimerId)) {
        const numericId = Number(normalizedTimerId);
        timer = this.timers.get(numericId);
      }
    }

    // Si no existe, crear uno nuevo
    if (!timer) {
      timer = new TimerInstance(normalizedTimerId, initialTime);
      this.timers.set(normalizedTimerId, timer);

      // Guardar inmediatamente si no es el timer por defecto
      if (normalizedTimerId !== this.defaultTimerId) {
        this.scheduleNextSave();
      }
    }

    return timer;
  }

  getTimer(
    timerId: string | number = this.defaultTimerId,
  ): TimerInstance | undefined {
    // Usar la misma lógica de normalización que getOrCreateTimer
    let normalizedTimerId = timerId;

    // Solo convertir strings que son enteros válidos a numbers
    if (typeof timerId === "string" && isIntegerString(timerId)) {
      normalizedTimerId = Number(timerId);
    }

    let timer = this.timers.get(normalizedTimerId);
    if (!timer && typeof normalizedTimerId === "number") {
      // Si no se encontró como number, intentar como string
      timer = this.timers.get(normalizedTimerId.toString());
    } else if (!timer && typeof normalizedTimerId === "string") {
      // Si no se encontró como string y es un entero válido, intentar como number
      if (isIntegerString(normalizedTimerId)) {
        const numericId = Number(normalizedTimerId);
        timer = this.timers.get(numericId);
      }
    }

    return timer;
  }

  removeTimer(timerId: string | number): boolean {
    const timer = this.getTimer(timerId);
    if (timer && !timer.hasSubscribers() && timerId !== this.defaultTimerId) {
      timer.stopCountdown();

      // Intentar eliminar con ambos tipos de key
      let deleted = this.timers.delete(timerId);
      if (!deleted && typeof timerId === "number") {
        deleted = this.timers.delete(timerId.toString());
      } else if (!deleted && typeof timerId === "string") {
        const numericId = Number(timerId);
        if (!isNaN(numericId)) {
          deleted = this.timers.delete(numericId);
        }
      }

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
    let running = 0,
      stopped = 0,
      completed = 0,
      expired = 0;

    for (const timer of this.timers.values()) {
      if (timer.isExpired()) {
        expired++;
      } else {
        switch (timer.getState()) {
          case "running":
            running++;
            break;
          case "stopped":
            stopped++;
            break;
          case "completed":
            completed++;
            break;
        }
      }
    }

    return {
      total: this.timers.size,
      running,
      stopped,
      completed,
      expired,
    };
  }

  // Método para debugging
  debug(): void {
    // Debug info available if needed, but don't log by default
  }

  getAllTimers(): TimerInstance[] {
    return Array.from(this.timers.values());
  }

  destroy(): void {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
    }

    // Guardar una última vez
    this.saveToFile().catch(() => {
      // Silently handle save errors during destroy
    });

    // Detener todos los timers
    for (const timer of this.timers.values()) {
      timer.stopCountdown();
    }
  }
}
