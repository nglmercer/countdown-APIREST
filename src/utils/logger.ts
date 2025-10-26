// src/utils/logger.ts

/**
 * Logging utility with environment-based disable support
 */

// Check if logs are disabled via environment variable
const DISABLE_LOGS = process.env.DISABLE_LOGS === 'true';

/**
 * Logger utility that respects DISABLE_LOGS environment variable
 */
export class Logger {
  private static instance: Logger;
  private disabled: boolean;

  private constructor() {
    this.disabled = DISABLE_LOGS;
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public setDisabled(disabled: boolean): void {
    this.disabled = disabled;
  }

  public log(...args: any[]): void {
    if (!this.disabled) {
      console.log(...args);
    }
  }

  public error(...args: any[]): void {
    if (!this.disabled) {
      console.error(...args);
    }
  }

  public warn(...args: any[]): void {
    if (!this.disabled) {
      console.warn(...args);
    }
  }

  public info(...args: any[]): void {
    if (!this.disabled) {
      console.info(...args);
    }
  }

  public debug(...args: any[]): void {
    if (!this.disabled) {
      console.log('[DEBUG]', ...args);
    }
  }
}

// Export singleton instance for easy use
export const logger = Logger.getInstance();

// Export convenience functions
export const log = (...args: any[]) => logger.log(...args);
export const error = (...args: any[]) => logger.error(...args);
export const warn = (...args: any[]) => logger.warn(...args);
export const info = (...args: any[]) => logger.info(...args);
export const debug = (...args: any[]) => logger.debug(...args);
