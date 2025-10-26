# Deployment and Configuration Guide

This guide covers various deployment options, configuration settings, and production considerations for the Timer API.

## Table of Contents

1. [Environment Setup](#environment-setup)
2. [Configuration Options](#configuration-options)
3. [Deployment Methods](#deployment-methods)
4. [Production Considerations](#production-considerations)
5. [Monitoring and Logging](#monitoring-and-logging)
6. [Security](#security)
7. [Performance Optimization](#performance-optimization)
8. [Troubleshooting](#troubleshooting)

## Environment Setup

### Prerequisites

- **Node.js** v16 or higher
- **Bun** v1.0.0 or higher (recommended)
- **Operating System**: Linux, macOS, or Windows

### System Requirements

**Minimum:**
- CPU: 1 core
- RAM: 512MB
- Storage: 100MB

**Recommended for Production:**
- CPU: 2+ cores
- RAM: 2GB+
- Storage: 1GB+ (for logs and persistence)
- Network: 100Mbps+

### Installation

```bash
# Clone the repository
git clone <REPOSITORY_URL>
cd countdown-APIREST

# Install dependencies
bun install

# Build for production
bun run build
```

## Configuration Options

### Environment Variables

Create a `.env` file in the project root:

```env
# Server Configuration
PORT=3000
HOST=0.0.0.0
NODE_ENV=production

# Timer Configuration
DEFAULT_TIMER_DURATION=300
TIMER_CLEANUP_INTERVAL=300000
MAX_TIMERS_PER_INSTANCE=1000

# Persistence
PERSISTENCE_ENABLED=true
PERSISTENCE_FILE=./data/timers.json
BACKUP_ENABLED=true
BACKUP_INTERVAL=3600000

# WebSocket
WEBSOCKET_ENABLED=true
WEBSOCKET_PING_INTERVAL=30000
WEBSOCKET_MAX_CONNECTIONS=100

# P2P Service
P2P_ENABLED=true
P2P_SERVICE_NAME=TimerAPI
P2P_SERVICE_TYPE=tcp

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/timer-api.log
LOG_ROTATION=daily

# CORS
CORS_ORIGIN=*
CORS_METHODS=GET,POST,PUT,PATCH,DELETE,OPTIONS
CORS_CREDENTIALS=false

# Rate Limiting
RATE_LIMIT_ENABLED=false
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60000

# Health Check
HEALTH_CHECK_ENABLED=true
HEALTH_CHECK_PATH=/health
HEALTH_CHECK_INTERVAL=30000
```

### Configuration File Support

The API also supports configuration via JSON/YAML files:

**config.json:**
```json
{
  "server": {
    "port": 3000,
    "host": "0.0.0.0",
    "environment": "production"
  },
  "timer": {
    "defaultDuration": 300,
    "cleanupInterval": 300000,
    "maxTimers": 1000,
    "persistence": {
      "enabled": true,
      "filePath": "./data/timers.json",
      "backupEnabled": true,
      "backupInterval": 3600000
    }
  },
  "websocket": {
    "enabled": true,
    "pingInterval": 30000,
    "maxConnections": 100
  },
  "p2p": {
    "enabled": true,
    "serviceName": "TimerAPI",
    "serviceType": "tcp"
  },
  "logging": {
    "level": "info",
    "file": "./logs/timer-api.log",
    "rotation": "daily"
  },
  "cors": {
    "origin": "*",
    "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    "credentials": false
  },
  "rateLimit": {
    "enabled": false,
    "requests": 100,
    "window": 60000
  },
  "health": {
    "enabled": true,
    "path": "/health",
    "interval": 30000
  }
}
```

## Deployment Methods

### 1. Direct Deployment with Bun

```bash
# Production deployment
bun run start

# Custom port
bun run start --port=8080

# With environment file
NODE_ENV=production bun run start
```

### 2. PM2 Process Manager

Install PM2:
```bash
npm install -g pm2
```

Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'timer-api',
    script: 'src/index.ts',
    interpreter: 'bun',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '1G'
  }]
};
```

Deploy with PM2:
```bash
# Start in development
pm2 start ecosystem.config.js --env development

# Start in production
pm2 start ecosystem.config.js --env production

# Save configuration
pm2 save

# Setup startup script
pm2 startup
```

### 3. Docker Deployment

**Dockerfile:**
```dockerfile
# Use Bun base image
FROM oven/bun:1.0-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lockb ./

# Install dependencies
RUN bun install --frozen-lockfile --production

# Copy source code
COPY . .

# Build the application
RUN bun run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S timer -u 1001

# Change ownership
RUN chown -R timer:nodejs /app
USER timer

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["bun", "run", "start"]
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  timer-api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # Optional: Nginx reverse proxy
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - timer-api
    restart: unless-stopped
```

Build and run:
```bash
# Build image
docker build -t timer-api .

# Run with docker-compose
docker-compose up -d

# View logs
docker-compose logs -f timer-api
```

### 4. Kubernetes Deployment

**k8s/deployment.yaml:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: timer-api
  labels:
    app: timer-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: timer-api
  template:
    metadata:
      labels:
        app: timer-api
    spec:
      containers:
      - name: timer-api
        image: timer-api:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "3000"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        volumeMounts:
        - name: data
          mountPath: /app/data
        - name: logs
          mountPath: /app/logs
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: timer-api-data
      - name: logs
        persistentVolumeClaim:
          claimName: timer-api-logs
---
apiVersion: v1
kind: Service
metadata:
  name: timer-api-service
spec:
  selector:
    app: timer-api
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: LoadBalancer
```

Deploy to Kubernetes:
```bash
kubectl apply -f k8s/
```

### 5. Systemd Service (Linux)

Create `/etc/systemd/system/timer-api.service`:
```ini
[Unit]
Description=Timer API Service
After=network.target

[Service]
Type=simple
User=timer
WorkingDirectory=/opt/timer-api
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/local/bin/bun run start
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=timer-api

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable timer-api
sudo systemctl start timer-api
sudo systemctl status timer-api
```

## Production Considerations

### 1. Reverse Proxy Setup

**Nginx Configuration:**
```nginx
upstream timer_api {
    server 127.0.0.1:3000;
    # Add more servers for load balancing
    # server 127.0.0.1:3001;
    # server 127.0.0.1:3002;
}

server {
    listen 80;
    server_name your-domain.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL Configuration
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    
    location / {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://timer_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # WebSocket support
        proxy_set_header Proxy "";
        proxy_read_timeout 86400;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        proxy_pass http://timer_api;
    }
    
    # Static files (if any)
    location /static/ {
        alias /opt/timer-api/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 2. Database Setup (Optional)

For larger deployments, consider using a database instead of file-based persistence:

**MongoDB Integration:**
```javascript
// src/services/mongodb.service.ts
import { MongoClient } from 'mongodb';

export class MongoDBService {
  private client: MongoClient;
  private db: any;

  constructor(connectionString: string) {
    this.client = new MongoClient(connectionString);
  }

  async connect() {
    await this.client.connect();
    this.db = this.client.db('timer_api');
  }

  async saveTimers(timers: any) {
    await this.db.collection('timers').updateOne(
      { _id: 'main' },
      { $set: { timers, lastUpdated: new Date() } },
      { upsert: true }
    );
  }

  async loadTimers() {
    const doc = await this.db.collection('timers').findOne({ _id: 'main' });
    return doc?.timers || {};
  }
}
```

### 3. Load Balancing

For high availability, deploy multiple instances behind a load balancer:

```bash
# Scale with PM2
pm2 scale timer-api 4

# Or with Docker Compose
version: '3.8'
services:
  timer-api-1:
    build: .
    environment:
      - PORT=3000
    ports:
      - "3001:3000"
  
  timer-api-2:
    build: .
    environment:
      - PORT=3000
    ports:
      - "3002:3000"
  
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx-lb.conf:/etc/nginx/nginx.conf
```

## Monitoring and Logging

### 1. Application Logging

Configure logging in `src/config/logging.ts`:
```typescript
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'timer-api' },
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}
```

### 2. Metrics Collection

Add Prometheus metrics:
```typescript
// src/metrics.ts
import client from 'prom-client';

export const register = new client.Registry();

// Default metrics
client.collectDefaultMetrics({ register });

// Custom metrics
export const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register]
});

export const activeTimers = new client.Gauge({
  name: 'active_timers',
  help: 'Number of active timers',
  registers: [register]
});

export const websocketConnections = new client.Gauge({
  name: 'websocket_connections',
  help: 'Number of active WebSocket connections',
  registers: [register]
});
```

### 3. Health Checks

Enhanced health check endpoint:
```typescript
// src/health.ts
export async function healthCheck() {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version,
    memory: process.memoryUsage(),
    timers: {
      active: await getActiveTimerCount(),
      total: await getTotalTimerCount()
    },
    websocket: {
      connections: getWebSocketConnectionCount()
    },
    services: {
      database: await checkDatabaseHealth(),
      p2p: checkP2PHealth()
    }
  };

  // Determine overall health
  const allHealthy = Object.values(health.services).every(
    service => service.status === 'ok'
  );

  health.status = allHealthy ? 'ok' : 'degraded';
  return health;
}
```

## Security

### 1. API Security

Implement authentication and authorization:
```typescript
// src/middleware/auth.ts
export const authMiddleware = async ({ request, set }: any) => {
  const token = request.headers.get('Authorization');
  
  if (!token) {
    set.status = 401;
    return { error: 'No authorization token provided' };
  }

  try {
    const user = await verifyToken(token);
    request.user = user;
  } catch (error) {
    set.status = 401;
    return { error: 'Invalid token' };
  }
};
```

### 2. Rate Limiting

Implement rate limiting:
```typescript
// src/middleware/rate-limit.ts
import rateLimit from 'express-rate-limit';

export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});
```

### 3. Input Validation

Sanitize and validate all inputs:
```typescript
// src/utils/validation.ts
export function validateTimerId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{1,50}$/.test(id);
}

export function validateTime(time: number): boolean {
  return Number.isInteger(time) && time >= 0 && time <= 86400;
}
```

## Performance Optimization

### 1. Caching

Implement Redis caching:
```typescript
// src/services/redis.service.ts
import Redis from 'ioredis';

export class RedisService {
  private client: Redis;

  constructor() {
    this.client = new Redis(process.env.REDIS_URL);
  }

  async getTimer(id: string) {
    const cached = await this.client.get(`timer:${id}`);
    return cached ? JSON.parse(cached) : null;
  }

  async setTimer(id: string, data: any, ttl = 300) {
    await this.client.setex(`timer:${id}`, ttl, JSON.stringify(data));
  }
}
```

### 2. Connection Pooling

For database connections:
```typescript
// src/database/pool.ts
import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### 3. Compression

Enable response compression:
```typescript
import compression from 'compression';

app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6
}));
```

## Troubleshooting

### Common Issues and Solutions

**1. Port Already in Use**
```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>

# Or change port
PORT=3001 bun run start
```

**2. Memory Leaks**
```bash
# Monitor memory usage
pm2 monit

# Restart on memory threshold
pm2 start ecosystem.config.js --max-memory-restart 1G
```

**3. WebSocket Connection Issues**
```bash
# Check WebSocket status
curl -i -N -H "Connection: Upgrade" \
     -H "Upgrade: websocket" \
     -H "Sec-WebSocket-Key: test" \
     -H "Sec-WebSocket-Version: 13" \
     http://localhost:3000/ws
```

**4. Database Connection Issues**
```bash
# Test database connection
ping <database-host>
telnet <database-host> <port>

# Check connection pool
pm2 show timer-api
```

### Debug Mode

Enable debug logging:
```bash
DEBUG=timer-api:* bun run start
```

### Performance Profiling

Generate CPU profile:
```bash
bun --prof src/index.ts
```

Heap snapshot:
```bash
kill -USR2 <process-id>
```

### Log Analysis

Analyze logs with common patterns:
```bash
# Find errors
grep -i error logs/timer-api.log

# Find slow requests
grep "slow request" logs/timer-api.log

# WebSocket connection issues
grep -i websocket logs/timer-api.log
```

### Health Monitoring

Set up automated monitoring:
```bash
# Simple health check script
#!/bin/bash
response=$(curl -s http://localhost:3000/health)
status=$(echo $response | jq -r '.status')

if [ "$status" != "ok" ]; then
  echo "Health check failed"
  # Send alert
fi
```

This deployment guide provides comprehensive information for deploying the Timer API in various environments, from development to production scale.