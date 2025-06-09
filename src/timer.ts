// index.ts - Archivo principal de exportación

// Exportar tipos
export * from './types/timer.types';

// Exportar constantes
export * from './constants/timer.constants';

// Exportar utilidades
export * from './utils/timer.utils';

// Exportar servicios
export * from './services/storage.service';

// Exportar clases principales
export * from './core/timer-instance';
export * from './core/timer-manager';

// Exportación por defecto del TimerManager
export { TimerManager as default } from './core/timer-manager';