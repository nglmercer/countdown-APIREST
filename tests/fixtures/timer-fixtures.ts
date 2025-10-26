// tests/fixtures/timer-fixtures.ts
import { TimerInstance } from '../../src/core/timer-instance';
import { TimerStats } from '../../src/types/timer.types';

// Mock timer instance for testing
export const createMockTimer = (
  id: string | number = 'test-timer',
  initialTime: number = 60,
  currentTime: number = 60,
  state: 'running' | 'stopped' | 'completed' = 'stopped'
): Partial<TimerInstance> => ({
  getId: () => id,
  getTime: () => currentTime,
  setTime: jest.fn(),
  getState: () => state,
  startCountdown: jest.fn(),
  stopCountdown: jest.fn(),
  reset: jest.fn(),
  add: jest.fn(),
  subtract: jest.fn(),
  multiply: jest.fn(),
  divide: jest.fn(),
  hasSubscribers: jest.fn(() => false),
  getSubscriberCount: jest.fn(() => 0),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
  isExpired: jest.fn(() => false),
  getStatus: jest.fn(() => ({
    timerId: id,
    currentTime,
    state,
    initialTime,
    createdAt: Date.now(),
    subscriberCount: 0,
  })),
  toJSON: jest.fn(() => ({
    timerId: id,
    initialTime,
    currentTime,
    state,
    createdAt: Date.now(),
    expiresAt: Date.now() + 86400000, // 24 hours from now
  })),
});

// Test data fixtures
export const timerFixtures = {
  // Basic timer configurations
  basicTimer: {
    id: 'basic-timer',
    initialTime: 60,
    currentTime: 60,
    state: 'stopped' as const,
  },

  runningTimer: {
    id: 'running-timer',
    initialTime: 120,
    currentTime: 45,
    state: 'running' as const,
  },

  completedTimer: {
    id: 'completed-timer',
    initialTime: 30,
    currentTime: 0,
    state: 'completed' as const,
  },

  // Numeric ID timers
  numericTimer: {
    id: 12345,
    initialTime: 90,
    currentTime: 90,
    state: 'stopped' as const,
  },

  zeroTimer: {
    id: 'zero-timer',
    initialTime: 0,
    currentTime: 0,
    state: 'stopped' as const,
  },

  // Timer with subscribers
  subscribedTimer: {
    id: 'subscribed-timer',
    initialTime: 60,
    currentTime: 30,
    state: 'running' as const,
    subscriberCount: 3,
  },
};

// WebSocket message fixtures
export const wsMessageFixtures = {
  start: { action: 'start' },
  stop: { action: 'stop' },
  setTime: { action: 'setTime', value: 120 },
  addTime: { action: 'addTime', value: 30 },
  restTime: { action: 'restTime', value: 15 },
  multiply: { action: 'multiply', factor: 2 },
  divide: { action: 'divide', divisor: 3 },
  reset: { action: 'reset' },
  getTime: { action: 'getTime' },

  // Invalid messages
  invalidAction: { action: 'invalidAction' },
  negativeTime: { action: 'setTime', value: -10 },
  zeroDivisor: { action: 'divide', divisor: 0 },
  negativeFactor: { action: 'multiply', factor: -2 },
  missingValue: { action: 'setTime' },
  extraFields: { action: 'start', extra: 'field', another: 123 },
};

// HTTP request/response fixtures
export const httpFixtures = {
  // PUT /timers/:timerId
  createTimer: {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ time: 60 }),
  },

  // PATCH operations
  addTime: {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ seconds: 30 }),
  },

  subtractTime: {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ seconds: 15 }),
  },

  multiplyTime: {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ factor: 2 }),
  },

  divideTime: {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ divisor: 3 }),
  },

  // POST operations
  pause: {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  },

  resume: {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  },

  // Invalid requests
  invalidJson: {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: 'invalid json',
  },

  missingFields: {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}), // Missing time field
  },

  negativeTime: {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ time: -10 }),
  },
};

// Statistics fixtures
export const statsFixtures: TimerStats = {
  total: 5,
  running: 2,
  stopped: 2,
  completed: 1,
  expired: 0,
};

// Edge case fixtures
export const edgeCaseFixtures = {
  // Timer IDs
  emptyStringId: '',
  numericStringId: '12345',
  negativeNumericId: '-1',
  zeroNumericId: '0',
  decimalStringId: '123.45',
  alphanumericId: 'timer-123-abc',
  veryLongId: 'a'.repeat(1000),
  specialCharsId: 'timer@#$%^&*()',
  unicodeId: '⏰-timer-🕐',

  // Time values
  maxSafeInteger: Number.MAX_SAFE_INTEGER,
  minSafeInteger: Number.MIN_SAFE_INTEGER,
  infinity: Infinity,
  negativeInfinity: -Infinity,
  notANumber: NaN,

  // Array of test timer IDs
  variedTimerIds: [
    'simple',
    '123',
    'timer-with-dashes',
    'timer_with_underscores',
    'timer.with.dots',
    'TIMER-UPPERCASE',
    'timer-with-numbers-123',
    '0',
    '-1',
    '123.45',
    '⏰emoji-timer🕐',
    '',
  ],
};

// Performance test fixtures
export const performanceFixtures = {
  // Large number of timers for stress testing
  manyTimers: Array.from({ length: 1000 }, (_, i) => ({
    id: `perf-timer-${i}`,
    initialTime: 60,
    currentTime: Math.floor(Math.random() * 60),
    state: ['running', 'stopped', 'completed'][Math.floor(Math.random() * 3)] as 'running' | 'stopped' | 'completed',
  })),

  // Rapid test operations
  rapidOperations: {
    iterations: 1000,
    delay: 1, // milliseconds between operations
  },

  // Memory stress test
  memoryStress: {
    timerCount: 10000,
    subscriberCount: 100,
  },
};

// Response validation helpers
export const responseValidators = {
  validateTimerResponse: (response: any, expectedId?: string | number) => {
    expect(response).toBeDefined();
    expect(response.success).toBe(true);
    expect(response.timerId).toBeDefined();
    if (expectedId) {
      expect(response.timerId).toBe(expectedId);
    }
    expect(response.currentTime).toBeDefined();
    expect(typeof response.currentTime).toBe('number');
    expect(response.state).toBeDefined();
    expect(['running', 'stopped', 'completed']).toContain(response.state);
  },

  validateErrorResponse: (response: any, expectedMessage?: string) => {
    expect(response).toBeDefined();
    expect(response.success).toBe(false);
    expect(response.error).toBeDefined();
    if (expectedMessage) {
      expect(response.error).toContain(expectedMessage);
    }
  },

  validateStatsResponse: (response: any) => {
    expect(response).toBeDefined();
    expect(response.success).toBe(true);
    expect(response.total).toBeDefined();
    expect(response.running).toBeDefined();
    expect(response.stopped).toBeDefined();
    expect(response.completed).toBeDefined();
    expect(response.expired).toBeDefined();
    expect(typeof response.total).toBe('number');
    expect(typeof response.running).toBe('number');
    expect(typeof response.stopped).toBe('number');
    expect(typeof response.completed).toBe('number');
    expect(typeof response.expired).toBe('number');
  },

  validateWsMessage: (message: any, expectedType: string) => {
    expect(message).toBeDefined();
    expect(message.type).toBe(expectedType);
    expect(typeof message.timerId).toBeDefined();
  },
};

// Utility functions for fixtures
export const fixtureUtils = {
  // Create timer with random data
  randomTimer: () => {
    const states: ('running' | 'stopped' | 'completed')[] = ['running', 'stopped', 'completed'];
    const id = Math.random().toString(36).substr(2, 9);
    const initialTime = Math.floor(Math.random() * 300) + 1; // 1-300 seconds
    const currentTime = Math.floor(Math.random() * (initialTime + 1));
    const state = states[Math.floor(Math.random() * states.length)];

    return { id, initialTime, currentTime, state };
  },

  // Create WebSocket message with random action
  randomWsMessage: () => {
    const actions = ['start', 'stop', 'setTime', 'addTime', 'reset', 'getTime'];
    const action = actions[Math.floor(Math.random() * actions.length)];
    const message: any = { action };

    if (action === 'setTime' || action === 'addTime') {
      message.value = Math.floor(Math.random() * 200) + 1;
    }

    return message;
  },

  // Generate test timer IDs
  generateTestIds: (count: number): Array<string | number> => {
    const ids: Array<string | number> = [];

    for (let i = 0; i < count; i++) {
      if (i % 3 === 0) {
        ids.push(`test-timer-${i}`);
      } else if (i % 3 === 1) {
        ids.push((i * 100).toString());
      } else {
        ids.push(i * 100);
      }
    }

    return ids;
  },

  // Wait for a specified duration
  wait: (ms: number = 100): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  // Create a timer that expires in the specified duration
  createExpiringTimer: (id: string | number, duration: number) => {
    return {
      id,
      initialTime: duration,
      currentTime: duration,
      state: 'running' as const,
      createdAt: Date.now(),
      expiresAt: Date.now() + duration,
    };
  },
};
