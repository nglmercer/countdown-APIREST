# Timer API REST

A robust and scalable RESTful API built with ElysiaJS and Bun for creating, managing, and modifying multiple countdown timers in real-time. This project features real-time WebSocket communication, data persistence, and peer-to-peer service discovery.

## ✨ Features

- **Multiple Timer Management**: Create and control unlimited timers with unique IDs
- **RESTful API**: Clear and semantic endpoints for easy integration
- **Advanced Time Modifications**: Set, add, subtract, multiply, divide, and reset timers
- **Real-time WebSocket**: Live timer updates and bidirectional communication
- **Data Persistence**: Automatic timer state saving and recovery
- **P2P Service Discovery**: Automatic service discovery using mDNS/Bonjour
- **High Performance**: Built on ElysiaJS, one of the fastest web frameworks
- **Type Safe**: Fully typed with TypeScript for robust, maintainable code
- **CORS Support**: Cross-origin requests enabled for web applications

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh/) (v1.0.0 or higher)
- [Node.js](https://nodejs.org/) (v16 or higher) - for development tools

### Installation

1. **Clone the repository:**
   ```bash
   git clone <REPOSITORY_URL>
   cd countdown-APIREST
   ```

2. **Install dependencies:**
   ```bash
   bun install
   ```

3. **Start the development server:**
   ```bash
   bun run dev
   ```

The server will start at `http://localhost:3000` by default.

### Available Scripts

- `bun run dev` - Start development server with hot reload
- `bun run start` - Start production server
- `bun run build` - Build for production
- `bun run test` - Run tests
- `bun run test:watch` - Run tests in watch mode
- `bun run test:coverage` - Run tests with coverage
- `bun run lint` - Run ESLint
- `bun run format` - Format code with Prettier
- `bun run type-check` - Type checking without compilation

## 📚 API Documentation

All endpoints use the `/timers` prefix. All requests and responses are in JSON format.

### Timer Management

#### Create/Update Timer
Sets a specific time for a timer. Creates the timer if it doesn't exist.

```http
PUT /timers/:timerId
```

**Body:**
```json
{
  "time": 300
}
```

**Response:**
```json
{
  "success": true,
  "message": "Timer created/updated successfully",
  "timerId": "my-timer",
  "currentTime": 300,
  "initialTime": 300,
  "state": "running",
  "createdAt": 1698396000000,
  "expiresAt": 1698396300000
}
```

#### Get Timer Status
Retrieves detailed status of a specific timer.

```http
GET /timers/:timerId/status
```

**Response:**
```json
{
  "success": true,
  "timerId": "my-timer",
  "currentTime": 255,
  "initialTime": 300,
  "state": "running",
  "createdAt": 1698396000000,
  "expiresAt": 1698396300000,
  "subscriberCount": 2
}
```

#### Delete Timer
Removes a timer from the system.

```http
DELETE /timers/:timerId
```

**Response:**
```json
{
  "success": true,
  "message": "Timer removed successfully"
}
```

### Time Modification Operations

#### Add Time
Adds seconds to the current timer time.

```http
PATCH /timers/:timerId/add
```

**Body:**
```json
{
  "seconds": 60
}
```

#### Subtract Time
Subtracts seconds from the current timer time.

```http
PATCH /timers/:timerId/subtract
```

**Body:**
```json
{
  "seconds": 30
}
```

#### Multiply Time
Multiplies the current time by a factor.

```http
PATCH /timers/:timerId/multiply
```

**Body:**
```json
{
  "factor": 1.5
}
```

#### Divide Time
Divides the current time by a divisor.

```http
PATCH /timers/:timerId/divide
```

**Body:**
```json
{
  "divisor": 2
}
```

### Timer Control Actions

#### Pause Timer
Pauses a running timer.

```http
POST /timers/:timerId/pause
```

#### Resume Timer
Resumes a paused timer.

```http
POST /timers/:timerId/resume
```

#### Reset Timer
Resets timer to its initial time.

```http
POST /timers/:timerId/reset
```

### Global Operations

#### List All Timers
Gets statistics about all timers in the system.

```http
GET /timers
```

**Response:**
```json
{
  "success": true,
  "total": 5,
  "running": 3,
  "stopped": 1,
  "completed": 1,
  "expired": 0
}
```

#### Get Statistics
Alias for listing all timers.

```http
GET /timers/stats
```

### System Endpoints

#### Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": 1698396000000
}
```

## 🔌 WebSocket API

Connect to the WebSocket endpoint for real-time updates:

```javascript
const ws = new WebSocket('ws://localhost:3000/ws');
// Or connect to a specific timer:
const ws = new WebSocket('ws://localhost:3000/ws/my-timer');
```

### Client to Server Messages

Send JSON messages with the following structure:

```json
{
  "action": "setTime|addTime|subtractTime|multiplyTime|divideTime|getTime|start|stop|reset",
  "value": <number> // Required for time operations
}
```

### Server to Client Messages

The server sends messages with different types:

```json
{
  "type": "initialTime|timeUpdate|timerEnd|stateChange|connected|heartbeat|error",
  "time": <number>,
  "state": "running|stopped|completed",
  "timerId": "string",
  "message": "string",
  "timestamp": <number>
}
```

## 🏗️ Project Structure

```
countdown-APIREST/
├── src/
│   ├── constants/          # Application constants
│   ├── core/              # Core timer logic
│   │   ├── timer-instance.ts
│   │   └── timer-manager.ts
│   ├── p2p/               # Peer-to-peer service discovery
│   ├── services/          # Storage and utility services
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions
│   ├── config.ts          # Configuration settings
│   ├── http.ts            # HTTP route definitions
│   ├── index.ts           # Main application entry point
│   ├── tcprouter.ts       # P2P TCP routing
│   ├── timer.ts           # Timer module exports
│   └── ws.ts              # WebSocket route definitions
├── public/                # Static files
├── tests/                 # Test files
├── dist/                  # Built application
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── bun.lock              # Bun lock file
└── README.md             # This file
```

## 🔧 Configuration

The API can be configured through environment variables or command-line arguments:

### Environment Variables

- `PORT` - Server port (default: 3000)
- `HOST` - Server host (default: "0.0.0.0")

### Command Line Arguments

```bash
bun run start --port=8080
```

## 🧪 Testing

Run the test suite:

```bash
bun test
```

Run tests with coverage:

```bash
bun test --coverage
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🛠️ Technologies Used

- **Framework**: [ElysiaJS](https://elysiajs.com/)
- **Runtime**: [Bun](https://bun.sh/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **WebSocket**: Native ElysiaJS WebSocket support
- **Service Discovery**: Bonjour/mDNS
- **Testing**: Bun's built-in test runner

## 📞 Support

If you have any questions or issues, please open an issue on GitHub.
```
