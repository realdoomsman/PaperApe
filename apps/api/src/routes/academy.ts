import { Router } from 'express';
import { authenticateRequest } from '../services/auth.js';
import { db, isMockMode } from '../lib/firebase.js';
import { applyPrimaryWalletBalanceDelta } from './wallets.js';

export const academyRouter = Router();

// ─── Lesson Rewards (must match curriculum.ts) ──────────
const LESSON_REWARDS: Record<string, number> = {
  tf01: 2, tf02: 2, tf03: 3, tf04: 5, tf05: 5, tf06: 5, tf07: 3,
  da01: 10, da02: 15, da03: 5, da04: 10,
  ao01: 10, ao02: 15, ao03: 5, ao04: 5,
};

// ─── In-Memory Mock Store ───────────────────────────────
const mockCompletedLessons: Map<string, Set<string>> = new Map();

/**
 * POST /academy/claim-reward
 * Marks a lesson as completed and deposits Fake SOL.
 * Anti-replay: each lesson can only be claimed once per user.
 */
academyRouter.post('/claim-reward', async (req, res) => {
  try {
    const user = await authenticateRequest(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { lesson_id } = req.body;
    if (!lesson_id || typeof lesson_id !== 'string') {
      return res.status(400).json({ success: false, error: 'lesson_id required' });
    }

    const reward = LESSON_REWARDS[lesson_id];
    if (reward === undefined) {
      return res.status(400).json({ success: false, error: 'Unknown lesson' });
    }

    if (isMockMode) {
      // Mock mode
      if (!mockCompletedLessons.has(user.id)) {
        mockCompletedLessons.set(user.id, new Set());
      }
      const completed = mockCompletedLessons.get(user.id)!;

      if (completed.has(lesson_id)) {
        return res.json({ success: true, data: { already_claimed: true, reward: 0, completed_lessons: [...completed] } });
      }

      completed.add(lesson_id);

      // Add reward to balance
      const { fundUser } = await import('../services/auth.js');
      const updated = await fundUser(user.id, reward);
      try {
        await applyPrimaryWalletBalanceDelta(user.id, reward);
      } catch (walletErr) {
        console.warn('Wallet balance sync failed after academy reward:', walletErr);
      }

      return res.json({
        success: true,
        data: {
          already_claimed: false,
          reward,
          new_balance: updated?.paper_balance ?? 0,
          completed_lessons: [...completed],
        },
      });
    }

    // Firestore mode — use transaction for atomic check + update
    const userRef = db.collection('users').doc(user.id);
    const result = await db.runTransaction(async (txn) => {
      const userDoc = await txn.get(userRef);
      if (!userDoc.exists) {
        throw new Error('User not found');
      }
      const userData = userDoc.data()!;
      const completedLessons: string[] = userData.completed_lessons ?? [];

      if (completedLessons.includes(lesson_id)) {
        return { already_claimed: true, reward: 0, completed_lessons: completedLessons };
      }

      const newBalance = (userData.paper_balance ?? 100) + reward;
      const newCompleted = [...completedLessons, lesson_id];

      txn.update(userRef, {
        completed_lessons: newCompleted,
        paper_balance: newBalance,
      });

      return {
        already_claimed: false,
        reward,
        new_balance: newBalance,
        completed_lessons: newCompleted,
      };
    });

    if (result.already_claimed) {
      return res.json({ success: true, data: result });
    }

    try {
      await applyPrimaryWalletBalanceDelta(user.id, reward);
    } catch (walletErr) {
      console.warn('Wallet balance sync failed after academy reward:', walletErr);
    }

    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /academy/progress
 * Get user's completed lessons.
 */
academyRouter.get('/progress', async (req, res) => {
  try {
    const user = await authenticateRequest(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (isMockMode) {
      const completed = mockCompletedLessons.get(user.id);
      return res.json({ success: true, data: { completed_lessons: completed ? [...completed] : [] } });
    }

    const userDoc = await db.collection('users').doc(user.id).get();
    const completedLessons = userDoc.exists ? (userDoc.data()?.completed_lessons ?? []) : [];

    res.json({ success: true, data: { completed_lessons: completedLessons } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
