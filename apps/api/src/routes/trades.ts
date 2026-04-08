import { Router } from 'express';
import { authenticateRequest } from '../services/privy.js';
import { executeBuy, executeSell, executeSellInit, getUserPositions } from '../services/tradeEngine.js';
import { createAutoOrder, getOrdersForPosition, getUserActiveOrders, cancelAutoOrder } from '../services/autoOrders.js';
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

/**
 * GET /trades/history
 * Get user's trade log (buys + sells). 
 */
tradesRouter.get('/history', async (req, res) => {
  try {
    const { getUserTrades } = await import('../services/tradeEngine.js');
    const trades = await getUserTrades(req.user.id);
    res.json({ success: true, data: { trades } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /trades/auto-orders
 * Create a TP/SL/trailing-SL auto order.
 */
tradesRouter.post('/auto-orders', async (req, res) => {
  try {
    const { position_id, type, trigger_percent, sell_percent, token_address, entry_price } = req.body;
    if (!position_id || !type || trigger_percent == null || !token_address || !entry_price) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    if (!['tp', 'sl', 'trailing_sl'].includes(type)) {
      return res.status(400).json({ success: false, error: 'Invalid order type' });
    }
    const order = createAutoOrder({
      user_id: req.user.id,
      position_id,
      token_address,
      type,
      trigger_percent: parseFloat(trigger_percent),
      sell_percent: sell_percent ? parseFloat(sell_percent) : 100,
      entry_price: parseFloat(entry_price),
    });
    res.json({ success: true, data: { order } });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * GET /trades/auto-orders
 * Get all active auto orders for the user.
 */
tradesRouter.get('/auto-orders', async (req, res) => {
  try {
    const positionId = req.query.position_id as string | undefined;
    const orders = positionId
      ? getOrdersForPosition(positionId)
      : getUserActiveOrders(req.user.id);
    res.json({ success: true, data: { orders } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /trades/auto-orders/:id
 * Cancel an auto order.
 */
tradesRouter.delete('/auto-orders/:id', async (req, res) => {
  try {
    const success = cancelAutoOrder(req.params.id, req.user.id);
    if (!success) return res.status(404).json({ success: false, error: 'Order not found' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════
// DCA (Dollar Cost Average) Orders
// ═══════════════════════════════════════════════════════════

/**
 * GET /trades/dca
 * List user's DCA orders.
 */
tradesRouter.get('/dca', async (req, res) => {
  try {
    const { getDCAOrders } = await import('../services/dcaEngine.js');
    const orders = getDCAOrders(req.user.id);
    res.json({ success: true, data: { orders } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /trades/dca
 * Create a new DCA order.
 */
tradesRouter.post('/dca', async (req, res) => {
  try {
    const { createDCAOrder } = await import('../services/dcaEngine.js');
    const { token_address, token_symbol, amount_per_buy, interval, total_buys, slippage } = req.body;
    const order = createDCAOrder(
      req.user.id,
      token_address,
      token_symbol || '???',
      parseFloat(amount_per_buy),
      interval,
      parseInt(total_buys),
      slippage ? parseFloat(slippage) : 15,
    );
    res.json({ success: true, data: { order } });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /trades/dca/:id/pause
 * Pause or resume a DCA order.
 */
tradesRouter.post('/dca/:id/pause', async (req, res) => {
  try {
    const { pauseDCAOrder } = await import('../services/dcaEngine.js');
    const success = pauseDCAOrder(req.user.id, req.params.id);
    if (!success) return res.status(404).json({ success: false, error: 'Order not found or not active/paused' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /trades/dca/:id
 * Cancel a DCA order.
 */
tradesRouter.delete('/dca/:id', async (req, res) => {
  try {
    const { cancelDCAOrder } = await import('../services/dcaEngine.js');
    const success = cancelDCAOrder(req.user.id, req.params.id);
    if (!success) return res.status(404).json({ success: false, error: 'Order not found' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
