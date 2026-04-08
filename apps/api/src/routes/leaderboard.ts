import { Router } from 'express';
import { LEADERBOARD_PAGE_SIZE } from '@paperape/shared';
import { db, isMockMode } from '../lib/firebase.js';

export const leaderboardRouter = Router();

// ─── Leaderboard Cache ──────────────────────────────────
let lbCache: any[] = [];
let lbCacheTime = 0;
const LB_CACHE_TTL = 15_000; // 15s cache

/**
 * Aggregate real leaderboard from Firestore.
 * Reads all users + their trades to compute rankings.
 */
async function aggregateLeaderboard(): Promise<any[]> {
  if (Date.now() - lbCacheTime < LB_CACHE_TTL && lbCache.length > 0) {
    return lbCache;
  }

  try {
    // Get all users
    const usersSnap = await db.collection('users').get();
    if (usersSnap.empty) return [];

    const entries: any[] = [];

    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;

      // Get all positions for this user
      const positionsSnap = await db.collection('positions')
        .where('user_id', '==', userId)
        .get();

      // Get all trades for this user
      const tradesSnap = await db.collection('trades')
        .where('user_id', '==', userId)
        .get();

      const positions = positionsSnap.docs.map(d => d.data());
      const totalTrades = tradesSnap.size;

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

      // Include unrealized PnL from open positions
      const unrealizedPnl = positions
        .filter(p => p.status === 'open')
        .reduce((sum, p) => sum + parseFloat(String(p.pnl_sol ?? 0)), 0);

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

/**
 * Mock leaderboard — includes real user data from in-memory trades
 */
async function generateMockLeaderboard(): Promise<any[]> {
  const MOCK_NAMES = [
    'SolApe_420', 'DiamondGrip', 'PaperlessKing', 'DegenerApe',
    'MoonBagMaster', 'RugSurvivor', 'BonkWhale', 'WifHodler',
    'JeetSlayer', 'AlphaApe', 'TrendSniper', 'PumpHunter',
    'CanopySwinger', 'SilverbackSal', 'BananaTrader',
    'TokenMonkey', 'ChartApe', 'DipBuyer69', 'MemeKing_SOL', 'PaperHandsNo'
  ];

  // Include real user data from mock stores
  let mockPositionsMap: Map<string, any[]>;
  try {
    const mod = await import('../services/tradeEngine.js');
    mockPositionsMap = mod.mockPositions;
  } catch {
    mockPositionsMap = new Map();
  }
  const realEntries: any[] = [];
  for (const [userId, positions] of mockPositionsMap) {
    if (!positions || positions.length === 0) continue;
    let totalPnl = 0, wins = 0, losses = 0, bestTrade = -Infinity, worstTrade = Infinity;
    for (const p of positions) {
      const pnl = parseFloat(String(p.pnl_sol ?? 0));
      totalPnl += pnl;
      if (pnl > 0) { wins++; bestTrade = Math.max(bestTrade, parseFloat(String(p.pnl_percent ?? 0))); }
      else if (pnl < 0) { losses++; worstTrade = Math.min(worstTrade, parseFloat(String(p.pnl_percent ?? 0))); }
    }
    realEntries.push({
      id: userId,
      username: `You`,
      total_pnl: parseFloat(totalPnl.toFixed(4)),
      win_rate: (wins + losses) > 0 ? parseFloat(((wins / (wins + losses)) * 100).toFixed(1)) : 0,
      total_trades: positions.length,
      paper_balance: 100 + totalPnl,
      best_trade: bestTrade === -Infinity ? 0 : parseFloat(bestTrade.toFixed(1)),
      worst_trade: worstTrade === Infinity ? 0 : parseFloat(worstTrade.toFixed(1)),
      win_streak: wins,
      rank: 0,
      badge: undefined,
      is_you: true,
    });
  }

  const mockEntries = MOCK_NAMES.map((name, i) => {
    const basePnl = (20 - i * 1.5) + (Math.random() - 0.3) * 5;
    const trades = Math.floor(10 + Math.random() * 80);
    const wins = Math.floor(trades * (0.45 + Math.random() * 0.3));
    const bestPct = 50 + Math.floor(Math.random() * 500);
    const worstPct = -(5 + Math.floor(Math.random() * 70));
    return {
      id: `mock-${i}`,
      username: name,
      total_pnl: parseFloat(basePnl.toFixed(4)),
      win_rate: parseFloat(((wins / trades) * 100).toFixed(1)),
      total_trades: trades,
      paper_balance: 100 + basePnl,
      best_trade: bestPct,
      worst_trade: worstPct,
      win_streak: Math.floor(Math.random() * 8),
      rank: 0,
      badge: undefined,
    };
  });

  const entries = [...realEntries, ...mockEntries];
  entries.sort((a, b) => b.total_pnl - a.total_pnl);
  entries.forEach((e, i) => { e.rank = i + 1; });
  if (entries.length > 0) entries[0].badge = 'HIMOTHY';

  return entries;
}

// ─── GET /leaderboard/weekly ────────────────────────────
leaderboardRouter.get('/weekly', async (_req, res) => {
  try {
    const rankings = isMockMode
      ? await generateMockLeaderboard()
      : await aggregateLeaderboard();
    res.json({ success: true, data: { rankings } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /leaderboard/monthly ───────────────────────────
leaderboardRouter.get('/monthly', async (_req, res) => {
  try {
    const rankings = isMockMode
      ? await generateMockLeaderboard()
      : await aggregateLeaderboard();
    res.json({ success: true, data: { rankings } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /leaderboard/alltime ───────────────────────────
leaderboardRouter.get('/alltime', async (_req, res) => {
  try {
    const rankings = isMockMode
      ? await generateMockLeaderboard()
      : await aggregateLeaderboard();
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
    const rankings = isMockMode
      ? await generateMockLeaderboard()
      : await aggregateLeaderboard();
    res.json({ success: true, data: { rankings, message: 'Leaderboard refreshed' } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
