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
app.set('trust proxy', 1);
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
  'https://paperape.fun',
  'https://www.paperape.fun',
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


// ─── Root ───────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({ service: 'paperape-api', status: 'ok', docs: '/health' });
});

// ─── Health Check ───────────────────────────────────────
app.get('/health', async (_req, res) => {
  const priceStream = getPriceStreamStats();
  
  // Firestore connectivity check
  let firestore: any = { connected: false };
  try {
    const { db, isMockMode } = await import('./lib/firebase.js');
    if (isMockMode) {
      firestore = { mode: 'mock', connected: true };
    } else {
      // Try a simple read to verify Firestore is connected
      const testSnap = await db.collection('users').limit(1).get();
      firestore = { mode: 'firestore', connected: true, docCount: testSnap.size };
    }
  } catch (err: any) {
    firestore = { mode: 'unknown', connected: false, error: err.message };
  }

  res.json({
    status: 'ok',
    service: 'paperape-api',
    timestamp: Date.now(),
    firestore,
    priceStream,
  });
});

// ─── Debug: Check raw Firestore data ────────────────────
app.get('/debug/data', async (_req, res) => {
  try {
    const { db, isMockMode } = await import('./lib/firebase.js');
    if (isMockMode) {
      const { mockPositions } = await import('./services/tradeEngine.js');
      const allPositions: any[] = [];
      mockPositions.forEach((positions, userId) => {
        allPositions.push({ userId, count: positions.length, statuses: positions.map(p => p.status) });
      });
      return res.json({ mode: 'mock', users: allPositions });
    }

    // Get all users
    const usersSnap = await db.collection('users').get();
    const users: any[] = [];
    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      const posSnap = await db.collection('users').doc(userDoc.id).collection('positions').get();
      const tradeSnap = await db.collection('users').doc(userDoc.id).collection('trades').limit(5).get();
      users.push({
        id: userDoc.id,
        email: userData.email,
        balance: userData.paper_balance,
        positionCount: posSnap.size,
        positions: posSnap.docs.map(d => ({ id: d.id, status: d.data().status, token: d.data().token_symbol, amount: d.data().amount_sol })),
        recentTradeCount: tradeSnap.size,
      });
    }
    res.json({ mode: 'firestore', userCount: usersSnap.size, users });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Fix: Unrug all falsely-rugged positions ────────────
app.post('/debug/unrug-all', async (_req, res) => {
  try {
    const { db, isMockMode } = await import('./lib/firebase.js');
    if (isMockMode) return res.json({ fixed: 0, mode: 'mock' });
    
    const usersSnap = await db.collection('users').get();
    let fixed = 0;
    
    for (const userDoc of usersSnap.docs) {
      const posSnap = await db.collection('users').doc(userDoc.id).collection('positions')
        .where('status', '==', 'rugged')
        .get();
      
      if (posSnap.empty) continue;
      
      const batch = db.batch();
      for (const doc of posSnap.docs) {
        const data = doc.data();
        const amountSol = parseFloat(String(data.amount_sol ?? 0));
        batch.update(doc.ref, {
          status: 'open',
          is_rugged: false,
          pnl_percent: 0,
          pnl_sol: 0,
          current_value: amountSol,
          current_price: data.entry_price || 0,
          closed_at: null,
        });
        fixed++;
      }
      await batch.commit();
      
      // Reset balance to 100 SOL
      await userDoc.ref.update({ paper_balance: 100 });
    }
    
    res.json({ fixed, balanceReset: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
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
