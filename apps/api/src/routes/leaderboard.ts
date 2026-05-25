import { Router } from 'express';
import { LEADERBOARD_PAGE_SIZE } from '@paperape/shared';
import { db } from '../lib/firebase.js';

export const leaderboardRouter = Router();

// ─── Leaderboard Cache ──────────────────────────────────
let lbCache: any[] = [];
let lbCacheTime = 0;
const LB_CACHE_TTL = 15_000; // 15s cache

/**
 * Aggregate real leaderboard from Firestore.
 * Uses collectionGroup queries to fetch ALL positions and trades in 3 total queries
 * (instead of 2N+1 queries from the old N+1 pattern).
 */
async function aggregateLeaderboard(): Promise<any[]> {
  if (Date.now() - lbCacheTime < LB_CACHE_TTL && lbCache.length > 0) {
    return lbCache;
  }

  try {
    // 3 queries total regardless of user count
    const [usersSnap, allPositionsSnap, allTradesSnap] = await Promise.all([
      db.collection('users').get(),
      db.collectionGroup('positions').get(),
      db.collectionGroup('trades').get(),
    ]);

    if (usersSnap.empty) return [];

    // Group positions by userId (extracted from subcollection path)
    const positionsByUser = new Map<string, any[]>();
    for (const doc of allPositionsSnap.docs) {
      const userId = doc.ref.parent.parent!.id;
      if (!positionsByUser.has(userId)) positionsByUser.set(userId, []);
      positionsByUser.get(userId)!.push(doc.data());
    }

    // Count trades by userId
    const tradeCountByUser = new Map<string, number>();
    for (const doc of allTradesSnap.docs) {
      const userId = doc.ref.parent.parent!.id;
      tradeCountByUser.set(userId, (tradeCountByUser.get(userId) ?? 0) + 1);
    }

    const entries: any[] = [];

    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;
      const positions = positionsByUser.get(userId) ?? [];
      const totalTrades = tradeCountByUser.get(userId) ?? 0;

      // Calculate total PnL across all positions
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
      const winRate = totalTrades > 0 ? (winCount / (winCount + lossCount)) * 100 : 0;

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

    lbCache = entries.slice(0, LEADERBOARD_PAGE_SIZE);
    lbCacheTime = Date.now();
    return lbCache;
  } catch (err) {
    console.error('[leaderboard] Aggregation error:', err);
    return lbCache.length > 0 ? lbCache : [];
  }
}



// ─── GET /leaderboard/weekly ────────────────────────────
leaderboardRouter.get('/weekly', async (_req, res) => {
  try {
    const rankings = await aggregateLeaderboard();
    res.json({ success: true, data: { rankings } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /leaderboard/monthly ───────────────────────────
leaderboardRouter.get('/monthly', async (_req, res) => {
  try {
    const rankings = await aggregateLeaderboard();
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
    lbCache = [];
    lbCacheTime = 0;
    const rankings = await aggregateLeaderboard();
    res.json({ success: true, data: { rankings, message: 'Leaderboard refreshed' } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
