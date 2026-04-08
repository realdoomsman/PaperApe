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
const corsOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
  .split(',')
  .map((s) => s.trim());

app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json());

// ─── Rate Limiting (60 req/min per IP) ──────────────────
const rateLimitStore: Map<string, { count: number; resetAt: number }> = new Map();
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 60;

app.use((req, res, next) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (entry && now < entry.resetAt) {
    if (entry.count >= RATE_LIMIT_MAX) {
      return res.status(429).json({ success: false, error: 'Rate limit exceeded. Try again later.' });
    }
    entry.count++;
  } else {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
  }

  // Clean old entries every 100 requests
  if (rateLimitStore.size > 1000) {
    for (const [key, val] of rateLimitStore.entries()) {
      if (now > val.resetAt) rateLimitStore.delete(key);
    }
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

export { app, server };
