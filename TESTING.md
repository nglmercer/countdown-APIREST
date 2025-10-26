# Testing Guide

This document provides comprehensive information about the testing setup and practices for the Elysia Timer Widget API.

## Overview

The testing suite is built using Bun's native testing capabilities, which provides a fast and modern testing experience for TypeScript projects. The test structure includes:

- **Unit Tests**: Test individual components in isolation
- **Integration Tests**: Test component interactions and API endpoints
- **Fixtures**: Reusable test data and utilities
- **Coverage Reports**: Comprehensive coverage analysis

## Test Structure

```
tests/
├── setup.ts              # Global test configuration
├── unit/                 # Unit tests
│   └── timer-manager.test.ts
├── integration/          # Integration tests
│   ├── http-routes.test.ts
│   └── websocket.test.ts
└── fixtures/             # Test data and utilities
    └── timer-fixtures.ts
```

## Running Tests

### Basic Commands

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test:watch

# Run tests with coverage
bun test:coverage

# Run only unit tests
bun test:unit

# Run only integration tests
bun test:integration

# Type checking without emitting files
bun run type-check
```

### Specific Test Files

```bash
# Run a specific test file
bun test tests/unit/timer-manager.test.ts

# Run tests matching a pattern
bun test --testNamePattern="should create timer"

# Run tests with verbose output
bun test --verbose
```

## Test Configuration

### Bun Configuration (bunfig.toml)

The testing configuration is defined in `bunfig.toml`:

```toml
[test]
preload = ["./tests/setup.ts"]
coverage = true
coverageDir = "./coverage"
coverageReporter = ["text", "html"]
testMatch = ["**/*.test.ts", "**/*.spec.ts"]
testTimeout = 10000
```

### TypeScript Configuration

The `tsconfig.json` is configured for optimal testing:

- **Target**: ES2022 for modern JavaScript features
- **Module Resolution**: Bundler for better import handling
- **Path Mapping**: Clean imports with `@/` aliases
- **Strict Type Checking**: Ensures type safety in tests

## Writing Tests

### Basic Test Structure

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';

describe('Component Name', () => {
  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    // Cleanup after each test
  });

  it('should do something', () => {
    // Arrange
    const input = 'test';

    // Act
    const result = someFunction(input);

    // Assert
    expect(result).toBe('expected');
  });
});
```

### Async Testing

```typescript
it('should handle async operations', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});
```

### Mocking

```typescript
// Mock a module
import { spyOn } from 'bun:test';

it('should mock console.log', () => {
  const logSpy = spyOn(console, 'log').mockImplementation(() => {});
  
  someFunction();
  
  expect(logSpy).toHaveBeenCalled();
  logSpy.mockRestore();
});
```

## Test Categories

### Unit Tests

Unit tests focus on testing individual components in isolation:

- **TimerManager**: Core timer management logic
- **TimerInstance**: Individual timer behavior
- **Services**: Business logic and utilities

Example:
```typescript
describe('TimerManager', () => {
  it('should create a timer', () => {
    const timerManager = new TimerManager();
    const timer = timerManager.getOrCreateTimer('test', 60);
    expect(timer.getId()).toBe('test');
  });
});
```

### Integration Tests

Integration tests test how components work together:

- **HTTP Routes**: API endpoint functionality
- **WebSocket**: Real-time communication
- **Database**: Storage operations (if applicable)

Example:
```typescript
describe('HTTP Routes', () => {
  it('should create timer via HTTP POST', async () => {
    const response = await fetch('/timers/test', {
      method: 'PUT',
      body: JSON.stringify({ time: 60 })
    });
    expect(response.status).toBe(200);
  });
});
```

## Fixtures and Utilities

### Using Fixtures

Fixtures provide reusable test data:

```typescript
import { timerFixtures, createMockTimer } from '../fixtures/timer-fixtures';

it('should use fixture data', () => {
  const timer = createMockTimer(
    timerFixtures.basicTimer.id,
    timerFixtures.basicTimer.initialTime
  );
  expect(timer.getId()).toBe('basic-timer');
});
```

### Test Utilities

Global utilities are available in tests:

```typescript
// Available globally
testUtils.createTestTimer('test-id', 60);
testUtils.wait(100); // Wait 100ms
testUtils.randomId(); // Generate random ID
```

## Best Practices

### Test Organization

1. **Descriptive Names**: Use clear, descriptive test names
2. **AAA Pattern**: Arrange, Act, Assert structure
3. **Single Responsibility**: Each test should verify one thing
4. **Independent Tests**: Tests should not depend on each other

### Assertions

1. **Specific Assertions**: Use the most specific matcher
2. **Message in Assertions**: Add custom messages for clarity
3. **Error Testing**: Test both success and error cases

```typescript
// Good
expect(result).toBe(expected);
expect(() => riskyOperation()).toThrow('Specific error message');

// Avoid
expect(result).toBeTruthy(); // Too generic
```

### Mocking Strategy

1. **Mock External Dependencies**: Only mock external services
2. **Minimal Mocking**: Mock only what's necessary
3. **Reset Mocks**: Clean up mocks between tests

```typescript
beforeEach(() => {
  jest.clearAllMocks();
});
```

## Coverage

### Coverage Thresholds

The project enforces minimum coverage thresholds:
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

### Coverage Reports

Generate detailed coverage reports:

```bash
bun test:coverage
```

Coverage reports are generated in:
- `coverage/` directory
- HTML report at `coverage/lcov-report/index.html`
- Text output in console
- LCOV format for CI integration

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun test:coverage
      - uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
```

## Performance Testing

### Load Testing

For performance-critical components:

```typescript
describe('Performance', () => {
  it('should handle many timers efficiently', async () => {
    const start = performance.now();
    
    for (let i = 0; i < 1000; i++) {
      timerManager.getOrCreateTimer(`perf-${i}`, 60);
    }
    
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(1000); // Should complete in < 1s
  });
});
```

### Memory Testing

```typescript
it('should not leak memory', () => {
  const initialMemory = process.memoryUsage().heapUsed;
  
  // Perform operations
  for (let i = 0; i < 1000; i++) {
    const timer = timerManager.getOrCreateTimer(`test-${i}`, 60);
    timerManager.removeTimer(`test-${i}`);
  }
  
  // Force garbage collection if available
  if (global.gc) global.gc();
  
  const finalMemory = process.memoryUsage().heapUsed;
  const increase = finalMemory - initialMemory;
  
  // Memory increase should be minimal
  expect(increase).toBeLessThan(1024 * 1024); // < 1MB
});
```

## Debugging Tests

### Debug Mode

Run tests with additional debugging:

```bash
# Verbose output
bun test --verbose

# Run specific test with debugger
bun --inspect test tests/unit/timer-manager.test.ts

# Node inspector
bun test --inspect-brk
```

### Common Issues

1. **Test Timing**: Use proper async/await and wait for operations
2. **Mock Cleanup**: Ensure mocks are properly reset
3. **Resource Cleanup**: Clean up timers, intervals, and connections
4. **Test Isolation**: Ensure tests don't share state

## Troubleshooting

### Common Test Failures

1. **Import Errors**: Check TypeScript configuration and module resolution
2. **Timeout Errors**: Increase timeout or fix async operations
3. **Mock Errors**: Verify mock setup and cleanup
4. **Coverage Issues**: Check exclude patterns and thresholds

### Running Individual Tests

```bash
# Run specific describe block
bun test -t "TimerManager"

# Run specific test
bun test -t "should create timer"

# Run tests matching pattern
bun test --testNamePattern="create.*timer"
```

## Contributing Tests

When adding new features:

1. **Write Tests First**: Consider test-driven development
2. **Test Coverage**: Ensure new code is fully covered
3. **Integration Tests**: Add integration tests for API changes
4. **Documentation**: Update this testing guide as needed

### Test Checklist

- [ ] Unit tests for new functions/classes
- [ ] Integration tests for API endpoints
- [ ] Error case testing
- [ ] Performance considerations
- [ ] Updated fixtures if needed
- [ ] Coverage thresholds maintained

## Resources

- [Bun Testing Documentation](https://bun.sh/docs/cli/test)
- [Jest Matchers Reference](https://jestjs.io/docs/using-matchers)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [TypeScript Testing Guide](https://basarat.gitbook.io/typescript/testing)