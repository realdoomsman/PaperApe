import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { authRouter } from './routes/auth.js';
import { tradesRouter } from './routes/trades.js';
import { leaderboardRouter } from './routes/leaderboard.js';
import { tokensRouter } from './routes/tokens.js';
import { walletsRouter } from './routes/wallets.js';
import { academyRouter } from './routes/academy.js';
import { alertsRouter } from './routes/alerts.js';
import { setupPriceStream, getPriceStreamStats } from './ws/priceStream.js';
import { startRugDetector } from './services/rugDetector.js';
import { startAutoOrderTicker } from './services/autoOrders.js';
import { startDCATicker } from './services/dcaEngine.js';

const app = express();
const port = parseInt(process.env.PORT ?? '3001', 10);

// ─── Middleware ──────────────────────────────────────────
const corsOrigins = (process.env.CORS_ORIGINS ?? [
  'http://localhost:3000',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3002',
  'http://127.0.0.1:3003',
  'https://paperape.vercel.app',
  'https://paper-ape.vercel.app',
  'https://paperape.com',
  'https://www.paperape.com',
].join(','))
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  credentials: true,
}));
app.use(express.json());

// ─── Rate Limiting (300 req/min per IP — Redis-backed) ──
import { checkRateLimit } from './lib/cache.js';

const RATE_LIMIT_MAX = 300;
const RATE_LIMIT_WINDOW = 60; // seconds

app.use(async (req, res, next) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  try {
    const result = await checkRateLimit(ip, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW);
    res.setHeader('X-RateLimit-Limit', RATE_LIMIT_MAX);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000));

    if (!result.allowed) {
      return res.status(429).json({ success: false, error: 'Rate limit exceeded. Try again later.' });
    }
  } catch {
    // If rate limiter fails, allow the request
  }

  next();
});


// ─── Health Check ───────────────────────────────────────
app.get('/health', (_req, res) => {
  const priceStream = getPriceStreamStats();
  // Simulated network congestion: cycles through levels every few minutes
  const minute = Math.floor(Date.now() / 60_000);
  const congestionCycle = minute % 10;
  const congestion = congestionCycle < 6 ? 'low' : congestionCycle < 8 ? 'medium' : 'high';
  res.json({
    status: 'ok',
    service: 'paperape-api',
    timestamp: Date.now(),
    priceStream,
    network: { congestion, priority_fee: congestion === 'low' ? 0.005 : congestion === 'medium' ? 0.01 : 0.05 },
  });
});

// ─── Routes ─────────────────────────────────────────────
app.use('/auth', authRouter);
app.use('/trades', tradesRouter);
app.use('/leaderboard', leaderboardRouter);
app.use('/tokens', tokensRouter);
app.use('/wallets', walletsRouter);
app.use('/academy', academyRouter);
app.use('/alerts', alertsRouter);

// ─── HTTP + WebSocket Server ────────────────────────────
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

setupPriceStream(wss);

// ─── Start Background Services ──────────────────────────
startRugDetector();
startAutoOrderTicker();
startDCATicker();

// ─── Listen ─────────────────────────────────────────────
server.listen(port, () => {
  console.log(`🦍 PaperApe API running on http://localhost:${port}`);
  console.log(`🔌 WebSocket server on ws://localhost:${port}/ws`);
});

// ─── Global Error Handlers ──────────────────────────────
process.on('unhandledRejection', (err) => {
  console.error('🚨 Unhandled promise rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('🚨 Uncaught exception:', err);
  // Don't exit — keep the server running for paper trading
});

export { app, server };
