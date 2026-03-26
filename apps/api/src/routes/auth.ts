import { Router } from 'express';
import { authenticateRequest, verifyPrivyToken, upsertUser } from '../services/privy.js';

export const authRouter = Router();

/**
 * POST /auth/verify
 * Verify a Privy access token, upsert user, return user profile.
 */
authRouter.post('/verify', async (req, res) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({ success: false, error: 'Missing accessToken' });
    }

    const privyUser = await verifyPrivyToken(accessToken);
    if (!privyUser) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    const user = await upsertUser(privyUser);
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
