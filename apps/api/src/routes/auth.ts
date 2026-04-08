import { Router } from 'express';
import { authenticateRequest, verifyFirebaseToken, upsertUser } from '../services/privy.js';

export const authRouter = Router();

/**
 * POST /auth/verify
 * Verify a Firebase ID token, upsert user, return user profile.
 */
authRouter.post('/verify', async (req, res) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({ success: false, error: 'Missing accessToken' });
    }

    const firebaseUser = await verifyFirebaseToken(accessToken);
    if (!firebaseUser) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    const user = await upsertUser(firebaseUser);
    res.json({ success: true, data: { user } });
  } catch (err: any) {
    console.error('Auth error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /auth/me
 * Get current user profile.
 */
authRouter.get('/me', async (req, res) => {
  try {
    const user = await authenticateRequest(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    res.json({ success: true, data: { user } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /auth/fund
 * Add paper SOL to user's balance.
 * CAPPED: 500 SOL per 24 hours per user.
 */
const dailyFundTracker: Map<string, { total: number; resetAt: number }> = new Map();
const DAILY_FUND_CAP = 500; // SOL
const SINGLE_FUND_MAX = 100; // SOL

authRouter.post('/fund', async (req, res) => {
  try {
    const user = await authenticateRequest(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const { amount } = req.body;
    if (!amount || typeof amount !== 'number' || amount <= 0 || amount > SINGLE_FUND_MAX) {
      return res.status(400).json({ success: false, error: `Invalid amount. Max ${SINGLE_FUND_MAX} SOL per request.` });
    }

    // Enforce daily cap
    const now = Date.now();
    const tracker = dailyFundTracker.get(user.id);
    if (tracker && now < tracker.resetAt) {
      if (tracker.total + amount > DAILY_FUND_CAP) {
        const remaining = Math.max(0, DAILY_FUND_CAP - tracker.total);
        return res.status(429).json({
          success: false,
          error: `Daily funding limit reached. ${remaining.toFixed(1)} SOL remaining today.`,
        });
      }
      tracker.total += amount;
    } else {
      dailyFundTracker.set(user.id, { total: amount, resetAt: now + 24 * 60 * 60 * 1000 });
    }

    const { fundUser } = await import('../services/privy.js');
    const updated = await fundUser(user.id, amount);
    res.json({ success: true, data: { user: updated, amount_added: amount } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

