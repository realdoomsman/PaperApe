import { Router } from 'express';
import { authenticateRequest } from '../services/privy.js';
import { isMockMode } from '../lib/firebase.js';

export const alertsRouter = Router();

// Auth middleware
async function requireAuth(req: any, res: any, next: any) {
  const user = await authenticateRequest(req.headers.authorization);
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
  req.user = user;
  next();
}
alertsRouter.use(requireAuth);

// In-memory alert store (mock mode)
interface Alert {
  id: string;
  userId: string;
  tokenAddress: string;
  tokenSymbol: string;
  targetPrice: number;
  direction: 'above' | 'below';
  active: boolean;
  createdAt: string;
}

const mockAlerts: Map<string, Alert[]> = new Map();

/**
 * GET /alerts — get user's price alerts
 */
alertsRouter.get('/', async (req: any, res) => {
  try {
    const userId = req.user.id;
    const alerts = mockAlerts.get(userId) || [];
    res.json({ success: true, data: { alerts: alerts.filter(a => a.active) } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /alerts — create a price alert
 */
alertsRouter.post('/', async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { tokenAddress, tokenSymbol, targetPrice, direction } = req.body;

    if (!tokenAddress || !targetPrice || !direction) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      userId,
      tokenAddress,
      tokenSymbol: tokenSymbol || 'TOKEN',
      targetPrice: parseFloat(targetPrice),
      direction,
      active: true,
      createdAt: new Date().toISOString(),
    };

    const userAlerts = mockAlerts.get(userId) || [];
    if (userAlerts.filter(a => a.active).length >= 10) {
      return res.status(400).json({ success: false, error: 'Maximum 10 active alerts' });
    }
    userAlerts.push(alert);
    mockAlerts.set(userId, userAlerts);

    res.json({ success: true, data: { alert } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /alerts/:id — delete a price alert
 */
alertsRouter.delete('/:id', async (req: any, res) => {
  try {
    const userId = req.user.id;
    const alertId = req.params.id;
    const userAlerts = mockAlerts.get(userId) || [];
    const alert = userAlerts.find(a => a.id === alertId);
    if (!alert) return res.status(404).json({ success: false, error: 'Alert not found' });
    alert.active = false;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
