// tests/setup.ts
import { beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';

// Global test configuration
beforeAll(() => {
  console.log('🧪 Starting test suite...');

  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.API_PORT = '0'; // Use random available port for testing

  // Mock console methods to reduce noise during tests
  if (process.env.SILENT_TESTS === 'true') {
    global.console = {
      ...console,
      log: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
    };
  }
});

afterAll(() => {
  console.log('✅ Test suite completed');

  // Clean up test environment
  process.env.NODE_ENV = 'development';
});

beforeEach(() => {
  // Reset any global state before each test
});

afterEach(() => {
  // Clean up after each test
});

// Global test utilities
export const testUtils = {
  // Helper to create test timer data
  createTestTimer: (id: string | number = 'test-timer', time: number = 60) => ({
    id,
    time,
    state: 'stopped' as const,
  }),

  // Helper to create WebSocket test message
  createWsMessage: (action: string, value?: number) => ({
    action,
    value,
  }),

  // Helper to wait for async operations
  wait: (ms: number = 100) => new Promise(resolve => setTimeout(resolve, ms)),

  // Helper to generate random test data
  randomId: () => Math.random().toString(36).substr(2, 9),

  // Helper to create test HTTP response object
  createMockResponse: () => {
    const headers = new Map();
    let status = 200;

    return {
      status: (code: number) => {
        status = code;
        return { status };
      },
      setHeader: (key: string, value: string) => {
        headers.set(key, value);
      },
      getHeaders: () => Object.fromEntries(headers),
      getStatus: () => status,
    };
  },
};

// Make test utils globally available
declare global {
  const testUtils: typeof testUtils;
}

// Assign to global
(global as any).testUtils = testUtils;

// Type declarations for test environment
declare global {
  namespace jest {
    interface Matchers<R> {
      // Custom matchers can be added here
    }
  }
}
