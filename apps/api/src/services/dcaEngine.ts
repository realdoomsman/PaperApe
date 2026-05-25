import { db, isMockMode } from '../lib/firebase.js';
import { executeBuy } from './tradeEngine.js';

// ─── In-Memory Store (Mock Mode) ────────────────────────
const dcaOrders: Map<string, DCAOrder> = new Map();
let tickInterval: ReturnType<typeof setInterval> | null = null;
const DCA_TICK_MS = 10_000; // Check every 10 seconds

export interface DCAOrder {
  id: string;
  user_id: string;
  token_address: string;
  token_symbol: string;
  amount_per_buy: number;       // SOL per buy
  interval: string;             // '1m' | '5m' | '15m' | '1h' | '4h'
  total_buys: number;           // max number of buys
  completed_buys: number;
  slippage: number;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  next_buy_at: number;          // timestamp ms
  created_at: string;
  last_buy_at?: string;
}

const INTERVAL_MS: Record<string, number> = {
  '1m':  60_000,
  '5m':  5 * 60_000,
  '15m': 15 * 60_000,
  '1h':  60 * 60_000,
  '4h':  4 * 60 * 60_000,
};

// ─── Firestore Helpers ──────────────────────────────────
function userDCACol(userId: string) {
  return db.collection('users').doc(userId).collection('dca_orders');
}

// ─── Create DCA Order ───────────────────────────────────
export async function createDCAOrder(
  userId: string,
  tokenAddress: string,
  tokenSymbol: string,
  amountPerBuy: number,
  interval: string,
  totalBuys: number,
  slippage: number = 15,
): Promise<DCAOrder> {
  if (!INTERVAL_MS[interval]) {
    throw new Error(`Invalid interval. Use: ${Object.keys(INTERVAL_MS).join(', ')}`);
  }
  if (amountPerBuy <= 0 || amountPerBuy > 50) {
    throw new Error('Amount per buy must be between 0 and 50 SOL');
  }
  if (totalBuys < 2 || totalBuys > 100) {
    throw new Error('Total buys must be between 2 and 100');
  }

  const order: DCAOrder = {
    id: '',
    user_id: userId,
    token_address: tokenAddress,
    token_symbol: tokenSymbol,
    amount_per_buy: amountPerBuy,
    interval,
    total_buys: totalBuys,
    completed_buys: 0,
    slippage,
    status: 'active',
    next_buy_at: Date.now() + INTERVAL_MS[interval],
    created_at: new Date().toISOString(),
  };

  if (isMockMode) {
    order.id = `dca-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    dcaOrders.set(order.id, order);
    console.log(`📊 DCA order created: ${order.id} — ${totalBuys}x ${amountPerBuy} SOL into ${tokenSymbol} every ${interval}`);
    return order;
  }

  const docRef = userDCACol(userId).doc();
  order.id = docRef.id;
  await docRef.set(order);
  console.log(`📊 DCA order created: ${order.id} — ${totalBuys}x ${amountPerBuy} SOL into ${tokenSymbol} every ${interval}`);
  return order;
}

// ─── Get DCA Orders ─────────────────────────────────────
export async function getDCAOrders(userId: string): Promise<DCAOrder[]> {
  if (isMockMode) {
    return [...dcaOrders.values()].filter(o => o.user_id === userId);
  }

  const snap = await userDCACol(userId).get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() as any }));
}

// ─── Pause / Resume DCA Order ───────────────────────────
export async function pauseDCAOrder(userId: string, orderId: string): Promise<boolean> {
  if (isMockMode) {
    const order = dcaOrders.get(orderId);
    if (!order || order.user_id !== userId) return false;
    if (order.status === 'active') {
      order.status = 'paused';
    } else if (order.status === 'paused') {
      order.status = 'active';
      order.next_buy_at = Date.now() + INTERVAL_MS[order.interval];
    } else {
      return false;
    }
    return true;
  }

  const docRef = userDCACol(userId).doc(orderId);
  const snap = await docRef.get();
  if (!snap.exists) return false;
  const data = snap.data()!;

  if (data.status === 'active') {
    await docRef.update({ status: 'paused' });
  } else if (data.status === 'paused') {
    await docRef.update({
      status: 'active',
      next_buy_at: Date.now() + INTERVAL_MS[data.interval],
    });
  } else {
    return false;
  }
  return true;
}

// ─── Cancel DCA Order ───────────────────────────────────
export async function cancelDCAOrder(userId: string, orderId: string): Promise<boolean> {
  if (isMockMode) {
    const order = dcaOrders.get(orderId);
    if (!order || order.user_id !== userId) return false;
    order.status = 'cancelled';
    return true;
  }

  const docRef = userDCACol(userId).doc(orderId);
  const snap = await docRef.get();
  if (!snap.exists) return false;
  await docRef.update({ status: 'cancelled' });
  return true;
}

// ─── DCA Ticker ─────────────────────────────────────────
async function dcaTick() {
  try {
    const now = Date.now();
    let activeOrders: (DCAOrder & { _ref?: any })[] = [];

    if (isMockMode) {
      activeOrders = [...dcaOrders.values()].filter(o => o.status === 'active');
    } else {
      const snap = await db.collectionGroup('dca_orders')
        .where('status', '==', 'active')
        .get();
      activeOrders = snap.docs.map(d => ({
        id: d.id,
        _ref: d.ref,
        ...d.data() as any,
      }));
    }

    for (const order of activeOrders) {
      if (now < order.next_buy_at) continue;
      if (order.completed_buys >= order.total_buys) {
        // Mark completed
        if (isMockMode) {
          order.status = 'completed';
        } else {
          await order._ref.update({ status: 'completed' });
        }
        continue;
      }

      const userId = order.user_id;

      try {
        console.log(`📊 DCA executing buy ${order.completed_buys + 1}/${order.total_buys} for ${order.token_symbol}`);

        await executeBuy(userId, {
          token_address: order.token_address,
          amount_sol: order.amount_per_buy,
          slippage_tolerance: order.slippage,
        });

        const updates = {
          completed_buys: order.completed_buys + 1,
          next_buy_at: now + INTERVAL_MS[order.interval],
          last_buy_at: new Date().toISOString(),
          status: (order.completed_buys + 1 >= order.total_buys) ? 'completed' : 'active',
        };

        if (isMockMode) {
          Object.assign(order, updates);
        } else {
          await order._ref.update(updates);
        }
      } catch (err: any) {
        console.error(`DCA buy failed for order ${order.id}:`, err.message);
        // Don't cancel — retry on next tick
        if (isMockMode) {
          order.next_buy_at = now + INTERVAL_MS[order.interval];
        } else {
          await order._ref.update({ next_buy_at: now + INTERVAL_MS[order.interval] });
        }
      }
    }
  } catch (err) {
    console.error('DCA ticker error:', err);
  }
}

export function startDCATicker() {
  console.log(`📊 DCA ticker started (${isMockMode ? 'mock' : 'production'} mode, ${DCA_TICK_MS / 1000}s interval)`);
  tickInterval = setInterval(dcaTick, DCA_TICK_MS);
}

export function stopDCATicker() {
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
  }
}
