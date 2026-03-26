import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { authRouter } from './routes/auth.js';
import { tradesRouter } from './routes/trades.js';
import { leaderboardRouter } from './routes/leaderboard.js';
import { setupPriceStream } from './ws/priceStream.js';
import { startRugDetector } from './services/rugDetector.js';

const app = express();
const port = parseInt(process.env.PORT ?? '3001', 10);

// ─── Middleware ──────────────────────────────────────────
const corsOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
  .split(',')
  .map((s) => s.trim());

app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json());

// ─── Health Check ───────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'paperape-api', timestamp: Date.now() });
});

// ─── Routes ─────────────────────────────────────────────
app.use('/auth', authRouter);
app.use('/trades', tradesRouter);
app.use('/leaderboard', leaderboardRouter);

// ─── HTTP + WebSocket Server ────────────────────────────
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

setupPriceStream(wss);

// ─── Start Rug Detector ─────────────────────────────────
startRugDetector();

// ─── Listen ─────────────────────────────────────────────
server.listen(port, () => {
  console.log(`🦍 PaperApe API running on http://localhost:${port}`);
  console.log(`🔌 WebSocket server on ws://localhost:${port}/ws`);
});

export { app, server };
