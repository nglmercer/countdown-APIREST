# Timer API Examples and Usage Scenarios

This document provides practical examples and common usage scenarios for the Timer API, including code snippets in various languages and real-world implementations.

## Table of Contents

1. [Quick Start Examples](#quick-start-examples)
2. [cURL Examples](#curl-examples)
3. [JavaScript/Node.js Examples](#javascriptnodejs-examples)
4. [Python Examples](#python-examples)
5. [WebSocket Examples](#websocket-examples)
6. [Real-World Scenarios](#real-world-scenarios)
7. [Integration Patterns](#integration-patterns)

## Quick Start Examples

### Creating Your First Timer

```bash
# Create a 5-minute timer
curl -X PUT -H "Content-Type: application/json" \
  -d '{"time": 300}' \
  http://localhost:3000/timers/my-first-timer
```

### Checking Timer Status

```bash
curl http://localhost:3000/timers/my-first-timer/status
```

### Adding More Time

```bash
# Add 60 seconds
curl -X PATCH -H "Content-Type: application/json" \
  -d '{"seconds": 60}' \
  http://localhost:3000/timers/my-first-timer/add
```

## cURL Examples

### Complete Timer Lifecycle

```bash
#!/bin/bash

# 1. Create a 2-minute timer
echo "Creating timer..."
curl -X PUT -H "Content-Type: application/json" \
  -d '{"time": 120}' \
  http://localhost:3000/timers/presentation-timer

# 2. Check initial status
echo -e "\nChecking status..."
curl http://localhost:3000/timers/presentation-timer/status

# 3. Add 30 seconds after 10 seconds (simulate delay)
echo -e "\nWaiting 10 seconds..."
sleep 10
echo "Adding 30 seconds..."
curl -X PATCH -H "Content-Type: application/json" \
  -d '{"seconds": 30}' \
  http://localhost:3000/timers/presentation-timer/add

# 4. Check updated status
echo -e "\nChecking updated status..."
curl http://localhost:3000/timers/presentation-timer/status

# 5. Pause the timer
echo -e "\nPausing timer..."
curl -X POST http://localhost:3000/timers/presentation-timer/pause

# 6. Resume after 5 seconds
echo "Waiting 5 seconds..."
sleep 5
echo "Resuming timer..."
curl -X POST http://localhost:3000/timers/presentation-timer/resume

# 7. Final status check
echo -e "\nFinal status..."
curl http://localhost:3000/timers/presentation-timer/status
```

### Bulk Operations

```bash
#!/bin/bash

# Create multiple timers
TIMERS=("timer-1" "timer-2" "timer-3")
TIMES=(60 120 180)

for i in "${!TIMERS[@]}"; do
  echo "Creating ${TIMERS[$i]} with ${TIMES[$i]} seconds..."
  curl -X PUT -H "Content-Type: application/json" \
    -d "{\"time\": ${TIMES[$i]}}" \
    http://localhost:3000/timers/${TIMERS[$i]}
done

# Get all timer statistics
echo -e "\nGetting statistics..."
curl http://localhost:3000/timers/stats

# Clean up
for timer in "${TIMERS[@]}"; do
  echo "Deleting $timer..."
  curl -X DELETE http://localhost:3000/timers/$timer
done
```

## JavaScript/Node.js Examples

### Basic Timer Management

```javascript
// timer-client.js
class TimerClient {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  async createTimer(timerId, time) {
    const response = await fetch(`${this.baseUrl}/timers/${timerId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ time })
    });
    return response.json();
  }

  async getTimerStatus(timerId) {
    const response = await fetch(`${this.baseUrl}/timers/${timerId}/status`);
    return response.json();
  }

  async addTime(timerId, seconds) {
    const response = await fetch(`${this.baseUrl}/timers/${timerId}/add`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seconds })
    });
    return response.json();
  }

  async pauseTimer(timerId) {
    const response = await fetch(`${this.baseUrl}/timers/${timerId}/pause`, {
      method: 'POST'
    });
    return response.json();
  }

  async resumeTimer(timerId) {
    const response = await fetch(`${this.baseUrl}/timers/${timerId}/resume`, {
      method: 'POST'
    });
    return response.json();
  }

  async deleteTimer(timerId) {
    const response = await fetch(`${this.baseUrl}/timers/${timerId}`, {
      method: 'DELETE'
    });
    return response.json();
  }

  async getAllStats() {
    const response = await fetch(`${this.baseUrl}/timers/stats`);
    return response.json();
  }
}

// Usage example
async function example() {
  const client = new TimerClient();
  
  try {
    // Create a timer
    console.log('Creating timer...');
    const timer = await client.createTimer('meeting-timer', 600);
    console.log('Timer created:', timer);

    // Check status after 2 seconds
    setTimeout(async () => {
      const status = await client.getTimerStatus('meeting-timer');
      console.log('Timer status:', status);

      // Add time
      const updated = await client.addTime('meeting-timer', 120);
      console.log('Time added:', updated);

      // Pause
      await client.pauseTimer('meeting-timer');
      console.log('Timer paused');

      // Resume after 5 seconds
      setTimeout(async () => {
        await client.resumeTimer('meeting-timer');
        console.log('Timer resumed');
      }, 5000);
    }, 2000);

  } catch (error) {
    console.error('Error:', error);
  }
}

example();
```

### WebSocket Integration

```javascript
// websocket-timer.js
class WebSocketTimer {
  constructor(timerId, baseUrl = 'ws://localhost:3000') {
    this.timerId = timerId;
    this.ws = new WebSocket(`${baseUrl}/ws/${timerId}`);
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.ws.onopen = () => {
      console.log('Connected to timer WebSocket');
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket connection closed');
    };
  }

  handleMessage(message) {
    switch (message.type) {
      case 'initialTime':
        console.log(`Initial time: ${message.time}s`);
        break;
      case 'timeUpdate':
        console.log(`Time update: ${message.time}s remaining`);
        break;
      case 'timerEnd':
        console.log('Timer finished!');
        this.onTimerEnd(message);
        break;
      case 'stateChange':
        console.log(`State changed to: ${message.state}`);
        break;
      case 'error':
        console.error('Error:', message.message);
        break;
    }
  }

  setTime(time) {
    this.sendAction('setTime', time);
  }

  addTime(seconds) {
    this.sendAction('addTime', seconds);
  }

  start() {
    this.sendAction('start');
  }

  stop() {
    this.sendAction('stop');
  }

  reset() {
    this.sendAction('reset');
  }

  sendAction(action, value = null) {
    const message = { action };
    if (value !== null) {
      message.value = value;
    }
    this.ws.send(JSON.stringify(message));
  }

  onTimerEnd(message) {
    // Override this method for custom timer end behavior
    console.log('Timer ended callback:', message);
  }

  close() {
    this.ws.close();
  }
}

// Usage example
const timer = new WebSocketTimer('demo-timer');

// Wait a bit then interact
setTimeout(() => {
  timer.addTime(30);
  console.log('Added 30 seconds');
}, 3000);

// Custom timer end handler
timer.onTimerEnd = (message) => {
  console.log('Custom handler: Timer ended!');
  // Could trigger notifications, sounds, etc.
};
```

## Python Examples

### HTTP Client

```python
# timer_client.py
import requests
import json
import time

class TimerClient:
    def __init__(self, base_url='http://localhost:3000'):
        self.base_url = base_url
        self.session = requests.Session()

    def create_timer(self, timer_id, time_seconds):
        """Create or update a timer"""
        url = f"{self.base_url}/timers/{timer_id}"
        data = {"time": time_seconds}
        response = self.session.put(url, json=data)
        return response.json()

    def get_status(self, timer_id):
        """Get timer status"""
        url = f"{self.base_url}/timers/{timer_id}/status"
        response = self.session.get(url)
        return response.json()

    def add_time(self, timer_id, seconds):
        """Add time to timer"""
        url = f"{self.base_url}/timers/{timer_id}/add"
        data = {"seconds": seconds}
        response = self.session.patch(url, json=data)
        return response.json()

    def multiply_time(self, timer_id, factor):
        """Multiply timer time"""
        url = f"{self.base_url}/timers/{timer_id}/multiply"
        data = {"factor": factor}
        response = self.session.patch(url, json=data)
        return response.json()

    def pause_timer(self, timer_id):
        """Pause timer"""
        url = f"{self.base_url}/timers/{timer_id}/pause"
        response = self.session.post(url)
        return response.json()

    def resume_timer(self, timer_id):
        """Resume timer"""
        url = f"{self.base_url}/timers/{timer_id}/resume"
        response = self.session.post(url)
        return response.json()

    def delete_timer(self, timer_id):
        """Delete timer"""
        url = f"{self.base_url}/timers/{timer_id}"
        response = self.session.delete(url)
        return response.json()

    def get_stats(self):
        """Get all timer statistics"""
        url = f"{self.base_url}/timers/stats"
        response = self.session.get(url)
        return response.json()

# Example usage
def pomodoro_timer_example():
    """Implement a Pomodoro timer using the API"""
    client = TimerClient()
    
    # Create a 25-minute work session
    print("Starting work session (25 minutes)...")
    work_timer = client.create_timer("pomodoro-work", 25 * 60)
    print(f"Work timer: {work_timer}")
    
    # Monitor the timer
    start_time = time.time()
    while True:
        time.sleep(10)  # Check every 10 seconds
        
        status = client.get_status("pomodoro-work")
        remaining = status.get('currentTime', 0)
        print(f"Time remaining: {remaining // 60}:{remaining % 60:02d}")
        
        if status.get('state') == 'completed':
            print("Work session completed!")
            break
    
    # Create a 5-minute break
    print("Starting break (5 minutes)...")
    break_timer = client.create_timer("pomodoro-break", 5 * 60)
    print(f"Break timer: {break_timer}")
    
    # Wait for break to complete
    while True:
        time.sleep(5)
        status = client.get_status("pomodoro-break")
        if status.get('state') == 'completed':
            print("Break completed!")
            break
    
    # Clean up
    client.delete_timer("pomodoro-work")
    client.delete_timer("pomodoro-break")

if __name__ == "__main__":
    pomodoro_timer_example()
```

### WebSocket Client

```python
# websocket_client.py
import asyncio
import websockets
import json

class WebSocketTimer:
    def __init__(self, timer_id, uri='ws://localhost:3000'):
        self.timer_id = timer_id
        self.uri = f"{uri}/ws/{timer_id}"
        self.websocket = None

    async def connect(self):
        """Connect to WebSocket"""
        self.websocket = await websockets.connect(self.uri)
        print(f"Connected to timer {self.timer_id}")

    async def listen(self):
        """Listen for messages"""
        if not self.websocket:
            await self.connect()
        
        try:
            async for message in self.websocket:
                data = json.loads(message)
                await self.handle_message(data)
        except websockets.exceptions.ConnectionClosed:
            print("Connection closed")

    async def handle_message(self, message):
        """Handle incoming messages"""
        msg_type = message.get('type')
        
        if msg_type == 'initialTime':
            print(f"Timer started at {message['time']} seconds")
        elif msg_type == 'timeUpdate':
            minutes = message['time'] // 60
            seconds = message['time'] % 60
            print(f"Time remaining: {minutes:02d}:{seconds:02d}")
        elif msg_type == 'timerEnd':
            print("Timer finished!")
        elif msg_type == 'stateChange':
            print(f"State changed to: {message['state']}")
        elif msg_type == 'error':
            print(f"Error: {message['message']}")

    async def send_action(self, action, value=None):
        """Send action to server"""
        if not self.websocket:
            await self.connect()
        
        message = {"action": action}
        if value is not None:
            message["value"] = value
        
        await self.websocket.send(json.dumps(message))

    async def add_time(self, seconds):
        """Add time to timer"""
        await self.send_action("addTime", seconds)

    async def set_time(self, seconds):
        """Set timer time"""
        await self.send_action("setTime", seconds)

    async def start(self):
        """Start timer"""
        await self.send_action("start")

    async def stop(self):
        """Stop timer"""
        await self.send_action("stop")

    async def reset(self):
        """Reset timer"""
        await self.send_action("reset")

    async def close(self):
        """Close connection"""
        if self.websocket:
            await self.websocket.close()

# Example usage
async def interactive_timer():
    timer = WebSocketTimer("interactive-timer")
    
    # Start listening in background
    listen_task = asyncio.create_task(timer.listen())
    
    # Create timer
    await timer.set_time(60)
    
    # Interactive loop
    print("Commands: add <seconds>, stop, start, reset, quit")
    
    while True:
        command = input("> ").strip().lower()
        
        if command == 'quit':
            break
        elif command.startswith('add '):
            try:
                seconds = int(command.split()[1])
                await timer.add_time(seconds)
                print(f"Added {seconds} seconds")
            except (IndexError, ValueError):
                print("Usage: add <seconds>")
        elif command == 'stop':
            await timer.stop()
            print("Timer stopped")
        elif command == 'start':
            await timer.start()
            print("Timer started")
        elif command == 'reset':
            await timer.reset()
            print("Timer reset")
        else:
            print("Unknown command")
    
    # Cleanup
    listen_task.cancel()
    await timer.close()

if __name__ == "__main__":
    asyncio.run(interactive_timer())
```

## WebSocket Examples

### HTML Client

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Timer Dashboard</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .timer { border: 1px solid #ccc; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .timer.running { border-color: #4CAF50; background-color: #f0f8f0; }
        .timer.stopped { border-color: #ff9800; background-color: #fff8f0; }
        .timer.completed { border-color: #f44336; background-color: #fff0f0; }
        .display { font-size: 2em; font-weight: bold; margin: 10px 0; }
        .controls { margin: 10px 0; }
        button { margin: 5px; padding: 8px 15px; }
        input { padding: 5px; width: 80px; }
        .log { background: #f5f5f5; padding: 10px; margin: 10px 0; height: 200px; overflow-y: auto; }
        .timer-list { margin: 20px 0; }
        .new-timer { background: #e8f5e8; padding: 15px; border-radius: 5px; }
    </style>
</head>
<body>
    <h1>Timer Dashboard</h1>
    
    <!-- Create New Timer -->
    <div class="new-timer">
        <h3>Create New Timer</h3>
        <input type="text" id="newTimerId" placeholder="Timer ID">
        <input type="number" id="newTimerTime" placeholder="Seconds" min="1">
        <button onclick="createTimer()">Create Timer</button>
    </div>
    
    <!-- Timer List -->
    <div id="timerList" class="timer-list">
        <h3>Active Timers</h3>
    </div>
    
    <!-- Log -->
    <div>
        <h3>Event Log</h3>
        <div id="log" class="log"></div>
        <button onclick="clearLog()">Clear Log</button>
    </div>

    <script>
        class TimerDashboard {
            constructor() {
                this.timers = new Map();
                this.baseWsUrl = 'ws://localhost:3000/ws';
                this.baseApiUrl = 'http://localhost:3000/timers';
                this.loadTimerList();
            }

            log(message) {
                const logDiv = document.getElementById('log');
                const time = new Date().toLocaleTimeString();
                logDiv.innerHTML += `[${time}] ${message}<br>`;
                logDiv.scrollTop = logDiv.scrollHeight;
            }

            async loadTimerList() {
                try {
                    const response = await fetch(`${this.baseApiUrl}/stats`);
                    const stats = await response.json();
                    
                    // For now, we'll just show that there are timers
                    // In a real implementation, you'd have an endpoint to list all timer IDs
                    this.log(`Server reports ${stats.total} active timers`);
                } catch (error) {
                    this.log('Error loading timer list: ' + error.message);
                }
            }

            async createTimer(timerId, time) {
                try {
                    const response = await fetch(`${this.baseApiUrl}/${timerId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ time: parseInt(time) })
                    });
                    
                    const result = await response.json();
                    if (result.success) {
                        this.addTimerUI(timerId);
                        this.log(`Created timer: ${timerId} (${time} seconds)`);
                    } else {
                        this.log('Error creating timer: ' + result.error);
                    }
                } catch (error) {
                    this.log('Error creating timer: ' + error.message);
                }
            }

            addTimerUI(timerId) {
                const timerList = document.getElementById('timerList');
                
                const timerDiv = document.createElement('div');
                timerDiv.className = 'timer';
                timerDiv.id = `timer-${timerId}`;
                
                timerDiv.innerHTML = `
                    <h4>Timer: ${timerId}</h4>
                    <div class="display" id="display-${timerId}">--:--</div>
                    <div class="controls">
                        <button onclick="dashboard.addTime('${timerId}', 30)">+30s</button>
                        <button onclick="dashboard.addTime('${timerId}', 60)">+1m</button>
                        <button onclick="dashboard.addTime('${timerId}', 300)">+5m</button>
                        <button onclick="dashboard.pauseTimer('${timerId}')">Pause</button>
                        <button onclick="dashboard.resumeTimer('${timerId}')">Resume</button>
                        <button onclick="dashboard.resetTimer('${timerId}')">Reset</button>
                        <button onclick="dashboard.deleteTimer('${timerId}')">Delete</button>
                    </div>
                `;
                
                timerList.appendChild(timerDiv);
                this.connectTimer(timerId);
            }

            connectTimer(timerId) {
                const ws = new WebSocket(`${this.baseWsUrl}/${timerId}`);
                
                ws.onopen = () => {
                    this.log(`Connected to timer: ${timerId}`);
                };

                ws.onmessage = (event) => {
                    const message = JSON.parse(event.data);
                    this.handleTimerMessage(timerId, message);
                };

                ws.onerror = (error) => {
                    this.log(`WebSocket error for ${timerId}: ${error}`);
                };

                ws.onclose = () => {
                    this.log(`Disconnected from timer: ${timerId}`);
                };

                this.timers.set(timerId, ws);
            }

            handleTimerMessage(timerId, message) {
                const timerDiv = document.getElementById(`timer-${timerId}`);
                const display = document.getElementById(`display-${timerId}`);
                
                if (!timerDiv) return;

                switch (message.type) {
                    case 'initialTime':
                    case 'timeUpdate':
                        const minutes = Math.floor(message.time / 60);
                        const seconds = message.time % 60;
                        display.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                        break;
                    case 'stateChange':
                        timerDiv.className = `timer ${message.state}`;
                        this.log(`Timer ${timerId} state: ${message.state}`);
                        break;
                    case 'timerEnd':
                        timerDiv.className = 'timer completed';
                        display.textContent = '00:00';
                        this.log(`Timer ${timerId} finished!`);
                        break;
                    case 'error':
                        this.log(`Timer ${timerId} error: ${message.message}`);
                        break;
                }
            }

            async addTime(timerId, seconds) {
                try {
                    const response = await fetch(`${this.baseApiUrl}/${timerId}/add`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ seconds })
                    });
                    
                    const result = await response.json();
                    if (result.success) {
                        this.log(`Added ${seconds}s to timer ${timerId}`);
                    }
                } catch (error) {
                    this.log(`Error adding time: ${error.message}`);
                }
            }

            async pauseTimer(timerId) {
                await this.timerAction(timerId, 'pause');
            }

            async resumeTimer(timerId) {
                await this.timerAction(timerId, 'resume');
            }

            async resetTimer(timerId) {
                await this.timerAction(timerId, 'reset');
            }

            async deleteTimer(timerId) {
                if (confirm(`Delete timer ${timerId}?`)) {
                    try {
                        const response = await fetch(`${this.baseApiUrl}/${timerId}`, {
                            method: 'DELETE'
                        });
                        
                        const result = await response.json();
                        if (result.success) {
                            // Close WebSocket
                            const ws = this.timers.get(timerId);
                            if (ws) {
                                ws.close();
                                this.timers.delete(timerId);
                            }
                            
                            // Remove UI
                            const timerDiv = document.getElementById(`timer-${timerId}`);
                            if (timerDiv) {
                                timerDiv.remove();
                            }
                            
                            this.log(`Deleted timer: ${timerId}`);
                        }
                    } catch (error) {
                        this.log(`Error deleting timer: ${error.message}`);
                    }
                }
            }

            async timerAction(timerId, action) {
                try {
                    const response = await fetch(`${this.baseApiUrl}/${timerId}/${action}`, {
                        method: 'POST'
                    });
                    
                    const result = await response.json();
                    if (result.success) {
                        this.log(`${action} timer ${timerId}`);
                    }
                } catch (error) {
                    this.log(`Error ${action} timer: ${error.message}`);
                }
            }
        }

        // Initialize dashboard
        const dashboard = new TimerDashboard();

        // Global functions for button onclick
        function createTimer() {
            const id = document.getElementById('newTimerId').value;
            const time = document.getElementById('newTimerTime').value;
            
            if (id && time) {
                dashboard.createTimer(id, time);
                document.getElementById('newTimerId').value = '';
                document.getElementById('newTimerTime').value = '';
            }
        }

        function clearLog() {
            document.getElementById('log').innerHTML = '';
        }
    </script>
</body>
</html>
```

## Real-World Scenarios

### 1. Meeting Timer System

```javascript
// meeting-timer.js
class MeetingTimer {
  constructor(meetingId, duration) {
    this.meetingId = meetingId;
    this.duration = duration;
    this.api = new TimerClient();
  }

  async startMeeting() {
    console.log(`Starting meeting ${this.meetingId}`);
    
    // Create main meeting timer
    await this.api.createTimer(`meeting-${this.meetingId}`, this.duration);
    
    // Create agenda item timers
    await this.createAgendaTimers();
    
    // Start monitoring
    this.startMonitoring();
  }

  async createAgendaTimers() {
    // Example agenda with time allocations
    const agenda = [
      { id: 'introduction', duration: 300 },    // 5 minutes
      { id: 'discussion', duration: 900 },     // 15 minutes
      { id: 'decisions', duration: 600 },       // 10 minutes
      { id: 'summary', duration: 300 }          // 5 minutes
    ];

    for (const item of agenda) {
      await this.api.createTimer(
        `agenda-${this.meetingId}-${item.id}`,
        item.duration
      );
    }
  }

  startMonitoring() {
    setInterval(async () => {
      const status = await this.api.get_status(`meeting-${this.meetingId}`);
      
      // Check if meeting needs extension
      if (status.currentTime < 300 && status.state === 'running') {
        console.log('Meeting ending soon! Consider extending.');
        // Could send notification here
      }
    }, 30000); // Check every 30 seconds
  }

  async extendMeeting(extraTime) {
    await this.api.addTime(`meeting-${this.meetingId}`, extraTime);
    console.log(`Meeting extended by ${extraTime} seconds`);
  }

  async endMeeting() {
    await this.api.pause_timer(`meeting-${this.meetingId}`);
    console.log('Meeting ended');
  }
}

// Usage
const meeting = new MeetingTimer('team-sync', 3600); // 1 hour
meeting.startMeeting();
```

### 2. Cooking Timer

```python
# cooking_timer.py
class CookingTimer:
    def __init__(self):
        self.client = TimerClient()
        self.recipes = {
            'pasta': {'boil': 480, 'al_dente': 600},  # 8 min, 10 min
            'rice': {'cook': 900},                   # 15 min
            'chicken': {'roast': 2400},              # 40 min
            'eggs': {'soft': 180, 'hard': 420}       # 3 min, 7 min
        }

    async def start_recipe(self, dish, cook_type=None):
        if dish not in self.recipes:
            print(f"Recipe for {dish} not found")
            return

        if cook_type is None:
            cook_type = list(self.recipes[dish].keys())[0]

        duration = self.recipes[dish][cook_type]
        timer_id = f"{dish}_{cook_type}"

        print(f"Starting {dish} ({cook_type}) - {duration//60} minutes")
        
        # Create timer
        result = await self.client.create_timer(timer_id, duration)
        
        # Monitor and notify
        await self.monitor_cooking(timer_id, dish, cook_type)

    async def monitor_cooking(self, timer_id, dish, cook_type):
        import time
        
        while True:
            time.sleep(30)  # Check every 30 seconds
            
            status = await self.client.get_status(timer_id)
            
            if status['state'] == 'completed':
                print(f"🔔 {dish.title()} ({cook_type}) is ready!")
                # Could trigger notifications, sounds, etc.
                break
            elif status['currentTime'] <= 60:
                print(f"⏰ {dish.title()} ({cook_type}) almost ready!")
        
        # Clean up
        await self.client.delete_timer(timer_id)

    async def adjust_cooking_time(self, timer_id, adjustment_minutes):
        await self.client.add_time(timer_id, adjustment_minutes * 60)
        print(f"Adjusted {timer_id} by {adjustment_minutes} minutes")

# Usage
async def main():
    cooking = CookingTimer()
    
    # Start cooking multiple items
    import asyncio
    
    tasks = [
        cooking.start_recipe('pasta', 'al_dente'),
        cooking.start_recipe('eggs', 'soft')
    ]
    
    await asyncio.gather(*tasks)

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
```

### 3. Quiz/Game Timer

```javascript
// quiz-timer.js
class QuizTimer {
  constructor(quizId, questions) {
    this.quizId = quizId;
    this.questions = questions;
    this.currentQuestion = 0;
    this.api = new TimerClient();
  }

  async startQuiz() {
    console.log(`Starting quiz ${this.quizId}`);
    
    // Create overall quiz timer
    await this.api.createTimer(`quiz-${this.quizId}`, 1800); // 30 minutes total
    
    // Start first question
    await this.startQuestion(0);
  }

  async startQuestion(questionIndex) {
    if (questionIndex >= this.questions.length) {
      await this.endQuiz();
      return;
    }

    this.currentQuestion = questionIndex;
    const question = this.questions[questionIndex];
    const timerId = `question-${this.quizId}-${questionIndex}`;

    console.log(`Question ${questionIndex + 1}: ${question.text}`);
    console.log(`Time limit: ${question.timeLimit} seconds`);

    // Create question timer
    await this.api.createTimer(timerId, question.timeLimit);
    
    // Monitor this question
    this.monitorQuestion(timerId);
  }

  async monitorQuestion(timerId) {
    const checkInterval = setInterval(async () => {
      const status = await this.api.get_status(timerId);
      
      if (status.state === 'completed') {
        clearInterval(checkInterval);
        console.log('Time\'s up for this question!');
        await this.nextQuestion();
      }
    }, 1000);
  }

  async submitAnswer(answer) {
    const timerId = `question-${this.quizId}-${this.currentQuestion}`;
    
    // Pause the question timer
    await this.api.pause_timer(timerId);
    console.log(`Answer submitted: ${answer}`);
    
    // Move to next question
    await this.nextQuestion();
  }

  async nextQuestion() {
    // Clean up current question timer
    const timerId = `question-${this.quizId}-${this.currentQuestion}`;
    await this.api.delete_timer(timerId);
    
    // Start next question
    await this.startQuestion(this.currentQuestion + 1);
  }

  async endQuiz() {
    console.log('Quiz completed!');
    
    // Clean up overall timer
    await this.api.delete_timer(`quiz-${this.quizId}`);
    
    // Calculate and show results
    this.showResults();
  }

  showResults() {
    console.log('Quiz results would be displayed here');
  }
}

// Example usage
const quizQuestions = [
  { text: "What is 2 + 2?", timeLimit: 30, answer: "4" },
  { text: "Capital of France?", timeLimit: 20, answer: "Paris" },
  { text: "Largest planet?", timeLimit: 25, answer: "Jupiter" }
];

const quiz = new QuizTimer('math-quiz-001', quizQuestions);
quiz.startQuiz();
```

## Integration Patterns

### React Hook for Timer Management

```javascript
// useTimer.js
import { useState, useEffect, useCallback } from 'react';

export function useTimer(timerId, baseUrl = 'http://localhost:3000') {
  const [timer, setTimer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch timer status
  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(`${baseUrl}/timers/${timerId}/status`);
      const data = await response.json();
      
      if (data.success) {
        setTimer(data);
        setError(null);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [timerId, baseUrl]);

  // Create or update timer
  const setTimerTime = useCallback(async (time) => {
    try {
      const response = await fetch(`${baseUrl}/timers/${timerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ time })
      });
      
      const data = await response.json();
      if (data.success) {
        setTimer(data);
      }
    } catch (err) {
      setError(err.message);
    }
  }, [timerId, baseUrl]);

  // Add time
  const addTime = useCallback(async (seconds) => {
    try {
      const response = await fetch(`${baseUrl}/timers/${timerId}/add`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seconds })
      });
      
      const data = await response.json();
      if (data.success) {
        setTimer(data);
      }
    } catch (err) {
      setError(err.message);
    }
  }, [timerId, baseUrl]);

  // Pause timer
  const pause = useCallback(async () => {
    try {
      const response = await fetch(`${baseUrl}/timers/${timerId}/pause`, {
        method: 'POST'
      });
      
      const data = await response.json();
      if (data.success) {
        setTimer(data);
      }
    } catch (err) {
      setError(err.message);
    }
  }, [timerId, baseUrl]);

  // Resume timer
  const resume = useCallback(async () => {
    try {
      const response = await fetch(`${baseUrl}/timers/${timerId}/resume`, {
        method: 'POST'
      });
      
      const data = await response.json();
      if (data.success) {
        setTimer(data);
      }
    } catch (err) {
      setError(err.message);
    }
  }, [timerId, baseUrl]);

  // Initial load and periodic updates
  useEffect(() => {
    fetchStatus();
    
    const interval = setInterval(fetchStatus, 1000); // Update every second
    
    return () => clearInterval(interval);
  }, [fetchStatus]);

  return {
    timer,
    loading,
    error,
    setTimerTime,
    addTime,
    pause,
    resume,
    refresh: fetchStatus
  };
}

// Usage in React component
// import { useTimer } from './useTimer';
//
// function TimerComponent({ timerId }) {
//   const { timer, loading, error, addTime, pause, resume } = useTimer(timerId);
//
//   if (loading) return <div>Loading...</div>;
//   if (error) return <div>Error: {error}</div>;
//   if (!timer) return <div>Timer not found</div>;
//
//   const minutes = Math.floor(timer.currentTime / 60);
//   const seconds = timer.currentTime % 60;
//
//   return (
//     <div className={`timer ${timer.state}`}>
//       <h3>Timer: {timer.timerId}</h3>
//       <div className="display">
//         {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
//       </div>
//       <div className="state">State: {timer.state}</div>
//       <div className="controls">
//         <button onClick={() => addTime(30)}>+30s</button>
//         <button onClick={pause} disabled={timer.state !== 'running'}>
//           Pause
//         </button>
//         <button onClick={resume} disabled={timer.state !== 'stopped'}>
//           Resume
//         </button>
//       </div>
//     </div>
//   );
// }
```

### Express.js Middleware

```javascript
// timer-middleware.js
const fetch = require('node-fetch');

class TimerMiddleware {
  constructor(apiUrl = 'http://localhost:3000') {
    this.apiUrl = apiUrl;
  }

  // Express middleware to check timer
  checkTimer(timerId, options = {}) {
    const {
      required = true,
      redirectTo = null,
      onExpired = null,
      checkState = null
    } = options;

    return async (req, res, next) => {
      try {
        const response = await fetch(`${this.apiUrl}/timers/${timerId}/status`);
        const data = await response.json();

        if (!data.success) {
          if (required) {
            if (redirectTo) {
              return res.redirect(redirectTo);
            }
            return res.status(404).json({ error: 'Timer not found' });
          }
          return next();
        }

        // Check state if specified
        if (checkState && data.state !== checkState) {
          if (redirectTo) {
            return res.redirect(redirectTo);
          }
          return res.status(403).json({ 
            error: `Timer must be in ${checkState} state` 
          });
        }

        // Check if expired
        if (data.state === 'completed' && onExpired) {
          return onExpired(req, res, data);
        }

        // Attach timer to request
        req.timer = data;
        next();

      } catch (error) {
        console.error('Timer middleware error:', error);
        if (required) {
          return res.status(500).json({ error: 'Timer service unavailable' });
        }
        next();
      }
    };
  }

  // Middleware to create timer if it doesn't exist
  ensureTimer(timerId, defaultTime = 300) {
    return async (req, res, next) => {
      try {
        const response = await fetch(`${this.apiUrl}/timers/${timerId}/status`);
        const data = await response.json();

        if (!data.success) {
          // Timer doesn't exist, create it
          await fetch(`${this.apiUrl}/timers/${timerId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ time: defaultTime })
          });
        }

        next();
      } catch (error) {
        console.error('Ensure timer error:', error);
        next();
      }
    };
  }
}

// Usage example in Express
// const express = require('express');
// const TimerMiddleware = require('./timer-middleware');
//
// const app = express();
// const timerMiddleware = new TimerMiddleware();
//
// // Protect routes with timer checks
// app.get('/protected',
//   timerMiddleware.checkTimer('session-123', {
//     required: true,
//     checkState: 'running',
//     onExpired: (req, res) => res.redirect('/expired')
//   }),
//   (req, res) => {
//     res.json({ message: 'Access granted', timer: req.timer });
//   }
// );
//
// // Ensure timer exists
// app.use('/quiz',
//   timerMiddleware.ensureTimer('quiz-session', 600),
//   quizRoutes
// );
```

These examples demonstrate various ways to integrate the Timer API into different applications and scenarios, from simple scripts to complex web applications.