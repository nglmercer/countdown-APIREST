# Timer API Reference

This document provides comprehensive reference documentation for all API endpoints, WebSocket messages, and data structures used in the Timer API.

## Base URL

```
http://localhost:3000
```

## Authentication

Currently, the API does not require authentication. All endpoints are publicly accessible.

## Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "data": {}, // Response-specific data
  "message": "Optional success message"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message describing the issue"
}
```

## HTTP Status Codes

- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request parameters or body
- `404 Not Found` - Timer not found
- `422 Unprocessable Entity` - Validation errors (e.g., negative time)
- `500 Internal Server Error` - Server error

## API Endpoints

### Timer Management

#### Create/Update Timer

**Endpoint:** `PUT /timers/:timerId`

Creates a new timer or updates an existing one with the specified time.

**Parameters:**
- `timerId` (path, required) - Unique identifier for the timer (string or number)

**Request Body:**
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

**Behavior:**
- If timer doesn't exist, creates it with the specified time
- If timer exists, updates its current time
- Auto-starts timer if time > 0 and timer is stopped
- Sets state to "completed" if time is 0

#### Get Timer Status

**Endpoint:** `GET /timers/:timerId/status`

Retrieves the current status and details of a specific timer.

**Parameters:**
- `timerId` (path, required) - Unique identifier for the timer

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

**Endpoint:** `DELETE /timers/:timerId`

Permanently removes a timer from the system.

**Parameters:**
- `timerId` (path, required) - Unique identifier for the timer

**Response:**
```json
{
  "success": true,
  "message": "Timer removed successfully"
}
```

### Time Modification Operations

#### Add Time

**Endpoint:** `PATCH /timers/:timerId/add`

Adds the specified amount of time to the current timer value.

**Parameters:**
- `timerId` (path, required) - Unique identifier for the timer

**Request Body:**
```json
{
  "seconds": 60
}
```
**Alternative Body:**
```json
{
  "time": 60
}
```

**Response:**
```json
{
  "success": true,
  "message": "Time added successfully",
  "timerId": "my-timer",
  "currentTime": 360,
  "initialTime": 300,
  "state": "running"
}
```

#### Subtract Time

**Endpoint:** `PATCH /timers/:timerId/subtract`

Subtracts the specified amount of time from the current timer value.

**Parameters:**
- `timerId` (path, required) - Unique identifier for the timer

**Request Body:**
```json
{
  "seconds": 30
}
```

**Response:**
```json
{
  "success": true,
  "message": "Time subtracted successfully",
  "timerId": "my-timer",
  "currentTime": 270,
  "initialTime": 300,
  "state": "running"
}
```

#### Multiply Time

**Endpoint:** `PATCH /timers/:timerId/multiply`

Multiplies the current timer time by the specified factor.

**Parameters:**
- `timerId` (path, required) - Unique identifier for the timer

**Request Body:**
```json
{
  "factor": 1.5
}
```

**Response:**
```json
{
  "success": true,
  "message": "Time multiplied successfully",
  "timerId": "my-timer",
  "currentTime": 450,
  "initialTime": 300,
  "state": "running"
}
```

#### Divide Time

**Endpoint:** `PATCH /timers/:timerId/divide`

Divides the current timer time by the specified divisor.

**Parameters:**
- `timerId` (path, required) - Unique identifier for the timer

**Request Body:**
```json
{
  "divisor": 2
}
```

**Response:**
```json
{
  "success": true,
  "message": "Time divided successfully",
  "timerId": "my-timer",
  "currentTime": 150,
  "initialTime": 300,
  "state": "running"
}
```

### Timer Control Actions

#### Pause Timer

**Endpoint:** `POST /timers/:timerId/pause`

Pauses a running timer. Does nothing if timer is already paused or completed.

**Parameters:**
- `timerId` (path, required) - Unique identifier for the timer

**Response:**
```json
{
  "success": true,
  "message": "Timer paused successfully",
  "timerId": "my-timer",
  "currentTime": 255,
  "initialTime": 300,
  "state": "stopped"
}
```

#### Resume Timer

**Endpoint:** `POST /timers/:timerId/resume`

Resumes a paused timer. Does nothing if timer is already running or completed.

**Parameters:**
- `timerId` (path, required) - Unique identifier for the timer

**Response:**
```json
{
  "success": true,
  "message": "Timer resumed successfully",
  "timerId": "my-timer",
  "currentTime": 255,
  "initialTime": 300,
  "state": "running"
}
```

#### Reset Timer

**Endpoint:** `POST /timers/:timerId/reset`

Resets the timer to its initial time value.

**Parameters:**
- `timerId` (path, required) - Unique identifier for the timer

**Response:**
```json
{
  "success": true,
  "message": "Timer reset successfully",
  "timerId": "my-timer",
  "currentTime": 300,
  "initialTime": 300,
  "state": "stopped"
}
```

### Global Operations

#### List All Timers

**Endpoint:** `GET /timers`

Retrieves statistics about all timers in the system.

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

**Endpoint:** `GET /timers/stats`

Alias for the list all timers endpoint. Returns identical data.

### System Endpoints

#### Health Check

**Endpoint:** `GET /health`

Returns the health status of the API server.

**Response:**
```json
{
  "status": "ok",
  "timestamp": 1698396000000
}
```

#### Root Endpoint

**Endpoint:** `GET /`

Returns a simple welcome message.

**Response:**
```json
"Timer API Server with ElysiaJS"
```

## WebSocket API

### Connection Endpoints

- `ws://localhost:3000/ws` - Connect to general timer updates
- `ws://localhost:3000/ws/:timerId` - Connect to updates for a specific timer

### Client to Server Messages

Send JSON messages with the following structure:

```json
{
  "action": "action_name",
  "value": <number> // Required for time operations
}
```

#### Available Actions

- `setTime` - Set timer to specific time
- `addTime` - Add time to timer
- `subtractTime` - Subtract time from timer
- `multiplyTime` - Multiply timer time
- `divideTime` - Divide timer time
- `getTime` - Request current timer time
- `start` - Start/resume timer countdown
- `stop` - Stop/pause timer countdown
- `reset` - Reset timer to initial time

#### Example Messages

```json
{
  "action": "setTime",
  "value": 300
}

{
  "action": "addTime",
  "value": 60
}

{
  "action": "start"
}
```

### Server to Client Messages

The server sends messages with different types:

```json
{
  "type": "message_type",
  "time": <number>,
  "state": "running|stopped|completed",
  "timerId": "string",
  "message": "string",
  "timestamp": <number>,
  "source": "websocket|http",
  "action": "string",
  "value": <number>
}
```

#### Message Types

- `initialTime` - Sent on connection with current timer time
- `initialState` - Sent on connection with current timer state
- `timeUpdate` - Sent during countdown or after time modification
- `timerEnd` - Sent when timer reaches zero
- `stateChange` - Sent when timer state changes
- `connected` - Sent when client successfully connects
- `heartbeat` - Periodic heartbeat message
- `actionConfirmed` - Sent when client action is processed
- `error` - Sent when an error occurs

#### Example Messages

```json
{
  "type": "initialTime",
  "time": 300,
  "timerId": "my-timer",
  "timestamp": 1698396000000
}

{
  "type": "timeUpdate",
  "time": 255,
  "timerId": "my-timer",
  "timestamp": 1698396005000
}

{
  "type": "timerEnd",
  "timerId": "my-timer",
  "message": "Timer finished!",
  "timestamp": 1698396300000
}
```

## Data Models

### TimerData

```typescript
interface TimerData {
  timerId: string | number;
  currentTime: number;
  initialTime: number;
  state: "running" | "stopped" | "completed";
  createdAt: number;
  expiresAt: number;
  lastSaved: number;
}
```

### TimerStats

```typescript
interface TimerStats {
  total: number;
  running: number;
  stopped: number;
  completed: number;
  expired: number;
}
```

### WebSocketMessage

```typescript
interface WebSocketMessage {
  type: "initialTime" | "initialState" | "timeUpdate" | "timerEnd" | 
        "stateChange" | "connected" | "heartbeat" | "actionConfirmed" | "error";
  time?: number;
  state?: "running" | "stopped" | "completed";
  timerId?: string | number;
  message?: string;
  timestamp?: string | number;
  source?: "websocket" | "http";
  subscriberId?: string;
  action?: string;
  value?: number;
}
```

## Error Handling

The API handles errors gracefully and returns appropriate HTTP status codes with descriptive error messages.

### Common Errors

**Timer Not Found (404)**
```json
{
  "success": false,
  "error": "Timer not found"
}
```

**Invalid Time Value (422)**
```json
{
  "success": false,
  "error": "Time must be a non-negative number"
}
```

**Missing Required Field (400)**
```json
{
  "success": false,
  "error": "Time field is required"
}
```

**Invalid Divisor (400)**
```json
{
  "success": false,
  "error": "Divisor must be a positive number greater than zero."
}
```

## Rate Limiting

Currently, there are no rate limits imposed on the API endpoints. However, for production use, it's recommended to implement rate limiting to prevent abuse.

## CORS

The API is configured to accept requests from any origin with the following settings:

- **Origin:** `*` (all origins allowed)
- **Methods:** GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD
- **Headers:** Content-Type, Authorization, X-Requested-With
- **Credentials:** false

## Persistence

Timer states are automatically persisted to a JSON file (`timers.json`) with the following features:

- Automatic saving at regular intervals
- Recovery on server restart
- Cleanup of expired timers
- Version-based storage format for future migrations