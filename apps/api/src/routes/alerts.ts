import { Router } from 'express';
import { authenticateRequest } from '../services/auth.js';
import { db, isMockMode } from '../lib/firebase.js';

export const alertsRouter = Router();

// ─── In-Memory Store (Mock Mode) ────────────────────────
const mockAlerts: Map<string, Alert[]> = new Map();

interface Alert {
  id: string;
  user_id: string;
  token_address: string;
  token_symbol: string;
  condition: 'above' | 'below';
  target_price: number;
  note?: string;
  status: 'active' | 'triggered' | 'cancelled';
  created_at: string;
  triggered_at?: string;
}

// ─── Firestore Helpers ──────────────────────────────────
function userAlertsCol(userId: string) {
  return db.collection('users').doc(userId).collection('alerts');
}

// ─── Auth Middleware ────────────────────────────────────
async function requireAuth(req: any, res: any, next: any) {
  const user = await authenticateRequest(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  req.user = user;
  next();
}

alertsRouter.use(requireAuth);

/**
 * GET /alerts
 * List user's active alerts.
 */
alertsRouter.get('/', async (req: any, res) => {
  try {
    const userId = req.user.id;

    if (isMockMode) {
      const alerts = mockAlerts.get(userId) ?? [];
      return res.json({ success: true, data: { alerts: alerts.filter(a => a.status === 'active') } });
    }

    const snap = await userAlertsCol(userId)
      .where('status', '==', 'active')
      .get();
    const alerts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return res.json({ success: true, data: { alerts } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /alerts
 * Create a price alert.
 */
alertsRouter.post('/', async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { token_address, token_symbol, condition, target_price, note } = req.body;

    if (!token_address || !condition || !target_price) {
      return res.status(400).json({ success: false, error: 'Missing token_address, condition, or target_price' });
    }
    if (!['above', 'below'].includes(condition)) {
      return res.status(400).json({ success: false, error: 'condition must be "above" or "below"' });
    }
    if (isNaN(parseFloat(target_price))) {
      return res.status(400).json({ success: false, error: 'target_price must be a valid number' });
    }

    const alert: Alert = {
      id: '',
      user_id: userId,
      token_address,
      token_symbol: token_symbol || '???',
      condition,
      target_price: parseFloat(target_price),
      status: 'active',
      created_at: new Date().toISOString(),
    };
    const cleanNote = typeof note === 'string' ? note.trim() : '';
    if (cleanNote) alert.note = cleanNote;

    if (isMockMode) {
      alert.id = `alert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      if (!mockAlerts.has(userId)) mockAlerts.set(userId, []);
      const userAlerts = mockAlerts.get(userId)!;
      if (userAlerts.filter(a => a.status === 'active').length >= 20) {
        return res.status(400).json({ success: false, error: 'Max 20 active alerts' });
      }
      userAlerts.push(alert);
      return res.json({ success: true, data: { alert } });
    }

    // Firestore: cap at 20 active alerts
    const countSnap = await userAlertsCol(userId)
      .where('status', '==', 'active')
      .get();
    if (countSnap.size >= 20) {
      return res.status(400).json({ success: false, error: 'Max 20 active alerts' });
    }

    const docRef = userAlertsCol(userId).doc();
    alert.id = docRef.id;
    await docRef.set(alert);
    return res.json({ success: true, data: { alert } });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /alerts/:id
 * Cancel an alert.
 */
alertsRouter.delete('/:id', async (req: any, res) => {
  try {
    const userId = req.user.id;
    const alertId = req.params.id;

    if (isMockMode) {
      const userAlerts = mockAlerts.get(userId);
      if (!userAlerts) return res.status(404).json({ success: false, error: 'Alert not found' });
      const alert = userAlerts.find(a => a.id === alertId);
      if (!alert) return res.status(404).json({ success: false, error: 'Alert not found' });
      alert.status = 'cancelled';
      return res.json({ success: true });
    }

    const docRef = userAlertsCol(userId).doc(alertId);
    const snap = await docRef.get();
    if (!snap.exists) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }
    await docRef.update({ status: 'cancelled' });
    return res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
