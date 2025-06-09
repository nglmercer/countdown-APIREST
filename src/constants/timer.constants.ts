// constants/timer.constants.ts

export const TIMER_CONSTANTS = {
    DEFAULT_INITIAL_TIME: 60,
    DEFAULT_INTERVAL: 1000,
    ONE_DAY_MS: 24 * 60 * 60 * 1000,
    AUTO_SAVE_INTERVAL: 30000, // 30 segundos
    DELAYED_SAVE_TIMEOUT: 5000, // 5 segundos
    DEFAULT_TIMER_ID: 0,
    STORAGE_VERSION: '1.0',
    DEFAULT_STORAGE_FILE: './timers.json'
  } as const;