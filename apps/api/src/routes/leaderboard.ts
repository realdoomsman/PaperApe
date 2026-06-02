import { Router } from 'express';
import { LEADERBOARD_PAGE_SIZE } from '@paperape/shared';
import { db } from '../lib/firebase.js';

export const leaderboardRouter = Router();

// ─── Leaderboard Cache (per time-range key) ────────────
const lbCacheMap = new Map<string, { data: any[]; time: number }>();
const LB_CACHE_TTL = 15_000; // 15s cache

/**
 * Aggregate real leaderboard from Firestore.
 * Uses a collectionGroup query to fetch ALL positions in 2 total queries
 * (instead of 2N+1 queries from the old N+1 pattern).
 *
 * @param sinceDate — optional Date; when provided, only positions with
 *   `created_at` >= sinceDate are counted. Pass `undefined` for all-time.
 */
async function aggregateLeaderboard(sinceDate?: Date): Promise<any[]> {
  const cacheKey = sinceDate ? sinceDate.toISOString() : 'alltime';
  const cached = lbCacheMap.get(cacheKey);
  if (cached && Date.now() - cached.time < LB_CACHE_TTL && cached.data.length > 0) {
    return cached.data;
  }

  try {
    // 2 queries total regardless of user count
    const [usersSnap, allPositionsSnap] = await Promise.all([
      db.collection('users').get(),
      db.collectionGroup('positions').get(),
    ]);

    if (usersSnap.empty) return [];

    const sinceMs = sinceDate ? sinceDate.getTime() : 0;

    // Helper: check whether a doc's created_at falls within the time window
    function isWithinRange(docData: any): boolean {
      if (!sinceDate) return true; // alltime – no filter
      const raw = docData.created_at;
      if (!raw) return false;
      const ts = typeof raw === 'string' ? new Date(raw).getTime()
        : typeof raw?.toMillis === 'function' ? raw.toMillis()
        : typeof raw?.seconds === 'number' ? raw.seconds * 1000
        : 0;
      return ts >= sinceMs;
    }

    // Group positions by userId (extracted from subcollection path)
    const positionsByUser = new Map<string, any[]>();
    for (const doc of allPositionsSnap.docs) {
      const data = doc.data();
      if (!isWithinRange(data)) continue;
      const userId = doc.ref.parent.parent!.id;
      if (!positionsByUser.has(userId)) positionsByUser.set(userId, []);
      positionsByUser.get(userId)!.push(data);
    }

    const entries: any[] = [];

    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;
      const positions = positionsByUser.get(userId) ?? [];
      const totalTrades = positions.length;

      // Calculate total PnL across positions in the time window
      let totalPnl = 0;
      let winCount = 0;
      let lossCount = 0;

      for (const pos of positions) {
        const pnl = parseFloat(String(pos.pnl_sol ?? 0));
        totalPnl += pnl;
        if (pnl > 0) winCount++;
        else if (pnl < 0) lossCount++;
      }

      const finalPnl = totalPnl;
      const decidedPositions = winCount + lossCount;
      const winRate = decidedPositions > 0 ? (winCount / decidedPositions) * 100 : 0;

      entries.push({
        id: userId,
        username: userData.username ?? userData.displayName ?? `Ape_${userId.slice(-6)}`,
        avatar_url: userData.avatar_url ?? null,
        total_pnl: parseFloat(finalPnl.toFixed(4)),
        win_rate: parseFloat(winRate.toFixed(1)),
        total_trades: totalTrades,
        paper_balance: userData.paper_balance ?? 0,
        rank: 0,
      });
    }

    // Sort by PnL descending
    entries.sort((a, b) => b.total_pnl - a.total_pnl);
    entries.forEach((e, i) => { e.rank = i + 1; });

    // Mark #1 as HIMOTHY
    if (entries.length > 0) {
      entries[0].badge = 'HIMOTHY';
    }

    const result = entries.slice(0, LEADERBOARD_PAGE_SIZE);
    lbCacheMap.set(cacheKey, { data: result, time: Date.now() });
    return result;
  } catch (err) {
    console.error('[leaderboard] Aggregation error:', err);
    const cached = lbCacheMap.get(cacheKey);
    return cached && cached.data.length > 0 ? cached.data : [];
  }
}



// ─── GET /leaderboard/weekly ────────────────────────────
leaderboardRouter.get('/weekly', async (_req, res) => {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 7);
    const rankings = await aggregateLeaderboard(since);
    res.json({ success: true, data: { rankings } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /leaderboard/monthly ───────────────────────────
leaderboardRouter.get('/monthly', async (_req, res) => {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const rankings = await aggregateLeaderboard(since);
    res.json({ success: true, data: { rankings } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /leaderboard/alltime ───────────────────────────
leaderboardRouter.get('/alltime', async (_req, res) => {
  try {
    const rankings = await aggregateLeaderboard();
    res.json({ success: true, data: { rankings } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /leaderboard/refresh ──────────────────────────
leaderboardRouter.post('/refresh', async (_req, res) => {
  try {
    lbCacheMap.clear();
    const rankings = await aggregateLeaderboard();
    res.json({ success: true, data: { rankings, message: 'Leaderboard refreshed' } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
