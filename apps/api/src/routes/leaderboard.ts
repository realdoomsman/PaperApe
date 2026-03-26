import { Router } from 'express';
import { LEADERBOARD_PAGE_SIZE } from '@paperape/shared';
import { supabase } from '../lib/supabase.js';

export const leaderboardRouter = Router();

/**
 * GET /leaderboard/weekly
 * Top users by weekly PnL.
 */
leaderboardRouter.get('/weekly', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('leaderboard_cache')
      .select('*')
      .order('weekly_pnl', { ascending: false })
      .limit(LEADERBOARD_PAGE_SIZE);

    if (error) throw error;

    const ranked = (data ?? []).map((entry, idx) => ({
      ...entry,
      rank: idx + 1,
    }));

    res.json({ success: true, data: { leaderboard: ranked } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /leaderboard/monthly
 * Top users by monthly PnL.
 */
leaderboardRouter.get('/monthly', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('leaderboard_cache')
      .select('*')
      .order('monthly_pnl', { ascending: false })
      .limit(LEADERBOARD_PAGE_SIZE);

    if (error) throw error;

    const ranked = (data ?? []).map((entry, idx) => ({
      ...entry,
      rank: idx + 1,
    }));

    res.json({ success: true, data: { leaderboard: ranked } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /leaderboard/refresh
 * Manually trigger leaderboard refresh (admin only in production).
 */
leaderboardRouter.post('/refresh', async (_req, res) => {
  try {
    const { error } = await supabase.rpc('refresh_leaderboard');
    if (error) throw error;
    res.json({ success: true, data: { message: 'Leaderboard refreshed' } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
