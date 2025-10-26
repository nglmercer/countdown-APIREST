# Architecture and System Design

This document provides a comprehensive overview of the Timer API's architecture, design patterns, and technical decisions.

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Patterns](#architecture-patterns)
3. [Component Architecture](#component-architecture)
4. [Data Flow](#data-flow)
5. [Core Components](#core-components)
6. [Design Patterns](#design-patterns)
7. [Scalability Considerations](#scalability-considerations)
8. [Performance Optimization](#performance-optimization)
9. [Fault Tolerance](#fault-tolerance)
10. [Technology Stack](#technology-stack)

## System Overview

The Timer API is a distributed, real-time system designed to manage multiple countdown timers with millisecond precision. It combines RESTful HTTP endpoints with WebSocket communication to provide both synchronous and asynchronous timer operations.

### Key Design Principles

- **Single Responsibility**: Each component has a well-defined, single purpose
- **Loose Coupling**: Components communicate through well-defined interfaces
- **High Cohesion**: Related functionality is grouped together
- **Scalability**: Designed to handle thousands of concurrent timers
- **Real-time**: WebSocket integration for instant updates
- **Fault Tolerance**: Graceful degradation and error handling

## Architecture Patterns

### 1. Layered Architecture

The system follows a classic layered architecture pattern:

```
┌─────────────────────────────────────┐
│           Presentation Layer        │  ← HTTP/WebSocket Handlers
├─────────────────────────────────────┤
│            Business Layer           │  ← Timer Logic & Management
├─────────────────────────────────────┤
│            Data Layer               │  ← Persistence & Storage
├─────────────────────────────────────┤
│         Infrastructure Layer        │  ← Networking & Utilities
└─────────────────────────────────────┘
```

### 2. Event-Driven Architecture

The system uses an event-driven approach for real-time updates:

```
┌─────────────┐    Event     ┌──────────────┐    Event     ┌─────────────┐
│   HTTP API  │ ──────────→ │ Timer Manager │ ──────────→ │ WebSockets  │
└─────────────┘             └──────────────┘             └─────────────┘
       ↑                           ↑                             ↑
       │                           │                             │
   Client                     Event Bus                      Clients
```

### 3. Service-Oriented Architecture

The Timer Manager acts as a central service with clear boundaries:

- **Timer Service**: Core timer operations
- **WebSocket Service**: Real-time communication
- **Persistence Service**: Data storage
- **P2P Service**: Service discovery
- **Monitoring Service**: Health and metrics

## Component Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         ElysiaJS Server                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐   │
│  │ HTTP Routes │  │ WS Routes   │  │     P2P Routes          │   │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                       Timer Manager                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐   │
│  │Timer Instance│ │Event Emitter│  │   Timer Registry        │   │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                     Support Services                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐   │
│  │Persistence  │  │WebSocket Mgr│  │   P2P Discovery         │   │
│  │Service      │  │             │  │                         │   │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Timer Creation Flow

```
Client → HTTP PUT /timers/:id → Validation → Timer Manager → Timer Instance
    ↓                           ↓              ↓                ↓
Response ← HTTP Response ← Event Emitter ← WebSocket Update ← Timer Started
```

### WebSocket Update Flow

```
Timer Instance → Event → Event Emitter → WebSocket Manager → All Connected Clients
       ↓               ↓              ↓                    ↓
   State Change → Timer Update → Broadcaster → Individual Messages
```

### Persistence Flow

```
Timer Manager → Batch Events → Persistence Service → File System/Database
       ↓              ↓              ↓                    ↓
   Timer Update → Event Queue → Scheduled Save → Atomic Write
```

## Core Components

### 1. TimerManager

The central orchestrator for all timer operations:

```typescript
class TimerManager {
  private timers: Map<string, TimerInstance>;
  private eventEmitter: EventEmitter;
  private persistenceService: PersistenceService;
  private webSocketManager: WebSocketManager;
  
  // Core operations
  createTimer(id: string, time: number): TimerInstance;
  getTimer(id: string): TimerInstance | null;
  removeTimer(id: string): boolean;
  getStats(): TimerStats;
  
  // Event handling
  private onTimerUpdate(event: TimerEvent): void;
  private onTimerComplete(event: TimerEvent): void;
}
```

### 2. TimerInstance

Represents a single countdown timer:

```typescript
class TimerInstance {
  private id: string;
  private currentTime: number;
  private initialTime: number;
  private state: TimerState;
  private subscribers: Set<WebSocket>;
  private interval: NodeJS.Timeout | null;
  
  // Timer operations
  start(): void;
  stop(): void;
  reset(): void;
  setTime(time: number): void;
  add(seconds: number): void;
  
  // State management
  getState(): TimerState;
  toJSON(): TimerData;
}
```

### 3. WebSocketManager

Handles real-time communication:

```typescript
class WebSocketManager {
  private connections: Map<string, Set<WebSocket>>;
  private timerManager: TimerManager;
  
  // Connection management
  addConnection(timerId: string, ws: WebSocket): void;
  removeConnection(timerId: string, ws: WebSocket): void;
  
  // Broadcasting
  broadcastToTimer(timerId: string, message: any): void;
  broadcastGlobal(message: any): void;
}
```

### 4. PersistenceService

Manages data persistence:

```typescript
class PersistenceService {
  private filePath: string;
  private saveInterval: number;
  private timerManager: TimerManager;
  
  // Persistence operations
  save(): Promise<void>;
  load(): Promise<TimerStorage>;
  startAutoSave(): void;
  backup(): Promise<void>;
}
```

## Design Patterns

### 1. Observer Pattern

Used for timer state changes and WebSocket updates:

```typescript
interface TimerObserver {
  onTimeUpdate(timerId: string, time: number): void;
  onStateChange(timerId: string, state: TimerState): void;
}

class TimerInstance {
  private observers: Set<TimerObserver> = new Set();
  
  addObserver(observer: TimerObserver): void;
  removeObserver(observer: TimerObserver): void;
  private notifyObservers(event: TimerEvent): void;
}
```

### 2. Factory Pattern

For creating timer instances:

```typescript
class TimerFactory {
  static createTimer(id: string, initialTime: number): TimerInstance {
    return new TimerInstance(id, initialTime);
  }
  
  static createTimerFromData(data: TimerData): TimerInstance {
    const timer = new TimerInstance(data.timerId, data.initialTime);
    timer.setTime(data.currentTime);
    timer.setState(data.state);
    return timer;
  }
}
```

### 3. Command Pattern

For timer operations via WebSocket:

```typescript
interface Command {
  execute(timer: TimerInstance): void;
}

class SetTimeCommand implements Command {
  constructor(private time: number) {}
  execute(timer: TimerInstance): void {
    timer.setTime(this.time);
  }
}

class CommandProcessor {
  processCommand(timer: TimerInstance, command: Command): void {
    command.execute(timer);
  }
}
```

### 4. Repository Pattern

For data persistence abstraction:

```typescript
interface TimerRepository {
  save(data: TimerStorage): Promise<void>;
  load(): Promise<TimerStorage>;
  backup(): Promise<void>;
}

class FileTimerRepository implements TimerRepository {
  constructor(private filePath: string) {}
  
  async save(data: TimerStorage): Promise<void> {
    // File-based persistence
  }
}

class DatabaseTimerRepository implements TimerRepository {
  constructor(private connection: DatabaseConnection) {}
  
  async save(data: TimerStorage): Promise<void> {
    // Database persistence
  }
}
```

## Scalability Considerations

### 1. Horizontal Scaling

The architecture supports horizontal scaling through:

- **Stateless HTTP handlers**: Easy to distribute across instances
- **Shared persistence**: Database or distributed file system
- **Load balancer aware**: Session affinity not required
- **P2P discovery**: Automatic service registration

### 2. Vertical Scaling

Optimizations for single-instance scaling:

- **Event loop optimization**: Non-blocking operations
- **Memory management**: Efficient data structures
- **Connection pooling**: Resource reuse
- **Caching**: In-memory hot data

### 3. WebSocket Scaling

Challenges and solutions:

- **Connection limits**: Use connection pooling and load balancing
- **Memory usage**: Efficient message buffering
- **Message ordering**: Sequence numbers and timestamps
- **Fault tolerance**: Automatic reconnection and state sync

## Performance Optimization

### 1. Memory Management

```typescript
// Efficient timer storage using object pooling
class TimerPool {
  private pool: TimerInstance[] = [];
  
  acquire(): TimerInstance {
    return this.pool.pop() || new TimerInstance();
  }
  
  release(timer: TimerInstance): void {
    timer.reset();
    this.pool.push(timer);
  }
}
```

### 2. Event Batching

```typescript
// Batch timer updates to reduce overhead
class EventBatcher {
  private batch: TimerEvent[] = [];
  private timer: NodeJS.Timeout;
  
  addEvent(event: TimerEvent): void {
    this.batch.push(event);
    this.scheduleFlush();
  }
  
  private flush(): void {
    if (this.batch.length > 0) {
      this.processBatch(this.batch);
      this.batch = [];
    }
  }
}
```

### 3. Lazy Loading

```typescript
// Load timers on-demand
class LazyTimerRegistry {
  private loaded = new Set<string>();
  
  get(id: string): TimerInstance | null {
    if (!this.loaded.has(id)) {
      this.loadTimer(id);
      this.loaded.add(id);
    }
    return this.timers.get(id);
  }
}
```

## Fault Tolerance

### 1. Graceful Degradation

- **WebSocket fallback**: HTTP polling when WebSocket fails
- **Persistence fallback**: In-memory storage when file system fails
- **Partial service**: Core timer functions work even if some services fail

### 2. Error Recovery

```typescript
class ErrorHandler {
  async handleTimerError(error: Error, timerId: string): Promise<void> {
    switch (error.type) {
      case 'Corruption':
        await this.recoverFromBackup(timerId);
        break;
      case 'Timeout':
        await this.resetTimer(timerId);
        break;
      default:
        await this.logAndNotify(error, timerId);
    }
  }
}
```

### 3. Circuit Breaker Pattern

```typescript
class CircuitBreaker {
  private failures = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      throw new Error('Circuit breaker is open');
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
}
```

## Technology Stack

### Core Technologies

- **Runtime**: Bun (high-performance JavaScript runtime)
- **Framework**: ElysiaJS (TypeScript-first web framework)
- **Language**: TypeScript (type safety and developer productivity)
- **WebSocket**: Native ElysiaJS WebSocket support
- **Service Discovery**: Bonjour/mDNS for P2P discovery

### Data Storage

- **Primary**: JSON file with atomic writes
- **Backup**: Rotating backup files
- **Alternative**: MongoDB/PostgreSQL for large deployments
- **Caching**: In-memory with optional Redis

### Development Tools

- **Testing**: Bun's built-in test runner
- **Linting**: ESLint for code quality
- **Formatting**: Prettier for code consistency
- **Building**: Bun's optimized bundler
- **Type Checking**: TypeScript compiler

### Deployment

- **Containerization**: Docker support
- **Process Management**: PM2 integration
- **Orchestration**: Kubernetes manifests
- **Monitoring**: Prometheus metrics and health checks
- **Logging**: Winston logging with rotation

## Future Architecture Considerations

### 1. Microservices Migration

Potential decomposition:

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ Timer API   │  │ Timer Core  │  │ Persistence │
│ Service     │  │ Service     │  │ Service     │
└─────────────┘  └─────────────┘  └─────────────┘
       │                │                │
       └────────────────┼────────────────┘
                        │
              ┌─────────────┐
              │Event Gateway │
              └─────────────┘
```

### 2. Event Sourcing

For audit trail and state reconstruction:

```
Command → Event Store → State Projection → Read Model
    ↓           ↓              ↓             ↓
Handler    Persistence    Query API     WebSocket API
```

### 3. CQRS Pattern

Separate read and write models:

```typescript
// Write Model
interface TimerWriteModel {
  execute(command: TimerCommand): Promise<void>;
}

// Read Model
interface TimerReadModel {
  getTimer(id: string): Promise<TimerView>;
  getAllTimers(): Promise<TimerView[]>;
}
```

This architecture provides a solid foundation for the Timer API, balancing simplicity with scalability and performance considerations.