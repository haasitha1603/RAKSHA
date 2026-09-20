import http from 'http';
import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { Server as SocketIOServer } from 'socket.io';
import cron from 'node-cron';
import { config } from './config.js';
import { runMigrations } from './db/migrations.js';
import { initSockets } from './sockets/index.js';
import { startWatchdog } from './jobs/watchdog.js';
import { runRetentionPurge } from './jobs/retentionPurge.js';
import { recomputeAllReports } from './engine/reportConfidence.js';

// Import routers
import { authRouter } from './routes/auth.js';
import { guardiansRouter } from './routes/guardians.js';
import { mapsRouter } from './routes/maps.js';
import { journeysRouter } from './routes/journeys.js';
import { sosRouter } from './routes/sos.js';
import { reportsRouter } from './routes/reports.js';
import { fakeCallsRouter } from './routes/fakeCalls.js';
import { responderRouter } from './routes/responder.js';
import { demoRouter } from './routes/demo.js';
import { pushRouter } from './routes/push.js';
import helpRouter from './routes/help.js';
import assistantRouter from './routes/assistant.js';

export const app = express();
export const server = http.createServer(app);

// Trust first proxy (required for rate limiting & secure cookie detection behind reverse proxies/localhost)
app.set('trust proxy', 1);

// Initialize Socket.IO
const io = new SocketIOServer(server, {
  cors: {
    origin: true,
    credentials: true,
  },
});
initSockets(io);

// Security Headers (CSP compliant)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'blob:', 'https://tile.openstreetmap.org'],
        connectSrc: ["'self'", 'ws:', 'wss:'],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        fontSrc: ["'self'"],
        workerSrc: ["'self'"],
        mediaSrc: ["'self'", 'blob:'],
        upgradeInsecureRequests: config.NODE_ENV === 'production' && config.COOKIE_SECURE ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

const corsAllowlist = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (corsAllowlist.includes(origin) || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// API Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true, version: '1.0.0', service: 'Raksha Core API' });
});

// App Config for Client (Feature Flags)
app.get('/api/config', (_req: Request, res: Response) => {
  res.json({
    demoMode: config.DEMO_MODE,
    env: config.NODE_ENV,
    assistantProvider: config.ASSISTANT_PROVIDER,
  });
});

// Mount API Routers
app.use('/api', authRouter);
app.use('/api', guardiansRouter);
app.use('/api', mapsRouter);
app.use('/api', journeysRouter);
app.use('/api', sosRouter);
app.use('/api', reportsRouter);
app.use('/api', fakeCallsRouter);
app.use('/api', responderRouter);
app.use('/api', demoRouter);
app.use('/api', pushRouter);
app.use('/api', helpRouter);
app.use('/api', assistantRouter);

// Global Error Handler (Uniform Error Shape)
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('API Error:', err);
  const code = err.code || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'An unexpected error occurred';
  res.status(err.status || 500).json({ error: { code, message } });
});

// Production client static file serving
const clientDist = path.resolve(process.cwd(), '../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Scheduled Jobs
// Hourly: Recompute report confidence & expiry
cron.schedule('0 * * * *', () => {
  try {
    recomputeAllReports();
  } catch (e) {
    console.error('Error in hourly report recompute:', e);
  }
});

// Daily: Retention purge at 03:00 AM
cron.schedule('0 3 * * *', () => {
  try {
    runRetentionPurge();
  } catch (e) {
    console.error('Error in daily retention purge:', e);
  }
});

// Server Initialization
export async function startServer(): Promise<http.Server> {
  runMigrations();
  startWatchdog();

  return new Promise((resolve) => {
    server.listen(config.PORT, '0.0.0.0', () => {
      console.log(`\n\x1b[35m _   _   ___  _   _ _____ _   __ _____ _   _   ___  
| \\ | | / _ \\| | | |_   _| | / //  ___| | | | / _ \\ 
|  \\| |/ /_\\ \\ | | | | | | |/ / \\ \`--.| |_| |/ /_\\ \\
| . \` ||  _  | | | | | | |    \\  \`--. \\  _  ||  _  |
| |\\  || | | |\\ V / _| |_| |\\  \\/\\__/ / | | || | | |
\\_| \\_/\\_| |_/ \\_/  \\___/\\_| \\_/\\____/\\_| |_/\\_| |_/\x1b[0m`);
      console.log(`\n========================================`);
      console.log(`🛡️  RAKSHA Server running on port ${config.PORT}`);
      console.log(`Environment: ${config.NODE_ENV}`);
      console.log(`Emergency numbers loaded: India (112) / Generic`);
      console.log(`========================================\n`);
      resolve(server);
    });
  });
}

if (process.argv[1]?.endsWith('index.ts') || process.argv[1]?.endsWith('index.js')) {
  startServer().catch((err) => {
    console.error('Server failed to start:', err);
    process.exit(1);
  });
}
