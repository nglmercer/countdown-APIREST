// utils/timer.utils.ts

import { TIMER_CONSTANTS } from '../constants/timer.constants';

export class TimerUtils {
  static validateTime(time: number): void {
    if (time < 0) {
      throw new Error('Time cannot be negative.');
    }
  }

  static validateSeconds(seconds: number, operation: string): void {
    if (seconds < 0) {
      throw new Error(`Cannot ${operation} negative seconds.`);
    }
  }

  static isExpired(createdAt: number): boolean {
    return Date.now() - createdAt > TIMER_CONSTANTS.ONE_DAY_MS;
  }

  static calculateExpirationTime(createdAt: number): number {
    return createdAt + TIMER_CONSTANTS.ONE_DAY_MS;
  }

  static formatTimerLog(timerId: string | number, action: string, currentTime: number): string {
    return `Timer ${timerId} ${action}: ${currentTime} seconds`;
  }

  static formatSecondsLog(seconds: number, action: string, timerId: string | number, currentTime: number): string {
    return `${seconds} seconds ${action} timer ${timerId}. Current time: ${currentTime} seconds`;
  }
}