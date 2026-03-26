import { Router } from 'express';
import { authenticateRequest } from '../services/privy.js';
import { executeBuy, executeSell, executeSellInit, getUserPositions } from '../services/tradeEngine.js';
import type { BuyRequest, SellRequest, SellInitRequest } from '@paperape/shared';

export const tradesRouter = Router();

// ─── Auth Middleware ────────────────────────────────────
async function requireAuth(req: any, res: any, next: any) {
  const user = await authenticateRequest(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  req.user = user;
  next();
}

tradesRouter.use(requireAuth);

/**
 * POST /trades/buy
 * Execute a paper buy.
 */
tradesRouter.post('/buy', async (req, res) => {
  try {
    const buyReq: BuyRequest = {
      token_address: req.body.token_address,
      amount_sol: parseFloat(req.body.amount_sol),
      slippage_tolerance: req.body.slippage_tolerance
        ? parseFloat(req.body.slippage_tolerance)
        : undefined,
    };

    if (!buyReq.token_address || isNaN(buyReq.amount_sol) || buyReq.amount_sol <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid buy request' });
    }

    const result = await executeBuy(req.user.id, buyReq);
    res.json({
      success: true,
      data: {
        position: result.position,
        trade: result.trade,
      },
    });
  } catch (err: any) {
    console.error('Buy error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /trades/sell
 * Sell a percentage of a position.
 */
tradesRouter.post('/sell', async (req, res) => {
  try {
    const sellReq: SellRequest = {
      position_id: req.body.position_id,
      percentage: parseFloat(req.body.percentage),
    };

    if (!sellReq.position_id || isNaN(sellReq.percentage) || sellReq.percentage <= 0 || sellReq.percentage > 100) {
      return res.status(400).json({ success: false, error: 'Invalid sell request' });
    }

    const result = await executeSell(req.user.id, sellReq);
    res.json({
      success: true,
      data: {
        position: result.position,
        trade: result.trade,
        sol_received: result.solReceived,
      },
    });
  } catch (err: any) {
    console.error('Sell error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /trades/sell-init
 * Sell initial investment, keep moon bag.
 */
tradesRouter.post('/sell-init', async (req, res) => {
  try {
    const sellInitReq: SellInitRequest = {
      position_id: req.body.position_id,
    };

    if (!sellInitReq.position_id) {
      return res.status(400).json({ success: false, error: 'Missing position_id' });
    }

    const result = await executeSellInit(req.user.id, sellInitReq);
    res.json({
      success: true,
      data: {
        position: result.position,
        trade: result.trade,
        sol_received: result.solReceived,
        moon_bag_tokens: result.moonBagTokens,
      },
    });
  } catch (err: any) {
    console.error('Sell-init error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * GET /trades/positions
 * Get user's positions. Query param: ?status=open|closed|rugged
 */
tradesRouter.get('/positions', async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    const positions = await getUserPositions(req.user.id, status);
    res.json({ success: true, data: { positions } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
