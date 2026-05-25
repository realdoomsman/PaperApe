import type { Position } from '@paperape/shared';
import { db, isMockMode } from '../lib/firebase.js';
import { executeSell } from './tradeEngine.js';

// ─── In-Memory Store (Mock Mode) ────────────────────────
const autoOrders: Map<string, AutoOrder> = new Map();
let tickInterval: ReturnType<typeof setInterval> | null = null;
const AUTO_ORDER_TICK_MS = 5_000; // Check every 5 seconds

export interface AutoOrder {
  id: string;
  user_id: string;
  position_id: string;
  token_address: string;
  type: 'tp' | 'sl' | 'trailing_sl';
  trigger_percent: number;
  sell_percent: number;
  entry_price: number;
  highest_price?: number; // for trailing SL
  status: 'active' | 'triggered' | 'cancelled';
  created_at: string;
  triggered_at?: string;
}

// ─── Firestore Helpers ──────────────────────────────────
function userAutoOrdersCol(userId: string) {
  return db.collection('users').doc(userId).collection('auto_orders');
}

// ─── Create Auto Order ─────────────────────────────────
export async function createAutoOrder(params: {
  user_id: string;
  position_id: string;
  token_address: string;
  type: 'tp' | 'sl' | 'trailing_sl';
  trigger_percent: number;
  sell_percent: number;
  entry_price: number;
}): Promise<AutoOrder> {
  const order: AutoOrder = {
    id: '',
    ...params,
    status: 'active',
    created_at: new Date().toISOString(),
    highest_price: params.type === 'trailing_sl' ? params.entry_price : undefined,
  };

  if (isMockMode) {
    order.id = `ao-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    autoOrders.set(order.id, order);
    return order;
  }

  const docRef = userAutoOrdersCol(params.user_id).doc();
  order.id = docRef.id;
  await docRef.set(order);
  return order;
}

// ─── Get Orders ─────────────────────────────────────────
export async function getOrdersForPosition(positionId: string, userId?: string): Promise<AutoOrder[]> {
  if (isMockMode) {
    return [...autoOrders.values()].filter(o => o.position_id === positionId && o.status === 'active');
  }

  if (!userId) return [];
  const snap = await userAutoOrdersCol(userId)
    .where('position_id', '==', positionId)
    .where('status', '==', 'active')
    .get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() as any }));
}

export async function getUserActiveOrders(userId: string): Promise<AutoOrder[]> {
  if (isMockMode) {
    return [...autoOrders.values()].filter(o => o.user_id === userId && o.status === 'active');
  }

  const snap = await userAutoOrdersCol(userId)
    .where('status', '==', 'active')
    .get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() as any }));
}

// ─── Cancel Auto Order ──────────────────────────────────
export async function cancelAutoOrder(orderId: string, userId: string): Promise<boolean> {
  if (isMockMode) {
    const order = autoOrders.get(orderId);
    if (!order || order.user_id !== userId) return false;
    order.status = 'cancelled';
    return true;
  }

  const docRef = userAutoOrdersCol(userId).doc(orderId);
  const snap = await docRef.get();
  if (!snap.exists) return false;
  await docRef.update({ status: 'cancelled' });
  return true;
}

// ─── Auto Order Ticker ──────────────────────────────────
export function startAutoOrderTicker() {
  console.log(`🤖 Auto-order ticker started (${isMockMode ? 'mock' : 'production'} mode, ${AUTO_ORDER_TICK_MS / 1000}s interval)`);

  tickInterval = setInterval(async () => {
    try {
      let activeOrders: AutoOrder[] = [];

      if (isMockMode) {
        activeOrders = [...autoOrders.values()].filter(o => o.status === 'active');
      } else {
        // Query all active auto-orders across all users
        const snap = await db.collectionGroup('auto_orders')
          .where('status', '==', 'active')
          .get();
        activeOrders = snap.docs.map(d => ({
          id: d.id,
          _ref: d.ref,
          _userId: d.ref.parent.parent!.id,
          ...d.data() as any,
        }));
      }

      if (activeOrders.length === 0) return;

      // Get unique tokens and their current prices
      const uniqueTokens = [...new Set(activeOrders.map(o => o.token_address))];
      const { getTokenPrice } = await import('./birdeye.js');
      const prices: Record<string, number> = {};

      for (const addr of uniqueTokens) {
        try {
          const p = await getTokenPrice(addr);
          prices[addr] = p.priceSol;
        } catch { /* skip */ }
      }

      // Check each order
      for (const order of activeOrders) {
        const currentPrice = prices[order.token_address];
        if (!currentPrice || !order.entry_price) continue;

        const pnlPercent = ((currentPrice - order.entry_price) / order.entry_price) * 100;

        let shouldTrigger = false;

        if (order.type === 'tp' && pnlPercent >= order.trigger_percent) {
          shouldTrigger = true;
        } else if (order.type === 'sl' && pnlPercent <= -Math.abs(order.trigger_percent)) {
          shouldTrigger = true;
        } else if (order.type === 'trailing_sl') {
          const highest = Math.max(order.highest_price ?? order.entry_price, currentPrice);
          const drawdown = ((highest - currentPrice) / highest) * 100;

          // Update highest price
          if (currentPrice > (order.highest_price ?? 0)) {
            if (isMockMode) {
              order.highest_price = currentPrice;
            } else {
              await (order as any)._ref.update({ highest_price: currentPrice });
            }
          }

          if (drawdown >= Math.abs(order.trigger_percent)) {
            shouldTrigger = true;
          }
        }

        if (shouldTrigger) {
          const userId = (order as any)._userId ?? order.user_id;
          console.log(`🔔 Auto-order triggered: ${order.type} for position ${order.position_id} (PnL: ${pnlPercent.toFixed(1)}%)`);

          try {
            await executeSell(userId, {
              position_id: order.position_id,
              percentage: order.sell_percent,
            });

            if (isMockMode) {
              order.status = 'triggered';
              order.triggered_at = new Date().toISOString();
            } else {
              await (order as any)._ref.update({
                status: 'triggered',
                triggered_at: new Date().toISOString(),
              });
            }
          } catch (err: any) {
            console.error(`Auto-order execution failed for ${order.id}:`, err.message);
          }
        }
      }
    } catch (err) {
      console.error('Auto-order ticker error:', err);
    }
  }, AUTO_ORDER_TICK_MS);
}

export function stopAutoOrderTicker() {
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
  }
}
