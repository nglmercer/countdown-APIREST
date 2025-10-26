# Contributing to Timer API

Thank you for your interest in contributing to the Timer API project! This guide will help you get started with contributing code, documentation, or other improvements.

## 🤝 How to Contribute

### Reporting Issues

1. **Search existing issues** first to avoid duplicates
2. Use the appropriate issue template:
   - 🐛 Bug Report for issues and unexpected behavior
   - 💡 Feature Request for new functionality
   - 📚 Documentation for documentation improvements
   - 🎨 Enhancement for performance or code quality improvements

### Submitting Pull Requests

1. **Fork the repository** and create a feature branch
2. **Make your changes** following our coding standards
3. **Test thoroughly** (include unit tests when applicable)
4. **Update documentation** if needed
5. **Submit a pull request** with a clear description

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) v1.0.0 or higher
- [Node.js](https://nodejs.org/) v16 or higher (for some dev tools)
- Git for version control
- A code editor with TypeScript support

### Development Setup

1. **Fork and clone the repository:**
   ```bash
   git clone https://github.com/your-username/countdown-APIREST.git
   cd countdown-APIREST
   ```

2. **Install dependencies:**
   ```bash
   bun install
   ```

3. **Start development server:**
   ```bash
   bun run dev
   ```

4. **Run tests to ensure everything works:**
   ```bash
   bun test
   ```

### Development Workflow

1. **Create a new branch** for your feature or fix:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/issue-number-description
   ```

2. **Make your changes** following our coding standards

3. **Run tests frequently:**
   ```bash
   bun test
   bun run type-check
   bun run lint
   ```

4. **Commit your changes** with meaningful messages:
   ```bash
   git add .
   git commit -m "feat: add timer multiplication feature"
   ```

5. **Push to your fork:**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a pull request** with a detailed description

## 📝 Coding Standards

### Code Style

We use automated tools to maintain code consistency:

- **ESLint** for linting (`bun run lint`)
- **Prettier** for formatting (`bun run format`)
- **TypeScript** for type safety (`bun run type-check`)

### Naming Conventions

- **Files**: kebab-case (`timer-manager.ts`, `websocket-handler.ts`)
- **Classes**: PascalCase (`TimerManager`, `WebSocketHandler`)
- **Functions/Variables**: camelCase (`createTimer`, `currentTime`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_TIMER_DURATION`, `MAX_CONNECTIONS`)
- **Interfaces**: PascalCase with `I` prefix optional (`TimerData`, `WebSocketMessage`)

### Code Organization

```
src/
├── constants/     # Configuration constants
├── core/          # Core business logic
├── services/      # External service integrations
├── types/         # TypeScript type definitions
├── utils/         # Utility functions
├── middleware/    # Custom middleware
├── routes/        # Route definitions
└── index.ts       # Application entry point
```

### TypeScript Guidelines

- **Strict mode enabled**: All TypeScript strict rules are enforced
- **Explicit returns**: Always specify return types for public functions
- **No any types**: Use proper TypeScript types instead of `any`
- **Interface over type**: Prefer interfaces for object shapes
- **Enums for constants**: Use enums for related constant values

### Example Code Structure

```typescript
// src/services/example-service.ts
import { Logger } from '../utils/logger';
import { ExampleData, ExampleConfig } from '../types/example.types';

export class ExampleService {
  private config: ExampleConfig;
  private logger = Logger.getInstance();

  constructor(config: ExampleConfig) {
    this.config = config;
  }

  /**
   * Process example data
   * @param data - The data to process
   * @returns Promise<ExampleData>
   */
  public async processData(data: ExampleData): Promise<ExampleData> {
    try {
      this.logger.info('Processing data', { id: data.id });
      
      // Implementation here
      const processed = { ...data, processed: true };
      
      this.logger.info('Data processed successfully', { id: data.id });
      return processed;
    } catch (error) {
      this.logger.error('Failed to process data', { error, data });
      throw new Error(`Processing failed: ${error.message}`);
    }
  }
}
```

## 🧪 Testing

### Test Structure

```
tests/
├── unit/          # Unit tests for individual functions
├── integration/   # Integration tests for components
├── e2e/          # End-to-end tests
└── fixtures/     # Test data and helpers
```

### Writing Tests

- **Unit tests**: Test individual functions and classes in isolation
- **Integration tests**: Test component interactions
- **E2E tests**: Test complete user scenarios

### Test Examples

```typescript
// tests/unit/timer-manager.test.ts
import { describe, it, expect, beforeEach } from 'bun:test';
import { TimerManager } from '../../src/core/timer-manager';

describe('TimerManager', () => {
  let timerManager: TimerManager;

  beforeEach(() => {
    timerManager = new TimerManager();
  });

  it('should create a new timer', () => {
    const timer = timerManager.createTimer('test-timer', 60);
    
    expect(timer.getId()).toBe('test-timer');
    expect(timer.getTime()).toBe(60);
    expect(timer.getState()).toBe('stopped');
  });

  it('should return null for non-existent timer', () => {
    const timer = timerManager.getTimer('non-existent');
    expect(timer).toBeNull();
  });
});
```

### Running Tests

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test --watch

# Run tests with coverage
bun test --coverage

# Run only unit tests
bun test tests/unit/

# Run specific test file
bun test tests/unit/timer-manager.test.ts
```

## 📚 Documentation Contributions

### Documentation Types

- **API Documentation**: Endpoint descriptions and examples
- **Architecture Docs**: System design and technical decisions
- **User Guides**: How-to documentation and tutorials
- **Code Comments**: Inline documentation for complex logic

### Documentation Style

- **Clear and concise**: Use simple, direct language
- **Include examples**: Show, don't just tell
- **Code blocks**: Use proper syntax highlighting
- **Cross-references**: Link to related documentation
- **Version-specific**: Note version requirements

### Example Documentation

```markdown
## Timer Creation

Creates a new timer with the specified duration.

### Usage

```javascript
const response = await fetch('/timers/my-timer', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ time: 300 })
});

const timer = await response.json();
console.log(timer); // { success: true, currentTime: 300, ... }
```

### Parameters

- `timerId` (string): Unique identifier for the timer
- `time` (number): Initial time in seconds (must be positive)

### Response

Returns a timer object with the following properties:
- `success` (boolean): Whether the operation succeeded
- `currentTime` (number): Current timer time in seconds
- `state` (string): Current timer state
```

## 🔍 Review Process

### Pull Request Checklist

Before submitting a PR, ensure:

- [ ] Code follows our style guidelines
- [ ] All tests pass (`bun test`)
- [ ] TypeScript compilation succeeds (`bun run type-check`)
- [ ] Linting passes (`bun run lint`)
- [ ] Documentation is updated if needed
- [ ] Commit messages follow conventional commits
- [ ] PR description is clear and detailed

### Review Guidelines

Reviewers should check:

- **Code quality**: Is the code clean and maintainable?
- **Functionality**: Does it work as expected?
- **Performance**: Any performance implications?
- **Security**: Any security concerns?
- **Tests**: Are tests adequate and passing?
- **Documentation**: Is documentation clear and accurate?

## 📋 Commit Message Guidelines

We use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements

### Examples

```bash
feat(timers): add multiplication operation
fix(websocket): handle connection timeouts properly
docs(api): update timer creation examples
test(timer-manager): add edge case tests
refactor(persistence): improve error handling
```

## 🚀 Release Process

### Version Management

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Checklist

1. **Update version** in package.json
2. **Update CHANGELOG.md** with version changes
3. **Create release tag**: `git tag v1.2.3`
4. **Push tag**: `git push origin v1.2.3`
5. **Create GitHub release** with changelog
6. **Deploy to production** (if applicable)

## 🏆 Recognition

### Contributor Recognition

We value all contributions! Contributors are recognized through:

- **GitHub contributors list** on the repository
- **Release notes** mentioning significant contributions
- **Special badges** for consistent contributors
- **Community highlights** in project communications

### Ways to Contribute

Not just code! You can contribute by:

- 🐛 Reporting bugs
- 💡 Suggesting features
- 📚 Improving documentation
- 🧪 Writing tests
- 🎨 Design improvements
- 🌍 Translations
- 📢 Community support

## ❓ Questions?

If you have questions about contributing:

1. **Check existing issues** and documentation
2. **Create a discussion** on GitHub for general questions
3. **Join our community** (Discord/Slack if available)
4. **Contact maintainers** for specific questions

## 📜 Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please:

- Be respectful and considerate
- Use inclusive language
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Report inappropriate behavior

Thank you for contributing to the Timer API project! Your contributions help make this project better for everyone.